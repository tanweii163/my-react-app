// 第 21 课 · GenericList：泛型组件——一份列表逻辑，N 种数据形状
//
// 本文件教什么：
// 1. 函数组件也能带"类型参数"：function GenericList<T extends Item>(...)。
//    T 由调用方喂进来的数据自动推断（不用手动写 GenericList<Student>）；
//    extends Item 是约束：进来的类型必须至少有 id 字段——因为列表渲染离不开 key
//    （第 2 课铁律），而 id 是最稳的 key 来源。约束越准，组件内部越敢用字段；
// 2. items: T[] + renderItem: (item: T) => ReactNode 的分工（render props 套路）：
//    组件管"怎么遍历、怎么加 key、空态显示什么"——这是要复用的部分；
//    调用方通过 renderItem 管"每一项画成什么样"——这是要定制的部分。
//    喂词表、喂学员表，组件一行不改：这就是"逻辑复用不限类型"；
// 3. 对比 JS 版：同样的组件在 JS 里只能靠注释约定"items 里要有 id"，
//    谁忘了就运行时 undefined 崩掉；TS 版里约束写在类型上，违反了连编译都过不去。

import type { Key, ReactNode } from 'react'

// 列表项的最低要求：有一个 id。
// React.Key 是 string | number 的官方别名（key 的合法类型），所以数字 id、字符串 id 都能进。
export interface Item {
  id: Key
}

// 泛型 props：T 在 interface 名后声明，extends 约束也写在这。
// 注意 renderItem 的参数类型是 T（不是 any、不是 Item）：
// 调用方喂什么形状，回调里就拿到什么形状的完整字段提示。
interface GenericListProps<T extends Item> {
  items: T[]
  /** 每一项的渲染交给调用方——组件管遍历与 key，调用方管长相 */
  renderItem: (item: T) => ReactNode
  /** 可选：空列表文案，有默认值 */
  emptyText?: string
}

export default function GenericList<T extends Item>({
  items,
  renderItem,
  emptyText = '暂无数据',
}: GenericListProps<T>) {
  // 空态也属于"复用的逻辑"：调用方不用每个列表自己写一遍 if
  if (items.length === 0) {
    return <p className="hint">{emptyText}</p>
  }
  return (
    <ul className="l21-generic-list">
      {items.map((item) => (
        // key 用约束保证存在的 id：把 extends Item 删掉试试——item.id 立刻红线，
        // 因为裸的 T "可能没有 id"。这就是约束的价值：约束换使用权限。
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}
