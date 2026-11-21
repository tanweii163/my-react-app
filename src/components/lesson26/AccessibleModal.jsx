// 第 26 课 · 可访问性 ② —— 无障碍对话框（焦点管理是弹窗的全部灵魂）
//
// 本文件教什么：
// 弹窗对鼠标用户只是"盖了一层"，对键盘和读屏用户却是四道生死题：
//   1. 打开时焦点必须搬进弹窗——否则焦点还留在触发按钮上，
//      按 Tab 会逛到弹窗底下的页面，读屏器也不会播报弹窗内容；
//   2. Tab 必须困在弹窗里转圈（focus trap）——Tab 是键盘用户的"眼睛"，
//      跑出去等于"看见了"已声明不存在的背景内容（见 aria-modal）；
//   3. Esc 必须能关——鼠标用户点关闭按钮，键盘用户按 Esc，两条通道都得有；
//   4. 关闭后焦点必须归还触发按钮——不归还的话焦点掉回页面开头，
//      用户被"传送"到陌生位置，正在做的事全断了线。
// 本实现刻意保持"能跑的最小教学版"，每处简化都注释了生产方案的差距：
//   原生 <dialog> + showModal()（浏览器自带焦点困住 + Esc + ::backdrop）、
//   inert 属性（把整块背景一键变"不可聚焦不可点击"）、focus-trap-react 库。
// 知道简化在哪，才不会把简化当真相。

import { useEffect, useId, useRef, useState } from 'react'

// 焦点困住的圈定范围：常见可聚焦元素 + 显式给了 tabindex 的元素。
// 教学版硬编码这套选择器；它不感知 shadow DOM、不感知动态插入的元素、
// 也无法排除 display:none 但匹配选择器的节点——生产方案交给
// focus-trap-react 这类库（或干脆用原生 <dialog> 让浏览器兜底）。
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function AccessibleModal({ title, buttonText = '打开对话框', children }) {
  const [open, setOpen] = useState(false)
  const titleId = useId() // aria-labelledby 要指向标题元素的 DOM id，同样走 useId 保证唯一
  const triggerRef = useRef(null) // 开局就收好触发按钮的真实 DOM——关闭后焦点要回到它
  const dialogRef = useRef(null)

  // ★ 所有关闭通道（关闭按钮 / Esc / 遮罩点击）都汇到这一个 close()，
  // "归还焦点"就只写一次——关的方法可以多，回家的路必须只有一条，否则必漏。
  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // 打开时：焦点搬进弹窗本体（tabIndex=-1 让 div 可被程序聚焦）。
  // 为什么聚焦弹窗而不是第一个控件？① 读屏器聚焦弹窗后立刻按 aria-labelledby
  // 播报标题，等于"报幕"；② 第一个控件常是"取消/关闭"按钮，直接落上去
  // 手一抖 Enter 就把弹窗关了——第一印象不能是一次误触。
  useEffect(() => {
    if (open) dialogRef.current?.focus()
  }, [open])

  // focus trap（教学版）：Tab 键的默认"跳下一个可聚焦元素"被拦下来手工转圈。
  // 只需要处理两个边界：在第一个上按 Shift+Tab → 转回最后一个；
  // 在最后一个上按 Tab → 转回第一个。中间的移动交给浏览器默认行为。
  const trapTabKey = (event) => {
    const focusables = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const current = document.activeElement

    if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault() // ★ "困住"就发生在这一行——出圈之前把方向掰回第一圈
      first.focus()
    }
    // 注意 current 是弹窗本体时（刚打开）两个边界都不命中，
    // 一次 Tab 由浏览器自然跳到第一个控件——顺序天然正确。
  }

  // 弹窗容器的总键盘入口：Esc 关闭，Tab 交给 trap。焦点被 trap 圈在容器内，
  // 所以在这里监听就必然收得到——不需要 window 级监听器（也就不需要清理副作用）。
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') close()
    else if (event.key === 'Tab') trapTabKey(event)
    // ★ 只认 Tab 键本身！Shift/Ctrl 等修饰键【自身的 keydown】也会带着
    // shiftKey 状态冒上来（按住 Shift 的瞬间，Shift 键的 keydown 先于 Tab 到达，
    // 此时 target 还是第一个元素）——不拦的话 trap 会提前把焦点搬到末尾，
    // 随后真正的 Tab keydown 反而按默认行为从末尾再退一格，顺序整个错乱。
    // 实测踩过的坑：本文件最初的版本没有这个守卫，"从第一个 Shift+Tab"
    // 永远落在倒数第二个元素上。
  }

  // 遮罩点击关闭：★ 必须判断 target === currentTarget——
  // 不判断的话，点击弹窗内部任何地方，事件冒泡到遮罩，弹窗就"点哪都关"（经典 bug）。
  // 另一个 a11y 判断：遮罩关闭对读屏用户不可见（看不见有个遮罩可点），
  // 所以 Esc 和关闭按钮才是保证通道，遮罩点击只是鼠标用户的快捷方式。
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) close()
  }

  return (
    <>
      <button
        type="button"
        className="l26-btn"
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog" // 告诉读屏器：这个按钮会弹出对话框（会话式弹窗）
      >
        {buttonText}
      </button>

      {open && (
        // 教学版简化：背景内容没有加 inert——弹窗开着时，背景理论上仍可被
        // 读屏光标漫游到。生产方案：给背景容器加 inert 属性（连点击都一并屏蔽），
        // 或直接 <dialog>.showModal()，浏览器原生把这两件事都做掉。
        <div className="l26-overlay" onClick={handleOverlayClick}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true" // 声明"我开着的时候，背后的内容视为不存在"——配 focus trap 才算兑现
            aria-labelledby={titleId} // 名字来自标题元素：读屏器打开弹窗先念标题
            tabIndex={-1} // 负值 = 不进 Tab 序，但允许上面 useEffect 里程序化 focus
            className="l26-dialog"
            onKeyDown={handleKeyDown}
          >
            <div className="l26-dialog-head">
              <h2 id={titleId}>{title}</h2>
              {/* 图标按钮的铁律：没有文字就必须有可访问名称，否则读屏器念"按钮"，
                  用户不知道它是干嘛的。aria-label 给它一个看不见的名字。 */}
              <button
                type="button"
                className="l26-dialog-close"
                onClick={close}
                aria-label="关闭对话框"
              >
                ✕
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  )
}
