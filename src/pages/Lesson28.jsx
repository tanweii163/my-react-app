// 第 28 课页面 · 实时数据与 useSyncExternalStore
//
// 本文件教什么：
// 1. 页面是纯编排（呼应第 22 课）：自己不持有 state，两块内容
//    （新版接入 / 对照版接入）各成组件，让"两种接法"同屏对照；
// 2. 教学主线：外部世界（WebSocket、第三方 store）在 React 之外持续变化，
//    正确的接缝是"订阅 + 外部 store + useSyncExternalStore"，
//    而生命周期清理（退订、断连、停定时器）是这条接缝的地基——呼应第 2 课。
import PriceTicker from '../components/lesson28/PriceTicker.jsx'
import LiveLog from '../components/lesson28/LiveLog.jsx'
import './lesson28.css'

function Lesson28() {
  return (
    <div className="page">
      <header>
        <h1>第 28 课：实时数据与 useSyncExternalStore</h1>
        <p>
          WebSocket 这类"外部世界"不受 React 管：它在渲染之外持续推送数据。
          这一课学的是把外部数据接进 React 的正确接缝——外部 store 三件套
          （subscribe / getSnapshot / getServerSnapshot），以及退订清理
          （第 2 课的原则在模块层的重演）。讲义见 <code>doc/lesson-28.md</code>。
        </p>
      </header>

      {/* 同屏对照：左边是官方推荐接法，右边是 useState+useEffect 老写法 */}
      <PriceTicker />
      <LiveLog />
    </div>
  )
}

export default Lesson28
