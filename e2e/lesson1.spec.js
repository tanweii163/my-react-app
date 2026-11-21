// 第 36 课 · E2E 用例二：第 1 课的计数器与待办（交互闭环）
//
// 本文件教什么：
//   1. "点按钮 → state 变 → DOM 变"的完整闭环是单元测试和 E2E 分工最清楚的地方：
//      单元测试用 fireEvent 假装点击、断言 state/组件输出；E2E 用真浏览器点真按钮，
//      读真实渲染出来的文字——连"事件绑定有没有真的挂上"一起测了；
//   2. toHaveText 内置自动等待（waitFor 机制）：点完 +5 不需要 sleep。
//      Playwright 会反复重试断言，直到数字变成 5 或超时为止——这是对抗 React 异步渲染
//      （批处理、并发特性）的第一道防线，也是反 flake 的核心机制；
//   3. 表单交互 fill + 点提交，断言"共 N 项"这条派生文案的变化（第 1 课 useState / 第 4 课受控表单的成果）。
import { test, expect } from '@playwright/test'

test.describe('第 1 课 · 计数器与待办', () => {
  test('点 +5 后大数字显示 5', async ({ page }) => {
    await page.goto('/lesson/1')

    // 第 1 课页面上唯一的 .big-number 就是 Counter 的大数字。
    // 先断言初始值 0：排除"页面根本没渲染、断言碰巧绿"的假阳性——先钉住起点，再钉终点
    const bigNumber = page.locator('.big-number')
    await expect(bigNumber).toHaveText('0')

    // getByRole('button', { name })：按角色 + 可见文字找按钮，
    // 等价于用户心智里的"点那个写着 +5 的按钮"，比 CSS 选择器更接近真实交互语义
    await page.getByRole('button', { name: '+5' }).click()

    // React 重新渲染有延迟，toHaveText 会自动重试到变 5 为止——绝不手写 waitForTimeout
    await expect(bigNumber).toHaveText('5')
  })

  test('待办添加一条后，列表计数变化', async ({ page }) => {
    await page.goto('/lesson/1')

    // "共 N 项"是 todos.length 的派生文案：数它 = 用户视角的"列表变长了"，
    // 比数 <li> 节点更接近用户在乎的事（断言钉用户价值，不钉实现）
    const counter = page.getByText(/共 \d+ 项/)
    await expect(counter).toHaveText(/共 2 项/) // TodoList 初始数据是 2 条

    // fill 触发的是真实 input 事件，受控组件的 onChange 会收到（第 4 课：value + onChange）
    await page.getByPlaceholder('输入待办事项，回车添加').fill('用 Playwright 加的一条')
    await page.getByRole('button', { name: '添加' }).click()

    await expect(counter).toHaveText(/共 3 项/)
    // 新待办真的出现在列表里——内容断言补上"计数对了但内容丢了"的盲区
    await expect(page.getByText('用 Playwright 加的一条')).toBeVisible()
  })
})
