// 第 36 课 · E2E 用例三：第 32 课虚拟列表（E2E 独有价值示范）
//
// 本文件教什么：
//   1. "裸版 100000 行全部进了 DOM、虚拟版只有不到 50 行"这件事，jsdom 单元测试测不了：
//      jsdom 没有 layout/视口，虚拟化窗口的大小由真实浏览器算出来——
//      只有真浏览器能回答"此刻 DOM 里到底有几个节点"。这是 E2E 不可替代性的最佳示范：
//      不是 E2E 比单元测试"更高级"，而是有些真相只存在于真实环境里；
//   2. 数 DOM 节点 = 数真实成本：裸版断言 === 100000（一行没省，卡顿的元凶），
//      虚拟版断言 < 50（视区行数 + 2 × overscan）。两个方向都钉死，防止"裸版悄悄被优化了"
//      （对照实验失去意义）或"虚拟版退化成全量渲染"（bug）任何一边逃逸；
//   3. 注意选择器的差异：裸版行是 <li>（普通列表），虚拟版行是绝对定位的
//      <div class="l32-item-virtual">——E2E 断言的是"真实渲染的行数"，所以数虚拟版的行类，
//      注释里讲清楚两个选择器为什么长得不一样。
import { test, expect } from '@playwright/test'

test.describe('第 32 课 · 虚拟列表的 DOM 真相', () => {
  test('裸版：100000 行全部渲染进 DOM（对照组的"病"）', async ({ page }) => {
    await page.goto('/lesson/32')

    // #l32-raw-list 是 RawList.jsx 里写死的 id（教学组件，定位锚点显式给出）。
    // 10 万个 <li> 的真实创建要一两秒，所以给这条断言放宽超时——
    // E2E 要尊重真实渲染成本：超时不是越短越严格，而是"足够等到真相出现"
    await expect(page.locator('#l32-raw-list > li')).toHaveCount(100000, { timeout: 15000 })
  })

  test('虚拟版：数据还是 100000 条，DOM 里只有不到 50 行', async ({ page }) => {
    await page.goto('/lesson/32')

    // 虚拟版的行是 div（.l32-item-virtual），不是 li——windowing 用绝对定位画行，
    // 所以数"行类"而不是数列表项标签（对比上一条测试的选择器，思考题在 doc/lesson-36.md）
    const virtualItems = page.locator('#l32-virtual-list .l32-item-virtual')

    // 先确认窗口行真的渲染出来了，再断言上限——下限 + 上限两个方向都钉住
    await expect(virtualItems.first()).toBeVisible()
    const count = await virtualItems.count()

    // 320px 高的滚动容器 ÷ 36px 行高 ≈ 9 行，+ 上下各 5 行 overscan ≈ 19 行，
    // 距离 50 的上限很远：即便窗口/字号微调导致行数浮动，这条断言也稳
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(50)
  })
})
