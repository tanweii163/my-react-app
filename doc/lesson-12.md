# 第 12 课 · 代码分割与懒加载

## 学习目标

完成本课后，你应该能够：

1. 说清楚默认打包的问题：所有代码进一个 bundle，用户首屏要下载、解析完整个文件才能看到页面；
2. 熟练写出 `React.lazy(() => import('./X'))` + `<Suspense fallback>` 的组合，并说清 lazy 的生效时机——**首次渲染时**才下载，不是写 `lazy()` 那行时；
3. 说清静态 `import` 与动态 `import()` 的区别，以及 `import()` 为什么能让构建工具拆出独立 chunk；
4. 区分 Suspense 的 **fallback**（React 管理的机制）与 **loading 状态**（你自己管理的 state），知道各适合什么场景；
5. 知道路由级代码分割怎么写、为什么它是真实项目里收益最大的拆分粒度。

本课对应的示例代码：

- `src/components/lesson12/HeavyChart.jsx` —— "假装很大"的重组件（内联 SVG 柱状图）
- `src/components/lesson12/LazySection.jsx` —— lazy + Suspense 的完整演示：点按钮才首次挂载
- 页面入口在 `src/pages/Lesson12.jsx`

## 核心概念

### 默认打包：一个 bundle 的代价

Vite 构建时，从入口 `main.jsx` 出发，把静态 `import` 到的所有模块打平、合并成（少数）几个 JS 文件。本项目 14 个课页面全在 `main.jsx` 里静态 import，构建后全在一个主 chunk 里；真实项目再叠加图表、富文本编辑器这类几百 KB 的第三方库，主包轻松上 MB。

代价在两处：**下载**（网络传输）和**解析执行**（JS 是要 CPU 跑的）。用户必须等整个 bundle 下载并执行完，才能看到首屏——哪怕其中 80% 的代码这次访问根本不会用到。

判断什么值得拆出去的标准：**首屏用不到、且只有部分用户会用到**的代码。典型候选：重组件（图表/编辑器/地图）、低频页面（设置页、报表页）。反过来说，代码分割**不减少总下载量**，只改变"什么时候下载"——如果一段代码人人首屏都要用，拆出去反而多一次请求、还会让首屏出现 loading 闪烁。

### 静态 import vs 动态 import()

```js
import HeavyChart from './HeavyChart.jsx' // 静态：构建期就确定依赖，被打进主包
const mod = await import('./HeavyChart.jsx') // 动态：运行时才发起，构建工具为它单独拆一个 chunk
```

`import()` 不是普通函数——它是 ES 标准语法，Vite/Webpack **在构建期扫描它**，把它指向的模块（及其独有依赖）拆成独立的 chunk 文件（文件名带 hash，如 `HeavyChart-abc123.js`），运行时按需下载并返回 Promise。**静态 import 写在模块顶部、必选；动态 import 写在表达式位置、可选。**

### React.lazy：把"下载"推迟到首次渲染

```jsx
import { lazy, Suspense } from 'react'

// 第 1 步：登记。这一行执行时没有任何网络请求——import() 在函数体里，还没被调用
const HeavyChart = lazy(() => import('./HeavyChart.jsx'))

// 第 2 步：用 Suspense 接住加载期
<Suspense fallback={<p>加载中…</p>}>
  <HeavyChart /> {/* 第 3 步：第一次渲染它时，import() 才执行，chunk 开始下载 */}
</Suspense>
```

三条契约，缺一不可：

1. `lazy()` 的参数是**"返回 `Promise<模块>` 的函数"**，返回的模块对象必须带 `default` 导出（具名导出要手动映射：`import('./X.jsx').then(m => ({ default: m.X }))`）；
2. lazy 组件**必须包在某个 `<Suspense>` 里**，否则渲染暂停时没人接住，整棵树报错；
3. **生效时机是铁律**：`lazy()` 只是登记，`import()` 在该组件第一次被渲染时才执行。这就是"页面初始不渲染它，chunk 就不下载"的原因。

