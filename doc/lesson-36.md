# 第 36 课 · E2E 测试 Playwright

单元测试（第 15 课 vitest）证明"零件是对的"，E2E（end-to-end）测试证明"整车能开"：Playwright 驱动一台真实 Chromium，像用户一样打开页面、点按钮、填表单、读屏幕上的字。本课给项目补上四个 spec 文件、九个用例，全部打真实 dev server（http://localhost:5173）。打开终端跑 `npx playwright test --headed`，亲眼看浏览器自己操作自己。

## 学习目标

完成本课后，你应该能够：

1. 画出测试金字塔，说清 E2E 在其中的位置与数量原则（少而关键，不是多而全）；
2. 会用"定位器哲学"写选择器：getByRole 优先、结构限定次之，断言钉"用户在乎的事"；
3. 说清 webServer 复用机制：`reuseExistingServer: true` 为什么让"常驻 dev server + 随手跑测试"两不误；
4. 能解释 flake 的三大成因，并说出两道防线：自动等待（waitFor 机制）与自动重试（retries）；
5. 会用 trace（`--trace on` + `npx playwright show-trace`）在失败后"回放案发经过"。

本课对应的示例代码：

- `playwright.config.js` —— testDir / baseURL / fullyParallel / webServer 复用
- `e2e/home.spec.js` —— 首页目录 ≥ 40 卡、点第 1 课到达 /lesson/1、NavLink active 类
- `e2e/lesson1.spec.js` —— 计数器 +5、待办添加后计数变化
- `e2e/lesson32.spec.js` —— 裸版 100000 行 vs 虚拟版 < 50 行（E2E 独有价值示范）
- `e2e/lesson33.spec.js` —— 切 English 标题变英文、刷新后语言保持
- `src/pages/Lesson36.jsx` —— 本课讲义页（金字塔定位、怎么跑、各 spec 测什么、真实输出）

## 核心概念

### 测试金字塔：E2E 的位置与数量原则

```
        ▲  E2E（本课）      少：只放关键用户路径，慢、真实、贵
       ▲▲  集成/组件测试     中：测组件协作（第 15 课的 RatingStars）
      ▲▲▲  单元测试          多：纯函数/Hook，毫秒级（第 15 课的 reducer）
```

数量原则的经济学：越往塔尖，测试越慢（E2E 一个用例秒级 vs 单元毫秒级）、越脆（依赖网络/渲染时机）、排查越绕（失败点可能在链路任何一处）。所以 E2E 只写"如果断了用户就走不下去"的路径——本课选了四条：**首页目录与导航**（应用入口）、**第 1 课计数器/待办**（最基础的交互闭环）、**第 32 课虚拟列表**（只有真实浏览器能给的答案）、**第 33 课 i18n 持久化**（跨刷新的状态）。其余的验证交给 vitest，别用 E2E 重写单元测试已经覆盖的东西。

第 32 课的 spec 值得单独一提：**"裸版 100000 行全部进了 DOM、虚拟版不到 50 行"在 jsdom 里测不出来**——jsdom 没有 layout、没有视口，windowing 窗口多大完全由真实浏览器算出来。这就是"E2E 不可替代"的样板：不是 E2E 更高级，而是有些真相只存在于真实环境。

### 定位器哲学：getByRole 优先

Playwright 的定位器（locator）按推荐顺序：

1. **`getByRole('button', { name: '+5' })`** —— 按可访问性角色 + 名字找元素。它同时是一份可访问性审计：如果你的按钮靠 `<div onclick>` 实现，getByRole 直接找不到它，测试替用户先发现了问题。名字匹配大小写不敏感、默认子串匹配，`exact: true` 收紧。
2. **`getByPlaceholder` / `getByText` / `getByLabelText`** —— 按用户看得见的文字找，同样贴近用户心智。
3. **CSS/结构定位 `page.locator('.top-nav a')`** —— 适合纯展示结构（课程卡片是 `section.card`）或在更大范围里先限定再缩小（`.top-nav` 里再 getByRole，避免正文同名链接干扰）。

