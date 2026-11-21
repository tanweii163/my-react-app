// 第 40 课 · 从 Mock 到真实后端 —— apiClient.js：前端这头的"真实世界接口层"
//
// 本文件教什么：
//   1. fetch 封装 + 三类错误的分诊。真 fetch 和 Mock 的第一个区别：
//      只有「网络层失败」（服务器没开、断网、CORS 被拦、超时）才会让
//      fetch 的 Promise reject；HTTP 400/500 是"成功的请求、失败的响应"，
//      res.ok 是 false 但不抛错——必须在封装里统一转成异常，调用方才能
//      用一套 try/catch 处理所有失败。这是 fetch 最常见的误解。
//   2. LiveSocket：把第 28 课 MockSocket 的接口原样换成真 WebSocket。
//      —— 接口不变，只换实现，这就是"从 Mock 到真实的替换成本为零"：
//      connect() / close() / status / onopen / onmessage / onclose /
//      onstatuschange 一个不多一个不少，组件层（LiveBoard）拿到的形状
//      和第 28 课的 Mock 一模一样。
//      与 Mock 的三处有意差异（真实世界的诚实版本）：
//      ① statuschange 的参数从 Event 换成 meta 快照对象
//         { status, attempt, nextDelayMs }——UI 要显示"第几次重试、多久后重试"，
//         传对象比让 UI 反读内部字段干净；
//      ② simulateDrop() 没了——真实断线不用模拟，Ctrl+C 杀掉服务器就是最好的教具；
//      ③ 重试没有次数上限——Mock 敢"3 次后放弃"，因为演示可以重来；
//        真实服务器重启要多久没人知道，生产级客户端的策略是
//        无限重试 + 封顶退避 + 抖动（见 _scheduleRetry）。
//   3. 序列化成本：跨网络传的只有字节。发之前 JSON.stringify、收之后
//      JSON.parse，且 parse 不保证成功——必须 try/catch，Mock 里
//      "传的是同一个对象引用"的错觉到这里彻底破灭。

// —— 两个真实端点：注意端口 4310 与页面所在源（5173）不同 ⇒ 跨源 ⇒ 服务端必须回 CORS 头 ——
const BASE_URL = 'http://localhost:4310'
const WS_URL = 'ws://localhost:4310/ws'

// —— 失败分类的"身份证"：status 为 0 表示请求根本没到应用层（网络层就死了） ——
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status // 400/500 = 服务器给过答复；0 = 网络/超时/CORS 拦截
  }
}