下载完成后 React 会记住这个模块：卸载再挂载，直接同步渲染，不再出 fallback——chunk 只下载一次（模块系统缓存），这次加载的开销是一次性的。

### Suspense 接住的是"渲染暂停"，不是错误

首次渲染 lazy 组件时 chunk 还在路上，这次渲染没法完成——React 让它**暂停（suspense）**，找到组件上方**最近的 `<Suspense>`** 渲染它的 `fallback`；Promise resolve 后 React 自动重试渲染，换上真组件，fallback 退场。出场和退场都由 React 管理，你只是声明"等待时显示什么"。

**注意：Suspense 只管"等待"，不管"失败"。** chunk 下载失败（弱网、部署后路径错误）时 Promise reject，渲染抛错——那需要错误边界（第 13 课的 ErrorBoundary）来兜底。

### fallback 与 loading 状态的区别

第 2 课的 fetch 四件套里我们自己管理 `loading`；本课的 fallback 看起来也像"加载中"，但机制完全不同：

| | loading 状态（第 2 课） | Suspense fallback（本课） |
|---|---|---|
| 谁管理 | 你：`useState` 一个布尔值，自己 setState | React：渲染暂停时自动接管 |
| 界面切换 | 你自己写 `if (loading) return <Spinner/>` | 声明式：React 自动换入换出，没有 if 分支 |
| 触发条件 | 任何你能表达的条件（通常"请求进行中"） | 渲染过程中 suspended（lazy chunk 没到、未来的数据源没就绪） |
| 能否保留旧内容 | 能——保留旧列表 + 顶部小 loading 是常见做法 | 默认替换子树；要保留旧内容得用 `startTransition`（第 14 课） |
| 典型场景 | fetch 数据四件套 | `React.lazy` 组件、框架级数据获取 |

一句话：**loading 状态是"你管理的过程"，fallback 是"React 管理的机制"**。两者不冲突——数据请求继续用 loading state（它需要错误处理、重试、保留旧数据这些精细控制），代码拆分交给 lazy + Suspense。

### 路由级代码分割（收益最大）

组件级 lazy 适合重组件；真实项目里**拆得最多的是路由**——每个页面一个 chunk，用户访问哪个页面才下载哪个，首屏 bundle 只留真正需要的布局和首页。

下面的写法演示如何把本项目入口改成路由级分割。**注意：`src/main.jsx` 属于父代理统一管理的文件，本课只讲不改**——下面是示例代码，不是本项目现状：

```jsx
// 现状（src/main.jsx）：14 个页面全部静态 import → 全在同一个 chunk
import Lesson12 from './pages/Lesson12.jsx'
// ...
<Route path="lesson/12" element={<Lesson12 />} />

// 路由级代码分割的写法（示例）：
import { lazy, Suspense } from 'react'

const Lesson12 = lazy(() => import('./pages/Lesson12.jsx'))
// ...每个页面一行 lazy

<Route
  path="lesson/12"
  element={
    <Suspense fallback={<p className="hint">页面加载中…</p>}>
      <Lesson12 />
    </Suspense>
  }
/>
```

三个要点：

1. **fallback 放哪都行，但要够大**：可以像上面每个 `element` 里包一个，也可以在布局路由 `<App />` 的 `<Outlet/>` 外面包一个全局 `<Suspense>`，一次管住所有页面。骨架/文案要撑起页面大致高度，避免跳变；
2. **构建结果立刻可见**：`npm run build` 后 `dist/assets` 里每个页面一个 chunk，主 chunk 明显变小（见下面的动手练习 1）；
3. **本项目为什么没这么做**：教学项目每个页面都很小，拆分省下的体积远小于"14 个页面各多一次请求"的开销；真实项目里页面大、依赖重，路由级分割是标配。**收益要算账，不是"lazy 一把梭"**。

