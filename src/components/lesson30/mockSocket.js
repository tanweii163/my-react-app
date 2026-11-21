// 第 30 课 · 结业实战：迷你监控台 —— MockSocket：一个会"断线重连"的假实时连接
//
// 本文件教什么：
//   1. 真实世界给前端的从来不是"永远稳定的连接"：WebSocket / SSE 随时会掉，
//      生产级数据源必须自带"重连策略"。本课造一个 MockSocket 把这条完整状态机演练一遍：
//      closed → connecting → open →（断线）→ reconnecting →（指数退避重试）→ open；
//   2. 指数退避（exponential backoff）：重试间隔 = 基础间隔 × 2^失败次数、封顶。
//      为什么不固定 1 秒猛试？服务端正在过载时，固定间隔重试等于火上浇油；
//      退避让间隔自动拉长，给服务端恢复时间。生产实现还会加"抖动"（随机 ±30%），
//      防止成千上万个客户端在同一秒同步重试——见 doc/lesson-30.md「动手试一试」；
//   3. 它对 React 一无所知：只对外推 onEvent / onStatus 两个监听。
//      这是第 28 课确立的模式——传输层和 React 状态各管各的，
//      由外部 store（telemetryStore.js）把它们接起来，组件保持"纯读者"。
//
// 铁律：数据源是异步的、活在组件树之外。把连接状态塞进组件 useState，
// 组件一卸载（路由切换）连接就成了孤儿——所以它的状态必须进外部 store。

// —— 节奏参数：教学页面，速度要"肉眼可见" ——
const TICK_MS = 1000 // 心跳周期：每秒推一轮价格
const OPEN_DELAY_MS = 400 // "握手"耗时：让 connecting 状态能被看见（真实网络也有这段）
const BASE_RETRY_MS = 800 // 首次重试间隔
const MAX_RETRY_MS = 8000 // 退避上限：最多等 8 秒，别让它涨到几分钟

const SYMBOLS = ['AAPL', 'GOOG', 'TSLA']

// 自增序列号：给每条日志/告警一个稳定 id——列表渲染的 key 要的是"身份"不是下标
let eventSeq = 0

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 日志行模板：info 打底、warn/error 少量掺入——真实日志流就是这种分布
const LOG_LINES = [
  () => ({ level: 'info', text: `健康检查通过 · P99 延迟 ${randInt(12, 60)}ms` }),
  () => ({ level: 'info', text: `缓存命中率 ${randInt(72, 99)}%，淘汰 ${randInt(0, 3)} 条` }),
  () => ({ level: 'info', text: `配置热更新完成 · ${randInt(2, 9)} 个实例生效` }),
  () => ({ level: 'warn', text: `慢查询告警 · 某条 SQL 耗时 ${randInt(300, 1200)}ms` }),
  () => ({ level: 'warn', text: `内存占用 ${randInt(70, 84)}%，接近告警线` }),
  () => ({ level: 'error', text: '上游返回 502 · 自动重试成功' }),
]

// 加权抽取：70% info / 20% warn / 10% error——用随机数落点决定区间
function pickLogLine() {
  const roll = Math.random()
  const pool = roll < 0.7 ? LOG_LINES.slice(0, 3) : roll < 0.9 ? LOG_LINES.slice(3, 5) : LOG_LINES.slice(5)
  return pool[randInt(0, pool.length - 1)]()
}

const ALERT_POOL = [
  { severity: 'critical', message: 'CPU 超阈值：持续 30 秒高于 92%' },
  { severity: 'critical', message: '上游服务不可用，熔断器已打开' },
  { severity: 'warning', message: '错误率升至 3.2%（基线 0.5%）' },
  { severity: 'warning', message: '磁盘占用 85%，接近容量告警线' },
]

const pickAlert = () => ALERT_POOL[randInt(0, ALERT_POOL.length - 1)]

export class MockSocket {
  constructor() {
    this.status = 'closed' // 状态机：closed | connecting | open | reconnecting
    this.retryCount = 0 // 已排定的重试次数（驱动指数退避；状态条上的"第 N 次重试"就是它）
    this.pendingDelayMs = null // 正在等待的那次重试的间隔（给状态条展示用）
    this.simOffline = false // 断线模拟开关：true = 网线被拔，每次重试都失败
    this.tickCount = 0
    // 三只股票的起始价：随机游走从这里的基准出发
    this.prices = { AAPL: 187.4, GOOG: 141.5, TSLA: 248.9 }
    this.eventListeners = new Set()
    this.statusListeners = new Set()
    this.heartbeatTimer = null
    this.handshakeTimer = null
    this.retryTimer = null
  }

