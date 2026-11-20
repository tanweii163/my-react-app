// 第 7 课 · cartReducer —— 把购物车"怎么改"集中成一个纯函数
//
// 本文件教什么：
//   reducer 是一个纯函数：(state, action) => newState。
//   它只负责回答一个问题："收到某种 action，新状态长什么样？"
//   所有更新逻辑集中在 switch 里，组件里的 dispatch 只是"发通知"，
//   不会再出现 setter 逻辑散落各处、互相踩脚的情况。
//
// 两条铁律（违反任何一条都会出难查的 bug）：
//   1. 纯函数：不许发请求、不许改 state 外的变量、不许直接改传入的 state；
//   2. 不可变更新：永远返回新对象/新数组，绝不 push / splice / 直接改属性。
//      React 靠 Object.is 比较"新旧 state 是否同一个引用"来决定要不要重渲染，
//      你原地改内容，引用没变，React 会认为"没变化"而跳过渲染。
//
// 状态形状：{ items: [{ id, name, price, qty }] }
// action 形状：{ type: 'add' | 'inc' | 'dec' | 'remove' | 'clear', payload?: 数据 }

// 初始状态：独立导出，组件里 useReducer(reducer, initialCart) 直接复用；
// clear 的目标也是它，避免两处手写空购物车。
export const initialCart = { items: [] }

export function cartReducer(state, action) {
  switch (action.type) {
    // ── add：加入一件商品（payload 携带商品对象 { id, name, price }）──
    case 'add': {
      const { id, name, price } = action.payload
      const existing = state.items.find((it) => it.id === id)

      // 同一商品已在购物车：不新增条目，只把命中的那条换成"数量 +1 的新对象"，
      // 其余条目原样保留 —— 这就是 map 做不可变更新的标准手法。
      if (existing) {
        return {
          ...state, // 浅拷贝外层对象（本例只有 items 一个字段，养成习惯）
          items: state.items.map((it) =>
            it.id === id ? { ...it, qty: it.qty + 1 } : it,
          ),
        }
      }

      // 新商品：展开旧数组得到副本，再追加新对象 —— [...旧数组, 新元素]。
      // 千万别写 state.items.push(...)，那是原地修改，引用不变，界面不更新。
      return { ...state, items: [...state.items, { id, name, price, qty: 1 }] }
    }

    // ── inc：数量 +1（payload 携带商品 id）──
    case 'inc':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.payload.id ? { ...it, qty: it.qty + 1 } : it,
        ),
      }

    // ── dec：数量 -1（payload 携带商品 id）──
    // 教学取舍：数量减到 0 时直接把该条目移除（电商购物车惯例）。
    // 注意 reducer 里这是"一个 case 算出最终结果"，不存在"先 -1 再判断要不要删"
    // 的两步 setState —— 这正是把逻辑集中到纯函数的好处：状态转移一步到位，
    // 不会出现"数量停在 0 的空条目"这种中间态。
    case 'dec': {
      const target = state.items.find((it) => it.id === action.payload.id)
      if (!target) return state // 防御：商品不在购物车里，状态原样返回

      // 数量 > 1：map 做不可变的 -1；只剩 1：filter 生成删掉该条目的新数组
      return target.qty > 1
        ? {
            ...state,
            items: state.items.map((it) =>
              it.id === action.payload.id ? { ...it, qty: it.qty - 1 } : it,
            ),
          }
        : { ...state, items: state.items.filter((it) => it.id !== action.payload.id) }
    }

    // ── remove：整条删除（payload 携带商品 id）──
    // filter 天然返回新数组，命中过滤条件的项被排除，其余原样保留。
    case 'remove':
      return {
        ...state,
        items: state.items.filter((it) => it.id !== action.payload.id),
      }

    // ── clear：清空 ──
    // 直接复用初始状态。不需要 payload。
    case 'clear':
      return initialCart

    // 铁律：未知 action 原样返回旧 state。这保证 reducer 对任何输入都安全，
    // 也避免将来新增 action 时手滑打错 type 导致整个购物车变成 undefined。
    default:
      return state
  }
}
