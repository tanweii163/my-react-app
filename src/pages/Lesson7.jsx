// 第 7 课页面：useReducer 与复杂状态
//
// 页面组件只负责排版：真正的示例在 ShoppingCart（组件）和
// cartReducer（纯函数）里 —— 更新逻辑独立成文件，正是 reducer 的卖点。
import ShoppingCart from '../components/lesson7/ShoppingCart.jsx'
import './lesson7.css'

function Lesson7() {
  return (
    <div className="page">
      <header>
        <h1>第 7 课：useReducer 与复杂状态</h1>
        <p>
          当多条更新逻辑纠缠同一份状态，useState 的 setter 散落各处容易不一致；
          useReducer 把「怎么改」集中成纯函数 reducer(state, action) → 新 state。
        </p>
      </header>
      <main>
        <ShoppingCart />
      </main>
    </div>
  )
}

export default Lesson7
