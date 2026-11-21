// 第 30 课 · 告警 widget：看板的"人来决策"面——告警要有人确认
//
// 本文件教什么：
//   1. 监控台的两类数据要分开理解：价格/日志是机器自动推、看一眼就行的"流"；
//      告警是需要人拍板的"待办"——所以它不自动消失，ack（确认）按钮是本组件的交互核心。
//      监控界面做得再花，本质是人机协作：机器发现问题，人承认并处理问题；
//   2. 外部 store 上的 immutable 更新实练：ackAlert 在 store 里 map 造新数组 +
//      展开造新条目。外部 store 比 setState 更严格地依赖引用变化——
//      原地 alert.acked = true 这种写法，订阅方（Object.is 比较）根本看不见；
//   3. 未确认数是派生值：渲染时 filter 现算，绝不往 state 里再存一份"数量"——
//      两份真相迟早打架（第 20 课铁律的最后一次强调）。
import { telemetryStore, useAlerts } from '../telemetryStore.js'
import { CrashSwitch } from '../ErrorBoundary.jsx'

const fmtTime = (ts) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })

function AlertWidget() {
  const alerts = useAlerts()
  // 派生值现算：未确认 = 从全量里 filter 出来的视图，不是第五个 state 字段
  const unacked = alerts.filter((a) => !a.acked)

  return (
    <section className="card l30-widget" aria-label="告警列表">
      <div className="l30-widget-head">
        <h2>
          🚨 告警
          {unacked.length > 0 && `（未确认 ${unacked.length}）`}
        </h2>
        <CrashSwitch label="告警组件" />
      </div>
      <p className="hint">告警不会自动消失：点「确认」标记已处理。列表最新在前，确认过的会留下记录但淡出视觉焦点。</p>

      {alerts.length === 0 ? (
        // 空态文案要回答新手的第一反应："是坏了，还是真没事？"——顺手指向状态条
        <p className="hint">暂无告警——系统健康（或者连接还没就绪，看顶部状态条）。</p>
      ) : (
        <ul className="l30-alert-list">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`l30-alert l30-alert-${alert.severity} ${alert.acked ? 'l30-alert-acked' : ''}`}
            >
              <div className="l30-alert-body">
                {/* severity 翻译成中文词：读屏器和快速扫读都吃"严重/警告"，不啃英文枚举 */}
                <span className="l30-alert-sev">{alert.severity === 'critical' ? '严重' : '警告'}</span>
                {/* 第 27 课回扣同日志：推送来的 message 只当文本渲染，永不经手 innerHTML */}
                <span className="l30-alert-msg">{alert.message}</span>
                <span className="l30-alert-time">{fmtTime(alert.ts)}</span>
              </div>
              {alert.acked ? (
                <span className="l30-ack-done" aria-label="已确认">
                  ✓ 已确认
                </span>
              ) : (
                // 每条告警一个独立按钮：目标够大、语义直白——比"整行可点"对键盘和读屏用户都友好
                <button
                  type="button"
                  className="l30-ack-btn"
                  onClick={() => telemetryStore.ackAlert(alert.id)}
                >
                  确认
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AlertWidget