## 代码导读

### `src/components/lesson12/HeavyChart.jsx` —— "假装很大"的重组件

- 顶部注释交代设定：把它想象成一个几百 KB 的图表库（ECharts/D3），本课关心的是"它什么时候被下载"，不是它长什么样。实际用内联 SVG 手画柱状图（`<rect>` 柱子 + `<text>` 标签），不引入任何真库；
- **模块顶部的 `console.log('[HeavyChart] chunk 已下载并执行…')`** 是观察分割效果的另一只眼睛：刷新页面后控制台没有这行，点按钮、chunk 下载完成后才出现——它与 Network 里的新请求互相印证，证明"模块直到那时才第一次执行"；
- 组件保持纯渲染（第 2 课）：静态数据 + `map` 画 12 根柱子，无 state 无 effect。"重组件"的"重"指体积和渲染开销，不代表需要副作用；
- `export default HeavyChart`：遵守 lazy 的契约（default 导出）。

### `src/components/lesson12/LazySection.jsx` —— lazy + Suspense 完整演示

- `const HeavyChart = lazy(() => import('./HeavyChart.jsx'))` 写在**模块顶层**：登记时零开销，注释里特别标注了"易错：写进组件函数体会导致每次渲染都创建新组件类型，组件被反复卸载重装"；
- `import()` 后面接了 `.then`，人为拖慢 800ms 再 resolve：本地 chunk 下载是毫秒级的，fallback 会一闪而过甚至看不见；教学演示需要亲眼看到 fallback（注释同时警告真实项目别这么写）；
- `show` state 是"要不要首次挂载"的开关：`false` 时 `<HeavyChart/>` 不在 JSX 树里 → import 不执行 → Network 里没有 chunk。页面上有一段 `hint` 明确引导读者开 DevTools → Network → 过滤 JS，亲眼看"点之前没有、点击瞬间出现"；
- `<Suspense fallback={<ChartSkeleton />}>`：骨架屏把"未来内容的位置和大小"先占住（灰块 + shimmer 微光动画，样式在 `lesson12.css`），加载完成后页面不跳动；
- "卸载"按钮 + 再点"加载"：第二次挂载**没有骨架屏、没有新请求**——模块已缓存，lazy 记住了它。这是验证"chunk 只下载一次"的最直接操作。

### `src/pages/Lesson12.jsx` —— 页面组织

- 三个卡片：① 讲"一个 bundle 的代价"与"什么代码值得拆"；② 嵌入 `LazySection` 演示，卡片开头给出 Network 观察步骤；③ 速记卡，浓缩四条规则和 fallback/loading 的区别（详细展开都在本讲义）；
- 页面组件没有任何 state/effect：分割逻辑全部封装在 `LazySection` 里。这也是个示范——"哪里 lazy"应该离"哪里用"最近，页面层只需要知道"这是个按需加载的区块"。

## 动手试一试

1. **build 并数 chunk（必做）**：运行 `npm run build`，打开 `dist/assets/`，记录 JS 文件数量和主 chunk（`index-*.js`）的体积——现在 14 个页面静态 import，页面代码几乎全在主 chunk 里。然后按"路由级代码分割"一节的示例改 `main.jsx`（练习性质：**改完验证完请还原**，该文件由父代理管理），再 build 一次，对比 chunk 数量和主 chunk 体积。提示：Vite 为每个 `import()` 生成一个独立 chunk，文件名里的 hash 与你在 Network 里看到的对应。
2. **具名导出映射**：把 `HeavyChart.jsx` 的导出改成 `export function HeavyChart()`（去掉 default），然后修改 `LazySection.jsx` 里的 lazy 调用为 `lazy(() => import('./HeavyChart.jsx').then(m => ({ default: m.HeavyChart })))`。体会 lazy 的契约本质是"`Promise<{ default: 组件 }>`"——很多只提供具名导出的第三方模块都靠这一手接入。
3. **验证"只下载一次"**：加载 → 卸载 → 再加载。第二次有骨架屏吗？Network 里有第二个请求吗？再用控制台验证：`[HeavyChart] chunk 已下载并执行…` 这行日志打印了几次？想清楚两层缓存的分工——模块系统缓存"模块对象"，React.lazy 缓存"加载结果"。

