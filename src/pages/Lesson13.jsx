// 本文件教什么：错误边界的完整演示。三层结构层层对照：
//   第①区"受控演示·无边界"：计数器到最外层兜底边界之间没有任何中间边界，
//     引爆后整片演示区（连同本页所有内容）一起消失——这就是"没边界 = 全页崩"的受控版；
//     真实项目里没有这个兜底边界，结果是整棵 React 树被卸载、白屏（页面顶部的注释讲清楚这一点）。
//   第②区"有边界"：边界只包住一张演示卡片，引爆后只有这张卡片变成 fallback，
//     页面其他部分（包括旁边正在走的计时器）纹丝不动——这就是"子树的 try/catch"。
//   第③区"嵌套边界"：外层边界里套内层边界，内层先接住，外层完全无感；
//     再给一个"绕过内层"的开关，演示内层不存在时错误会被外层接住。
// 教学铁律：页面最外层必须包一个兜底边界（本页第一行就是），否则任何一处渲染期错误都会白掉整页。
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/lesson13/ErrorBoundary.jsx'
import BuggyCounter from '../components/lesson13/BuggyCounter.jsx'
import './lesson13.css'

// 一个小小的"活着的"组件：用来证明②③区的崩溃不会波及页面其他部分。
function Heartbeat() {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTicks(v => v + 1), 1000)
    return () => clearInterval(t) // 定时器必须清理（第 2 课复习）
  }, [])
  return <span>⏱️ 页面心跳：{ticks} 秒（崩溃时它不该停）</span>
}

// ①区的兜底 fallback：伪装成"全页白屏"，附恢复按钮。
// 真实项目里如果没人兜底，用户看到的就是无提示的白屏——连这个按钮都不会有。
function FullPageCrash({ error, reset }) {
  return (
    <div className="crash-screen" role="alert">
      <h1>💀 整棵树崩了</h1>
      <p>
        你引爆的计数器到最外层兜底边界之间<strong>没有任何中间边界</strong>，
        所以错误一路冒泡，把本页全部内容（三个演示区 + 心跳计时）一起卸载了。
      </p>
      <p className="crash-detail">{error?.message}</p>
      <p className="hint">
        真实项目里没有这个兜底边界的话，用户看到的是彻底的白屏。
        想想 ① 和 ② 的区别：崩的范围 = 边界划定的范围。
      </p>
      <button onClick={reset}>恢复整页（重挂整棵子树，所有 state 归零）</button>
    </div>
  )
}

// ②③区卡片级别的 fallback：只替换自己包住的那张卡片。
function CardFallback({ title, error, reset }) {
  return (
    <div className="fallback-card" role="alert">
      <h2>⚠️ {title}：这片子树降级了</h2>
      <p>{error?.message}</p>
      <p className="hint">注意看左上角的心跳计时——它没停，因为边界只卸载了自己包住的子树。</p>
      <button onClick={reset}>重置本区域</button>
    </div>
  )
}

function Lesson13() {
  // ③区用：controlled 控制内层边界是否"存在"（false 时内层直接不渲染 children 的边界）。
  const [innerGuard, setInnerGuard] = useState(true)

  return (
    // 兜底边界：必须放在页面最外层。它是本课演示的"安全网"，也是真实项目的必备保险。
    <ErrorBoundary fallback={FullPageCrash}>
      <div className="page">
        <header>
          <h1>第 13 课：错误边界</h1>
          <p>一个组件渲染崩溃，默认白掉整棵树；错误边界是子树的 try/catch。</p>
          <p className="hint">
            <Heartbeat /> —— 全程盯着它，崩溃波及多大，一眼看出。
          </p>
        </header>

        <main>
          {/* ① 受控演示：无边界。这里的计数器没有任何中间边界保护，
              引爆后会冲到最外层兜底边界 → 整页演示区全没。 */}
          <section className="card">
            <h2>① 受控演示：无边界（崩 = 全没）</h2>
            <p className="hint">
              教学版说明：为了让你还能继续上课，页面最外层有一个"兜底边界"假装成全页崩溃页。
              <strong>真实项目里没有它，效果就是整棵树卸载、彻底白屏</strong>，控制台只剩一条报错。
            </p>
            <BuggyCounter label="①无边界计数器" />
          </section>

          {/* ② 有边界：边界只包住这一张卡片的内部。炸了只换这块，页面其余部分完好。 */}
          <section className="card">
            <h2>② 有边界：只崩一张卡片</h2>
            <ErrorBoundary
              fallback={({ error, reset }) => (
                <CardFallback title="演示卡片" error={error} reset={reset} />
              )}
            >
              <BuggyCounter label="②有边界计数器" />
            </ErrorBoundary>
          </section>

          {/* ③ 嵌套边界：外层边界包住整个组，组内每个格子又有内层边界。
              内层存在 → 内层接住，外层无感；关掉开关 → 错误冒泡给外层，整组降级。 */}
          <section className="card">
            <h2>③ 嵌套边界：内层接住，外层无感</h2>
            <div className="row">
              <label>
                <input
                  type="checkbox"
                  checked={innerGuard}
                  onChange={e => setInnerGuard(e.target.checked)}
                />
                内层边界开启（关掉再引爆，看看谁接盘）
              </label>
            </div>
            <ErrorBoundary
              fallback={({ error, reset }) => (
                <CardFallback title="整组（外层接住了）" error={error} reset={reset} />
              )}
              resetKeys={[innerGuard]}
            >
              {innerGuard ? (
                <ErrorBoundary
                  fallback={({ error, reset }) => (
                    <CardFallback title="单个格子（内层接住了）" error={error} reset={reset} />
                  )}
                >
                  <BuggyCounter label="③内层计数器" />
                </ErrorBoundary>
              ) : (
                <BuggyCounter label="③无内层计数器" />
              )}
            </ErrorBoundary>
            <p className="hint">
              开着开关引爆：内层边界接住，只有那一个格子降级，外层边界毫无反应。
              关掉开关引爆：错误直接冒泡，外层边界接住，整组降级——
              这就是"边界划在哪，崩的范围就到哪"。
            </p>
          </section>

          {/* 复习区：错误边界不是修错的工具，是把故障隔离起来的保险丝。
              错误要在根上修（判空、校验数据），边界只是兜底。 */}
          <section className="card">
            <h2>边界能接住什么？（重要）</h2>
            <ul className="scope-list">
              <li>✅ 能接：<strong>渲染期</strong>的错误（render / 生命周期里的 throw）</li>
              <li>❌ 不接：事件回调（onClick 里 throw，用 try/catch 自己管）</li>
              <li>❌ 不接：异步回调、promise rejection（setTimeout / fetch 的 .then 里抛的错）</li>
              <li>❌ 不接：错误边界自己的 render、以及服务端渲染</li>
            </ul>
            <p className="hint">
              所以本页所有按钮 onClick 里的普通逻辑即使出错也不会触发边界。
              正确姿势：<strong>错误在根上修</strong>（数据判空、类型校验），边界只做"最后一道保险丝"。
            </p>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default Lesson13
