// 第 36 课 · Playwright 配置文件（E2E 测试的"总开关"）
//
// 本文件教什么：
//   1. Playwright 的行为全部由这一份文件定义：去哪找测试（testDir）、打开哪个网站
//      （use.baseURL）、测试前要不要先确认服务器活着（webServer）——
//      和 vite.config.js / vitest.config.js 同一套思路：一个项目一份工具配置，可发现、可版本管理；
//   2. webServer 复用是本课的实战要点：本项目的 dev server（5173）已经常驻在跑，
//      reuseExistingServer: true 让 Playwright 探测到端口有人就【直接连上去】，不再起第二份；
//      不复用的话两个 dev server 抢同一个端口，起服务直接失败，整批测试没跑就挂；
//   3. fullyParallel: true —— 每个用例跑在独立的浏览器上下文里（localStorage / cookie / URL 全独立），
//      "测试之间永不共享状态"是 E2E 不互相拖累的基础设施保障，不是靠写测试的人小心。
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // 测试文件都住在 e2e/ 目录下（*.spec.js）。
  // 注意：vitest 的默认 include 也是 **/*.spec.js，所以 vitest.config.js 里必须把 e2e/ 排除掉，
  // 否则两套运行器会抢同一批文件——"一个后缀，两个运行器"是真实项目里常见的坑。
  testDir: './e2e',

  // 所有用例并行跑：每个 worker 拿到独立浏览器上下文，互不可见对方的 localStorage 和 URL。
  // 并行 = 快；独立 = 用例之间永远不需要"先跑 A 再跑 B"的顺序依赖
  fullyParallel: true,

  use: {
    // 配了 baseURL 之后，测试里写 page.goto('/lesson/1') 就等于 goto('http://localhost:5173/lesson/1')，
    // 换部署地址只改这一行，spec 文件里不出现任何写死的域名
    baseURL: 'http://localhost:5173',

    // 桌面 Chrome 的视口尺寸 / UA 等默认值。本课只测桌面端，移动端项目加第二组 project 即可
    ...devices['Desktop Chrome'],
  },

  // 跑测试前先探测 url 是否可访问：dev server 已经在跑（父进程常驻 5173），
  // reuseExistingServer: true 命中"端口已有人"就复用，绝不重复起服务；
  // （CI 环境里没人起过 dev server 时，就需要给 webServer 补 command 让 Playwright 自己拉起——
  //  本课程仓库 dev server 常驻，所以只留 url + 复用，保持配置一眼能看完）
  webServer: {
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
