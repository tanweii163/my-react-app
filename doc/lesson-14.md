# 第 14 课 · 并发渲染

## 学习目标

完成本课后，你应该能够：

1. 说清楚 React 18+ 的优先级模型：哪些更新是"紧急"的、哪些适合降级为"非紧急"，以及"可中断"到底可中断什么；
2. 熟练使用 `useTransition`：`isPending` 标志 + `startTransition` 包装器，并用 `isPending` 做出正确的 UI 反馈；
3. 熟练使用 `useDeferredValue`，并说清它与 `useTransition` 的分工（"值"版本 vs"更新"版本）；
4. 建立使用判断标准：**有可测的卡顿才用**，不因为"听起来高级"就到处包裹；
5. 说清并发渲染与第 9 课性能优化的关系：memo 是"少算"，transition 是"让出主线程"。

本课对应的示例代码：

- `src/components/lesson14/TransitionFilter.jsx` —— A/B 对比实验：同一个 2 万条大列表，直接 setState vs `startTransition`
- `src/components/lesson14/DeferredValueDemo.jsx` —— `useDeferredValue` 版本，并排显示两个值观察"延迟跟随"
- 页面入口在 `src/pages/Lesson14.jsx`，专属样式在 `src/pages/lesson14.css`

## 核心概念

### 优先级模型：紧急更新与非紧急更新

React 18 之前，所有 `setState` 一视同仁：排好队，一个接一个渲染，谁也插不了队，谁也退不出队。一个 2 万条的大列表更新排在队里时，你敲键盘就得等它画完——这就是"打字卡顿"的根源。

React 18+ 把更新分成两种优先级：

- **紧急更新（urgent）**：打字、点击、悬停、拖动——用户正盯着屏幕等反馈的交互。慢 100 毫秒就会觉得"卡"。
- **非紧急更新（non-urgent）**：大列表过滤、图表重算、屏幕切换——晚几百毫秒完全无妨，用户甚至察觉不到。

默认情况下，**所有 `setState` 都是紧急的**。要制造非紧急更新，要用本课的 API 显式声明：

```jsx
startTransition(() => {
  setKeyword(next) // 这次更新被标记为"可中断的非紧急"
})
```

### "可中断"到底可中断什么

React 18 的并发渲染意味着：**渲染过程本身可以暂停、放弃、重来**。当一个 transition 更新正在渲染（比如正把 2 万条过滤结果变成 DOM）时，如果来了一个紧急更新（比如你又敲了一个字符），React 会：

1. **放下**手头没画完的 transition 渲染；
2. **先完成**紧急更新（输入框立刻显示新字符）；
3. **丢弃**作废的中间结果——注意作废的渲染不会提交到屏幕，用户永远看不到"画了一半的列表"；
4. **按最新值重新开始** transition 渲染。

所以连续快速敲字时，前面几轮的过滤渲染根本不会跑完——React 只按最后一个关键词算一遍。**transition 的价值不只是"晚一点做"，更是"过时就别做了"**：为一个已经没人看的旧关键词渲染 2 万条列表，纯属浪费。

> 术语上，"并发渲染"是 React 18 底层能力（渲染可中断），"transition"是我们使用这个能力的 API。本课不深入 lane/时间切片的实现细节，抓住"可中断、可丢弃、按最新值重来"这个心智模型就够用。

### useTransition：带着 isPending 的版本

`startTransition` 有一个模块级版本（从 `react` 直接导入），但它不告诉你"过渡进行到哪了"。组件里更常用的是 Hook 版本：

```jsx
const [isPending, startTransition] = useTransition()
```

返回一对东西：

- `startTransition(fn)` —— 把 `fn` 这个**同步回调**里调用的 `setState` 全部标记为非紧急；
- `isPending` —— 从你调用 `startTransition` 那一刻起为 `true`，到这轮过渡渲染**提交到屏幕**为止。

### isPending 的 UI 用法：解释"新结果在路上"

