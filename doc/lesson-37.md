# 第 37 课 · framer-motion 动效库

第 23 课我们用纯 CSS（加一点手写工程）覆盖了大半动效需求，也留下了 CSS 做不了、或要做一堆工程的三件事：**退场动画**、**可中断的手势**、**布局补间**。本课引入动效库 framer-motion，把这三件事降回"声明式 props"，同时守住选型底线——CSS 够用的地方不上库。打开 http://localhost:5173/lesson/37 看讲义。

## 学习目标

完成本课后，你应该能够：

1. 会用 motion 组件三件套 `initial / animate / transition` 做声明式入场，说清 tween（定长+缓动）与 spring（物理弹簧，无时长概念）的选型差异；
2. 会用 `whileHover / whileTap` 把手势声明成 props，并能说出"中断重定向"相对 CSS `:hover` 的核心增量；
3. 会用 `AnimatePresence + exit` 实现真正的退场动画，并能与第 23 课手写 delayedUnmount 逐项对照（卸载时机归谁管、代码量、边界情况）；
4. 会用 `layout / layoutId` 做布局补间与共享元素过渡，理解它的 FLIP 本质（全程只有 transform，不违反第 23 课合成器铁律）；
5. 会用 `variants + staggerChildren` 做多元素编排，用 `MotionConfig reducedMotion="user"` 一行配置全局尊重系统"减少动态效果"设置，并能为一个页面做出"CSS 还是库"的选型、报出 bundle 代价。

本课对应的示例代码：

- `src/components/lesson37/MotionBasics.jsx` —— 三件套（tween vs spring）、手势芯片、variants 错峰入场
- `src/components/lesson37/ExitList.jsx` —— AnimatePresence 退场 + layout 补位，对照第 23 课 ExitAnimation
- `src/components/lesson37/LayoutAnimation.jsx` —— 列表换位、卡片展开收起、layoutId 缩略图↔大图
- `src/pages/Lesson37.jsx` —— 页面编排 + 选型卡 + MotionConfig 包裹
- `src/pages/lesson37.css` —— `l37-` 前缀样式（只写外观，零 transition——动画全归库）

## 核心概念

### 声明式最小单元：initial / animate / transition

```jsx
<motion.div
  initial={{ opacity: 0, x: -48 }}   // 挂载起点
  animate={{ opacity: 1, x: 0 }}     // 目标值
  transition={{ duration: 0.6, ease: 'easeOut' }}  // 怎么走
/>
```

- 值是 props 而不是 class：可以由 state/计算值直接得出，可以插值任意数字，不必受 CSS 属性白名单限制；
- `transition` 选两种引擎：**tween**（固定时长 + 缓动曲线，适合播放型演出）与 **spring**（只有 `stiffness`/`damping` 物理参数，没有时长概念，适合 UI 反馈）。易错点：给 spring 配 `duration` 不报错但完全无效；
- 动画只在"从 initial 到 animate"那一刻播一次。想重播：换 key 强制重挂载（React 惯用法），或用 `useAnimationControls` 命令式驱动（本课从简，未展开）。

### 手势：whileHover / whileTap

指针交互直接声明在 props 里，替代 `onMouseEnter/Leave` 三件套和 CSS `:hover`。库的核心增量是**中断重定向**：动画播到一半交互反转（快速划过又折返），spring 从当前**位置 + 速度**平滑转向；CSS transition 只能从当前计算值按新曲线重放，手感生硬。经验法则：手势一律配 spring。

### 退场动画：AnimatePresence 与第 23 课手写 delayedUnmount 对照表

第 23 课的根因不变：React 卸载是同步瞬间的，"元素已删"与"动画没播"物理互斥。AnimatePresence 的解法是**接管卸载时机**——发现带 `exit` 的子组件被删时，先扣住不卸载，等退场动画播完才真正移除 DOM。两个方案正面对比：

