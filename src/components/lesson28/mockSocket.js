// MockSocket · 用 EventTarget 模拟一个 WebSocket
//
// 本文件教什么：
// 1. 外部世界（真实项目里的 WebSocket / 第三方 SDK）长什么样：
//    onopen / onmessage / onclose 回调 + send()——React 管不了它的生命周期，
//    只能"订阅 + 清理"（呼应第 2 课：副作用必须能被撤销）；
// 2. 浏览器事件机制的通用底座 EventTarget：它只对 on<小写事件名> 这类
//    "内置属性"做自动派发（比如 DOM 元素的 onclick），普通 EventTarget 上
//    随手赋值的 socket.onmessage 只是一个普通属性，dispatchEvent 不会调用它——
//    所以本类用 getter/setter 把 onopen/onmessage/onclose 转接成真正的
//    addEventListener/removeEventListener，这就是"模拟 on* 属性"的标准手法；
// 3. 断线重连状态机：connecting → open →（断线）→ reconnecting（指数退避重试，
//    最多 MAX_RETRIES 次）→ 彻底放弃（closed）。真实网络库（如 socket.io）里
//    就是这套逻辑，这里手写一遍拆开看。

// 模拟"服务器"推送的股票池：每条消息形如 { symbol, price, ts }
const SYMBOLS = ['AAPL', 'GOOG', 'TSLA']

// 连接状态机允许的状态值（store 和 UI 都引用这一份，避免魔法字符串散落）
export const SOCKET_STATUS = {
  CONNECTING: 'connecting', // TCP 握手中
  OPEN: 'open', // 已连接，正常收消息
  RECONNECTING: 'reconnecting', // 断线后正在重试
  CLOSED: 'closed', // 手动关闭，或重试次数用尽彻底放弃
}

// 重连基础间隔（毫秒）：第 1 次重试等它，之后每次翻倍（指数退避）
const BASE_RETRY_DELAY = 800
// 最多重试次数：超过就彻底放弃，把决定权交回 UI（用户手动点"重连"）
export const MAX_RETRIES = 3

export class MockSocket extends EventTarget {
  constructor({ intervalMs = 1000 } = {}) {
    super()
    this.intervalMs = intervalMs
    this.status = SOCKET_STATUS.CONNECTING
    // 私有句柄区：定时器 id 和重试计数，绝不暴露给外部
    this._pushTimer = null
    this._retryTimer = null
    this._retries = 0
    this._manuallyClosed = false // 手动 close() 与"意外断线"的分流开关

    // 把 onopen/onmessage/onclose 转接成真正的事件监听（见文件头第 2 点）
    for (const type of ['open', 'message', 'close', 'statuschange']) {
      const prop = `on${type}`
      // 每个 on* 属性只能挂一个处理器（和真实 WebSocket 行为一致）：
      // setter 覆盖时先移除旧的再挂新的，避免重复触发
      let handler = null
      Object.defineProperty(this, prop, {
        get: () => handler,
        set: (fn) => {
          if (handler) this.removeEventListener(type, handler)
          handler = typeof fn === 'function' ? fn : null
          if (handler) this.addEventListener(type, handler)
        },
      })
    }
  }

  // 发起连接：真实 socket 是网络握手，这里用两个定时器演完全程
  connect() {
    this._clearTimers()
    this._manuallyClosed = false
    this._retries = 0
    this._setStatus(SOCKET_STATUS.CONNECTING)
    // 模拟网络延迟：120ms 后握手成功，开始定时推送
    this._retryTimer = setTimeout(() => {
      this._setStatus(SOCKET_STATUS.OPEN)
      this.dispatchEvent(new Event('open'))
      // "服务器"每 intervalMs 推一轮行情，价格围绕基准值随机游走
      this._pushTimer = setInterval(() => this._pushOnce(), this.intervalMs)
    }, 120)
  }

  // 手动关闭：设分流开关 → 永不自动重连；这是与"意外断线"的本质区别
  close() {
    this._manuallyClosed = true
    this._clearTimers()
    this._teardown(SOCKET_STATUS.CLOSED)
  }

  // 断线模拟开关（教学用）：真实世界里的"WiFi 断了"——
  // 不设 manuallyClosed，所以 close 事件之后进入重连状态机
  simulateDrop() {
    if (this.status !== SOCKET_STATUS.OPEN) return
    this._clearTimers()
    this._teardown(SOCKET_STATUS.RECONNECTING)
    this._scheduleReconnect()
  }

  // 指数退避：延迟 = BASE * 2^已试次数（800 → 1600 → 3200ms）。
  // 铁律：服务器挂了别用固定间隔猛敲（雪崩式重试），退避是自保也是礼貌
  _scheduleReconnect() {
    if (this._retries >= MAX_RETRIES) {
      // 重试用尽：彻底放弃，回到 closed，UI 上显示"已断开"
      this._teardown(SOCKET_STATUS.CLOSED)
      return
    }
    const delay = BASE_RETRY_DELAY * 2 ** this._retries
    this._retries += 1
    // 重试计数变了也要广播：徽章上的"第 N/3 次"才能实时走到位
    this.dispatchEvent(new Event('statuschange'))
    this._retryTimer = setTimeout(() => {
      this._setStatus(SOCKET_STATUS.CONNECTING)
      // 重连成功与否"掷骰子"：70% 成功回到 open，30% 再次失败继续退避
      if (Math.random() < 0.7) {
        this._retries = 0
        this._setStatus(SOCKET_STATUS.OPEN)
        this.dispatchEvent(new Event('open'))
        this._pushTimer = setInterval(() => this._pushOnce(), this.intervalMs)
      } else {
        this._setStatus(SOCKET_STATUS.RECONNECTING)
        this._scheduleReconnect()
      }
    }, delay)
  }

  // 推一条行情消息：模拟服务器 → 客户端的单向数据流
  _pushOnce() {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    // prices 由 store 维护基准价，这里随机 ±0.8% 浮动
    const payload = { symbol, drift: (Math.random() - 0.5) * 0.016, ts: Date.now() }
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }))
  }

  // 统一的状态更新口：任何状态变化都广播 statuschange 事件，
  // 外部 store 只需订阅这一种事件就能拿到全部状态流转
  _setStatus(status) {
    if (this.status === status) return
    this.status = status
    this.dispatchEvent(new Event('statuschange'))
  }

  // 关闭的"清理半场"：只停数据流和重连，不清 on* 回调——
  // 因为清理订阅是使用方（React 组件）的职责，socket 不越权（呼应第 2 课）
  _teardown(status) {
    this._setStatus(status)
    this.dispatchEvent(new Event('close'))
  }

  _clearTimers() {
    clearInterval(this._pushTimer)
    clearTimeout(this._retryTimer)
    this._pushTimer = null
    this._retryTimer = null
  }
}
