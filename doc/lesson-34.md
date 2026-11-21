# 第 34 课 · Tailwind CSS

打开 http://localhost:5173/lesson/34 ，你会看到**同一张资源卡片**的两种写法并排：左边纯 Tailwind utilities，右边项目原有的 `.card` 语义类。这一课不站队，而是把两种哲学的取舍摆到桌面上，并解释本项目为什么"双轨并行"以及为什么**禁用 preflight**。

## 学习目标

完成本课后，你应该能够：

1. 说清 utility-first 与语义 class 两种哲学的核心差异与各自舒适区，并能针对一个新组件做出有理由的选型；
2. 会用 Tailwind v4 的**粒度导入**（theme + utilities，不含 base）把 Tailwind 安全地接入已有项目，并解释为什么必须跳过 preflight；
3. 熟练使用状态前缀（`hover:` / `focus-visible:`）、任意值语法（`bg-[#1f2430]`）与容器查询（`@container` + `@md:`）这三类高频模式；
4. 能解释 JIT 的**静态扫描原理**，并因此避免"模板字符串拼类名丢样式"这个 Tailwind 最经典的坑；
5. 能复述本项目的双轨现状：语义类服务全局视觉语言，utilities 只在本课组件内出现，边界清晰互不污染。

本课对应的示例代码：

- `src/components/lesson34/tw.css` —— Tailwind v4 粒度导入：只要 theme + utilities，坚决不导 base（preflight）
- `src/components/lesson34/TailwindCard.jsx` —— 同一张资源卡片的两种写法并排对比
- `src/components/lesson34/UtilityPatterns.jsx` —— 常用模式速查：状态前缀 / 任意值 / 容器查询 / 条件拼接正解
- `src/pages/Lesson34.jsx` —— 页面编排：对比卡 + 选型结论卡 + 双轨现状说明
- `src/pages/lesson34.css` —— 本课无需额外样式（utilities 与复用的语义类已覆盖），特此留名说明

## 核心概念

### utility-first vs 语义 class：两种哲学

| 维度 | utility-first（Tailwind） | 语义 class（App.css 的 `.card`） |
|---|---|---|
| 一段样式住在哪 | JSX 的 class 字符串里，就地可见 | 独立 CSS 文件，结构与样式分离 |
| 改一个样式 | 删一个类名、加一个类名，不换文件 | 跳到 CSS 文件改规则 |
| 复用方式 | 抽 React 组件（官方推荐） | 多处元素共用同一个类名 |
| 类名含义 | 描述**样式本身**（`rounded-xl`） | 描述**角色**（`.card` = "这是张卡"） |
| 上手成本 | 记忆 utilities 词汇表 | 只要会 CSS 就能写 |
| 标签可读性 | 类名串长，一眼"很吵" | 标签干净 |
| 防失控能力 | 令牌约束（间距/颜色只能选档位） | 全靠约定与 code review |
| 舒适区 | 原型、局部样式、设计系统统一 | 状态机样式、长期维护、全局视觉语言 |

一句话：Tailwind 把"命名"这个难题直接消灭（不用想类名），代价是标签变长；语义类保住标签的干净，代价是永远要在两个文件间跳转和命名。

### 与 preflight 的恩怨：为什么本项目禁用 base 层

Tailwind v4 的 `@import "tailwindcss"` 等于三层打包：**theme**（设计令牌 CSS 变量）+ **base**（preflight 全局重置）+ **utilities**（工具类）。preflight 会对所有元素做 reset：去掉 heading 的 margin、按钮变透明、border 归零……单看每一项都"很现代"，但它作用于**全页面**。

关键在项目事实：**CSS 一旦被浏览器加载，就不随路由卸载**。你只要打开过 /lesson/34，preflight 就永久驻留——之后访问 /lesson/1–30，App.css 里精心写的 `.card`、`.top-nav` 会被全局重置搅得面目全非（按钮背景被清空、间距消失）。这是"一个路由的样式决定权，污染全站"的典型事故。

