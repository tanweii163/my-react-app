// 本文件教什么：第 14 课页面——并发渲染（React 18+ 的更新优先级模型）。
// 主线：默认所有 setState 都是紧急更新；被 startTransition 包住的更新变成
// "可中断的非紧急更新"，React 先保住输入响应，再回头完成大渲染。
// 页面组织：
//   ① 心智模型卡：紧急 vs 非紧急，一句话版本；
//   ② TransitionFilter：A/B 对比实验，同一份 2 万条数据，直接 setState vs startTransition；
//   ③ DeferredValueDemo：useDeferredValue 版本，并排显示两个值，观察"延迟跟随"；
//   ④ 收尾卡：什么时候真的需要 + 与第 9 课（memo"少算"）的分工。
import TransitionFilter from '../components/lesson14/TransitionFilter.jsx'
import DeferredValueDemo from '../components/lesson14/DeferredValueDemo.jsx'
import './lesson14.css'

function Lesson14() {
  return (
    <div className="page">
      <header>
        <h1>第 14 课：并发渲染</h1>
        <p>
          不是所有更新都同等紧急。React 18+ 允许你告诉它："这个更新不急，可以让路。"
          从此输入不被大渲染卡住。
        </p>
      </header>
      <main>
        <div className="card">
          <h2>心智模型：两种更新，两条通道</h2>
          <p>
            <b>紧急更新：</b>打字、点击、悬停——用户盯着屏幕等反馈，慢 100ms 就觉得"卡"。
            <b>非紧急更新：</b>大列表过滤、图表重算——晚几百毫秒完全无妨。
          </p>
          <p>
            默认所有 setState 都是紧急的。被 startTransition 包住的更新变成"可中断的非紧急"：
            React 渲染到一半时来了紧急更新，会放下手头的活先去响应，
            之后<b>丢掉作废的中间结果、按最新值重来</b>。这就是"让出主线程"。
          </p>
          <p className="hint">
            判断标准：用户会不会觉得"界面没反应"。输入框必须永远跟手；列表慢半拍可以接受。
          </p>
        </div>
        <TransitionFilter />
        <DeferredValueDemo />
        <div className="card">
          <h2>什么时候真的需要？和第 9 课怎么分工？</h2>
          <p>
            <b>先测量再动手</b>（第 9 课的原则在这里同样适用）：只有先在 DevTools 里录到、
            或亲手敲字敲出"可感知的卡顿"，才值得引入 transition。没有卡顿也包，
            是纯付复杂度税。
          </p>
          <p>
            与第 9 课的关系一句话：<b>memo 家族是"少算"，transition 是"让出主线程"。</b>
            memo / useMemo / useCallback 让不必要的工作干脆不发生；transition 不减少工作量，
            只是把它挪到不碍事的时机执行，并且随时可以打断、丢弃、按最新值重来。两者互补：
            通常先"少算"，剩下确实贵的部分再用"让路"兜底。
          </p>
        </div>
      </main>
    </div>
  )
}

export default Lesson14
