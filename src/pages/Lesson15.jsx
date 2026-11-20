// 第 15 课页面：测试入门
//
// 本文件教什么：
// 1. 测试思维——测什么、按什么比例测（测试金字塔在组件层的落点）；
// 2. 三个被测对象的"活体展示"：下面三个 demo 跑的就是测试文件里测的
//    那三个模块【本体】。页面展示行为，测试钉住行为契约，两处消费同一份逻辑——
//    这正是"可测试性设计"的收益：不是"为了测试重构业务"，而是业务天然就写成这样；
// 3. 运行方式：每张被测对象卡片底部都有对应的 npx vitest run 命令。
//
// 注意：页面本身不运行任何测试。测试属于构建期（开发时在终端跑），
// 浏览器里展示的只是被测对象被真实使用时的样子。
//
// 三个本课新概念都用上了：本组件只 export Lesson15 一个组件
// （react-refresh 约定），demo 都是不导出的局部组件。

import { useReducer, useState } from 'react'
import RatingStars from '../components/lesson15/RatingStars.jsx'
import useCounter from '../components/lesson15/useCounter.js'
import {
  miniCartReducer,
  cartTotal,
} from '../components/lesson15/miniCartReducer.js'
import './lesson15.css'

// —— demo ①：纯函数 reducer 的活体 ——
// 本组件自身不写任何购物车逻辑，只管 dispatch（第 9 课 useReducer 的标准用法）。
// 它调用的 miniCartReducer 和 miniCartReducer.test.js 测的是同一个函数。
function CartDemo() {
  const [items, dispatch] = useReducer(miniCartReducer, [])

  const goods = [
    { id: 'apple', name: '苹果', price: 3 },
    { id: 'coffee', name: '咖啡豆', price: 25 },
  ]

  return (
    <div>
      <div className="row">
        {goods.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => dispatch({ type: 'add', item: g })}
          >
            加购 {g.name}
          </button>
        ))}
        {/* reducer 的容错边界现场：未知 action 原样返回，页面纹丝不动 */}
        <button type="button" onClick={() => dispatch({ type: 'nope' })}>
          dispatch 未知 action
        </button>
      </div>

      <ul>
        {items.length === 0 && <li>购物车还是空的——点上面的按钮试试</li>}
        {items.map((it) => (
          <li key={it.id}>
            <span>
              {it.name} · ¥{it.price} × {it.qty}
            </span>
            <span className="row cart-ops">
              <button
                type="button"
                aria-label={`增加一件${it.name}`}
                onClick={() => dispatch({ type: 'inc', id: it.id })}
              >
                ＋
              </button>
              <button
                type="button"
                aria-label={`减少一件${it.name}`}
                onClick={() => dispatch({ type: 'dec', id: it.id })}
              >
                －
              </button>
            </span>
          </li>
        ))}
      </ul>

      {/* 总价是派生数据：每次渲染用 cartTotal 现算，state 里从来没有它。
          点"－"减到 0，整行直接消失——"减到 0 移除"的 reducer 分支肉眼可见 */}
      <p className="cart-total">总价：¥{cartTotal(items)}</p>
    </div>
  )
}

