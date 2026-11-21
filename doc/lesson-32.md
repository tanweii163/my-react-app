# 第 32 课 · 虚拟列表

数据可以很大，DOM 必须很小。这一课做一个 100,000 行的对照实验：左边把全部数据直接 `map` 成 DOM（滚动卡顿，红色大数字 100,000），右边用 `@tanstack/react-virtual` 只渲染可视区 ± overscan 的行（丝滑滚动，绿色大数字几十）。打开 http://localhost:5173/lesson/32 ，两边各滚几秒钟，再打开 DevTools 的 Elements 面板数一数虚拟版真正存在的 DOM 行——差距自己会说话。

## 学习目标

完成本课后，你应该能够：

1. 说出虚拟化（windowing）的核心公式：起始行 = 滚动距离 ÷ 行高，渲染行数 = 容器高 ÷ 行高 + 2 × overscan——数据 10 万行，DOM 永远只有几十行；
2. 会用 `useVirtualizer` 搭建固定行高虚拟列表：滚动容器 / 撑高占位层 / 绝对定位行三个角色各司其职；
3. 会用 `measureElement` 处理动态行高：estimateSize 负责首次猜测、渲染后测量真实高度并修正；
4. 能判断什么时候**不需要**虚拟列表（少于几百行直接渲染），以及它和第 14 课 Transition 的分工（虚拟化治 DOM 数量、transition 治主线程阻塞）。

本课对应的示例代码：

- `src/components/lesson32/RawList.jsx` —— 裸渲染对照版：10 万行直接 map，页面上显示真实 DOM 行数
- `src/components/lesson32/VirtualList.jsx` —— 固定行高虚拟列表：useVirtualizer 基本用法
- `src/components/lesson32/DynamicHeightList.jsx` —— 动态行高进阶版：measureElement + 随机长度文字
- `src/pages/Lesson32.jsx` —— 页面编排：windowing 原理示意卡 + 两列对照 + 治病边界讨论
- `src/pages/lesson32.css` —— 全部 `l32-` 前缀样式（含纯 CSS 的滚动窗口示意图）

## 核心概念

### 虚拟化原理：可视区计算公式

浏览器一次只需要显示几十行，那 DOM 里放 10 万行就是纯粹的浪费。虚拟列表的思路是**只渲染窗口内的行**，窗口位置由三个量算出：

```
起始行 startIndex   = Math.floor(scrollTop / 行高)
结束行 endIndex     = startIndex + Math.ceil(容器高 / 行高)      （再加 overscan 上下各扩几行）
行 i 的 top 偏移    = i × 行高（固定行高时是纯乘法）
撑高层总高 totalSize = 总行数 × 行高
```

三个角色分工：

| 角色 | 元素 | 职责 |
|---|---|---|
| 滚动容器 | `overflow: auto` 的 div | 真正滚动；useVirtualizer 监听它的 scroll 事件 |
| 撑高占位层 | `height: totalSize` 的空 div | 把滚动条撑到正确长度，行一个不放 |
| 绝对定位行 | `transform: translateY(start)` | 只渲染窗口内的行，位置按公式计算 |

滚动事件发生时，库只做两件事：重算窗口范围、替换 `getVirtualItems()` 数组——React 重渲染二十几行，而不是十万行。

### 为什么 DOM 节点数是浏览器瓶颈

节点数在三层成本上都是线性开销：**布局**（Layout/Reflow，为每个节点算几何信息）、**绘制**（Paint，光栅化成像素）、**内存与合成**（每个 DOM 节点在浏览器 C++ 层都是几百字节起步的对象）。10 万行 ≈ 上百 MB 内存 + 一棵巨大渲染树，滚动时主线程忙不过来，帧率掉到个位数——这就是左边裸版卡顿的全部原因。屏幕同时可见的永远只有几十行，所以正确的规模是「DOM 行数 ≈ 可见行数」，不是「DOM 行数 = 数据行数」。

### 固定行高 vs 动态行高

- **固定行高**是虚拟化的最优场景：每行的位置都是 `index × ROW_HEIGHT` 纯数学，不需要测量，滚动条长度精确无跳动；
- **动态行高**（文字长度不一、图片高度未知）没法预知每行多高，只能走「先猜、再测、随渲染修正」：`estimateSize` 给一个接近平均值的首次猜测，行挂上 DOM 后 `measureElement` 读真实高度写回缓存，库再重算可视区。代价是滚动中滚动条长度可能微调、每次测量都有一点成本——所以内容长度要稳定（随机内容必须在**数据生成时**定型，不能在渲染体里 `Math.random()`，否则行高每次渲染都在变，列表会「跳舞」）。