`isPending` 是给**人**看的信号。过滤还在进行时，界面显示的是上一轮结果——如果不加任何提示，用户会以为"输入没生效"。标准做法：

- **角标**：列表旁亮一个"更新中…"小徽章（本课卡 B 的做法）；
- **降透明度**：把还在显示的旧列表变淡，表示"这是过期内容"；
- **禁用**：把依赖该结果的按钮临时禁用。

一条铁律：**只标记真正在更新的区域**。整页转圈、全局禁用会让一个"本来只是慢半拍"的更新看起来像页面死了——非紧急更新的 UX 语义是"稍等，马上好"，不是"请勿打扰"。

### useDeferredValue：值版本的延迟

```jsx
const deferredKeyword = useDeferredValue(keyword)
const shown = filterItems(deferredKeyword)
```

`useDeferredValue(keyword)` 的行为：当 `keyword` 变化时，这一轮渲染**先用旧值**（保证输入框那一趟立刻完成），然后 React 空出主线程，再拿**新值**重新渲染一次。效果上和 transition 等价，但作用对象不同：

- `useTransition` 管**更新**：你亲自控制 `setState` 在哪发生，把哪一次标记为不急；
- `useDeferredValue` 管**值**：当 `setState` 的调用点轮不到你管（值来自父组件 props、第三方输入组件），你只能在消费它的地方声明"这个值允许延迟跟随"。

两个细节：

1. `useDeferredValue` **没有 `isPending`**。判断"还在追赶"用新旧值比较：`keyword !== deferredKeyword`。
2. 输入框绑的必须是 `keyword` 本身，而不是 `deferredKeyword`——延迟只应该发生在"值"这一层（贵的大列表），不能发生在输入框上。

### transition 不是 debounce：不等用户停手

容易把 transition 想成"自动防抖"，两者机制完全不同：

| | 第 8 课的 debounce | 本课的 transition |
|---|---|---|
| 机制 | **等**：静默 N 毫秒后才更新 | **插队**：每次输入都启动新渲染，随时被更新的输入打断 |
| 时间 | 用户等机器（固定延时） | 机器不让用户等（人感觉不到延迟） |
| 代价 | 结果至少延迟 N 毫秒 | 每次输入都可能触发一轮（可能被丢弃的）渲染 |

debounce 适合"反正结果也不急，攒一攒再说"的场景（搜索建议请求）；transition 适合"结果要尽快出，但不能挡住输入"的场景。两者不冲突，甚至可以叠加。

### 什么时候真的需要：有可测的卡顿才用

第 9 课的原则在这里同样适用，甚至更严格：**先测量，再动手**。

1. 卡顿必须是**可感知或可测量的**：亲手快速敲一遍字感到一顿一顿，或用 DevTools Performance 面板录到几十毫秒以上的长任务，才算数；
2. 弄清楚**贵的到底是哪一步**：本课的例子里，`filter` 本身只花几毫秒，贵的是把 2 万条结果全部渲染成真实 DOM。如果贵的其实是过滤算法，先优化算法或用 `useMemo` 缓存；
3. 确认更新**真的不急**：只有"晚几百毫秒无妨"的更新才配走 transition 通道。

没有卡顿就包 `startTransition`，是纯付复杂度税：多一个 state、多一个 `isPending` 分支，还可能让 `isPending` 角标一闪一闪地打扰用户。

### 与第 9 课的关系：memo 是"少算"，transition 是"让出主线程"

一句话分工：

- **memo / useMemo / useCallback = "少算"**：让不必要的工作干脆不发生，减少总工作量；
- **transition = "让出主线程"**：工作量一点没少，只是把它挪到不碍事的时机执行，且随时可打断、可丢弃。

两者互补而非替代：通常先用"少算"把浪费干掉（比如没变的数据别重渲染），剩下**确实必须做**的贵计算，再用"让路"兜底，保证它不阻塞输入。反过来讲：transition **不是性能银弹**——2 万条的渲染照样烧 CPU，它只是把这些消耗挪到了用户感觉不到的空档里。