function Lesson15() {
  // demo ②：受控组件。评分的"真身"存在页面这里（useState），
  // RatingStars 只是显示器 + 上报器——和测试文件里
  // render(<RatingStars value={...} onChange={...}>) 的姿势完全同构
  const [rating, setRating] = useState(0)

  // demo ③：自定义 Hook。max=3 让"越界钳制"肉眼可见：连点加号，停在 3
  const { count, increment, decrement, reset } = useCounter(0, { max: 3 })

  return (
    <div className="page">
      <header>
        <h1>第 15 课 · 测试入门</h1>
        <p>
          给代码配一个自动质检员：断言写一次，之后每次改代码它都替你回归一遍。
          本课用三个真实模块学会三种测试——页面里的 demo 和测试文件，测的是同一批代码。
        </p>
      </header>

      <section className="card">
        <h2>先想清楚：测什么、按什么比例测</h2>
        <p>测试金字塔在组件层的落点——越靠上越多越快，别把力气花错地方：</p>
        <ol className="pyramid">
          <li>
            <strong>纯函数测试（最多）</strong>：reducer、格式化、计算这类"输入 → 输出"逻辑，
            不需要浏览器，毫秒级跑完。
            <span className="testfile">miniCartReducer.test.js</span>
          </li>
          <li>
            <strong>Hook 测试（其次）</strong>：renderHook 挂一个一次性宿主，act 里模拟调用。
            <span className="testfile">useCounter.test.js</span>
          </li>
          <li>
            <strong>组件交互测试（少量关键路径）</strong>：RTL 渲染真实 DOM，
            按角色查询、模拟点击。慢一点，专测"用户视角对不对"。
            <span className="testfile">RatingStars.test.jsx</span>
          </li>
          <li>
            <strong>快照测试（尽量少用）</strong>：把渲染结果拍成文本存档比对。
            容易被"无脑 --update 快照"惯坏——红灯本意是"人来判断"，快照让它形同虚设。
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>被测对象 ① miniCartReducer —— 纯函数怎么测</h2>
        <p>
          下面的迷你购物车直接跑 <code>miniCartReducer</code> 本体。
          它是纯函数：同输入永远同输出、绝不修改旧数据，所以测试只需要断言
          "dispatch 这个 action 之后，state 变成了什么"——三行一个用例。
        </p>
        <CartDemo />
        <div className="test-note">
          <p>
            <span className="testfile">miniCartReducer.test.js</span> 共 9 个用例：
            正常加购、同款合并数量、不同商品各自成行、减到 0 移除、总价派生正确；
            边界：减一个不存在的 id、未知 action 原样返回、旧 state 分毫未动（不可变性）、
            空购物车总价为 0。
          </p>
          <code className="cmd">
            npx vitest run src/components/lesson15/miniCartReducer.test.js
          </code>
        </div>
      </section>

      <section className="card">
        <h2>被测对象 ② RatingStars —— 受控组件怎么测</h2>
        <p>
          星星组件自己不存分数：value 进、onChange 出（点第 3 颗就上报 3）。
          正因为没有内部真相，测试才敢说"给 value=4 就该亮 4 颗"。
          点几颗星试试——"当前 N 星"永远跟着你的点击走，这就是受控：父组件说了算。
        </p>
        <RatingStars value={rating} onChange={setRating} />
        <div className="test-note">
          <p>
            <span className="testfile">RatingStars.test.jsx</span> 共 4 个用例：
            渲染 5 颗星；点击第 3 颗 onChange 收到 3（用 vi.fn 间谍函数记录调用）；
            value=4 时高亮类落在正确的星上；value=0 时没有任何星被按下。
            查询全部走 getByRole('button', name '3 星')，一个 querySelector 都没有。
          </p>
          <code className="cmd">
            npx vitest run src/components/lesson15/RatingStars.test.jsx
          </code>
        </div>
      </section>

      <section className="card">
        <h2>被测对象 ③ useCounter —— 自定义 Hook 怎么测</h2>
        <p>
          Hook 只能在组件里运行，没法裸调着测。测试时由 renderHook 造一个一次性宿主
          把 Hook 挂起来，<code>result.current</code> 就是 Hook 的最新返回值。
          下面这个计数器上限是 3：加到头就停，测试文件钉住的正是这条钳制规则。
        </p>
        <div className="row counter-demo">
          <button type="button" onClick={decrement}>
            －
          </button>
          <span className="big-number">{count}</span>
          <button type="button" onClick={increment}>
            ＋
          </button>
          <button type="button" onClick={reset}>
            归零
          </button>
          <span className="hint">max = 3，加到头就停</span>
        </div>
        <div className="test-note">
          <p>
            <span className="testfile">useCounter.test.js</span> 共 7 个用例：
            初始值、不传参默认 0、increment 每次 +1、越过 max 被钳制、
            initial 已等于 max 时纹丝不动、decrement 正常 -1、reset 回到 initial。
            每次调用都包在 act 里，让 React 当场结算完再断言。
          </p>
          <code className="cmd">
            npx vitest run src/components/lesson15/useCounter.test.js
          </code>
        </div>
      </section>

      <section className="card">
        <h2>三个必懂概念</h2>
        <ol className="concepts">
          <li>
            <strong>查元素用角色，不用选择器</strong>：
            getByRole('button', name '3 星') 按"用户看到什么"找元素；
            querySelector('.star:nth-child(3)') 按"代码怎么写"找。
            前者改样式、调 DOM 顺序都不红；查不到时它还会列出页面上所有可查的角色——
            报错本身就在帮你发现可访问性缺陷。
          </li>
          <li>
            <strong>act 一句版</strong>：act(fn) 告诉 React"我正在模拟一次真实使用"，
            fn 里触发的更新会被当场结算——出来再断言，拿到的就是最终结果，
            不是"还没渲染完"的旧值。
          </li>
          <li>
            <strong>命名约定</strong>：测试文件与被测文件同目录，命名为
            <code>被测文件名.test.js</code>，里面有 JSX 就用 <code>.test.jsx</code>。
            vitest.config.js 负责环境（jsdom）和前置文件；setup.js 装 jest-dom 匹配器、
            注册用例间清理。globals 没开，describe / it / expect 一律显式 import。
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>怎么跑测试</h2>
        <ul className="cmd-list">
          <li>
            <code className="cmd">npx vitest run</code>
            跑全部测试然后退出（CI / 验收就用这个；npm test 是它的别名）
          </li>
          <li>
            <code className="cmd">npx vitest</code>
            watch 模式：文件一保存就重跑相关用例，写测试时用这个
          </li>
          <li>
            <code className="cmd">npx vitest run src/components/lesson15/useCounter.test.js</code>
            只跑一个文件，改哪个测哪个
          </li>
        </ul>
        <p className="hint">
          本课 3 个测试文件共 20 个用例，全套跑完不到 1 秒——纯函数测试就是可以这么便宜。
        </p>
      </section>
    </div>
  )
}

export default Lesson15
