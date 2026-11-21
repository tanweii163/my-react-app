// 第 30 课 · 看板编排层：状态条 + widget 网格 + 键盘可达性说明
//
// 本文件教什么：
//   1. 容器组件的本分（第 22 课回扣）：Dashboard 自己不渲染业务数据，只干三件事——
//      管连接生命周期、摆三块 widget、提供全局控制（连接开关 / 断线模拟 / 清屏）；
//   2. 第 2 课铁律的最终形态：挂载时 connect()，同一个 effect 里 return 一个
//      断开连接的清理函数。路由切走、页面刷新都会走 cleanup——
//      没有残留的定时器，也就没有"刷新之后还在报错"这种事；
//   3. 第 26 课回扣：
//      - 状态条是 role="status"（隐含 aria-live="polite"）：重连状态变化会主动播报，
//        用户不需要盯着屏幕才能发现"网断了"；
//      - 全部控件都是原生 button / checkbox：Tab 按 DOM 顺序流动，Enter/Space 全部可触发；
//      - 禁用要诚实：断开状态下"模拟断线"没有意义，disabled 而不是假装可用。
import { useEffect } from 'react'
import { telemetryStore, useConnection } from './telemetryStore.js'
import PriceWidget from './widgets/PriceWidget.jsx'
import LogWidget from './widgets/LogWidget.jsx'
import AlertWidget from './widgets/AlertWidget.jsx'
import WidgetErrorBoundary from './ErrorBoundary.jsx'

// 状态 → 文案：查表而不是 if 链——新增状态只改一张表
const STATUS_TEXT = {
  open: '已连接 · 实时推送中',
  connecting: '连接中…',
  reconnecting: '连接断开，正在重连',
  closed: '未连接',
}

const STATUS_CLASS = {
  open: 'l30-dot-open',
  connecting: 'l30-dot-connecting',
  reconnecting: 'l30-dot-reconnecting',
  closed: 'l30-dot-closed',
}

// 全局连接状态条：整个看板的"生命体征"区
function StatusBar() {
  const conn = useConnection()
  const reconnecting = conn.status === 'reconnecting'

  return (
    <div className="l30-statusbar">
      {/* role="status"：隐含 aria-live="polite"。状态流转（断线/重连/恢复）无需用户盯着，读屏器会播 */}
      <p className="l30-status-text" role="status">
        {/* 状态点是纯装饰，aria-hidden 掉，语义交给文字 */}
        <span className={`l30-dot ${STATUS_CLASS[conn.status]}`} aria-hidden="true" />
        {STATUS_TEXT[conn.status]}
        {reconnecting && conn.nextDelayMs != null && (
          <span className="l30-retry-meta">
            （第 {conn.attempt} 次重试 · 约 {((conn.nextDelayMs ?? 0) / 1000).toFixed(1)} 秒后）
          </span>
        )}
        {conn.offline && <span className="l30-offline-flag"> · 断线模拟已开启</span>}
      </p>

      <div className="l30-status-actions">
        {conn.status === 'closed' ? (
          <button type="button" onClick={() => telemetryStore.connect()}>
            连接
          </button>
        ) : (
          <button type="button" onClick={() => telemetryStore.disconnect()}>
            断开
          </button>
        )}
        {/* checkbox 用 label 包住：点文字也能切换，这是第 26 课的点击面积习惯。
            断开时 disabled：没有连接可断，诚实禁用而不是摆一个不工作的开关 */}
        <label className="l30-drop-toggle">
          <input
            type="checkbox"
            checked={conn.offline}
            disabled={conn.status === 'closed'}
            onChange={(e) => (e.target.checked ? telemetryStore.simulateDrop() : telemetryStore.restore())}
          />
          模拟断线
        </label>
        <button type="button" onClick={() => telemetryStore.resetData()}>
          清屏
        </button>
      </div>
    </div>
  )
}

function Dashboard() {
  // 第 2 课铁律：effect 开了什么，cleanup 就关什么。
  // 连接活在 store/模块层，比组件活得久——所以卸载时必须显式断开，
  // 否则路由切走后心跳还在跑，控制台开始刷"卸载后更新"类警告。
  // 顺带解释刷新后为什么干干净净：刷新 = 全部卸载（cleanup 执行）→ 重新挂载（重新 connect）。
  useEffect(() => {
    telemetryStore.connect()
    return () => telemetryStore.disconnect()
  }, [])

  return (
    <section className="l30-dashboard" aria-label="迷你监控台">
      <StatusBar />

      {/* 每个 widget 独立包一层错误边界：一块崩了只降级一块（爆炸半径控制）。
          这是本课第一个要实测的点：点任意一张卡的"💥 模拟崩溃"，
          另外两张卡的数据应该照常跳动 */}
      <div className="l30-grid">
        <WidgetErrorBoundary label="价格组件">
          <PriceWidget />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary label="日志组件">
          <LogWidget />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary label="告警组件">
          <AlertWidget />
        </WidgetErrorBoundary>
      </div>

      {/* 键盘可达性说明：监控台是"挂在大屏上"的界面，但键盘用户同样要能完整操作 */}
      <div className="card l30-keyboard-note">
        <h2>⌨️ 键盘可达性说明</h2>
        <ul>
          <li>
            所有控件都是原生 <code>button</code> / <code>checkbox</code>：Tab 按 DOM 顺序流动
            （状态条三个控件 → 各卡的崩溃开关 → 告警的确认按钮 → 降级卡的重置按钮），
            Enter / Space 即可触发，没有任何自定义快捷键要背。
          </li>
          <li>
            实时区域（价格、日志）里没有可聚焦元素——内容每秒自更新，
            但焦点永远不会被抢走。这是第 26 课铁律：live 区只播报，不移动焦点。
          </li>
          <li>
            日志列表是长滚动区，加了 <code>tabIndex=0</code>：键盘用户能聚焦它并用方向键滚动——
            可滚动区域键盘也必须够得着。
          </li>
          <li>
            widget 崩溃后的降级卡带 <code>role="alert"</code>，出现即刻播报；
            「重置本组件」是普通按钮，Tab 可达、Space 可按——恢复路径同样全程键盘可达。
          </li>
        </ul>
      </div>
    </section>
  )
}

export default Dashboard