所以本课的 `tw.css` 用粒度导入只取安全的两层：

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css";
```

theme 分层导入即可（只声明 CSS 变量、无冲突面）；utilities.css **不带 layer() 导入**是本项目实测得出的坑：`index.css` 里有未分层的全局 `button { background: #eef1f7 }`，而层叠规则是"未分层样式永远赢过分层样式"（与导入顺序无关）——utilities 一旦放进 layer 就会全线被老全局样式击败（按钮变灰、颜色丢失）。保持 utilities 未分层才能赢回优先级。

验证方法：打开 /lesson/2，卡片背景若和原来一样，说明防线守住了。

### 响应式与状态前缀速查

| 前缀 | 含义 | 备注 |
|---|---|---|
| `hover:` | 鼠标悬停态 | 等价 `.x:hover {...}`，但两条规则写在一处 |
| `focus-visible:` | 键盘聚焦态 | 鼠标点击不触发，只服务键盘用户，比裸 `focus:` 更克制 |
| `sm:` / `md:` / `lg:` | 视口 ≥ 640/768/1024px | 注意看的是**视口**，dev 窗口宽时"看不出变化" |
| `@md:` / `@lg:` | 容器 ≥ 28/32rem | 配 `@container` 使用，看的是最近声明容器的**盒子**宽度——卡片级响应式的正解 |
| `dark:` | 深色模式 | 本项目未启用，知道即可 |

记忆锚点：视口前缀管"整个浏览器窗口"，容器前缀管"我这个盒子"。组件库/卡片场景几乎总是后者更对——组件该对自己所处的容器负责，而不是对窗口负责。

### JIT 静态扫描原理：为什么模板拼字符串丢样式

Tailwind v4 不再扫描配置文件清单，而是**扫描所有源码文件，把出现的完整类名字面量收集起来**，只为这些类生成 CSS（JIT，just-in-time）。由此推出一条铁律：

> **类名必须以完整字面量出现在源码里，Tailwind 才会生成它的 CSS。**

反例（最常见的翻车现场）：

```jsx
const cls = `bg-${color}-600` // 源码里不存在 "bg-emerald-600" 这个完整词
```

扫描器按整类名匹配，模板拼接出来的名字在源码里从未整体出现 → CSS 没生成 → 运行时类名正确、样式缺失，是**静默失败**，最难排查。正解是维护完整类名的映射表：

```jsx
const BUTTON_COLORS = {
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
}
```

每个值都是完整字面量，扫描必然命中；代码里也一眼看清所有合法取值。`UtilityPatterns.jsx` 的第 ④ 组演示就是这个正解的现场版。

## 代码导读

1. **先看 `tw.css`**：全文只有 2 行有效导入 + 注释。对照本页"preflight 恩怨"一节，理解 `@layer` 声明的顺序含义与"为什么不导 base"。
2. **再看 `TailwindCard.jsx`**：同一份 `resource` 数据渲染两张卡。左卡逐个类名对回 CSS 声明（`rounded-xl` → `border-radius: 0.75rem`，`gap-2` → `0.5rem`），右卡用 `.card` + 内联样式拼同等视觉——刻意不新增语义类，保证对比公平。
3. **然后 `UtilityPatterns.jsx`**：四组模式从上到下——Tab 到输入框看 `focus-visible:` 光环；看任意值色块；拖容器右下角拉伸看 `@md:` 变横排；点三个按钮看映射表切换颜色。
4. **最后 `Lesson34.jsx`**：纯编排（第 22 课原则），两张结论卡把选型逻辑做成"什么时候用 A / 什么时候用 B"的双栏清单。

## 动手试一试

1. **验证 preflight 防线**：先开 /lesson/2 记住卡片背景色（白底浅灰边框），再访问 /lesson/34，然后回 /lesson/2——背景应该分毫未变。然后（在本地副本里）把 `tw.css` 的 utilities 导入换成完整 `@import "tailwindcss"`，重启后再回 /lesson/2 观察 preflight 的破坏力，改回来。
2. **给 Tailwind 卡加状态**：给徽章 `span` 加 `hover:scale-110 hover:shadow-sm transition-transform`，鼠标悬停看徽章微放大——体会"加一个类 = 加一条样式"的就地感。
3. **制造一次"拼字符串"事故**：在 `UtilityPatterns.jsx` 里把 `ThemedButton` 的 className 改成模板拼接 `` `bg-${color}-600 hover:bg-${color}-700` ``，保存后按钮变透明——在浏览器 DevTools 里确认类名在、样式不在，这就是静态扫描漏扫的证据。改回映射表。

## 易错点

- **导入完整 `tailwindcss`**（含 preflight）：一次就永久污染所有课的样式，且极难发现是"很久前打开过的某一页"干的。永远用粒度导入。
- **把 utilities 放进 `layer(utilities)` 而项目里有未分层的全局样式**：层叠规则"未分层赢过分层"，utilities 会被 index.css 的 `button {}` 等老规则全线击败。本项目 utilities.css 必须不带 layer() 导入（见上文）。
- **模板字符串拼类名**：`bg-${color}-600` 静态扫描不到，样式静默缺失。动态取值一律用完整类名映射表。
- **在卡片里用视口前缀做响应式**：`md:flex-row` 看视口，dev 窗口宽时不生效，还以为是类名写错。卡片内响应式用 `@container` + `@md:`。
- **重复导入 `tw.css`**：CSS 是全局的，多个组件重复 `import './tw.css'` 虽然不会重复生成，但语义上入口应该唯一——本课约定由 `TailwindCard.jsx` 统一导入，页面不再导。
- **把 Tailwind 类名当语义类复用**：`.card` 表达"角色"，`rounded-xl border p-5` 表达"样式"。给一个"也是卡片"的新组件直接抄 12 个 utilities 串，不如问一句：这角色该不该有一个语义类？

## 自测题

1. Tailwind v4 的 `@import "tailwindcss"` 包含哪三层？本项目为什么只导其中两层？
2. `hover:bg-indigo-700` 生成的 CSS 大致长什么样？它和手写 `.btn:hover { ... }` 的区别在哪？
3. 下面代码的按钮为什么没有背景色？给出两种修复方案：`<button className={`bg-${color}-600`} />`
4. `sm:flex-row` 和 `@md:flex-row` 分别以什么为参照？给"卡片头部在窄卡片里变横排"选哪个，为什么？

**答案**：1. theme + base + utilities；base（preflight）是全局重置，CSS 不随路由卸载会永久污染其他页，theme 与 utilities 都是按需生效的安全层。2. `.hover\:bg-indigo-700:hover { background-color: var(--color-indigo-700) }`；区别是状态规则与默认规则写在同一个类名字符串里，不用维护独立 CSS 规则。3. 源码里不存在 `bg-emerald-600` 等完整类名字面量，JIT 静态扫描没收集到、没生成 CSS；修复：改用完整类名映射表，或把所有可能的完整类名以任何形式写进源码（推荐前者）。4. `sm:` 看浏览器视口宽度，`@md:` 看最近 `@container` 祖先盒子的 inline-size；选 `@md:`——组件应对容器负责，视口前缀在宽窗口下无法体现窄卡片场景。

## 下一课预告

第 35 课 · PWA：让应用"装得起来、离线能用"——manifest、Service Worker 与缓存策略，为整个课程系列收尾。
