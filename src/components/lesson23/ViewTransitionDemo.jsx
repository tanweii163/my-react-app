// 第 23 课 · ViewTransitionDemo：document.startViewTransition——浏览器帮你截两张"照片"
//
// 本文件教什么：
// 1. 原理：调用 startViewTransition(callback) 时，浏览器会——
//      ① 给当前页面（或指定元素）拍一张"旧照"（快照）；
//      ② 执行你的 callback（在里面更新 state、让 DOM 变化落地）；
//      ③ 再拍一张"新照"；
//      ④ 在两张快照之间做交叉淡入淡出/变形——动画发生在**照片（伪元素）**上，
//         真实 DOM 只切换了一次，没有逐帧改样式，所以天然流畅（还是合成器线程的活）。
// 2. 这是较新的 Web API（Chrome/Edge 111+、Safari 18+，Firefox 支持得晚一些，
//     以 caniuse 为准），必须特性检测：typeof document.startViewTransition !== 'function'
//     时直接 setState——功能一模一样，只是少了过渡。这叫**渐进增强**：
//     动画是锦上添花，永远不能是功能前提。
// 3. flushSync 的必要性（本文件最容易看漏的一行）：startViewTransition 靠
//    "callback 返回时 DOM 已变"来拍新照，而 React 的 setState 是批处理、异步渲染——
//    callback 返回时 DOM 可能还没变，浏览器拍的"新照"= 旧照，动画看起来像没动。
//    flushSync(() => setState(...)) 强制 React 在这个同步块里完成渲染并提交 DOM，
//    保证 callback 返回时新画面已经就位。
// 4. 默认动画的是整页根快照——本课给面板元素设置 view-transition-name: l23-panel，
//    把动画收窄到这一块：只有面板的新旧照片参与变换，页面其余部分纹丝不动。
//    铁律：同一个 name 同一时刻只能属于一个元素。
// 5. prefers-reduced-motion 的 JS 侧闸门：CSS 里的 @media 能拦住 CSS 动画，
//    但 View Transitions 是浏览器驱动的快照动画，不走你的 CSS——得在 JS 里
//    matchMedia 检测后主动跳过。两道闸都要设，缺一不可。

import { useState } from 'react'
import { flushSync } from 'react-dom' // 注意：从 react-dom 导入，不是 react

const PANELS = [
  {
    id: 'today',
    label: '今日课程',
    body: '第 23 课 · 动画与过渡：class 切换、退场动画、View Transitions。',
    className: 'l23-vt-panel--today',
  },
  {
    id: 'next',
    label: '明日预告',
    body: '第 24 课 · 构建与部署：npm run build 产物分析、Vite 优化、部署上线。',
    className: 'l23-vt-panel--next',
  },
  {
    id: 'retro',
    label: '课程回顾',
    body: '第 1–22 课：从 JSX 与受控组件，走到状态管理全家桶与综合实战。',
    className: 'l23-vt-panel--retro',
  },
]

// 特性检测只做一次（API 存在与否在页面生命周期内不会变）。
// 写在模块层没问题：本项目是纯客户端 Vite 应用；若做 SSR，读 document 的代码
// 必须挪进 effect/事件回调里，否则服务端没有 document 会直接崩。
const SUPPORTED =
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function'

function ViewTransitionDemo() {
  const [activeId, setActiveId] = useState(PANELS[0].id)
  // 切换计数：一个能肉眼确认"state 确实变了"的旁证（降级/动画两种路径都该 +1）
  const [switchCount, setSwitchCount] = useState(0)
  const active = PANELS.find((panel) => panel.id === activeId)

  function handleSwitch(nextId) {
    if (nextId === activeId) return

    // 双重降级闸门：
    // ① API 不存在（老浏览器）→ 直接 setState；
    // ② 用户系统开了"减少动态效果"→ 也直接 setState（无障碍，不是可选项）。
    // 两条路殊途同归：功能完全一致，只是瞬间切换、没有过渡。
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!SUPPORTED || reducedMotion) {
      setActiveId(nextId)
      setSwitchCount((count) => count + 1)
      return
    }

    const transition = document.startViewTransition(() => {
      // flushSync：强制 React 在这个同步块里完成渲染 + 提交 DOM（见文件头第 3 条）。
      flushSync(() => {
        setActiveId(nextId)
        setSwitchCount((count) => count + 1)
      })
    })
    // 过渡被跳过（skipTransition）时 ready/finished 会 reject——典型场景：过渡还没播完
    // 就发起下一次切换（浏览器自动跳过旧过渡）、或系统减少动态效果直接跳过。
    // 跳过是 API 内建的正常中断处理，不是错误，所以空 catch；不接住的话
    // 控制台会出现 unhandled rejection（AbortError: Transition was skipped）。
    // 刻意不接 updateCallbackDone：flushSync 里的真 bug 必须照常暴露，不能被吞。
    transition.ready.catch(() => {})
    transition.finished.catch(() => {})
    // 补位知识：默认动画的是整页根快照，本课用 view-transition-name（lesson23.css）
    // 把动画收窄到面板元素；flushSync 的取舍与降级闸门见文件头。
  }

  return (
    <div>
      <div className="row">
        {PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => handleSwitch(panel.id)}
            className={panel.id === activeId ? 'l23-vt-tab--active' : ''}
          >
            {panel.label}
          </button>
        ))}
      </div>

      {/* data-active-id：断言钩子——点击后它应该立刻变成目标面板的 id */}
      <div className={`l23-vt-panel ${active.className}`} data-active-id={active.id}>
        <h3>{active.label}</h3>
        <p>{active.body}</p>
        <p>已切换 {switchCount} 次</p>
      </div>

      <p className="hint">
        {SUPPORTED
          ? '✅ 本浏览器支持 document.startViewTransition：切换时面板的新旧快照会平滑交叉过渡。'
          : '⚠️ 本浏览器不支持 startViewTransition：已自动降级为瞬间切换——功能一个不少，只是没有过渡。'}
      </p>
    </div>
  )
}

export default ViewTransitionDemo
