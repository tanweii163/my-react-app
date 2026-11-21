// 第 30 课 · 结业实战：迷你监控台 —— telemetryStore：看板的唯一数据源
//
// 本文件教什么：
//   1. 第 28 课的 useSyncExternalStore 三件套在"全家福"里的用法：
//      store 是一个模块级普通对象——state + subscribe + actions，加一组订阅 hook；
//   2. 核心铁律——getSnapshot 必须返回「稳定引用」：
//      state 变化时整体不可变替换（新顶层对象），没变化时永远返回同一个引用。
//      React 用 Object.is 比较快照：引用相同 → 跳过重渲染；
//      每次都返回新对象 → React 判定"快照一直在变" → 无限重渲染（开发模式直接警告）；
//   3. store 是唯一"两头都懂"的层：一头接 MockSocket（传输层），一头供组件订阅。
//      组件永远不直接摸 socket——哪天把 MockSocket 换成真 WebSocket，
//      下面所有 widget 一行都不用改，这就是分层的价值。
//
// 对照记忆：第 18 课的 zustand 也是"外部 store"——create() 只是把这个
// subscribe / getState / actions 三件套替你封装好了。本文件就是它的手搓版：
// 手搓过一遍，才知道状态库到底帮你省了什么。

import { useSyncExternalStore } from 'react'
import { MockSocket } from './mockSocket.js'

// 日志缓冲区上限：实时流的第一原则是"有界"。不封顶，内存和渲染迟早一起爆炸
const MAX_LOGS = 50

// 顶层形状：connection / prices / logs / alerts——四个"整体替换"的字段。
// 易错点：别往 state 里塞派生值（未确认告警数、最新一条日志）——
// 两份真相迟早打架（第 20 课铁律），它们在渲染时从这里的字段现算。
let state = {
  connection: { status: 'closed', attempt: 0, nextDelayMs: null, offline: false },
  prices: {}, // symbol → { price, prev, dir, ts }
  logs: [], // 最新在前，最多 MAX_LOGS 条
  alerts: [], // 最新在前；条目带 acked（确认标记）
}

const listeners = new Set()

function setState(patch) {
  // 新顶层对象 = 稳定引用的前半句：变了才换引用，一个字段变就换整个顶层。
  // 粒度粗了点（prices 跳动时 logs 的订阅者也会被通知），但各 hook 的选择器
  // 返回的是各自字段的引用，Object.is 一比，无关的 widget 照样不重渲染。
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

const socket = new MockSocket()

// —— 传输层推送 → state 映射：store 是唯一理解两边形状的地方 ——
socket.onEvent((event) => {
  if (event.type === 'price') {
    const prevEntry = state.prices[event.symbol]
    const prev = prevEntry ? prevEntry.price : event.price
    setState({
      prices: {
        ...state.prices,
        // dir: 1 涨 / -1 跌 / 0 平——数据层只存事实，箭头和颜色是渲染层的表达
        [event.symbol]: {
          price: event.price,
          prev,
          dir: Math.sign(event.price - prev),
          ts: event.ts,
        },
      },
    })
  } else if (event.type === 'log') {
    // 新的放最前 + slice 封顶：这就是"缓冲区"的形状
    setState({ logs: [event, ...state.logs].slice(0, MAX_LOGS) })
  } else if (event.type === 'alert') {
    // 告警不设上限也不自动消失：它是待办事项，由人确认（AlertWidget 的 ack）
    setState({ alerts: [{ ...event, acked: false }, ...state.alerts] })
  }
})

socket.onStatus((status, meta) => {
  setState({ connection: { status, ...meta } })
})

export const telemetryStore = {
  // —— React 绑定两件套：useSyncExternalStore 的第一、第二个参数就吃这个形状 ——
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getState() {
    return state // 返回模块级引用本身——这是"稳定快照"的基石，绝不能在这里现场造对象
  },

  // —— 连接类 action：纯转发。store 不复制 socket 的状态机，只做门面 ——
  connect: () => socket.connect(),
  disconnect: () => socket.disconnect(),
  simulateDrop: () => socket.simulateDrop(),
  restore: () => socket.restore(),

  // 确认一条告警：immutable 更新"数组里改一条"的标准姿势——
  // map 造新数组 + 展开造新条目，原地 push / 改属性对外部 store 是隐形操作（引用没变）
  ackAlert(id) {
    setState({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, acked: true } : a)),
    })
  },

  // 清屏（保留连接）：prices/logs/alerts 一起清空，connection 不动
  resetData() {
    setState({ prices: {}, logs: [], alerts: [] })
  },
}

// —— 订阅 hook：每个 widget 只挑自己那一块 ——
// 铁律：选择器必须返回 state 里的「字段引用或原始值」。
// 写成 () => ({ status: s.status, ... }) 这种现场打包的新对象，等于亲手杀死稳定快照。
export function useConnection() {
  return useSyncExternalStore(telemetryStore.subscribe, () => state.connection)
}

export function usePrices() {
  return useSyncExternalStore(telemetryStore.subscribe, () => state.prices)
}

export function useLogs() {
  return useSyncExternalStore(telemetryStore.subscribe, () => state.logs)
}

export function useAlerts() {
  return useSyncExternalStore(telemetryStore.subscribe, () => state.alerts)
}
