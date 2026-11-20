// 第 7 课 · ShoppingCart —— useReducer：把复杂状态的"怎么改"集中起来
//
// 本组件教什么：
//   当多条更新逻辑纠缠同一份状态（加商品要合并数量、减到 0 要删除、
//   清空要重置……），useState 的 setter 会散落在各个事件处理函数里，
//   每处都要自己保证"不可变、不出中间态"，很容易写漏、不一致。
//   useReducer 把这些逻辑全部搬进 reducer 纯函数，组件里只剩一句话：
//   dispatch({ type: 'xxx', payload }) —— "发生了什么事"，不管怎么改。
//
// useReducer vs useState 怎么选（本课核心判断标准）：
//   ✅ 用 reducer：状态转移复杂（一个动作要同时改多处）、多个操作联动
//      同一份数据（增/删/改/清都对 items 动手）、下一步状态依赖上一步
//      （add 时要先查有没有同款）、需要把"更新规则"抽成独立文件测试。
//   ✅ 用 useState：独立、简单的一个值（输入框草稿、开关、一个数字），
//      新值不依赖复杂判断 —— setter 一行写完，没必要为它写 reducer。
//   经验法则：setXxx 的回调逻辑开始在不同地方复制粘贴时，就是升级
//   useReducer 的信号。两者不互斥，本组件若有搜索框，草稿仍该用 useState。
import { useReducer } from 'react'
import { cartReducer, initialCart } from './cartReducer.js'

// 商品清单是常量数据（不是 state！它从不变化，放 state 纯属浪费渲染）。
const PRODUCTS = [
  { id: 'p1', name: '《React 入门到放弃》', price: 59 },
  { id: 'p2', name: '机械键盘', price: 399 },
  { id: 'p3', name: '程序员保温杯', price: 89 },
  { id: 'p4', name: '防脱洗发水', price: 45 },
  { id: 'p5', name: '人体工学椅', price: 1299 },
]

function ShoppingCart() {
  // useReducer 返回 [当前状态, dispatch]。
  // dispatch({ type, payload }) 只描述"发生了什么"，怎么改全在 reducer 里。
  // 注意：reducer 函数每次渲染都会被重新创建，但 useReducer 保证它内部
  // 拿到的 state 是最新值，所以不存在 useState 那种"闭包过期值"问题。
  const [cart, dispatch] = useReducer(cartReducer, initialCart)

  // 派生数据（第 2 课的知识）：总计 = 各行小计之和，渲染时直接 reduce 算出，
  // 绝不存进 state —— 存了就要在每次改购物车时手动同步，迟早忘了改。
  const total = cart.items.reduce((sum, it) => sum + it.price * it.qty, 0)
  const count = cart.items.reduce((sum, it) => sum + it.qty, 0)

  return (
    <section className="card">
      <h2>useReducer 购物车</h2>
      <p className="hint">
        点商品加入购物车：同款会合并数量；&minus; 到 0 自动移除该行。
        更新规则全部在 cartReducer.js 的纯函数里，这里只负责 dispatch。
      </p>

      {/* 商品列表：onClick 里 dispatch 一个带 payload 的 action 对象 */}
      <div className="product-grid">
        {PRODUCTS.map((p) => (
          <button key={p.id} onClick={() => dispatch({ type: 'add', payload: p })}>
            {p.name} · ¥{p.price}
          </button>
        ))}
      </div>

      {cart.items.length === 0 ? (
        <p>购物车空空如也，点上面的商品试试。</p>
      ) : (
        <>
          {/* 购物车表格：每行的 +/− 都是 dispatch，处理函数一行搞定 */}
          <table className="cart-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>单价</th>
                <th>数量</th>
                <th>小计</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cart.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>¥{it.price}</td>
                  <td>
                    <button
                      aria-label={`减少${it.name}`}
                      onClick={() => dispatch({ type: 'dec', payload: { id: it.id } })}
                    >
                      −
                    </button>
                    <span className="qty">{it.qty}</span>
                    <button
                      aria-label={`增加${it.name}`}
                      onClick={() => dispatch({ type: 'inc', payload: { id: it.id } })}
                    >
                      ＋
                    </button>
                  </td>
                  <td>¥{it.price * it.qty}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => dispatch({ type: 'remove', payload: { id: it.id } })}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="row cart-total">
            共 {count} 件 · 总计 <strong>¥{total}</strong>
            <button onClick={() => dispatch({ type: 'clear' })}>清空购物车</button>
          </p>
        </>
      )}
    </section>
  )
}

export default ShoppingCart