## 代码导读

### `src/components/lesson14/TransitionFilter.jsx` —— A/B 对比实验

- 数据在**模块顶层**造一次：`ITEMS` 是 2 万条 `{ id, name }`，每五条换一个前缀（react / vue / ...），所以输入 `react` 命中约 4000 条，清空输入框则要渲染全部 2 万条。放组件里造就是"每次渲染重造一遍数据"的经典事故。
- `filterItems(keyword)`：全量过滤。注释里点明本课"贵"的真正来源——`filter` 只要几毫秒，贵的是把结果全部变成真实 DOM。
- **卡 A（对照组）** `DirectFilterCard`：`keyword` 一个 state 打天下，渲染时直接算派生数据（第 2 课的原则没变）。每次按键：过滤 + 重建几千到 2 万个 `<li>`，输入肉眼可见地一顿一顿。
- **卡 B（实验组）** `TransitionFilterCard`，教学重点在"双 state"：
  - `keyword` 只给输入框用，走紧急通道，保证敲字跟手；
  - `listKeyword` 只给列表用，它的更新被 `startTransition` 包住；
  - `handleChange` 里两行分开写：`setKeyword(next)` 紧急，`startTransition(() => setListKeyword(next))` 非紧急。这正是官方文档点名的坑的修法——**受控输入的 value 千万别绑走 transition 的那个 state**，否则敲的字符要等过滤渲染完才出现，卡 B 就白做了；
  - `isPending` 的两处 UI：角标 `更新中…` + 列表加 `l14-list-stale` 降透明度。transition 未提交期间 `listKeyword` 还是旧值，用户看到的是上一轮**完整**结果而不是半成品。

### `src/components/lesson14/DeferredValueDemo.jsx` —— useDeferredValue 版本

- 同样的 2 万条数据、同样的 `filterItems`，方便和上面两个卡互相印证。
- 输入框绑 `keyword` 本身（紧急值），大列表吃 `deferredKeyword`（延迟值）——延迟只发生在"值"这一层，输入框天然跟手。
- 页面上并排两枚值芯片：`keyword = "…"` 和 `deferredKeyword = "…"`，快速敲字能直观看到 deferred 慢半拍地追。
- "追赶中"的判断：`keyword !== deferredKeyword`，顺势亮角标、降列表透明度。这是 `useDeferredValue` 没有 `isPending` 时的标准替代品，且追上后自动消失，不需要手动清理。

### `src/pages/Lesson14.jsx` 与 `src/pages/lesson14.css`

- 页面组件本身没有状态、没有 effect，只负责排版：心智模型卡 → TransitionFilter（A/B 对比）→ DeferredValueDemo → 收尾卡（何时需要 + 与第 9 课的分工）。
- `lesson14.css` 只放本课专属类：`.l14-grid` 两栏对比布局（窄屏退化单列）、`.l14-badge` 闪烁角标、`.l14-list-stale` 过期列表降透明度、`.l14-value-chip` 值芯片、`.l14-list` 限高滚动的列表容器。公共样式全部复用 App.css 的 `.card` / `.hint` / `.row`，不动公共文件。

## 动手试一试

1. **复现官方点名的坑**：把卡 B 的 `setKeyword(next)` 也包进 `startTransition`（让输入框直接绑 `listKeyword`），快速敲字观察输入框是否变卡。理解原因后改回双 state 写法。
2. **用 Performance 面板测量**：打开 DevTools Performance，分别录制卡 A 和卡 B 里连续快速输入"reactjs"的过程。对比两段的"长任务"分布：卡 A 每个字符一根长条；卡 B 的长条被切散、且中间插着紧急更新。给"可中断"找到证据。
3. **和第 8 课的 debounce 同场竞技**：用 `src/components/lesson8/useDebounce.js` 再做一个列表版本（keyword 经 300ms 防抖后过滤），和 `DeferredValueDemo` 并排。快速敲字后立刻停手，对比两者结果出现的时机，体会"固定等待"与"随时追赶"的区别。