## 易错点

1. **被拆的模块没有 default export**：现象是点按钮后控制台报 "element type is invalid" 类错误、页面崩掉。原因：lazy 要求模块对象带 `default`，拿到 `undefined` 就渲染失败。修法见练习 2 的 `.then(m => ({ default: m.X }))` 映射。
2. **lazy 组件忘包 Suspense**：现象是整棵树直接报错白屏，错误信息里有 suspend/fallback 字样（React 版本不同措辞略有差异）。原因：渲染暂停时上方没有任何 `<Suspense>` 接住。注意 Suspense 要写在 lazy 组件**上方**（最近祖先即可，不必紧贴）。
3. **把 `lazy()` 写进组件函数体**：现象是每次 setState 组件都闪一下、重新挂载（内部 state 全部丢失）。原因：每次渲染都执行一次 `lazy(...)`，创建出"新的组件类型"，React 视为不同组件，卸载旧的装新的。铁律：`lazy()` 放模块顶层，与组件定义同级。
4. **以为代码分割能省流量**：它只是推迟下载，总下载量不变，还可能因多出请求略增开销。对"人人首屏都要用"的代码做分割是负收益（多一次请求 + 首屏闪 loading）。
5. **本地看不清 fallback，就以为 lazy 没生效**：localhost 下载只要几毫秒，fallback 一闪而过。用 DevTools Network 的节流（Slow 4G）或像本课这样人为延迟后再观察。判断"生效没有"的权威证据是 Network 里 chunk 出现的时机，不是 fallback 是否肉眼可见。

## 自测题

1. `const X = lazy(() => import('./X.jsx'))` 这行代码执行时，浏览器发出网络请求了吗？请求发生在什么时候？
2. 从点下按钮到柱状图出现，中间经历了哪几步？fallback 在哪一步出场、由谁决定何时退场？
3. loading 状态和 Suspense fallback，谁能在"加载新内容"时保留旧内容？想让 fallback 也不打断旧内容，该用什么 API（提示：下一课之后的第 14 课）？
4. chunk 下载失败（弱网、部署后资源路径错误）时用户会看到什么？Suspense 能接住吗？

### 参考答案

1. 没有。`lazy()` 只是登记一个"取模块的函数"，此时什么也不发生；该组件第一次被渲染时 React 才调用它，那一刻 `import()` 执行、chunk 开始下载。
2. `setShow(true)` → `HeavyChart` 第一次进入 JSX 树 → React 调用 lazy 的函数 → `import()` 请求 chunk → 此时渲染无法完成，暂停（suspense）→ 最近的上层 `<Suspense>` 渲染 fallback（出场）→ chunk 下载并执行，Promise resolve → React 自动重试渲染 → 真组件渲染完成，fallback 退场。出场和退场都由 React 管理。
3. loading 状态可以——数据请求常做成"保留旧列表 + 顶部小 loading"。fallback 默认替换整个子树；想让更新期间保持旧 UI，需要用 `startTransition` 把更新标记为"可等待的过渡"，React 会在后台准备好新内容再切换（第 14 课细讲）。
4. `import()` 的 Promise reject，lazy 组件渲染时抛错，页面报错/白屏。Suspense 只管"等待"不管"失败"，需要错误边界（第 13 课的 ErrorBoundary）兜底，常见做法是捕获后显示"重试"按钮。

## 下一课预告

第 13 课 · 错误边界：lazy 的 chunk 可能下载失败、重组件可能在渲染时抛错——谁来接住这些"渲染期错误"，让页面不至于整树白屏？