| | ① 手写 delayedUnmount（第 23 课） | ② AnimatePresence + exit（本课） |
| --- | --- | --- |
| 谁管卸载时机 | 你自己：setTimeout 到点才真删数据，元素那一刻才卸载 | 库：数据一步删掉，库扣住 DOM 等 exit 播完才卸载 |
| 时长对齐 | 双时钟陷阱：JS 的 `EXIT_DURATION_MS = 400` 与 CSS 的 `0.4s` 必须人肉对齐，错了就"演到一半被拖下台"或"台空人没走" | 不存在：库自己驱动动画，播完的"动画结束"就是卸载信号 |
| 代码量 | 约 60 行：两份 state（items + leavingIds）、定时器登记表 ref、防重入、卸载清场 | 核心逻辑一行：`exit={{ opacity: 0, x: 48 }}`；删除就是一步 `setItems(filter)` |
| 边界：重复点击 | 必须防重入（退场中屏蔽按钮），否则定时器叠加、状态搅乱 | 库内部处理，无需写防御 |
| 边界：退场中重新加入 | 要自己掐定时器、清 leaving 标记，否则元素"复活"失败 | 库自动取消退场、平滑转回入场 |
| 边界：组件整体卸载 | 必须 useEffect cleanup 掐掉所有未到点的 setTimeout | 库自己清场 |
| 留下项补位 | 已知取舍：补位是瞬间跳变（要 FLIP 才能动画） | `layout` 属性顺带解决：补位自动补间 |
| 适用场景 | 不想引库的单点退场需求 | 项目已用 framer-motion，或退场需求成片 |

选型口径与第 23 课一致：**一处退场手写够用；成片的进出场编排上库**。本课程装了 framer-motion，所以本课演示统一走库——但你要能说清"库替我写了什么"，delayedUnmount 的手写版仍是理解卸载时机的最好教材。

### key 稳定性：AnimatePresence 的硬性前提

AnimatePresence 完全靠**稳定唯一 key** 判断"谁走了"。用数组下标当 key 时，删掉中间一项，后面元素下标集体前移，库会误判"最后一项走了"——错位的元素播退场、真正删的那项瞬间消失。第 5 课的 key 三铁律在这里从"建议"升级为"硬性前提"。同理：同一时刻同一 key 渲染两次必坏。

### variants vs 内联 props

variants 把命名的动画值收编成对象树，父组件广播状态机（`initial="hidden" animate="show"`），子组件只挂同名 variant 就跟随：

| | 内联 props（initial/animate 写在元素上） | variants |
| --- | --- | --- |
| 单元素简单动画 | 直白，首选 | 换个名字，徒增间接层 |
| 多元素错峰（stagger） | 每个孩子手算 `delay={i * 0.15}`——增删元素、改顺序全要重算 | 父级一个 `staggerChildren: 0.15`，自动排队 |
| 状态机多段切换（hidden→show→hidden） | 每处手写两端值，容易漂移 | 命名复用，一处声明 |
| 父子联动（父变子跟着变） | 手动层层传 props | 同名 variant 自动广播 |

结论：单元素动画内联即可；**编排/联动场景才用 variants**——不要为了"规范"把三个数字也包成 variants。

### layout / layoutId：FLIP 自动化

`layout` 解决第 23 课铁律的死角——布局变化怎么动画？答案是 FLIP：渲染前后各测一次位置尺寸（First/Last），用 transform 把元素瞬间摆回旧位（Invert），再补间到 0（Play）。全程只有 transform，不逐帧重排——"能动画布局"却不违反合成器铁律，库替你写了对的那一版。

- 触发是全自动的：挂了 `layout` 的元素，**任何**导致它布局变化的因素（state 换渲染顺序、className 改宽高、条件渲染变高度）都会被捕捉补间——动画值不在 style 里，这是它与 initial/animate 的本质区别；
- 子内容拉伸陷阱：默认 layout 连子内容一起缩放（展开时文字被横向拉变形）。只想"位置跟随、自身不变形"的子元素挂 `layout="position"`；
- `layoutId`：跨元素的共享元素过渡。两个**不同组件**挂同一个 layoutId，一个卸载、另一个挂载的瞬间，库自动做位置/尺寸形变（相册缩略图"长成"大图）。layoutId 必须全应用唯一——它是全局身份，不是列表内的局部名字。