配套的断言哲学：**钉用户在乎的事，不钉实现细节**。目录卡片数断言 `≥ 40` 而不是 `=== 40`（加新课不该误报）；待办计数断言"共 3 项"这条派生文案而不是内部 state；`toHaveCount(100000)` 这种精确断言只在"数字本身就是教学事实"时使用。

### webServer 复用机制

```js
webServer: {
  url: 'http://localhost:5173',
  reuseExistingServer: true,
}
```

Playwright 开跑前先探测 `url`：**端口已经有人（dev server 常驻）→ 直接复用，绝不重起**；探测不到（比如 CI 里没人起服务）才需要 `command` 自己拉起。`reuseExistingServer: false` 时只要端口被占就报错——两个 dev server 抢 5173 的场面谁都不想见。这个开关让"平时开着 dev server 写代码、随手跑一把 E2E"成为零成本动作，也是本地开发与 CI（起服务器再跑）共用的同一份配置。

### flake 的成因与对策

flake（同一份代码、测试忽绿忽红）三大成因：

1. **时序竞态**：断言跑在渲染完成之前。对策一：**自动等待（waitFor 机制）**——Playwright 的每一个动作（click 自动等元素可见可点）和 web 断言（`toHaveText`/`toHaveURL`/`toHaveCount`）都在超时时间内反复重试，直到条件满足。铁律：**绝不手写 `waitForTimeout(3000)` 睡等**，睡短了 flake、睡慢了浪费；睡等是把竞态埋进时间里，自动等待是把竞态交给重试。
2. **测试间状态泄漏**：对策：`fullyParallel: true` 让每个用例跑在独立浏览器上下文里（localStorage/cookie/URL 互不可见），再遵守"用例自备初始状态"——本课第 33 课 spec 开头显式点"中文"钉死初始语言，不依赖测试机浏览器偏好。
3. **环境抖动**（网络、机器负载）。对策二：**自动重试**——配置里加 `retries: 2`，失败用例自动再跑（CI 上尤其值当），配 `--trace on-first-retry` 把重试过程的完整录像/快照留档。重试治"偶发环境抖动"，不治"确定性 bug"：真 bug 重试一百次也是红的。

### trace 调试

E2E 失败时最贵的动作是"盯着控制台猜"。正确姿势是 trace：

```bash
npx playwright test --trace on          # 每个用例录完整 trace
npx playwright show-trace test-results/…/trace.zip   # 打开 trace viewer
```

trace viewer 里有时间轴、每一步的 DOM 快照（可回放点击前后的页面）、console/network 日志。失败瞬间页面长什么样、locator 到底匹配到了谁，一目了然。日常建议 `--trace on-first-retry`：第一遍跑不录（省开销），重试的失败用例自动留档。

## 代码导读

- `playwright.config.js`：`testDir: './e2e'` + `fullyParallel: true`（独立上下文并行）+ `use.baseURL`（spec 里不写死域名）+ `webServer` 复用常驻 dev server。注释里还提醒了 vitest 同名后缀的坑（vitest.config.js 必须排除 e2e/）。
- `e2e/home.spec.js`：三个用例分别钉"目录渲染下限（40 课 / 39 卡：第 3 课无独立页面）"、"点击到导航到达（URL + 标题双断言）"、"NavLink active 正反向成对断言"。
- `e2e/lesson1.spec.js`：先断言计数器初始值 0（排除假阳性），再点 +5 断言 5；待办用 `getByPlaceholder` 填表单、断言"共 N 项"派生文案 + 新条目可见。
- `e2e/lesson32.spec.js`：裸版 `toHaveCount(100000)`（放宽 15s 超时，尊重真实渲染成本）；虚拟版数 `.l32-item-virtual` 行类，下限 >0、上限 <50 双向钉死。注意虚拟版的行是 div 不是 li——注释里讲了为什么。
- `e2e/lesson33.spec.js`：显式点"中文"钉初始状态（Playwright 默认 locale 是 en-US，探测器会直接给英文）；`page.reload()` 真刷新后断言语言保持，并读 `localStorage['my-react-app:lang']` 钉死持久化证据。

## 动手试一试

