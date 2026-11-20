// RatingStars 的组件测试 —— RTL（Testing Library）查询三件套示范
//
// 测什么：render（挂载）→ screen（查询）→ 断言 / 交互。
// 核心思想：像【用户】一样查页面——按角色（button）和可读名字（"3 星"）找元素，
// 而不是像 CSS 一样 querySelector('.star:nth-child(3)')。
// 后者把测试焊死在实现细节上：改个类名、调个顺序，测试就红；前者只关心
// "屏幕上有没有一个叫 3 星的按钮"，重构内部实现它都稳如泰山。
//
// fireEvent 是最直白的交互模拟；更接近真实用户（含焦点/键盘序列）的
// user-event 见 doc/lesson-15.md 的"动手试一试"。
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RatingStars from './RatingStars.jsx'

describe('RatingStars', () => {
  it('渲染 5 颗星', () => {
    render(<RatingStars value={0} onChange={() => {}} />)
    // getAllByRole：按"角色 + 名字"批量找。星按钮的可读名都以"星"结尾 → 正则匹配
    expect(screen.getAllByRole('button', { name: /星$/ })).toHaveLength(5)
  })

  it('点击第 3 颗，onChange 收到 3', () => {
    // vi.fn()：间谍函数。它不做事，只忠实地记录"被调用了几次、传了什么参数"——
    // 测"组件对外上报了什么"的标准手法（比去猜组件内部存了什么强得多）
    const onChange = vi.fn()
    render(<RatingStars value={0} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '3 星' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('当前 value 对应的星高亮，其余不亮', () => {
    render(<RatingStars value={4} onChange={() => {}} />)

    const four = screen.getByRole('button', { name: '4 星' })
    const five = screen.getByRole('button', { name: '5 星' })
    // toHaveClass 是 jest-dom 匹配器（setup.js 装的）：
    // 断言"有 active 这个类"，而不是断言完整 className 字符串——
    // 将来加一个基础类不至于让测试误红
    expect(four).toHaveClass('active')
    expect(four).toHaveAttribute('aria-pressed', 'true')
    expect(five).not.toHaveClass('active')
    expect(five).toHaveAttribute('aria-pressed', 'false')
  })

  it('value 为 0 时没有任何星被按下（边界）', () => {
    render(<RatingStars value={0} onChange={() => {}} />)
    // queryAllByRole 与 getAllByRole 的区别：查不到时前者返回 []（配 toHaveLength(0)），
    // 后者直接抛错。断言"应该没有"时用 query 系列
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })
})
