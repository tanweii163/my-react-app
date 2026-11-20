// 第 23 课 · ExitAnimation：退场动画——React 动画里最著名的"缺口"
//
// 本文件教什么：
// 1. 难题本身：React 的卸载（unmount）是同步的、瞬间的——setState 把元素从数据里
//    去掉，下一次 commit 它就直接从 DOM 里没了，**不存在"退场中"这个渲染状态**。
//    而 CSS transition 需要元素留在 DOM 里才能从旧值渐变到新值——
//    "元素已经没了"和"动画还没播"物理上互斥。这就是退场动画难做的根因，
//    也是"进入过渡一行 class 就够、退场动画要动工程"的原因。
// 2. delayedUnmount 模式（本文件的实现）——把一次删除拆成两次状态更新：
//      点击删除 → 第一次更新：不删数据，只把 id 标进 leavingIds（元素加
//        --leaving 类 → CSS 把它渐变成 opacity:0 / translateX，演出开始）；
//      setTimeout(动画时长) 到点 → 第二次更新：这时才从 items 里真正删掉
//        → React 这一刻才卸载元素，谢幕下台。
//    名字里的 delayed unmount 就是字面意思：**推迟卸载，给动画让路**。
// 3. 工程细节三件套（漏一个都是真 bug）：
//    a. 防重入：退场中的元素要屏蔽重复点击，否则叠加定时器、动画状态被搅乱；
//    b. 时长对齐：setTimeout 的 400ms 必须与 CSS 里 transition 的 0.4s 一致——
//       不对齐就会"演到一半被拖下台"（JS 先删）或"台空了人还没走"（CSS 先完）；
//    c. 卸载清场：组件卸载时掐掉未到点的 setTimeout（useEffect cleanup），
//       否则回调会在组件死后 setState——React 18+ 不再警告，但那是纯浪费的更新，
//       是埋在快节奏交互里的隐性炸弹。
//
// 更精确的替代方案：不给 setTimeout，而是监听元素的 transitionend 事件、
// 事件一到再真正卸载——动画一结束立刻删，不用人肉对齐两个时钟。代价是
// transitionend 有不触发的边缘情况（元素中途 display:none、transition 被打断、
// 标签页后台化丢事件），得配兜底定时器。教学与大多数场景里 setTimeout 足够
// 简单可靠，本文件选它；三种方案的正面对比表见 doc/lesson-23.md。
//
// 已知取舍：退场中的 400ms 里元素还占着原来的格子，其余列表项要等它真正卸载后
// 才"跳"上来补位（收缩那一下是瞬间的）。想连补位也做成动画需要 FLIP 技巧，
// 或去动画 height——height 逐帧重排、违反本课铁律，折中讨论见 doc「性能注意」。

import { useEffect, useRef, useState } from 'react'

// 动画时长：必须与 lesson23.css 里 .l23-exit-item 的 transition 时长保持一致！
// 改这里必须同步改 CSS，反之亦然。想要"单一真相"可以 getComputedStyle 读回时长，
// 或改用 transitionend 事件——复杂度换一致性；教学项目选择"人肉对齐 + 大字提醒"。
const EXIT_DURATION_MS = 400

const INITIAL_ITEMS = [
  { id: 'react', label: 'React 19' },
  { id: 'router', label: 'React Router 8' },
  { id: 'query', label: 'TanStack Query' },
  { id: 'zustand', label: 'Zustand' },
]

function ExitAnimation() {
  // 两份状态，职责泾渭分明：
  //   items —— "真实在场名单"，只有动画演完才动它（动它 = 真卸载）；
  //   leavingIds —— "退场中名单"，只影响样式类，绝不参与数据逻辑。
  // 新手最常见的错误是把删除一次做完（items 直接 filter）——那样动画根本没机会播。
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [leavingIds, setLeavingIds] = useState(() => new Set())
  // 定时器登记表：id → timer，卸载时逐个回收。
  // 为什么放 ref 不放 state？timer 的存亡不需要触发渲染——它不是 UI 的真相。
  const timersRef = useRef(new Map())

  // 卸载清场：把所有未到点的定时器掐掉。
  // 细节：在 effect 里先把 timersRef.current 存进局部变量，cleanup 用它——
  // 这是 React 对 ref 的标准告诫（cleanup 运行时机不可控，别在里面读 .current）。
  // 为什么这里安全？本组件从不给 timersRef.current 换新 Map（只 set/delete/clear
  // 同一个实例），所以"当初捕获的那张登记表"就是"永远有效的那张"。
  // 反例：如果某处写了 timersRef.current = new Map()，捕获的旧表就成了孤儿，
  // 新定时器将逃过 cleanup——重置逻辑用 .clear() 而不是换新 Map，正是为了这个。
  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [])

  function handleRemove(id) {
    // 防重入：正在退场的元素再点一次删除，会再挂一个定时器——两个定时器都会到点
    // 执行，第二次面对的已经是被删过的数据（空操作），但 leaving 状态和动画时长
    // 都被搅乱了。直接短路是这里最便宜的防御。
    if (leavingIds.has(id)) return

    // 第一次状态更新：只标记"退场中"。React 重渲染，元素加上 --leaving 类，
    // CSS transition 开始播（opacity 1→0，translateX 0→40px）。
    // items 此时一个字都不动——动了元素立刻被卸载，动画就没得播了。
    // Set 是引用值：必须换一个新 Set，React 靠 Object.is 才看得出"变了"。
    setLeavingIds((prev) => new Set(prev).add(id))

    // 第二次状态更新延后到动画播完：这时才真正删数据 → React 卸载元素。
    // 400ms = CSS transition 的 0.4s，两个时钟必须对齐（见文件头 b 条）。
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setLeavingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, EXIT_DURATION_MS)
    timersRef.current.set(id, timer)
  }

  function handleReset() {
    // 重置 = 恢复初始名单 + 掐掉所有进行中的退场（还在演的元素强制归位）。
    // 用 .clear() 而不是换新 Map：cleanup 与本函数共享同一个登记表实例。
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.clear()
    setItems(INITIAL_ITEMS)
    setLeavingIds(new Set())
  }

  return (
    <div>
      <p className="hint">
        点每行的「删除」：元素先播 400ms 退场动画（淡出 + 右移），<strong>播完才真正从
        DOM 卸载</strong>。当前退场中：<strong>{leavingIds.size}</strong> 个——React 本没有
        "退场中"这个状态，这是我们自己造的。
      </p>

      <ul className="l23-exit-list">
        {items.map((item) => {
          const leaving = leavingIds.has(item.id)
          return (
            // data-state：自动化断言用的"业务状态"钩子。"退场中的元素仍存在于 DOM"
            // 这件事，用【元素还在 + data-state="leaving"】来验证，不绑样式类名。
            <li
              key={item.id}
              className={`l23-exit-item ${leaving ? 'l23-exit-item--leaving' : ''}`}
              data-state={leaving ? 'leaving' : 'idle'}
            >
              <span>{item.label}</span>
              {/* disabled 是防重入的用户可见形态：退场中连点按钮的机会都不给 */}
              <button type="button" onClick={() => handleRemove(item.id)} disabled={leaving}>
                {leaving ? '退场中…' : '删除'}
              </button>
            </li>
          )
        })}
      </ul>

      {items.length === 0 && <p className="hint">名单空了——点「重置名单」再来一遍。</p>}

      <div className="row">
        <button type="button" onClick={handleReset}>重置名单</button>
      </div>
    </div>
  )
}

export default ExitAnimation