### bundle 体积代价与 tree-shaking 现状

库不是免费的。本仓库 framer-motion 14.14.0 实测（esbuild 打包，minified + gzip）：

| 导入方式 | 体积 |
| --- | --- |
| 全量 `import * as` | 247 KB min / **87 KB** gzip |
| 按需 `import { motion, AnimatePresence, MotionConfig }` | 155 KB min / **53 KB** gzip |
| `LazyMotion + domAnimation + m`（功能分包） | 97 KB min / **35 KB** gzip |

现状要点：

1. **tree-shaking 有效但地板高**：按需导入省约四成，但 motion 单组件就自带手势、drag、layout 全家桶，53 KB gzip 是常态地板——对比第 23 课 CSS 方案的 0 KB；
2. **进一步压缩用 LazyMotion**：全局用 `<LazyMotion features={domAnimation}>` + 把 `motion` 换成轻量版 `m`，只加载需要的功能分包（上表 35 KB；需要 layout 动画时换 `domMax`，会回涨）；
3. 新包名 `motion`（`import { motion } from 'motion/react'`）与 framer-motion 同源同价，迁移不改心智模型；
4. 实践口径：整站动效成片（产品级交互反馈）→ 代价值；单页一两个 hover → 第 23 课 CSS。

### reduced-motion：一行配置与它的边界

第 23 课的无障碍降级要两处手写：CSS 动画在 `@media (prefers-reduced-motion: reduce)` 里掐掉，JS 快照动画自己写闸门。本课的库动画只需页面最外层包一行：

```jsx
<MotionConfig reducedMotion="user">
```

`"user"` = 跟随系统设置：开启"减少动态效果"时，**transform 与 layout 动画自动跳过、直接落终态**（位移动画是眩晕主因），**opacity/颜色动画保留**（褪色不致眩晕）。注意它的边界：MotionConfig **只管库自己的动画**——页面里的纯 CSS 动画仍要 @media 自己拦（见 `lesson23.css`），两套引擎两套闸门。另有 `useReducedMotion()` hook 可在逻辑层读当前设置（如"减少动效时跳过引导动画直接给终态"）。

## 代码导读

- `src/components/lesson37/MotionBasics.jsx`：EnterDemo 两个盒子只有 transition 不同（tween vs spring），点重播换 key 重挂载对比手感；GestureDemo 的 whileHover/whileTap 配 spring（注释讲中断重定向）；StaggerDemo 父级 `listVariants` 里 `staggerChildren: 0.15`，子级只挂同名 `itemVariants`。
- `src/components/lesson37/ExitList.jsx`：删除一步 `setItems(filter)`（注释对照第 23 课的两次更新）；`AnimatePresence initial={false}` 首挂不播入场；每个 li 挂 `exit` + `layout`（补位也动起来）+ `data-item-id`（实测钩子：退场中元素仍在 DOM）。文件头注释讲透 key 稳定性易错点。
- `src/components/lesson37/LayoutAnimation.jsx`：ReorderDemo 只靠 state 换数组顺序 + `layout`；ExpandDemo 卡片宽高由 className 切换、段落进出由 AnimatePresence 管、尺寸补间由 layout 管，标题挂 `layout="position"` 防拉伸；SharedIdDemo 缩略图与大图是两个组件，靠同一 `layoutId` 形变过渡。
- `src/pages/Lesson37.jsx`：选型卡（CSS 够用 vs 该上库的清单 + bundle 代价 + MotionConfig 说明）；整页包 `<MotionConfig reducedMotion="user">`。
- `src/pages/lesson37.css`：只有外观零动画——同一属性混用两个动画引擎是易错点（见下）。

## 动手试一试

