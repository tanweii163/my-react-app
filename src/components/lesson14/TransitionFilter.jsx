// 本文件教什么：并发渲染的核心演示——useTransition。
// React 18+ 把更新分成两种优先级：
//   · 紧急（urgent）：打字、点击……用户正盯着等结果，必须立刻响应；
//   · 非紧急（non-urgent）：大列表过滤、图表重算……晚几百毫秒也无妨。
// 默认所有 setState 都是紧急的；被 startTransition 包住的更新被标记为"可中断的非紧急"，
// React 可以随时放下它去响应紧急更新，之后丢掉作废的中间结果、按最新值重来——
// 于是"输入跟手"和"大列表慢慢算"可以同时成立。
//
// 两张对比卡，同一份 2 万条数据、同一个过滤逻辑：
//   卡 A：keyword 直接 setState → 每次按键都要过滤 + 重建大量 <li>，输入肉眼可见地一顿一顿；
//   卡 B：过滤更新包进 startTransition → 输入框始终跟手，过滤区亮"更新中…"角标。
//
// 官方文档点名的坑（卡 B 的"双 state"写法就是在规避它）：
//   受控输入框的 value 千万别绑"要走 transition 的那个 state"，
//   否则敲进去的字符要等过滤渲染完才显示，输入框照样卡。
import { useState, useTransition } from 'react'

// 造 2 万条数据。铁律：放模块顶层只造一次；
// 写进组件里的话每次渲染都重造一遍，卡顿会从"过滤贵"恶化成"连数据都在重新造"。
const SERIES = ['react', 'vue', 'angular', 'svelte', 'solid']
const ITEMS = Array.from({ length: 20000 }, (_, i) => ({
  id: i,
  // 每五条换一个前缀：输入 react / vue 大约命中 4000 条，清空输入框则要渲染全部 2 万条
  name: `${SERIES[i % SERIES.length]}-${i}`,
}))

// 全量过滤。注意：本课"贵"的来源主要不是这个 filter（2 万次字符串匹配只要几毫秒），
// 而是过滤结果要全部变成真实 DOM。"贵计算 + 大渲染绑在同一趟更新里"就是卡顿的配方。
function filterItems(keyword) {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return ITEMS
  return ITEMS.filter((it) => it.name.includes(kw))
}

// ---------- 卡 A：直接 setState（对照组：所有更新都是紧急的） ----------
function DirectFilterCard() {
  const [keyword, setKeyword] = useState('react')

  // 派生数据在渲染时直接算（第 2 课的原则没变），只是这次"算 + 画"贵得肉眼可见
  const shown = filterItems(keyword)

  return (
    <section className="card">
      <h2>卡 A · 直接 setState（对照）</h2>
      <p className="hint">
        输入更新和大列表重渲染绑在同一趟里，全是紧急优先级。
        在输入框里快速敲字，能感到明显卡顿。
      </p>
      <input
        className="l14-input"
        value={keyword}
        placeholder="试试 react / vue，或清空看全量"
        onChange={(e) => setKeyword(e.target.value)}
      />
      <p className="l14-status">匹配 {shown.length} 条</p>
      <ul className="l14-list">
        {shown.map((it) => (
          <li key={it.id}>{it.name}</li>
        ))}
      </ul>
    </section>
  )
}

// ---------- 卡 B：useTransition（实验组：过滤降级为"可中断的非紧急"） ----------
function TransitionFilterCard() {
  // 双 state 是本组件的教学重点：
  //   keyword     —— 输入框专用，走紧急通道，保证敲字跟手；
  //   listKeyword —— 过滤专用，走 transition 通道，慢半拍无妨。
  const [keyword, setKeyword] = useState('react')
  const [listKeyword, setListKeyword] = useState('react')

  // useTransition 返回一对东西：
  //   isPending       —— true 表示"有一轮 transition 更新还没提交完"；
  //   startTransition —— 把它的同步回调里调用的 setState 全部标记为非紧急。
  const [isPending, startTransition] = useTransition()

  // 列表按"过渡中的关键词"算。transition 未提交期间它还是旧值，所以用户看到的是
  // 上一轮的完整结果，而不是画了一半的半成品——这正是并发渲染的妙处。
  const shown = filterItems(listKeyword)

  function handleChange(e) {
    const next = e.target.value
    // 紧急通道：输入框立刻显示新字符
    setKeyword(next)
    // 非紧急通道：连续敲字时，上一轮没画完的过滤渲染会被直接丢弃，只按最新值重来
    startTransition(() => {
      setListKeyword(next)
    })
  }

  return (
    <section className="card">
      <h2>卡 B · useTransition 包住过滤</h2>
      <p className="hint">
        输入框绑 keyword（紧急），列表绑 listKeyword（非紧急）。
        敲字始终跟手；过滤期间列表保持上一轮结果并降透明度，并亮出角标。
      </p>
      <input
        className="l14-input"
        value={keyword}
        placeholder="敲和卡 A 一样的内容，对比手感"
        onChange={handleChange}
      />
      <p className="l14-status">
        匹配 {shown.length} 条
        {/* isPending 的标准 UI 用法：从调用 startTransition 起为 true，
            到这轮过滤渲染提交为止。角标 / 按钮禁用 / 列表降透明度都是常见形式，
            目的是告诉用户"新结果在路上"，而不是让界面看起来像死了。 */}
        {isPending && <span className="l14-badge">更新中…</span>}
      </p>
      {/* 旧列表还在显示（上一轮的完整结果），降透明度表示"已过期，新结果在路上" */}
      <ul className={`l14-list${isPending ? ' l14-list-stale' : ''}`}>
        {shown.map((it) => (
          <li key={it.id}>{it.name}</li>
        ))}
      </ul>
    </section>
  )
}

// 对比入口：数据、过滤逻辑完全相同，唯一变量是"过滤更新有没有走 transition"
export default function TransitionFilter() {
  return (
    <>
      <div className="card">
        <h2>对比实验：同一个 2 万条大列表，两种更新方式</h2>
        <p>
          左右两卡的数据和过滤函数一模一样，唯一区别是卡 B 把过滤更新包进了 startTransition。
          先在卡 A 里快速敲字感受卡顿，再到卡 B 敲同样的内容对比——输入框应该始终跟手。
        </p>
      </div>
      <div className="l14-grid">
        <DirectFilterCard />
        <TransitionFilterCard />
      </div>
    </>
  )
}
