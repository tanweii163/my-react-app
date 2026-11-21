// 第 29 课页面 · 调试方法论与 DevTools
//
// 本文件教什么：
// 1. 学完“写对”，最后一课教“错了怎么办”——本页是调试工具的三件套：
//    BugShowcase（三个经典 bug 的复现实验室）、ProfilerGuide（找“谁渲染慢”）、
//    MonitorConcepts（错误如何被看见与上报）；
// 2. 页面继续保持第 25 课以来的编排模式：自身零 state，
//    每块内容独立成组件，页面只决定摆什么、按什么顺序。
// 讲义见 doc/lesson-29.md：系统化排查流程、console 实用方法速查、
// React DevTools 组件树/props 检查都在讲义里展开。
import BugShowcase from '../components/lesson29/BugShowcase.jsx'
import ProfilerGuide from '../components/lesson29/ProfilerGuide.jsx'
import MonitorConcepts from '../components/lesson29/MonitorConcepts.jsx'
import './lesson29.css'

function Lesson29() {
  return (
    <div className="page">
      <header>
        <h1>第 29 课：调试方法论与 DevTools</h1>
        <p>
          写对靠的是知识，找错靠的是方法。这一课给你一套<strong>系统化排查流程</strong>
          （先复现 → 二分定位 → 最小 demo → 修复加回归测试，呼应第 15 课），
          外加三件趁手的工具：一个能亲手点坏的
          <strong>Bug 实验室</strong>（state 突变 / 闭包过期 / effect 缺依赖），
          一次真实的 <strong>Profiler 录制</strong>（本页故意留了一个慢组件给你拍 X 光），
          和一张<strong>错误监控</strong>概念卡（页面里真挂了 window
          的两个兜底事件监听，能捕获你制造的 demo 错误）。
          讲义见 <code>doc/lesson-29.md</code>。
        </p>
        <p className="hint">
          建议边读讲义边操作：每个实验卡都有 错误版/修复版
          开关，先复现、再修复、最后回头读“现象/原因/修复”三行诊断单。
        </p>
      </header>

      {/* 三块内容各自独立：实验 → 性能 → 监控，正好对应“找 bug 的三层视野” */}
      <BugShowcase />
      <ProfilerGuide />
      <MonitorConcepts />
    </div>
  )
}

export default Lesson29