1. **调弹簧手感**：把 GestureDemo 的 `stiffness: 400, damping: 17` 改成 `stiffness: 120, damping: 8`（软、回弹明显）再改成 `stiffness: 800, damping: 40`（硬、干脆），反复"快速划过再折返"感受中断重定向的差异；再试着加一行 `duration: 0.3`——不报错但无效，验证"spring 没有时长"。
2. **复现 key 错位 bug**：把 ExitList 的 `key={item.id}` 临时改成 `key={index}`（map 的第二个参数），删除中间一项——观察退场动画落在**错的元素**上。改回稳定 id 后思考：为什么第 23 课手写版同样用错 key 时症状不同？
3. **体验 reduced-motion 降级**：系统设置开启"减少动态效果"（macOS：辅助功能→显示；或 DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion），刷新 /lesson/37——位移与 layout 动画瞬移落终态，淡入淡出仍在播放。

## 易错点

1. **数组下标当 key + AnimatePresence**：退场动画张冠李戴（详见上文对照节）。铁律：AnimatePresence 的子组件必须用稳定唯一 id 当 key。
2. **两个动画引擎抢同一属性**：给 motion 元素的同一属性再写 CSS `transition`，CSS 会把库设置的 inline style 二次补间——卡顿、迟滞、莫名的延迟。本课 css 文件零 transition 就是为了演示这条边界：同一属性只归一个引擎管。
3. **给 spring 配 duration**：不报错、不生效。想要时长感就调 `stiffness/damping`；要精确时长就老实用 tween。
4. **layout 动画拉伸子内容**：默认 `layout` 连内容一起 scale，展开时文字变形。子元素挂 `layout="position"` 只跟随位置。
5. **以为 MotionConfig 能拦截 CSS 动画**：它只管库的动画。混合方案（库 + 手写 CSS 动画共存）时，reduced-motion 降级要两套闸门各拦各的。

## 自测题

1. 第 23 课 delayedUnmount 必须把删除拆成两次 setState，ExitList 却一步删完——是谁接管了什么，才让这一步成为可能？
2. `whileHover` 用 CSS `:hover` 也能做，什么场景下必须用库的手势属性？说出那个 CSS 做不到的能力名称及其原理。
3. variants 与内联 props 各适合什么场景？"staggerChildren 为什么只能写在父级 variant 的 transition 里"？
4. 一个页面只需要一个按钮的 hover 放大效果，你会用哪个方案？请从能力与 bundle 代价两方面给出理由。

<details>
<summary>答案</summary>

1. AnimatePresence 接管了**卸载时机**：子组件从 React 树删除时它先扣住 DOM 不卸载，等 `exit` 动画播完才真正移除。于是"删数据"与"卸载 DOM"解耦——第一步 setState 就能安全删数据，不再需要人为造"退场中"状态和 setTimeout 双时钟对齐。
2. 需要**中断重定向**时：动画进行中被反向交互打断（快速划过再折返、按住中途松手）。原理：spring 记录当前动画的位置与**速度**，转向时从当前速度平滑收敛到新目标；CSS transition 没有速度概念，只能从当前计算值按新曲线重新播放。
3. 内联 props 适合单元素简单动画（直白、少一层间接）；variants 适合编排（stagger 错峰、命名状态机复用、父子联动）。staggerChildren 是父级对"孩子们"的排队指令——子级的 transition 只描述自己怎么走，"相邻孩子间隔多久"这个信息只有持有全部子级的父级知道，所以只能写在父级 variant 的 transition 里。
4. CSS（第 23 课方案）。能力上 hover 放大是标准两态过渡，`transition: transform` 一行就够、还自带 `:hover` 语义，无需中断重定向这类高级手感；代价上 CSS 是 0 KB，而 framer-motion 按需导入也要约 +53 KB gzip——为行级需求引入整个库是典型的过度设计。

</details>

## 下一课预告

动效之外，现代前端还有一大件：把数据画出来。下一课（第 38 课）进入数据可视化——选型图表库、用 React 声明式地画柱状图/折线图，讨论"图表渲染是 DOM 还是 Canvas"这个与"CSS 还是库"同款思路的选型问题。