1. **亲眼看测试跑**：`npx playwright test --headed`（浏览器可见）或 `npx playwright test --ui`（Playwright UI 模式，可单步、可看每个用例的时间线）。跑完 `npx playwright show-report` 看报告。
2. **制造一个失败并调试**：把 `e2e/lesson1.spec.js` 里的 `toHaveText('5')` 改成 `toHaveText('6')`，跑 `npx playwright test --trace on`，然后 `npx playwright show-trace` 打开失败用例的 trace，在 DOM 快照里找到那个真实显示 5 的大数字。改回来。
3. **体验并行与独立上下文**：`npx playwright test --workers=1` 对比默认并行，感受速度差；再在第 33 课 spec 里 `console.log` 打印 localStorage，确认每个用例看到的都是自己的上下文。

## 易错点

1. **手写睡等 `waitForTimeout(3000)`**：睡短了 flake，睡长了浪费——所有等待都该交给自动等待机制（动作自动等、web 断言自动重试），显式等待只在"等待某个不触发 DOM 变化的条件"时用 `expect.poll`。
2. **vitest 和 Playwright 抢 `*.spec.js`**：vitest 默认 include 也是 `**/*.spec.js`，不加 `exclude: ['e2e/**']` 的话 `npm test` 会把 e2e 文件当 vitest 用例收集然后报错。一个后缀两个运行器，必须划清势力范围。
3. **用例依赖测试机环境**：浏览器语言偏好（en-US）、时区、视口不同都会让测试在别的机器上红。用例开头显式钉死自己的初始状态（如点"中文"），或者用 `test.use({ locale: 'zh-CN' })` 固定环境。
4. **E2E 当单元测试写**：一个用例断言 30 个细节、每个交互都从首页点五层进去——E2E 会慢到没人愿意跑。保持"一个用例一条关键路径、断言钉用户在乎的事"。
5. **断言精确过头**：`toHaveText('共 2 项，已完成 1 项')` 这种全句精确匹配，文案改一个字测试就红。正则 `/共 \d+ 项/` 钉住结构、放过措辞。

## 自测题

1. 测试金字塔为什么 E2E 在塔尖且数量最少？什么样的功能值得花 E2E 用例，什么样的不值得？
2. 为什么 `getByRole('button', { name: '+5' })` 比 `page.locator('button:nth-child(2)')` 更好？说出至少两个理由。
3. `reuseExistingServer: true` 时 Playwright 如何决定"复用"还是"自己拉起"服务器？`false` 时端口被占会发生什么？
4. 测试偶发失败（flake）的三大成因是什么？分别对应什么对策？"自动重试"为什么不能治确定性 bug？

<details>
<summary>答案</summary>

1. E2E 最慢（秒级 vs 单元毫秒级）、最脆（依赖真实渲染/环境时序）、失败排查链路最长，所以只放"断了用户就走不下去"的关键路径（首页导航、核心交互闭环、只有真实环境能给答案的场景）。纯函数、单个组件的渲染逻辑、派生计算等，单元/组件测试更快更稳，不值得 E2E。
2. ① 贴近用户心智（"点写着 +5 的按钮"），页面结构重排不会弄断它；② 同时是一份可访问性审计——div onclick 的假按钮根本匹配不上，测试替用户先发现问题；③ nth-child 这类位置选择器极脆，DOM 加一个兄弟节点就指向别的元素。
3. 先探测 `url` 是否可访问：端口已有人（dev server 常驻）→ 直接复用、不重起；探测不到才按 `command` 自己拉起。`false` 时端口被占直接报错退出——两个 dev server 抢同一端口是不允许的。
4. ①时序竞态 → 自动等待（动作自动等可交互、web 断言在超时内反复重试，绝不手写睡等）；②测试间状态泄漏 → 独立浏览器上下文（fullyParallel）+ 用例自备初始状态；③环境抖动 → 自动重试（retries）+ trace 留档。确定性 bug 是每次都复现的逻辑错误，重试只会把失败时间拉长——重试治抖动，不治 bug。

</details>

## 下一课预告

第 37 课 · framer-motion 动效库：`motion` 组件、AnimatePresence 的正确退场、layout 动画与手势——让"会动"不再靠 CSS 硬撸过渡。
