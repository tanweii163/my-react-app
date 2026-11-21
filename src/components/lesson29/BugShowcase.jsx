// 第 29 课 · 组件一：Bug 实验室——三个经典 bug 的“复现 → 现象 → 原因 → 修复”活体演示
//
// 本文件教什么：
// 教科书对 bug 的描述是“文字”，这里把三个最经典的 React bug 做成能亲手点坏的活体。
// 每个实验都有一个 错误版/修复版 开关：错误版让你亲眼看到 bug 发作，
// 修复版确认同一操作结果不同。调试的第一步永远是“能稳定复现”——
// 所以这三个实验本身，就是本课排查流程里“复现”环节的现成教具：
//   ① state 突变：直接 push 数组后界面不更新（呼应第 1 课“不可变更新”）
//   ② 闭包过期：setTimeout / 事件监听里读到旧 state（呼应第 2 课“闭包与 effect”）
//   ③ effect 缺依赖：依赖数组漏填导致用旧 props（注释里展示 lint 会怎么报）
import { useEffect, useRef, useState } from 'react'

// 初始数据用工厂函数而不是共享常量：本实验错误版的 push 会突变数组——
// 如果 useState 直接存常量引用、恢复按钮也复用它，突变污染会一起“复活”
// （恢复之后幽灵任务还赖在列表里）。每次都造全新副本，才真正等于“初始状态”。
const makeInitialTasks = () => ['初始任务 A', '初始任务 B']