### 什么时候不需要虚拟列表

少于几百行直接渲染就好：几百个 DOM 节点对现代浏览器毫无压力，虚拟化反而引入测量成本、滚动条跳动、可访问性复杂化（视区外的行不在 DOM 里，读屏器「看」不到整份列表）。虚拟列表治的是**上万行**级别的病；小列表上用它属于表演式优化（回扣第 20 课对 useMemo 的态度）。

### 与第 14 课 Transition 的关系

两者都治「卡」，但病灶不同：**虚拟化治 DOM 数量**——布局/绘制的规模太大；**Transition 治主线程阻塞**——单次大计算或大更新把一帧拉得过长。排查口诀：列表滚动卡先看行数（Elements 面板数节点），交互卡先看计算量（Performance 面板看长任务）；「10 万行的列表还要频繁过滤/排序」这种重列表 + 重交互，两个方案一起上。

### 库选型一句话

**@tanstack/react-virtual**：headless、框架无关、动态行高支持最好（本课用它）；**react-window**：轻量老牌、API 简单，动态行高要额外配方；**virtua**：更新、零配置、按需测量。选哪个都行——原理拆开看都是本课这一套公式。

## 代码导读

### `src/components/lesson32/RawList.jsx` —— 病本身

- `makeRows` 用 `useMemo` 只在挂载时造一次 10 万条数据——**数据可以大，DOM 不能大**；数据生成放渲染体里每次重跑，就是卡上加卡；
- 渲染就是一句 `rows.map(...)`，没有任何优化：这个组件存在的意义就是让你感受滚动卡顿；
- 页面上的红色大数字 `rows.length` 是这份代码造成的真实 DOM 行数：100,000；
- 顶部块注释逐条解释了布局/绘制/内存三层成本为什么随节点数线性增长——这段注释本身就是教材。

### `src/components/lesson32/VirtualList.jsx` —— 固定行高标准版

- `useVirtualizer({ count, getScrollElement, estimateSize, overscan })`：库不渲染任何东西，只返回一个 virtualizer 对象；`getScrollElement` 把滚动容器的 ref 递给它监听滚动；
- `useLayoutEffect` 里调一次 `virtualizer.measure()`：初始挂载时 ref 可能还没绑上，不主动测量首屏可能渲染 0 行（常见坑）；
- 三个角色在 JSX 里一目了然：滚动容器 `l32-scroll`（CSS 定高 320px）→ `height: virtualizer.getTotalSize()` 的空撑高层 → `items.map` 出的绝对定位行，`transform: translateY(virtualItem.start)`；
- 绿色大数字 `items.length` 就是此刻真实的 DOM 行数——几十 vs 左边 100,000；
- `overscan: 5`：视区上下各多渲染 5 行，滚动时新行已就位，肉眼看不到白屏。

### `src/components/lesson32/DynamicHeightList.jsx` —— 动态行高进阶版

- 每行文字「长度随机」：随机在**数据生成时**定型（模块级常量 ROWS），渲染体里绝不 `Math.random()`——否则行高每次渲染都变，measureElement 测一次变一次；
- `ref={virtualizer.measureElement}` + `data-index={virtualItem.index}`：把 measureElement 当 ref 回调，元素挂上 DOM 的瞬间库读取真实高度写回缓存；`data-index` 是库识别「测的是第几行」的必带属性；
- 动态行不写死 `height`，让内容自然撑开——测出来的才是真实值；
- `estimateSize: () => 44` 是首次猜测：猜得越接近平均值，滚动条跳动越少。

### `src/pages/Lesson32.jsx` —— 编排 + 原理示意

- 页面零 state（第 22 课容器/展示模式）：原理示意卡 → 两列对照 → 动态行高卡 → 治病边界讨论卡；
- `WindowingDiagram` 用纯 CSS 画 windowing：条纹背景 = 10 万行数据带的抽象，深色框 = 滚动窗口，框内绿色实心条 = 真实存在于 DOM 的行；
- 底部「治病边界」卡：什么时候不需要虚拟列表、与第 14 课 transition 的分工、库选型一句话——概念的边界和概念本身同样重要。

## 动手试一试

