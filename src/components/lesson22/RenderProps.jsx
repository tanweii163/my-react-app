// 第 22 课 · 组件设计模式 ② —— render props：把渲染权交给调用方
//
// 本文件教什么：
// HOC 时代的痛点：逻辑复用靠"组件包组件"，被包的组件拿数据全靠天上掉下来的 props——
// "这个 prop 从哪来的？"成了每个接手人的灵魂拷问（来源不明）；包装套多了，
// DevTools 里 WithXxx(WithYyy(WithZzz(...))) 一层层全是包装纸（包装地狱）。
// render props（2017 年前后流行，代表作 downshift、react-motion）换了条路：
//   组件不再决定"画什么"，只提供"状态 + 操作"，通过一个函数 prop 把它们递出去，
//   渲染权在调用方手里，数据来源明晃晃写在参数表上：
//     <Toggle render={(on, toggle) => <台灯 亮={on} 拍={toggle} />} />
//
// 本文件的 Toggle 是一个"行为组件"：只管 on/off 这一份状态和切换函数，
// 对界面长什么样一无所知。下面两个调用方（台灯、密码可见性）共用同一个 Toggle，
// UI 完全不同——这就是"把渲染权交给调用方"的直接收益：同一份行为逻辑配任意皮肤。
//
// 兴衰一笔：2019 年 Hooks 登场后，这类"逻辑壳子"大多改写成自定义 Hook
// （const [on, toggle] = useToggle()），不再需要函数 prop 的嵌套。
// render props 今天主要活在第三方库的 API 里（表格列渲染、downshift 等），认得即可。

import { useState } from 'react'

// 行为组件：只有状态，没有界面。render 是它唯一的"出口"。
// 约定：render 接收 (on, toggle)——读状态 + 改状态，两样齐活。
export function Toggle({ initial = false, render }) {
  const [on, setOn] = useState(initial)
  const toggle = () => setOn((v) => !v)
  // ★ 调 render 而不是画 JSX：本组件把"画什么"的权利完全让给调用方。
  //   它自己渲染出来的东西 = 调用方函数的返回值——所以叫"渲染权的移交"。
  return render(on, toggle)
}

// —— 调用方一：台灯。逻辑（on/toggle）全来自 Toggle，界面全是自己的 JSX。——
function LampDemo() {
  return (
    <Toggle
      render={(on, toggle) => (
        <div className="l22-lamp">
          {/* 状态只用来"决定怎么画"：亮不亮是 className 和文案的事，逻辑一行没写 */}
          <div className={on ? 'l22-bulb l22-bulb-on' : 'l22-bulb'}>{on ? '💡' : '🔌'}</div>
          <button type="button" onClick={toggle}>
            {on ? '关灯' : '开灯'}
          </button>
        </div>
      )}
    />
  )
}

// —— 调用方二：密码可见性。同一个 Toggle，另一种皮肤——这就是复用的证明。——
function PasswordDemo() {
  return (
    <Toggle
      render={(on, toggle) => (
        <div className="l22-pass">
          {/* on 在这里换了份工作：决定 input 的 type，而不是灯泡的颜色 */}
          <input type={on ? 'text' : 'password'} defaultValue="react-2026" readOnly />
          <button type="button" onClick={toggle}>
            {on ? '隐藏' : '显示'}
          </button>
        </div>
      )}
    />
  )
}

// 页面导出的演示：两个调用方并排，配一句"同一逻辑、两种皮肤"的提示。
export default function RenderPropsDemo() {
  return (
    <div className="l22-rp-grid">
      <LampDemo />
      <PasswordDemo />
      <p className="hint l22-rp-note">
        上面两个交互共用同一个 &lt;Toggle&gt;：状态和行为在它手里，
        界面长什么样全由 render 函数决定——渲染权在调用方。
      </p>
    </div>
  )
}

// 变体备忘（不演示）：children 当函数用——<Toggle>{(on, toggle) => …}</Toggle>。
// 本质与 render prop 相同，只是"那个函数"从 render 换成了 children；
// 一些表格库的列渲染、弹层的受控用法都是这个形状。两种写法机制一模一样。
//
// 另一个经典案例备忘：跟踪鼠标位置的 <MouseTracker render={(x, y) => …} />——
// 行为组件在 useEffect 里挂 mousemove 监听（记得清理），把坐标递给 render。
// 换成 Hooks 时代就是 useMousePosition() 自定义 Hook，思路完全同源。