// —— 统一请求函数：GET/POST 都走这里，错误分诊只写一遍 ——
async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      // 带请求体才需要声明内容类型——正是这个头触发了 CORS 预检（server.js 讲过）
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined, // 出门先序列化
      // 超时兜底：真 fetch 默认永远等。Mock 的"延迟"是可控常量，
      // 真网络的"延迟"可以是无底洞——5 秒不回应就按失败处理
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    // 走到这里说明请求没得到任何 HTTP 响应：服务器没开 / 断网 / CORS 被拦 / 超时。
    // 注意浏览器对 CORS 失败的报错也长这样——它故意不给 JS 更多信息（安全设计）
    const msg =
      err.name === 'TimeoutError'
        ? '请求超时：服务器 5 秒内没有响应'
        : '网络错误：请求没有到达服务器（服务没开？断网？CORS 被拦？）'
    throw new ApiError(msg, 0)
  }

  // HTTP 层失败：状态码即结果（REST 约定）。错误响应体里的中文说明
  // 是服务器专门写给人看的，优先展示；解析不出就退回通用文案
  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`
    try {
      const data = await res.json()
      if (data && typeof data.error === 'string') message = data.error
    } catch {
      // 错误响应体不是 JSON：用上面的通用文案，这个 catch 的意义是"不让解析失败雪崩"
    }
    throw new ApiError(message, res.status)
  }

  return res.json() // 成功响应也要反序列化：回来的从来不是对象，是字节
}

// —— REST 两个动词，各对应一个端点 ——
export async function fetchNotes() {
  return request('/api/notes') // resolve { notes: [...] }
}

export async function createNote(title) {
  // 201 成功 / 400 校验失败——调用方用 catch 接住，ApiError.message 可以直接上 UI
  return request('/api/notes', { method: 'POST', body: { title } })
}

// ================= LiveSocket：真 WebSocket + 断线重连状态机 =================

// 状态词汇表与第 28 课的 SOCKET_STATUS 完全一致——组件层的判断逻辑零改动
export const SOCKET_STATUS = {
  CONNECTING: 'connecting', // WebSocket 正在握手（HTTP Upgrade → 101）
  OPEN: 'open', // 已连接，正常收消息
  RECONNECTING: 'reconnecting', // 意外断线，正在按退避节奏重试
  CLOSED: 'closed', // 手动关闭；或初始状态
}

// 退避节奏：800 → 1600 → 3200 → 6400 → 8000（封顶）。
// 铁律（第 28/30 课讲过）：服务器挂了别用固定间隔猛敲——那是雪崩式重试，
// 退避是自保也是礼貌
const BASE_RETRY_MS = 800
const MAX_RETRY_MS = 8000

export class LiveSocket {
  constructor(url) {
    this.url = url
    this.status = SOCKET_STATUS.CLOSED
    this.attempt = 0 // 已失败的连续重试次数（驱动退避指数，也驱动徽章文案）
    this.nextDelayMs = null // 正在等待的那次重试间隔（给 UI 展示）
    this._ws = null
    this._retryTimer = null
    this._manuallyClosed = false // 手动 close 与"意外断线"的分流开关（第 28 课同款）
    this._handlers = { open: null, message: null, close: null, statuschange: null }

    // 单处理器接口（on* 属性）：与真 WebSocket、第 28 课 MockSocket 的行为一致——
    // 后赋值的覆盖先前的，最后一个说了算
    for (const type of Object.keys(this._handlers)) {
      Object.defineProperty(this, `on${type}`, {
        get: () => this._handlers[type],
        set: (fn) => {
          this._handlers[type] = typeof fn === 'function' ? fn : null
        },
      })
    }
  }

  // 发起连接。幂等守卫：只有 closed 状态才能真正发起——
  // 这条守卫是给 StrictMode 的（开发环境 effect 挂载→清理→再挂载跑两遍，
  // 第二遍必须是空操作，第 30 课踩过这个坑）
  connect() {
    if (this.status !== SOCKET_STATUS.CLOSED) return
    this._manuallyClosed = false
    this.attempt = 0
    this._open()
  }

  // 建立一条真连接：浏览器原生 WebSocket，握手由浏览器完成。
  // 注意 onerror 不单独处理：ws 的错误事件之后必然跟着 close——
  // 把所有断线决策收敛到 onclose 一处，避免两条路径抢状态机
  _open() {
    clearTimeout(this._retryTimer)
    this._setStatus(SOCKET_STATUS.CONNECTING)

    let ws
    try {
      ws = new WebSocket(this.url)
    } catch {
      // URL 非法等同步异常：当作一次失败连接，走重试
      this._scheduleRetry()
      return
    }
    this._ws = ws

    ws.onopen = () => {
      // 连上即清零退避计数：下次断线从最短间隔重新开始（第 30 课同款）
      this.attempt = 0
      this.nextDelayMs = null
      this._setStatus(SOCKET_STATUS.OPEN)
      this._fire('open', {})
    }
    // 消息原样上交：data 是字符串，反序列化是使用方的责任——
    // 故意不在这里 JSON.parse 吞掉这一步，"序列化成本"必须留在现场
    ws.onmessage = (event) => this._fire('message', event)
    ws.onclose = () => {
      this._ws = null
      if (this._manuallyClosed) {
        // 手动关闭：永不自动重连——"用户说不要"和"网络说不行"是两码事
        this._setStatus(SOCKET_STATUS.CLOSED)
        this._fire('close', { manual: true })
        return
      }
      // 意外断线：进入重连状态机
      this._setStatus(SOCKET_STATUS.RECONNECTING)
      this._fire('close', { manual: false })
      this._scheduleRetry()
    }
    ws.onerror = () => {} // 决策全部交给 onclose，这里故意留空
  }

  // 手动关闭：设分流开关 → 永不自动重连（第 28 课同款语义）
  close() {
    this._manuallyClosed = true
    clearTimeout(this._retryTimer)
    if (this._ws) {
      this._ws.close(1000, '客户端主动关闭') // 1000 = 正常关闭；onclose 里收尾
    } else {
      this._setStatus(SOCKET_STATUS.CLOSED)
      this._fire('close', { manual: true })
    }
  }

  // 指数退避 + 抖动：delay = BASE × 2^已失败次数，封顶 MAX，再乘 ±30% 随机。
  // 抖动（第 30 课埋的伏笔）：防止成千上万个客户端在同一秒整齐划一地重试，
  // 把一次服务端重启变成第二次雪崩
  _scheduleRetry() {
    const backoff = Math.min(BASE_RETRY_MS * 2 ** this.attempt, MAX_RETRY_MS)
    const delay = Math.round(backoff * (0.7 + Math.random() * 0.6)) // 0.7x ~ 1.3x
    this.nextDelayMs = delay
    this.attempt += 1
    // 排定重试也必须广播状态：徽章上的"第 N 次 · 约 Xms 后"靠的就是这次广播
    // （第 30 课实测踩过的坑：漏了这次广播，UI 永远停在断线瞬间的旧值）
    this._fire('statuschange', this._meta())
    this._retryTimer = setTimeout(() => {
      this.nextDelayMs = null
      this._open()
    }, delay)
  }

  _fire(type, payload) {
    const handler = this._handlers[type]
    if (handler) handler(payload)
  }

  _meta() {
    return { status: this.status, attempt: this.attempt, nextDelayMs: this.nextDelayMs }
  }

  _setStatus(status) {
    if (this.status === status) return
    this.status = status
    this._fire('statuschange', this._meta())
  }
}

// —— 模块级单例：连接活在组件树之外（第 28/30 课确立的模式）——
// 组件挂载只是"接上"这个常驻连接，卸载只摘自己的回调；
// 路由切走再切回来，连接和退避状态都还在——这才是真实应用该有的韧性
export const liveSocket = new LiveSocket(WS_URL)
