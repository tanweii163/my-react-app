// 第 23 课 · FadeToggle：动画的第一课——state 驱动 class 切换 + CSS transition
//
// 本文件教什么：
// 1. 动画的分工：React 只负责"翻状态"（visible: false → true），className 随之改变；
//    从旧值到新值之间的每一帧（opacity 0.03、0.37、0.81……）全部由浏览器 CSS
//    transition 自动插值。JS 不写 setInterval 逐帧改样式——那是性能与可维护性双输的写法。
//    一句话：React 管起止，CSS 管过程。
// 2. transition 的触发条件：**计算值发生了变化**（class 换了 → opacity/transform 的
//    计算值变了）。反过来的推论很重要：元素首次挂载时没有"旧值"，transition 不会播。
//    所以本组件初始 visible=false（先渲染成隐藏态），第一次点击翻转 class，
//    才构成一次真正的"进场过渡"。
// 3. 铁律实践：只动 opacity（透明度）和 transform（位移/缩放）。这两个属性的变化
//    可以完全在浏览器合成器线程（compositor）完成，不触发布局（layout）与逐像素
//    重绘（paint）——主线程再忙动画也不掉帧。为什么不能动 width/top？
//    见页面铁律卡与 doc/lesson-23.md「性能注意」。
//
// 易错预警：transition 只能"渐变到某个还在 DOM 里的状态"。本组件的"隐藏"其实是
// opacity: 0——元素还在、还占位、还占着可访问性树。想要"真的从 DOM 消失还要播动画"
// （退场），transition 单打独斗做不到，那是下一关 ExitAnimation（delayedUnmount）的课题。
//
// CSS 侧：.l23-fade-box（常态）与 .l23-fade-box--hidden（隐藏态）都定义在
// src/pages/lesson23.css；transition 声明只写在常态类上（元素永远以它为基座，
// 两个方向的切换都能过渡）。

import { useState } from 'react'

function FadeToggle() {
  // 唯一的 state：可见与否。动画的"进行到第几帧"不存在于任何 JS 变量里——
  // 它在浏览器手里。想拿中间帧的值，得用 getComputedStyle 读，而不是自己存。
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <div className="row">
        {/* data-visible 是给调试/自动化断言留的钩子：样式类名可以随便重构，
            data 属性表达的"业务状态"不变——测试别绑死在 className 字符串上 */}
        <div
          className={`l23-fade-box ${visible ? '' : 'l23-fade-box--hidden'}`}
          data-visible={visible}
        >
          {visible ? '我在这里' : '（已隐藏）'}
        </div>
        <button type="button" onClick={() => setVisible((v) => !v)}>
          {visible ? '退场（隐藏）' : '进场（显示）'}
        </button>
      </div>
      <p className="hint">
        按钮只做了一件事：翻转 state → className 变化 → CSS transition 接管全部中间帧。
        注意隐藏的方块其实还在页面上（opacity: 0，仍占着位置）——「真消失还带动画」
        见下一张卡。
      </p>
    </div>
  )
}

export default FadeToggle