// —— 三个实验共用的分段开关：错误版 ↔ 修复版 ——
function ModeToggle({ value, onChange }) {
  const options = [
    { key: 'broken', label: '🐛 错误版' },
    { key: 'fixed', label: '✅ 修复版' },
  ]
  return (
    <div className="l29-seg" role="group" aria-label="错误版与修复版切换">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={value === opt.key ? 'on' : ''}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// —— 诊断单：现象 / 原因 / 修复 三行——每张实验卡的固定收尾 ——
function Diagnosis({ symptom, cause, fix }) {
  return (
    <ul className="l29-abc">
      <li className="l29-sym">
        <strong>现象：</strong>
        {symptom}
      </li>
      <li className="l29-cause">
        <strong>原因：</strong>
        {cause}
      </li>
      <li className="l29-fixd">
        <strong>修复：</strong>
        {fix}
      </li>
    </ul>
  )
}

/* ============================================================
   实验一 · state 突变：push 了，但界面不动
   设计要点：items 存在本组件里，切开关时 state 不清空——
   先在错误版点几次“添加”，再切修复版点一次，之前“消失”的任务会一起冒出来。
   这个“幽灵数据现身”的瞬间，正是这类 bug 最迷惑人的地方：
   数据一直都在，只是 React 不知道要重新渲染。
   ============================================================ */
function MutationDemo() {
  // 惰性初始化：只造一次；注意存进 state 的是“这份副本自己的引用”
  const [items, setItems] = useState(makeInitialTasks)
  const [mode, setMode] = useState('broken')
  // 任务编号计数器：不参与渲染，放 ref 不放 state（“存在但不用来显示”的值进 ref）
  const nextIdRef = useRef(3)
  const broken = mode === 'broken'

  function add() {
    if (broken) {
      // ❌ 错误版：直接突变 state 数组
      items.push(`任务 ${nextIdRef.current++}`)
      // 再 setItems(同一个引用)：React 拿新引用和旧引用一比——一模一样，
      // 认为“什么都没变”，直接跳过重渲染。于是数据变了、界面没变。
      setItems(items)
    } else {
      // ✅ 修复版：不可变更新——造一个新数组（新引用），旧数组原封不动
      setItems([...items, `任务 ${nextIdRef.current++}`])
    }
  }

  return (
    <div>
      <ModeToggle value={mode} onChange={setMode} />
      <p className="big-number">{items.length}</p>
      {/* 界面显示的永远是“上一次渲染时的快照”，不是数组此刻的真实内容 */}
      <p className="hint">↑ 界面认为数组有这么多项（state.length 的渲染快照）</p>
      <div className="row">
        <button type="button" onClick={add}>
          + 添加一个任务
        </button>
        <button type="button" onClick={() => setItems(makeInitialTasks())}>
          ↺ 恢复初始数据
        </button>
        {/* 只在错误版出现的“照妖镜”：造一个新数组逼 React 重渲染，
            让你看清突变过的数组里到底已经塞了多少项 */}
        {broken && (
          <button type="button" onClick={() => setItems([...items])}>
            🔍 强制重渲染：看看数组真实内容
          </button>
        )}
      </div>
      <ul>
        {items.map((task) => (
          <li key={task}>{task}</li>
        ))}
      </ul>
      <Diagnosis
        symptom="点了好几次“添加”，数字和列表纹丝不动；可切一下开关（或点一次“强制重渲染”），消失的任务全冒出来了。"
        cause="push 是原地突变：数组引用没变，setItems(同一引用) 被 React 判定为“没变化”而跳过重渲染。第 1 课的铁律“用新数组替换旧数组”就是在防这个。"
        fix="setItems([...items, 新任务])——造新引用，React 才会重新渲染。"
      />
    </div>
  )
}

/* ============================================================
   实验二 · 闭包过期：定时器里读到的永远是旧 count
   复现剧本：点“启动定时读取” → 2 秒窗口内狂点 +1 → 看汇报。
   错误版汇报的是“启动那一刻”的数字；修复版汇报的是“定时器触发那一刻”的数字。
   事件监听器（addEventListener）里的过期闭包是同一个病：
   回调只注册一次，闭包捕获的是注册那一刻的变量。
   ============================================================ */
function StaleClosureDemo() {
  const [count, setCount] = useState(0)
  const [report, setReport] = useState('（还没启动过定时读取）')
  const [mode, setMode] = useState('broken')
  const broken = mode === 'broken'

  // 定时器 id：存在但不用来渲染，放 ref；卸载时用它清理（副作用要收拾干净，呼应第 2 课）
  const timerRef = useRef(null)
  useEffect(() => () => clearTimeout(timerRef.current), [])

  // “最新值镜子”（latest-ref 套路）：每次渲染提交后，把最新 count 抄进 ref。
  // 定时器回调拿不到“最新渲染的变量”，但随时能读到 ref.current。
  // 故意不写依赖数组：每次渲染后都要执行一次，镜子才始终照着最新值。
  const countRef = useRef(count)
  useEffect(() => {
    countRef.current = count
  })

  function startRead() {
    if (broken) {
      // ❌ 错误版：点击这一刻，闭包把当时的 count 值“打包”进回调。
      // 之后 count 怎么变，回调里这个 snapshot 都不再更新——它是截图，不是直播。
      const snapshot = count
      timerRef.current = setTimeout(() => {
        setReport(`定时器读到：count = ${snapshot}（这是点击那一刻打包的旧值）`)
      }, 2000)
    } else {
      // ✅ 修复版：回调里读 ref.current——触发那一刻才去取，永远是最新值。
      timerRef.current = setTimeout(() => {
        setReport(`定时器读到：count = ${countRef.current}（触发那一刻的实时值）`)
      }, 2000)
    }
  }

  return (
    <div>
      <ModeToggle value={mode} onChange={setMode} />
      <p className="big-number">{count}</p>
      <p className="hint">↑ 当前真实 count（每次点击立即更新）</p>
      <div className="row">
        <button type="button" onClick={() => setCount(count + 1)}>
          +1
        </button>
        <button type="button" onClick={startRead}>
          ▶ 启动定时读取（2 秒后汇报）
        </button>
      </div>
      <p className="hint">
        复现剧本：点“启动定时读取”，趁 2 秒窗口内狂点 +1，然后等汇报。
      </p>
      <p className="l29-result">{report}</p>
      <Diagnosis
        symptom="错误版：点了 +1 好几次，定时器汇报的却是启动时的旧数字；修复版汇报的才是最新值。"
        cause="setTimeout 的回调是一个闭包，捕获的是“创建那一刻”的 count 变量值；state 更新让组件重新渲染，但已经打包好的旧闭包不会被替换。事件监听器同理——只注册一次的回调会一直攥着旧 state。"
        fix="让回调延迟取值：用 latest-ref（渲染后把最新值抄进 useRef，回调读 ref.current）；如果目的是“在定时器里改 state”，则用函数式更新 setCount(c => c + 1)，从根上不引用外部旧值。"
      />
    </div>
  )
}

/* ============================================================
   实验三 · effect 缺依赖：effect 只跑一次，读到的 props 是旧的
   父组件 EffectDepDemo 持有 user，用按钮在两个用户之间切换；
   子组件把 user 写进问候语。错误版把问候语冻结在挂载那一刻
   （真实世界的错误写法与 lint 报文见卡片里的代码块）。
   ============================================================ */

// 故意保留的“错误代码”文本（是字符串不是真代码，所以本项目的 lint 护栏管不到它），
// 与真实报错一起展示：装了 eslint-plugin-react-hooks 的项目会怎么报。
const BROKEN_SNIPPET = [
  'useEffect(() => {',
  '  setGreeting(`你好，${user.name}！`)',
  '}, []) // ← 漏填了 user',
].join('\n')

const LINT_MESSAGE = [
  "React Hook useEffect has a missing dependency: 'user'.",
  'Either include it or remove the dependency array.  (react-hooks/exhaustive-deps)',
].join('\n')

// ❌ 错误版子组件：复现“effect 依赖数组漏填”的最终行为——问候语冻结在挂载那一刻。
// ⚠️ 真实世界的错误版就是上面 <pre> 里的代码：effect 里读了 user、依赖数组却写 []。
// 本项目的 oxlint 默认启用 exhaustive-deps（漏依赖必报）和 set-state-in-effect
// （禁止在 effect 里同步 setState）两条护栏，那段“真错误代码”在这里活不过 lint——
// 所以错误版改用 useState 初始化器在挂载时把 user 冻结成快照：
// 初始化器只执行一次，之后 user 怎么变 frozen 都不更新，
// 症状与那段错误代码一模一样，但不触发任何护栏。
// 这本身就是本课的一课：护栏没报 ≠ 代码没错，护栏拦下的写法也不止一种成因。
function GreetingBroken({ user }) {
  const [frozen] = useState(
    () => `你好，${user.name}！你的身份是：${user.plan}`,
  )
  return <p className="l29-result">挂载时冻结的问候：{frozen}</p>
}

// ✅ 修复版子组件：真 effect + 正确的依赖数组 [user]——
// user 一换，effect 清掉旧定时器并重跑，问候语跟着换人。
// setState 包在 setTimeout(0) 里而不是在 effect 体里同步调用：
// 一是本项目 oxlint 的 set-state-in-effect 护栏禁止同步调用（防连锁渲染），
// 二是这更接近真实 effect 的形态——异步活干完（请求/定时器）再 setState（呼应第 11 课）。
function GreetingFixed({ user }) {
  const [greeting, setGreeting] = useState('（问候语还没生成）')
  const timerRef = useRef(null)
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setGreeting(`你好，${user.name}！你的身份是：${user.plan}`)
    }, 0)
    // 依赖变化或卸载时清掉旧定时器——副作用要收拾干净（呼应第 2 课）
    return () => clearTimeout(timerRef.current)
  }, [user]) // ← 修复的关键：effect 里读到的每一项都要填进依赖数组
  return <p className="l29-result">effect 写下的问候：{greeting}</p>
}

