// 第 36 课 · E2E 用例一：首页课程目录（渲染 + 导航 + NavLink 激活态）
//
// 本文件教什么：
//   1. E2E 最经典的"关键用户路径"：打开首页 → 看到课程目录 → 点第 1 课 → 到达 /lesson/1。
//      这条链路断了用户什么都学不了，所以它是整个应用最值得花一个 E2E 用例的地方——
//      E2E 只测关键路径，不追求覆盖每个角落（数量原则见 doc/lesson-36.md 测试金字塔）；
//   2. 断言"数量下限"而不是"精确数量"：目录会随课程增加变长，
//      toBeGreaterThanOrEqual(40) 不会因为加新课就误报——脆弱断言（exact match 一切）
//      是 E2E 维护成本的头号来源，断言要钉住"用户在乎的事"，而不是实现细节；
//   3. NavLink 的 active 类是 react-router 在真实浏览器里根据 URL 自动加上的 UI 状态
//      （App.jsx 里的 <NavLink>），jsdom 单元测试很难还原"路由切换后类名跟着变"的完整链路，
//      这正是 E2E 的主场。
import { test, expect } from '@playwright/test'

test.describe('首页课程目录', () => {
  test('渲染全部课程卡片（≥ 39 张）', async ({ page }) => {
    // baseURL 已在 playwright.config.js 配好：'/' 就是 http://localhost:5173/
    await page.goto('/')

    // 定位器哲学：优先 CSS 结构限定范围（main 里、section.card），避免误伤页面其他卡片；
    // "角色 + 名字"（getByRole）适合交互元素，目录卡片是纯展示结构，类名定位更直接
    const cards = page.locator('main > section.card')

    // count() 立即返回当前 DOM 里的数量；断言下限而不是精确值，加新课不会把这测试搞挂。
    // 下限是 39 不是 40：第 3 课（React Router）没有独立页面——它的教材就是 App.jsx / Home.jsx
    // 本身（main.jsx 里也没有 /lesson/3 路由），所以课程目录是 40 课 / 39 张卡片
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(39)
  })

  test('点击第 1 课链接，到达 /lesson/1', async ({ page }) => {
    await page.goto('/')

    // 目录里第一张卡片的标题链接。SPA 点击只换 URL 不刷新页面——
    // toHaveURL 内置自动等待（waitFor 机制）：导航没完成就反复重试，不需要手写 sleep
    await page.locator('main .card h2 a').first().click()
    await expect(page).toHaveURL(/\/lesson\/1$/)

    // URL 到了不算完，页面内容真的换出来才算到达（第 1 课标题可见）
    await expect(page.getByRole('heading', { name: 'JSX、Props、State' })).toBeVisible()
  })

  test('NavLink 激活态：当前页的导航项带 active 类', async ({ page }) => {
    // E2E 不必每次都从首页点过去：直接访问 URL 也是真实用户行为（收藏夹/分享链接）
    await page.goto('/lesson/1')

    // 顶部导航整体限定在 .top-nav 里找，避免和页面正文的链接混淆
    const nav = page.locator('.top-nav')

    // 第 1 课的 NavLink 与当前 URL 匹配 → react-router 自动给它加 active 类
    await expect(nav.getByRole('link', { name: '第 1 课' })).toHaveClass(/active/)

    // 首页的 NavLink 带 end 属性，/lesson/1 不匹配它 → 不该有 active。
    // "正向 + 反向"成对断言，防止 active 类到处乱加也测不出来
    await expect(nav.getByRole('link', { name: '首页' })).not.toHaveClass(/active/)
  })
})
