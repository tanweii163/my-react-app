// 第 29 课 · 组件二：React DevTools Profiler 实操引导卡
//
// 本文件教什么：
// Profiler 是“找出谁渲染慢”的仪表盘。文字教程容易看了就忘，
// 这里把三步实操路径（录制 → 读火焰图 → 查 Why did this render?）
// 写成页面内的引导清单，并配一个故意保留的慢组件让你真实录一次。
//
// ⚠️ 本页故意保留一个可测的慢渲染：下方 SlowGrid 的渲染体里跑一个
// 三千万次的纯计算循环，每次渲染稳定花掉几十毫秒——没有“真的慢”的组件，
// 火焰图上根本看不出条块差异，练习就不成立。
// （教学专用：真实项目的渲染体里绝不允许放这种循环，慢渲染应该用 useMemo /
//   拆组件 / 虚拟列表去治理，见第 9 课。）
//
// 本页同时内置了 React 的 <Profiler> API（不带 DevTools 扩展也能量）：
// 它每次提交后回调 onRender。注意铁律——onRender 里绝不能 setState：
// setState 触发新渲染 → 又触发 onRender → 再 setState……很容易烧成死循环。
// 所以这里只把数据抄进 ref，等你点“抄一份统计到界面”再展示。
import { Profiler, useRef, useState } from 'react'

// 循环次数：本机约几十毫秒。调这个数字就能调慢/调快练习用的组件。
const LOOP_COUNT = 30_000_000

// —— 练习用慢组件：色块网格 + 渲染体里的重计算 ——
// 注意：这里不在渲染体里用 performance.now() 自测耗时——渲染必须纯，
// 本项目 oxlint 的 purity 护栏也会拦；真实耗时看下方 Profiler API 统计表
// 或 DevTools Profiler 的火焰图条块宽度。
function SlowGrid({ seed, slow }) {
  let checksum = 0
  if (slow) {
    // 慢的根源就在这里：渲染体里的同步大循环，阻塞的是主线程，
    // 在 Profiler 火焰图上体现为这个组件条块的“宽度”。
    for (let i = 0; i < LOOP_COUNT; i += 1) {
      checksum += (i + seed) % 7
    }
  }
  // 色块花纹由 seed 决定：seed 变了花纹就变——“这次渲染真的发生了”肉眼可见。
  const cells = Array.from({ length: 40 }, (_, i) => (i * (seed + 1)) % 10)
  return (
    <div>
      <div className="l29-cells" aria-hidden="true">
        {cells.map((shade, i) => (
          <span
            key={i}
            className="l29-cell"
            style={{ opacity: 0.25 + shade / 14 }}
          />
        ))}
      </div>
      <p className="hint">
        {slow
          ? '🐢 慢循环：开——耗时看下方统计表或火焰图'
          : '🐇 慢循环：关——同一个组件，几乎零耗时'}
        ，计算校验和 = {checksum}
      </p>
    </div>
  )
}

// —— Profiler 实操三步：照着做就能录出人生第一张火焰图 ——
function ProfilerSteps() {
  const steps = [
    {
      title: '① 录制',
      body: '打开 React DevTools（浏览器 F12 里多出的 React 标签）→ 切到 Profiler 面板 → 点左上角 ⏺ 开始录制 → 回到本页点几次“渲染一次”→ 点 ⏹ 停止。',
    },
    {
      title: '② 读火焰图',
      body: '录制结果里每个条块 = 一次提交里的一个组件，宽度 = 耗时（越宽越慢）。找到那条最宽的 SlowGrid；点它可以在右侧看到提交时长与渲染次数。',
    },
    {
      title: '③ 查 Why did this render?',
      body: '选中组件条块，右侧面板找“Why did this render?”。本页的答案你能提前猜到：props.seed 变了 / 父组件 ProfilerGuide 重新渲染了——先把答案说出口再去对，这就是调试的“假设先行”。',
    },
  ]
  return (
    <ol className="l29-steps">
      {steps.map((step) => (
        <li key={step.title}>
          <strong>{step.title}</strong> {step.body}
        </li>
      ))}
    </ol>
  )
}

export default function ProfilerGuide() {
  const [seed, setSeed] = useState(0) // seed 一变，SlowGrid 就重渲染一次
  const [slow, setSlow] = useState(true) // 慢渲染开关：录完慢的，关掉录个快的对比
  // onRender 的数据先攒在 ref 里（绝不在这里 setState，见文件头铁律）
  const recordsRef = useRef([])
  const [records, setRecords] = useState(null) // null = 还没抄过；点了按钮才进 state

  function handleRender(id, phase, actualDuration) {
    recordsRef.current = [
      ...recordsRef.current,
      { id, phase, actualDuration },
    ].slice(-6) // 只留最近 6 条，避免练习越多表越长
  }

  return (
    <section className="card">
      <h2>
        React DevTools Profiler：给渲染拍一次 X 光
        <span className="l29-badge">呼应第 9 课</span>
      </h2>
      <p>
        第 9 课说过“别过早优化”——但前提是你得先<strong>知道慢在哪</strong>。
        Profiler 就是回答这个问题的工具。照下面三步，用本页自带的慢组件录一次：
      </p>
      <ProfilerSteps />

      <h3>练习台：真实录一次</h3>
      <div className="row">
        <button type="button" onClick={() => setSeed(seed + 1)}>
          渲染一次（seed = {seed + 1}）
        </button>
        <button type="button" onClick={() => setSlow(!slow)}>
          {slow ? '🐢 慢循环：开（点一下关掉，录个快的对比）' : '🐇 慢循环：关'}
        </button>
        <button
          type="button"
          onClick={() => setRecords([...recordsRef.current])}
        >
          📊 抄一份 Profiler 统计到界面
        </button>
      </div>

      {/* React 内置的 <Profiler>：给子树包一层，每次提交都会回调 onRender。
          id 是你给这块测量起的代号，会出现在回调参数里。 */}
      <Profiler id="slow-grid" onRender={handleRender}>
        <SlowGrid seed={seed} slow={slow} />
      </Profiler>

      {records && (
        <table className="l29-table">
          <thead>
            <tr>
              <th>测量块 (id)</th>
              <th>阶段 (phase)</th>
              <th>实际耗时 (actualDuration)</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i}>
                <td>{r.id}</td>
                <td>{r.phase}</td>
                <td>{r.actualDuration.toFixed(1)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {records && records.length === 0 && (
        <p className="hint">还没有记录：先点几次“渲染一次”，再来抄。</p>
      )}
      <p className="hint">
        没装 React DevTools 扩展？上面这张表就是 React 自带的 Profiler API
        的测量结果，同样的数据在 DevTools Profiler 里会画成火焰图。扩展安装：
        浏览器扩展商店搜 “React Developer Tools”（本页是 localhost 开发服务，装好即用）。
      </p>
    </section>
  )
}