const DEMO_USERS = [
  { id: 'ming', name: '小明', plan: '会员' },
  { id: 'hong', name: '小红', plan: '访客' },
]

function EffectDepDemo() {
  const [user, setUser] = useState(DEMO_USERS[0])
  const [mode, setMode] = useState('broken')

  return (
    <div>
      <ModeToggle value={mode} onChange={setMode} />
      <div className="row">
        {DEMO_USERS.map((u) => (
          <button key={u.id} type="button" onClick={() => setUser(u)}>
            切换到 {u.name}
          </button>
        ))}
      </div>
      {/* 父组件传下来的 props 是最新的；冻结的只是错误版 effect 写下的那份旧快照 */}
      <p className="hint">当前 props：user = {user.name}（{user.plan}）</p>
      {mode === 'broken' ? (
        <GreetingBroken user={user} />
      ) : (
        <GreetingFixed user={user} />
      )}
      <pre className="l29-pre">
        {BROKEN_SNIPPET}
        {'\n'}
        <span className="l29-lint">⚠️ {LINT_MESSAGE}</span>
      </pre>
      <Diagnosis
        symptom="错误版：切到小红，上面的 props 提示已经变了，问候语还停在“你好，小明”；修复版跟着换人。"
        cause="依赖数组 [] 告诉 React“这些数据永远不会变，effect 只跑一次”。effect 函数同样是个闭包，捕获的是挂载那次渲染的 user——之后 props 更新，effect 却再也不执行。"
        fix="把 effect 里读到的每一项都填进依赖数组（[user] 或更精确的 [user.id]）。靠 exhaustive-deps 这条 lint 规则兜底：它专门比对“effect 里读了什么”和“数组里写了什么”。"
      />
    </div>
  )
}

// —— 实验室容器：三张实验卡按序排布 ——
export default function BugShowcase() {
  return (
    <>
      <section className="card">
        <h2>
          实验一 · state 突变：push 了，但界面不动
          <span className="l29-badge">呼应第 1 课</span>
        </h2>
        <MutationDemo />
      </section>

      <section className="card">
        <h2>
          实验二 · 闭包过期：定时器读到旧 state
          <span className="l29-badge">呼应第 2 课</span>
        </h2>
        <StaleClosureDemo />
      </section>

      <section className="card">
        <h2>
          实验三 · effect 缺依赖：用旧 props 渲染
          <span className="l29-badge">呼应第 2 课 · 依赖数组</span>
        </h2>
        <EffectDepDemo />
      </section>
    </>
  )
}