## 易错点

1. **受控输入绑了走 transition / deferred 的值**：现象是输入框的字符一个个"跳"出来，跟不上手。原因：输入框的显示被非紧急渲染拖着走，敲的字符要等大列表渲染完才提交。修法：输入框用独立的紧急 state（卡 B 的双 state 写法），延迟只留给消费值的贵渲染。
2. **没有卡顿也硬包 transition**：现象是代码里到处是 `startTransition`，`isPending` 角标时不时闪一下，却说不清优化了什么。原因：把"听起来高级"当成了理由。铁律：先测量到可感知的卡顿，再动手。
3. **在 startTransition 的回调里写异步代码**：现象是"明明包了却没生效"。原因：`startTransition(async () => { await fetch(); setX() })` 里，`await` 之后的 `setState` 已不在标记窗口内。铁律：回调必须同步；异步结果回来后，再单独决定把哪次 `setState` 包进 `startTransition`。
4. **isPending 滥用**：现象是过渡期间整页蒙层、全局禁用。原因：把"慢半拍"的更新渲染成了"页面死了"。只标记真正在更新的区域（角标、对应列表降透明度）。
5. **以为 transition 能省算力**：现象是包了 transition 后 CPU 占用没降，得出"没用"的结论。原因：transition 不减少工作量，只重新安排执行时机并允许丢弃过时渲染；想让总工作量变少，用第 9 课的 memo / useMemo / useCallback。两者是互补关系。

## 自测题

1. 按 React 的划分，哪些操作属于紧急更新？为什么"输入框跟手"是并发渲染最重要的保障目标？
2. `isPending` 从什么时候开始为 `true`，到什么时候变回 `false`？你可以用它做哪些 UI？
3. 卡 B 为什么要用两个 state（`keyword` 和 `listKeyword`）？如果只用一个会发生什么？
4. `useTransition` 和 `useDeferredValue` 都能实现"过滤不卡输入"，各自的适用场景是什么？
5. transition 和第 9 课的 memo 各自解决什么问题？一句话说清分工。

### 参考答案

1. 紧急更新是打字、点击、悬停、拖动这类用户盯着等反馈的交互。输入框必须永远跟手，因为输入延迟是用户感知最强的"卡"——大列表可以慢半拍，输入框慢半拍整个应用就显得坏了。所以并发渲染的核心保障就是：紧急更新永远能插队。
2. 调用 `startTransition` 那一刻起为 `true`，对应的过渡渲染提交到屏幕为止。常见 UI：角标（"更新中…"）、把还在显示的旧列表降透明度、临时禁用依赖该结果的按钮——只标记真正在更新的区域。
3. 输入框是受控组件，value 绑哪个 state，哪个 state 的更新就直接决定输入框何时显示新字符。若只绑一个走 transition 的 state，敲字会被非紧急渲染拖着，输入框照样卡。双 state 让输入走紧急通道、过滤走非紧急通道，各自独立。
4. `setState` 调用点由你控制时用 `useTransition`（还能顺便拿到 `isPending`）；值的来源轮不到你控制（父组件 props、第三方输入组件）时，在消费处用 `useDeferredValue`。另外 `useDeferredValue` 没有 `isPending`，"追赶中"要用新旧值比较自己算。
5. memo 家族是"少算"——让不必要的工作不发生，减少总工作量；transition 是"让出主线程"——工作量不减，只是挪到不碍事的时机执行且随时可打断丢弃。先"少算"，剩下确实贵的再用"让路"兜底。

## 下一课预告

第 15 课我们学习用 Vitest + React Testing Library 给组件写自动化测试：让机器替你点一遍按钮、敲一遍输入框。
