// 第 15 课 · 被测对象 ①：miniCartReducer —— 一个纯函数 reducer
//
// 本文件教什么："最好测的代码长什么样"。
// reducer 是纯函数：(state, action) => 新 state。不发请求、不改 DOM、
// 不读时间——同样输入永远同样输出。它是第 9 课 useReducer 背后那个函数，
// 也是单元测试的第一优先目标：不需要 jsdom、不需要渲染组件，
// 断言输入输出就完事，毫秒级跑完。
//
// 铁律（测试视角再强调一次）：reducer 绝不能修改传入的 state，
// 每个分支都返回新数组/新对象。下面的测试文件里有专门一个用例验证它。
//
// 数据结构：单件商品 { id, name, price, qty }；购物车 state 就是商品数组。

// 加购：同款（同 id）数量 +1 合并为一行；新品追加一行、qty 从 1 起。
// 注意 reducer"又蠢又纯"：不做价格校验、不弹提示，只负责算出下一个状态。
// 逻辑越简单，测试越好写——这是"可测试性设计"的第一课。
export function miniCartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const exists = items.some((it) => it.id === action.item.id)
      if (exists) {
        // 同款合并：map 出【新数组】，命中的那条返回"扩展开的新对象"
        return items.map((it) =>
          it.id === action.item.id ? { ...it, qty: it.qty + 1 } : it,
        )
      }
      // 新品：展开旧数组 + 追加新对象。
      // 不能用 items.push(...)——push 会修改原数组，违反纯函数铁律
      return [...items, { ...action.item, qty: 1 }]
    }

    case 'inc':
      // 数量 +1：和 add 的合并分支同款写法
      return items.map((it) =>
        it.id === action.id ? { ...it, qty: it.qty + 1 } : it,
      )

    case 'dec': {
      const target = items.find((it) => it.id === action.id)
      // 边界 1：减一个购物车里没有的商品——原样返回，不抛错。
      // reducer 是状态机的转移函数，对未知输入的礼貌是"停在原地"
      if (!target) return items
      // 边界 2：数量已是 1 再减——把商品移出购物车。
      // "减到 0 等于不存在"，业务语义在这一个分支里说清
      if (target.qty <= 1) {
        return items.filter((it) => it.id !== action.id)
      }
      return items.map((it) =>
        it.id === action.id ? { ...it, qty: it.qty - 1 } : it,
      )
    }

    default:
      // 未知 action：原样返回。第 9 课讲过，reducer 必须对任何输入都有安全回应
      return items
  }
}

// 派生数据：总价不存进购物车 state，用的时候直接算（第 2 课铁律的延续）。
// 若把 total 存进 state，就多了"改数量还要记得改总价"这个出错机会；
// 函数永远算得对，而且它本身也是纯函数——顺手就能测。
export function cartTotal(items) {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0)
}
