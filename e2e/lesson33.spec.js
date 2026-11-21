// 第 36 课 · E2E 用例四：第 33 课 i18n 切换与持久化
//
// 本文件教什么：
//   1. "切换语言 → 整页文案变"是跨几十个组件的联动（每个 useTranslation 订阅者各自重渲染），
//      但 E2E 只断言用户看得见的两处（标题变英文）——E2E 是黑盒：关心"用户看到什么"，
//      不关心内部订阅机制（那是单元测试的事），分工意识；
//   2. 刷新后语言保持 = localStorage 持久化真正生效。E2E 的 page.reload() 是真刷新：
//      内存里的 state 全部清零，语言选择只能来自 localStorage（LanguageSwitcher 写入的键）——
//      "内存 state 和持久化数据谁在起作用"这种问题，只有真刷新能验证；
//   3. 确定性第一：Playwright 默认浏览器 locale 是 en-US，第 33 课的语言探测器
//      会把界面初始化成英文。测试开头显式点"中文"把初始状态钉死——
//      用例绝不能依赖测试机的浏览器环境，否则换个机器就 flake。
import { test, expect } from '@playwright/test'

test.describe('第 33 课 · i18n 切换与持久化', () => {
  test('点击 English 后整页标题变英文', async ({ page }) => {
    await page.goto('/lesson/33')

    // 先显式切到中文，把初始状态钉死（不依赖测试机的浏览器语言偏好）
    await page.getByRole('button', { name: '中文' }).click()
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveText('第 33 课：i18n 国际化')

    // 语言按钮组的标签永远显示语言自己的名字（"中文"/"English"不翻译），
    // 所以无论当前界面是哪种语言，getByRole('button', { name: 'English' }) 都找得到它
    await page.getByRole('button', { name: 'English' }).click()

    // 整页几十处文案同时换词，这里钉用户最先看的一处。切换器用 aria-pressed 标记当前语言，
    // 顺手补一条可访问性断言：English 按钮此刻应是按下态（第 26 课 toggle button 的正确表达）
    await expect(h1).toHaveText('Lesson 33: i18n (Internationalization)')
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('刷新后语言保持（localStorage 持久化）', async ({ page }) => {
    await page.goto('/lesson/33')

    await page.getByRole('button', { name: 'English' }).click()
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveText('Lesson 33: i18n (Internationalization)')

    // 真刷新：所有内存 state 清零，界面还是英文 → 选择必然来自 localStorage 而不是内存
    await page.reload()
    await expect(h1).toHaveText('Lesson 33: i18n (Internationalization)')

    // 把"为什么保持"也钉死：切换器写入的键（i18n.js 的 LANG_KEY）
    const stored = await page.evaluate(() => localStorage.getItem('my-react-app:lang'))
    expect(stored).toBe('en')
  })
})