1. **亲手数 DOM**：打开 Elements 面板，搜索 `l32-item-virtual`，数出虚拟版真实渲染的行数；再把浏览器窗口拉窄（容器变窄行数不变、拉高窗口）观察行数怎么变——验证「渲染行数 = 容器高 ÷ 行高 + 2 × overscan」。
2. **调 overscan**：把 VirtualList 的 `overscan` 改成 0 和 20 各滚一次。0 的现象是什么？20 的代价是什么？（提示：0 = 滚快了会白屏；20 = DOM 行数变大，虚拟化打折。）
3. **给动态列表加「展开/收起」**：给 DynamicHeightList 每行加一个按钮，点击展开一段长文字。展开后观察滚动条和后续行位置的变化——这正是 measureElement 的修正机制在工作：高度变了，库重算可视区。

## 易错点

1. **首屏渲染 0 行**：现象是列表空白。原因：初始挂载时滚动容器 ref 还没绑上，virtualizer 测不到容器高度。解法：`useLayoutEffect` 里主动调一次 `virtualizer.measure()`（VirtualList.jsx 的写法）。
2. **渲染体里 `Math.random()` 生成内容**：现象是动态行高列表滚动时行高不停变化、内容闪变。原因：每次重渲染都重新随机，measureElement 每次测到不同高度，库不断重算。解法：随机结果在数据生成时（模块级 / useMemo）定型。
3. **动态行写死 height**：现象是文字被截断或测量值和显示不符。原因：measureElement 测的是元素真实高度，你写死的 height 让「显示高度」和「内容高度」脱节。解法：动态行不写死 height，让内容自然撑开。
4. **忘了撑高占位层**：现象是滚动条只有 320px 长，根本滚不到第 10 万行。原因：虚拟列表的滚动长度全靠 `height: virtualizer.getTotalSize()` 的空 div 伪造，少了它滚动范围就是容器本身。解法：滚动容器内第一层永远是撑高层。
5. **给只有几十行的列表上虚拟化**：现象是代码复杂了、可访问性变差了、肉眼完全看不出变快。原因：虚拟列表治的是上万行的 DOM 规模病，小列表没有这个病。解法：少于几百行直接渲染；先数 DOM 节点再决定要不要治。

## 自测题

1. 100,000 行、行高 36px、容器高 320px、overscan 5：虚拟列表此刻渲染多少行 DOM？滚动到第 50,000 行附近时，第一行的 `translateY` 大约是多少？
2. 撑高占位层的 height 为什么必须等于 `总行数 × 行高`？它里面一个行元素都没有，浏览器是怎么「知道」有 10 万行可滚的？
3. 动态行高版本为什么要传 `data-index`？如果漏传，measureElement 会发生什么？
4. 「10 万行的列表滚动卡」和「点一个按钮后页面卡 300ms 才更新」分别该先上哪个方案？两者的病灶各是什么？

### 参考答案

1. 渲染行数 = Math.ceil(320 / 36) + 2 × 5 = 9 + 10 ≈ 19 行（实现里 `getVirtualItems().length` 就是这个量级，页面上的绿色大数字是实测值）。第 50,000 行附近，第一行的 start ≈ 50,000 × 36 = 1,800,000px，`translateY(1800000px)` 量级——固定行高的位置是纯乘法。
2. 浏览器的可滚动范围由内容的总高度决定。撑高层用一个大 height 把容器「撑」出 10 万行该有的滚动长度，滚动条、惯性滚动、锚点定位的行为都和真渲染 10 万行时一致；行本身不存在没关系——窗口滚到哪里，库就把哪几行渲染进撑高层。
3. measureElement 是 ref 回调：元素挂上 DOM 时库要读取真实高度并**写回该行的测量缓存**，`data-index` 告诉库这条测量属于第几行。漏传时库不知道测的是谁，动态高度的修正失效，行位置错乱、滚动条跳动。
4. 前者是 DOM 数量病，先上虚拟化（或确认数据规模是否真需要 10 万行一次渲染）；后者是主线程阻塞病，先上 Transition（回扣第 14 课）或拆分/异步化计算。先在 Performance 面板看长任务、在 Elements 面板数节点，用证据选药，不凭感觉。

## 下一课预告

第 33 课 · i18n 国际化：用 react-i18next 把界面文案抽成翻译资源，支持中英切换——让同一个应用对不同语言的用户说不同的「话」。
