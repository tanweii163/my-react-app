// PriceTicker · useSyncExternalStore 的标准接入示范
//
// 本文件教什么：
// 1. useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) 三步接线：
//    subscribe 挂耳朵（返回退订函数）、getSnapshot 取快照（引用必须稳定，
//    见 priceStore.js 的注释）、getServerSnapshot 服务端兜底；
// 2. 为什么不用 useEffect + setState？外部数据在"渲染之外"持续变化，
//    useEffect 只在"挂载/依赖变化"时跑，订阅窗口和渲染时序对不齐，
//    React 18 并发渲染下可能出现 tearing（不同组件读到不同版本快照）——
//    useSyncExternalStore 是 React 官方给这条接缝的专用接口，
//    它保证渲染过程中读到的快照永远一致；
// 3. 连接状态徽章：状态机四态（连接中/已连接/重连中/已断开），
//    数据来自同一个快照——不另开 state 存"状态"（单一数据源，第 20 课铁律）。
import { useSyncExternalStore } from 'react'
import priceStore from './priceStore.js'
import { MAX_RETRIES } from './mockSocket.js'

// 状态 → 徽章文案与配色：映射表写在外面，组件体内只剩纯渲染（渲染必须纯）
const STATUS_META = {
  connecting: { label: '连接中', cls: 'l28-badge-connecting' },
  open: { label: '已连接', cls: 'l28-badge-open' },
  reconnecting: { label: '重连中', cls: 'l28-badge-reconnecting' },
  closed: { label: '已断开', cls: 'l28-badge-closed' },
}

function PriceTicker() {
  // 三件套接线：subscribe/getSnapshot 都来自 priceStore（箭头函数保住了 this）
  const snapshot = useSyncExternalStore(
    priceStore.subscribe,
    priceStore.getSnapshot,
    priceStore.getServerSnapshot,
  )
  const { prices, status, attempt, updates } = snapshot
  const meta = STATUS_META[status]

  return (
    <div className="card">
      <h2>实时行情 · useSyncExternalStore 接入</h2>
      <p className="hint">
        价格由 MockSocket 每 1 秒推送，写入外部 store；本组件只是"读快照"——
        store 引用变了 React 才重渲染，这就是外部世界的正确接法。
      </p>

      {/* 连接状态徽章：四态来自快照里的 status，不另存 state */}
      <div className="row l28-status-row">
        <span className={`l28-badge ${meta.cls}`} role="status">
          {meta.label}
          {/* 重连中时展示"第几次重试/上限"，让指数退避肉眼可见 */}
          {status === 'reconnecting' && `（第 ${attempt}/${MAX_RETRIES} 次重试）`}
        </span>
        <span className="hint">累计收到 {updates} 条推送</span>
      </div>

      {/* 价格面板：直接从快照读，socket 推一条、快照换一次引用、这里跳一次 */}
      <ul className="l28-price-list">
        {Object.entries(prices).map(([symbol, price]) => (
          <li key={symbol} className="l28-price-item">
            <span className="l28-symbol">{symbol}</span>
            <span className="big-number">${price.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {/* 手动控制：断开走 socket.close()（永不自动重连），
          重连走 connect()（重试计数清零）；两个命令都是 store 的方法，
          组件不直接碰 socket——接缝只有一个（store） */}
      <div className="row">
        <button type="button" onClick={priceStore.manualOpen} disabled={status !== 'closed'}>
          手动重连
        </button>
        <button type="button" onClick={priceStore.manualClose} disabled={status === 'closed'}>
          手动断开
        </button>
        <button type="button" onClick={priceStore.simulateDrop} disabled={status !== 'open'}>
          模拟断线（触发重连）
        </button>
      </div>
      <p className="hint">
        试试"模拟断线"：状态徽章会走 已连接 → 重连中（退避 800 → 1600 → 3200ms）→
        已连接 或 重试用尽后 已断开。手动断开则直接到"已断开"，点"手动重连"复活。
      </p>
    </div>
  )
}

export default PriceTicker