  // —— 对外两个订阅口：都返回"取消订阅"函数（观察者模式的标准形状，第 28 课同款） ——
  onEvent(listener) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener) {
    this.statusListeners.add(listener)
    // 订阅的瞬间先推一份当前快照——订阅者拿到完整状态，不用"等一拍"再对齐
    listener(this.status, this.statusMeta())
    return () => this.statusListeners.delete(listener)
  }

  // 状态附带的元信息：重试第几次 / 下次间隔多久 / 断线开关是否打开
  statusMeta() {
    return { attempt: this.retryCount, nextDelayMs: this.pendingDelayMs, offline: this.simOffline }
  }

  pushStatus() {
    const meta = this.statusMeta()
    this.statusListeners.forEach((fn) => fn(this.status, meta))
  }

  // —— 连接生命周期 ——
  connect() {
    // 幂等守卫：已在 connecting/open/reconnecting 时再 connect 是空操作。
    // 这条守卫是给 StrictMode 的：开发环境 effect 会"挂载→清理→再挂载"跑两遍，
    // 第二遍 connect 必须安全，靠的就是这种入口检查。
    if (this.status !== 'closed') return
    this.simOffline = false
    this.retryCount = 0
    this.openConnection()
  }

  openConnection() {
    this.clearTimers()
    this.pendingDelayMs = null
    this.status = 'connecting'
    this.pushStatus()
    // 握手不是瞬时的：留 400ms 窗口让用户看见"连接中"，教学状态流转全靠它
    this.handshakeTimer = setTimeout(() => {
      this.retryCount = 0 // 连上即清零退避计数：下次断线从头（最短间隔）开始
      this.status = 'open'
      this.pushStatus()
      this.startHeartbeat()
    }, OPEN_DELAY_MS)
  }

  disconnect() {
    // 手动关闭顺手把断线开关一起复位——避免出现"已断开却还挂着离线模拟"的矛盾状态
    this.simOffline = false
    this.clearTimers()
    this.pendingDelayMs = null
    this.retryCount = 0
    this.status = 'closed'
    this.pushStatus()
  }

  // —— 断线模拟开关 ——
  simulateDrop() {
    if (this.status === 'closed' || this.simOffline) return
    this.simOffline = true
    this.clearTimers() // 掐掉心跳：从这一刻起一个事件都不再推
    this.status = 'reconnecting'
    // 状态条的元信息由 scheduleRetry 内部广播（第几次重试、间隔多久），
    // 这里不用单独 push——先改状态再排重试，一次说完
    this.scheduleRetry()
  }

  restore() {
    if (!this.simOffline) return
    this.simOffline = false
    // 立刻同步开关状态（此刻 status 还是 reconnecting，但 UI 上的开关先归位）
    this.pushStatus()
    if (this.status === 'reconnecting') {
      clearTimeout(this.retryTimer)
      this.attemptOnce() // 不等下一个退避窗口，马上探测——退避是对网络的礼貌，开关已恢复就该立刻试
    }
  }

  // —— 指数退避核心：间隔 = BASE × 2^已失败次数，封顶 MAX ——
  // 为什么退避？服务端过载时固定 1 秒猛试是踩踏；退避让间隔自动拉长，给服务端恢复时间。
  // 生产实现还会加"抖动"（随机 ±30%）防止成千上万客户端同一秒同步重试——见讲义「动手试一试」。
  scheduleRetry() {
    const delay = Math.min(BASE_RETRY_MS * 2 ** this.retryCount, MAX_RETRY_MS)
    this.retryCount += 1
    this.pendingDelayMs = delay
    // 易错点（实测踩过）：排定重试也必须广播一次状态——
    // 否则状态条上的"第几次重试/间隔多久"永远停在断线瞬间的旧值
    this.pushStatus()
    this.retryTimer = setTimeout(() => this.attemptOnce(), delay)
  }

  attemptOnce() {
    this.pendingDelayMs = null
    if (this.simOffline) {
      // 探测失败（网还断着）：留在 reconnecting，按退避排下一次
      this.scheduleRetry()
    } else {
      // 探测成功：走正常握手流程（openConnection 里会把退避计数清零）
      this.openConnection()
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => this.emitTick(), TICK_MS)
  }

  // 每个心跳推三类事件中的零到若干个——真实推送的到达从来不是均匀的
  emitTick() {
    this.tickCount += 1
    // ① 价格心跳：每个 symbol 一步随机游走（正负随机的小幅波动）
    for (const symbol of SYMBOLS) {
      const delta = (Math.random() - 0.5) * 2.4
      const price = Math.max(1, +(this.prices[symbol] + delta).toFixed(2))
      this.prices[symbol] = price
      this.emit({ type: 'price', symbol, price, ts: Date.now() })
    }
    // ② 日志行：每 3 拍一条，info 为主、掺少量 warn/error
    if (this.tickCount % 3 === 0) {
      const { level, text } = pickLogLine()
      this.emit({ type: 'log', id: ++eventSeq, level, text, ts: Date.now() })
    }
    // ③ 告警：低概率事件，每拍最多一条——告警的价值在"少而响"，泛滥了就没人看了
    if (Math.random() < 0.1) {
      const { severity, message } = pickAlert()
      this.emit({ type: 'alert', id: ++eventSeq, severity, message, ts: Date.now() })
    }
  }

  emit(event) {
    this.eventListeners.forEach((fn) => fn(event))
  }

  // 三个定时器一把清：断线、手动关闭、重新握手都要走这里——
  // 漏清任何一个都会出现"僵尸推送"，这就是第 2 课"副作用要清理"的最终形态
  clearTimers() {
    clearTimeout(this.handshakeTimer)
    clearTimeout(this.retryTimer)
    clearInterval(this.heartbeatTimer)
    this.handshakeTimer = null
    this.retryTimer = null
    this.heartbeatTimer = null
  }
}
