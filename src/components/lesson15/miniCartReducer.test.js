// miniCartReducer 的单元测试 —— 纯函数测试的样板
//
// 测什么：只测"输入 → 输出"。不渲染组件、不碰 DOM、不需要 mock，
// 每个用例都是同一句三段式：构造初始 state → dispatch 一个 action → 断言新 state。
// 这样的测试毫秒级跑完，是测试金字塔里"应该最多、跑得最勤"的那一层。
//
// 9 个用例覆盖任务要求的：正常加购 / 同款合并 / 减到 0 移除 / 总价正确，
// 外加边界：减不存在的 id、数量已是 0 场景的孪生（unknown action）、不可变性、空车总价。
//
// 注意第一行 import：globals 没开（见 vitest.config.js），
// describe / it / expect 必须【显式】从 vitest 拿——它们不是 JavaScript 内置。
import { describe, it, expect } from 'vitest'
import { miniCartReducer, cartTotal } from './miniCartReducer.js'

// 测试代码也是代码：重复三次以上的造数据样板就该抽成小工厂。
// 参数只留"这个用例真正关心的字段"，其余默认值让用例读起来一行扫完重点。
const item = (id, name, price) => ({ id, name, price, qty: 1 })

describe('miniCartReducer', () => {
  it('空购物车正常加购一件商品', () => {
    // 三段式样板：arrange（准备）→ act（执行）→ assert（断言）
    const next = miniCartReducer([], {
      type: 'add',
      item: { id: 'apple', name: '苹果', price: 3 },
    })
    expect(next).toHaveLength(1)
    expect(next[0]).toEqual({ id: 'apple', name: '苹果', price: 3, qty: 1 })
  })

  it('重复加购同款商品合并数量，不新增一行', () => {
    const cart = miniCartReducer([], {
      type: 'add',
      item: { id: 'a', name: 'A', price: 1 },
    })
    const next = miniCartReducer(cart, {
      type: 'add',
      item: { id: 'a', name: 'A', price: 1 },
    })
    expect(next).toHaveLength(1)
    expect(next[0].qty).toBe(2)
  })

  it('不同商品各自成行，互不影响', () => {
    let cart = miniCartReducer([], { type: 'add', item: { id: 'a', name: 'A', price: 1 } })
    cart = miniCartReducer(cart, { type: 'add', item: { id: 'b', name: 'B', price: 5 } })
    expect(cart).toHaveLength(2)
    expect(cart.map((it) => it.id)).toEqual(['a', 'b'])
  })

  it('数量减到 0 时把商品从购物车移除（边界）', () => {
    // arrange：购物车里有一件 qty=1 的商品，再减就到 0
    const cart = [item('b', 'B', 2)]
    const next = miniCartReducer(cart, { type: 'dec', id: 'b' })
    expect(next).toHaveLength(0)
  })

  it('减一个购物车里不存在的 id，原样返回不报错（边界）', () => {
    const cart = [item('a', 'A', 1)]
    const next = miniCartReducer(cart, { type: 'dec', id: 'ghost' })
    expect(next).toEqual(cart)
  })

  it('未知 action 原样返回，reducer 不崩（边界）', () => {
    const cart = [item('a', 'A', 1)]
    // 第 9 课的约定在测试里兑现：reducer 对任何输入都有安全回应
    expect(miniCartReducer(cart, { type: 'nope' })).toEqual(cart)
  })

  it('纯函数铁律：不修改传入的旧 state（不可变性）', () => {
    const before = [item('a', 'A', 2)]
    // 先拍一份深拷贝快照，dispatch 之后逐字段对比"案发现场"是否被动过
    const snapshot = structuredClone(before)
    miniCartReducer(before, { type: 'add', item: { id: 'a', name: 'A', price: 2 } })
    expect(before).toEqual(snapshot)
  })
})

describe('cartTotal', () => {
  it('空购物车总价为 0（边界）', () => {
    expect(cartTotal([])).toBe(0)
  })

  it('总价 = 单价 × 数量 再求和（派生正确）', () => {
    const cart = [
      { ...item('a', 'A', 3), qty: 2 }, // 3 × 2 = 6
      { ...item('b', 'B', 5), qty: 1 }, // 5 × 1 = 5
    ]
    expect(cartTotal(cart)).toBe(11)
  })
})
