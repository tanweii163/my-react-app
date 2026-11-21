// 第 30 课 · 日志 widget：aria-live 日志流
//
// 本文件教什么：
//   1. 有界缓冲区的消费端：store 只保留最新 50 条（新的在前）——
//      实时流的展示端同理"只关心最近发生了什么"，历史归日志系统管，不归界面管；
//   2. 第 26 课回扣——aria-live 三件套怎么配：
//      - role="log"：语义上声明"这是日志"，部分读屏器对它有默认的 live 区行为；
//      - aria-live="polite"：内容自己会更新，请读屏器在当前内容读完后再播报，绝不打断；
//      - aria-relevant="additions" + aria-atomic="false"：只播报"新增的条目"、不重读整块——
//        不写的话，有些读屏器会把 50 条日志整段重读一遍，对用户是灾难；
//   3. 第 26 课铁律：live 区只播报、不抢焦点。这块列表没有任何可聚焦元素，
//      内容每 3 秒自增，用户焦点纹丝不动——正在打字/浏览的人不被打断。
import { useLogs } from '../telemetryStore.js'
import { CrashSwitch } from '../ErrorBoundary.jsx'

const LEVEL_LABEL = { info: '信息', warn: '警告', error: '错误' }
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })

function LogWidget() {
  const logs = useLogs()

  return (
    <section className="card l30-widget" aria-label="日志流">
      <div className="l30-widget-head">
        <h2>📜 日志流</h2>
        <CrashSwitch label="日志组件" />
      </div>
      <p className="hint">缓冲区上限 50 条（最新在前）。它是 polite 的 live 区：新日志自动播报，不打断、不抢焦点。</p>

      {/* tabIndex={0}：这是可滚动的长区域。第 26 课补课——可滚动区域键盘用户也够得着
          （WCAG 2.1 的 focusable scroll regions），聚焦后用方向键即可滚动 */}
      <div
        className="l30-log-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-atomic="false"
        aria-label="日志流（可滚动）"
        tabIndex={0}
      >
        {logs.length === 0 ? (
          <p className="l30-log-empty">还没有日志——连接建立后每 3 秒会自动出现一条。</p>
        ) : (
          <ul>
            {logs.map((log) => (
              <li key={log.id} className={`l30-log l30-log-${log.level}`}>
                <span className="l30-log-time">{fmtTime(log.ts)}</span>
                <span className="l30-log-level">{LEVEL_LABEL[log.level]}</span>
                {/* 第 27 课回扣：日志文本一律当纯字符串渲染。就算哪天日志里混进了
                    <script>，它也只是文本，绝不可能执行——永远不用 dangerouslySetInnerHTML */}
                <span className="l30-log-text">{log.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default LogWidget
