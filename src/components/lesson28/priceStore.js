// priceStore · 外部 store 模式：把 socket 流接进 React 的"正确接缝"
//
// 本文件教什么：
// 1. useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) 三件套要求
//    一个"React 之外的数据源"。本文件就是这个数据源：一个普通对象 +
//    subscribe（订阅变化）+ getSnapshot（取当前快照）；
// 2. 铁律：getSnapshot 必须返回稳定引用。下面的 _publish 只在数据真正变化时
//    才创建新快照对象——如果 getSnapshot 每次调用都返回新对象（比如
//    `return { ...this._data }`），React 每次渲染都会发现"快照变了"，
//    于是再渲染、再发现变了……无限循环直接卡死页面；
// 3. 单例 socket + 引用计数订阅：多个组件共用同一条连接，
//    第一个订阅者触发 connect，最后一个退订时清理连接——
//    "谁也不用了就撤掉副作用"是第 2 课清理原则在模块层的重演。
import { MockSocket, MAX_RETRIES } from './mockSocket.js'

// 股票基准价：socket 每推一条消息，就围绕基准价随机游走一步
const BASE_PRICES = { AAPL: 189.5, GOOG: 141.2, TSLA: 248.7 }

class PriceStore {
  constructor() {
    // 全项目唯一的 socket 实例：连接是昂贵资源（网络 + 定时器），绝不每组件开一条
    this._socket = new MockSocket({ intervalMs: 1000 })
    this._listeners = new Set()
    this._prices = { ...BASE_PRICES }
    // 快照缓存：getSnapshot 永远返回这个引用；数据变了才整体换新（见文件头第 2 点）
    this._snapshot = { prices: this._prices, status: 'closed', attempt: 0, updates: 0 }
    this._updates = 0 // 收到的消息总数（教学指标：对照 LiveLog 数重渲染）
    this._seq = 0 // 日志行序号：map 的 key 不能用数组下标（增删会错位复用）
    this._connected = false // 本模块是否已经让 socket 连上

    this._socket.onmessage = (event) => {
      const { symbol, drift } = JSON.parse(event.data)
      const next = this._prices[symbol] * (1 + drift)
      // 不可变更新（呼应第 8 课）：换新对象，旧快照原封不动留给还在读它的人
      this._prices = { ...this._prices, [symbol]: Number(next.toFixed(2)) }
      this._updates += 1
      this._publish()
    }
    // 状态流转（connecting/open/reconnecting/closed）也属于快照的一部分：
    // 徽章、重试次数都从这里读，UI 永远只有一个数据源
    this._socket.onstatuschange = () => this._publish()
  }

  // ---------- useSyncExternalStore 三件套 ----------

  // subscribe：React 用它"挂上耳朵"。约定：返回的函数是退订函数，
  // React 在清理副作用时调用它（第 2 课的 cleanup，在这里兑现）
  subscribe = (listener) => {
    // 首个订阅者出现才真正连网：没有读者的连接是纯浪费
    if (!this._connected) {
      this._connected = true
      this._socket.connect()
    }
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
      // 最后一个听众走了：断开连接、停掉所有定时器——外部资源不泄漏
      if (this._listeners.size === 0) {
        this._connected = false
        this._socket.close()
      }
    }
  }

  // getSnapshot：必须"数据没变就返回同一引用"（本类靠 _publish 保证）
  getSnapshot = () => this._snapshot

  // getServerSnapshot：服务端渲染/水合时用的快照。这里没有 SSR，
  // 但 API 要求存在时必须提供——返回一个静态初始快照即可。
  // 若省略它而在服务端渲染本组件，React 会直接报错提醒你补上
  getServerSnapshot = () => ({
    prices: BASE_PRICES,
    status: 'closed',
    attempt: 0,
    updates: 0,
  })

  // 给对照版 LiveLog 用：直接订阅 socket 的原始 message 事件（不走快照），
  // 演示"老写法"的订阅窗口。同样返回退订函数，且不影响 useSyncExternalStore
  // 那条订阅——单例 socket 天然支持多路监听
  logSubscribe = (onLine) => {
    // 不在这里 connect：连接的启停统一由 subscribe() 的引用计数管（单一入口），
    // 本页面两个组件同屏，PriceTicker 挂载时连接早已建立
    const handler = (event) => {
      const { symbol, ts } = JSON.parse(event.data)
      onLine({
        id: ++this._seq,
        time: new Date(ts).toLocaleTimeString('zh-CN', { hour12: false }),
        text: `${symbol} 推送到达（消息级订阅，非快照）`,
      })
    }
    this._socket.addEventListener('message', handler)
    return () => this._socket.removeEventListener('message', handler)
  }

  // ---------- UI 需要的命令（手动断开 / 重连） ----------

  manualClose = () => this._socket.close()
  manualOpen = () => this._socket.connect()
  // 教学开关：模拟"WiFi 断了"，触发重连状态机（指数退避，最多 MAX_RETRIES 次）
  simulateDrop = () => this._socket.simulateDrop()
  // 重新掷骰子用：把重试计数清零，方便课堂里反复演示断线
  get maxRetries() {
    return MAX_RETRIES
  }

  // ---------- 内部：唯一的"发布"通道 ----------

  // 任何数据/状态变化都走这里：换新快照引用（一次性、批量）→ 通知所有听众。
  // React 收到通知后会调 getSnapshot 对比引用，引用不同才重渲染——
  // 所以"先换引用再通知"的顺序保证了不会通知落空
  _publish() {
    this._snapshot = {
      prices: this._prices,
      status: this._socket.status,
      attempt: this._socket._retries,
      updates: this._updates,
    }
    for (const listener of this._listeners) listener()
  }
}

// 模块级单例：import 到处拿到的是同一个 store——
// PriceTicker 和 LiveLog 因此能看到同一条流、同一份计数
const priceStore = new PriceStore()
export default priceStore
