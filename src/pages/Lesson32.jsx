// 第 32 课页面 · 虚拟列表
//
// 本文件教什么：
//   1. 纯编排页（第 22 课模式）：页面零 state，只决定摆什么、按什么顺序；
//   2. 「对照教学」的版面：左边裸渲染 10 万行（会卡），右边虚拟化（丝滑），
//      两块并排 + 各自显示「实际渲染 DOM 行数」——差距自己会说话；
//   3. windowing 原理示意卡：用纯 CSS 画一条「数据带」和一个「滚动窗口」，
//      直观表达「DOM 只存在窗口里的那几行」。
import RawList from '../components/lesson32/RawList.jsx'
import VirtualList from '../components/lesson32/VirtualList.jsx'
import DynamicHeightList from '../components/lesson32/DynamicHeightList.jsx'
import './lesson32.css'

// 窗口里「真实渲染」的行的 top 值：示意用，真实值由 useVirtualizer 计算
const DIAGRAM_ROWS = [2, 18, 34, 50]

function WindowingDiagram() {
  return (
    <div className="card">
      <h2>windowing（窗口化）原理示意</h2>
      <p>
        虚拟列表的公式：起始行 = 滚动距离 ÷ 行高（向下取整）；渲染行数 = 容器高 ÷ 行高 + 2 × overscan。
        滚动条长度由「撑高占位层」伪造（总高 = 行数 × 行高），滚动事件只更新窗口位置——
        <strong>数据有多少行不重要，DOM 里永远只有窗口里的那几十行</strong>。
      </p>
      <div className="l32-diagram" aria-hidden="true">
        {/* 条纹数据带 = 100,000 行的抽象；只有绿色实心条对应的行真的在 DOM 里 */}
        <div className="l32-diagram-track">
          <div className="l32-diagram-window">
            {DIAGRAM_ROWS.map((top) => (
              <div key={top} className="l32-diagram-row" style={{ top }} />
            ))}
          </div>
        </div>
        <div className="l32-diagram-caption">
          <span>↑ 条纹：10 万行数据（不进 DOM）</span>
          <span>绿色实心条：真实渲染的行（≈ 视区 + overscan）</span>
        </div>
      </div>
    </div>
  )
}

export default function Lesson32() {
  return (
    <div className="page">
      <header>
        <h1>第 32 课 · 虚拟列表</h1>
        <p>
          数据可以很大，DOM 必须很小。本课用 100,000 行数据做对照实验：
          左边直接渲染（感受卡顿），右边用 @tanstack/react-virtual 只渲染可视区 ± overscan 的行（丝滑滚动）。
          打开 DevTools 的 Elements 面板搜 <code>l32-item-virtual</code>，亲眼数一数虚拟版到底渲染了几行。
        </p>
      </header>

      <WindowingDiagram />

      {/* 两列对照：裸版 vs 虚拟版。「实际渲染 DOM 行数」大数字是本课的核心读数 */}
      <div className="l32-grid">
        <RawList />
        <VirtualList />
      </div>

      {/* 进阶：行高不固定时，用 measureElement 先猜后测 */}
      <DynamicHeightList />

      <div className="card">
        <h2>什么时候<b>不需要</b>虚拟列表？</h2>
        <p>
          少于几百行直接渲染就好——几百个 DOM 节点对现代浏览器毫无压力，
          虚拟化反而带来测量成本、滚动条跳动、可访问性复杂化（读屏器看不到视区外的行）。
          虚拟列表治的是「上万行」级别的病；小列表上用它属于表演式优化（回扣第 20 课的 useMemo 观）。
        </p>
        <p>
          和第 14 课 Transition 的关系：两者都治卡，但病灶不同——
          <strong>虚拟化治 DOM 数量</strong>（布局/绘制的规模），<strong>Transition 治主线程阻塞</strong>
          （大更新把一帧拉得过长）。列表卡多半先看行数，交互卡才看计算量；重列表 + 重交互两者一起上。
        </p>
        <p>
          库选型一句话：<strong>@tanstack/react-virtual</strong>（headless、框架无关、动态行高支持最好，本课用它）；
          <strong>react-window</strong> 轻量老牌、API 简单但动态行高要额外配方；
          <strong>virtua</strong> 更新、零配置、按需测量，新项目值得一试。选哪个都行，核心原理本课已经拆开讲透了。
        </p>
      </div>
    </div>
  )
}
