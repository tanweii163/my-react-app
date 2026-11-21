// 第 30 课页面 · 结业实战：迷你监控台
//
// 本文件教什么：
//   1. 纯编排页的最后一次示范（第 22 / 25 课回扣）：页面自身零 state，
//      内容拆成"结业致辞 → 看板 → 回扣表卡"三段，各自独立成组件——
//      页面只决定"摆什么、按什么顺序"；
//   2. 结业致辞呼应第 25 课：毕业致辞说"去构建"——本课就是那句话的第一次兑现。
//      监控台是很多前端工程师的第一个"真产品形状"的工具：
//      接实时数据（28 课）、崩了不倒（13 课）、键盘读屏都能用（26 课）、
//      推送内容防注入（27 课）、出事先自己看见（29 课）；
//   3. 「本项目用到的课次回扣表」渲染成卡片：结业的最后一页应该是一张地图——
//      看板上每个功能指回产出它的那节课、那个概念、那个文件。
import Dashboard from '../components/lesson30/Dashboard.jsx'
import './lesson30.css'

// 回扣表数据：功能 ↔ 课次 ↔ 概念 ↔ 文件。
// 数据和 JSX 分离：以后想增删卡片，只动这张表，模板不用碰（第 20 课"数据驱动 UI"的老原则）。
const RECAP = [
  {
    feature: '实时推送与断线重连状态机',
    lesson: 28,
    title: '实时数据与 useSyncExternalStore',
    concept: '外部 store · 观察者订阅 · 传输层与 React 解耦',
    file: 'src/components/lesson30/mockSocket.js',
  },
  {
    feature: '稳定快照与有界缓冲',
    lesson: 28,
    title: '实时数据与 useSyncExternalStore',
    concept: 'getSnapshot 稳定引用 · 顶层不可变替换 · 日志封顶 50 条',
    file: 'src/components/lesson30/telemetryStore.js',
  },
  {
    feature: '重连状态主动播报',
    lesson: 26,
    title: '可访问性 (a11y)',
    concept: 'role="status"（隐含 aria-live polite）· 播报不抢焦点',
    file: 'src/components/lesson30/Dashboard.jsx',
  },
  {
    feature: '读屏友好的日志流',
    lesson: 26,
    title: '可访问性 (a11y)',
    concept: 'role="log" + aria-relevant="additions" · 可滚动区加 tabIndex',
    file: 'src/components/lesson30/widgets/LogWidget.jsx',
  },
  {
    feature: '全程键盘可操作',
    lesson: 26,
    title: '可访问性 (a11y)',
    concept: '原生 button/checkbox · Tab 按 DOM 顺序 · Enter/Space 触发',
    file: 'src/components/lesson30/Dashboard.jsx',
  },
  {
    feature: '推送文本只当文本渲染',
    lesson: 27,
    title: '前端安全',
    concept: '远端推送是不可信输入 · 永不用 dangerouslySetInnerHTML',
    file: 'src/components/lesson30/widgets/LogWidget.jsx',
  },
  {
    feature: '单 widget 崩溃不影响其他',
    lesson: 13,
    title: '错误边界',
    concept: 'getDerivedStateFromError 切降级 UI · 每个 widget 独立包裹',
    file: 'src/components/lesson30/ErrorBoundary.jsx',
  },
  {
    feature: '崩溃上报与定位',
    lesson: 29,
    title: '调试方法论与 DevTools',
    concept: 'componentDidCatch 副作用上报 · info.componentStack 定位爆炸面',
    file: 'src/components/lesson30/ErrorBoundary.jsx',
  },
  {
    feature: '挂载即连、卸载即断',
    lesson: 2,
    title: 'useEffect 与副作用',
    concept: 'effect 返回清理函数 · 刷新无残留定时器与报错',
    file: 'src/components/lesson30/Dashboard.jsx',
  },
  {
    feature: '告警确认的不可变更新',
    lesson: 1,
    title: 'JSX、Props、State',
    concept: 'map 造新数组 + 展开造新条目 · 原地修改引用不变等于隐形',
    file: 'src/components/lesson30/telemetryStore.js',
  },
  {
    feature: '页面纯编排',
    lesson: 22,
    title: '组件设计模式',
    concept: '容器/展示：页面零 state，只决定摆什么、按什么顺序',
    file: 'src/pages/Lesson30.jsx',
  },
]

function Lesson30() {
  return (
    <div className="page">
      <header>
        <h1>第 30 课：结业实战 —— 迷你监控台</h1>
        <p>
          结业课没有新 API。用第 28 课的模式架实时数据源，给每块 widget 独立包上第 13 课的错误边界，
          装上第 26 课的播报系统，守住第 27 课的安全底线——产出是一个会跳、会断、会恢复的监控台。
          讲义见 <code>doc/lesson-30.md</code>。
        </p>

        {/* 结业致辞：呼应第 25 课的毕业致辞——那次说"去构建"，这次交作业 */}
        <div className="l30-address">
          <strong>结业致辞</strong>
          <p>
            第 25 课的毕业致辞说：毕业不是终点，去构建。这一页就是那句话的第一次兑现。
            监控台是很多前端工程师的第一个"真产品形状"的工具：它接实时数据（28 课），
            崩一块不倒整墙（13 课），键盘和读屏用户都能完整操作（26 课），
            对推送内容守住注入防线（27 课），出事先于用户看见（29 课）。
            现在，把"模拟断线"勾上，看状态流转；点"模拟崩溃"，看隔离生效——
            故意弄坏它，再看着它恢复。然后翻到页面底部的回扣表：每一张卡，都是你已经修过的一门课。
          </p>
        </div>
      </header>

      {/* 看板本体：连接生命周期、状态条、widget 网格、键盘说明全在 Dashboard 里 */}
      <Dashboard />

      {/* 回扣表：结业复习的入口——盖住右边两列，看还能不能讲出左边 */}
      <section className="card l30-recap" aria-label="本项目用到的课次回扣表">
        <h2>🗺️ 本项目用到的课次回扣表</h2>
        <p className="hint">
          看板的每个功能，指回产出它的课次、承载它的概念、落在哪个文件。结业自测：盖住「概念」「文件」两列，看功能还能不能讲出概念。
        </p>
        <ul className="l30-recap-grid">
          {RECAP.map((item) => (
            <li key={`${item.lesson}-${item.feature}`} className="l30-recap-card">
              <span className="l30-recap-lesson">
                第 {item.lesson} 课 · {item.title}
              </span>
              <strong className="l30-recap-feature">{item.feature}</strong>
              <span className="l30-recap-concept">{item.concept}</span>
              <code className="l30-recap-file">{item.file}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default Lesson30
