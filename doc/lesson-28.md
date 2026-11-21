# 第 28 课 · 实时数据与 useSyncExternalStore

有些数据不在 React 手里：WebSocket 服务器每秒推送行情、第三方 SDK 持续发事件、浏览器在渲染之外默默变化。这些"外部世界"不经过 setState，React 却要显示它们。本课给出官方专用接缝：**外部 store 三件套 + `useSyncExternalStore`**，并把第 2 课的清理原则延伸到模块层——最后一个听众退订时，连接也要关掉。打开 http://localhost:5173/lesson/28 ，点一遍"模拟断线"，看着状态徽章走完整个重连状态机。

## 学习目标

完成本课后，你应该能够：

1. 说清外部数据源（socket / 第三方 store）与 React state 的本质区别：它在渲染之外持续变化，`useEffect` 的订阅窗口和渲染时序对不齐；
2. 手写外部 store 三件套：`subscribe`（返回退订函数）、`getSnapshot`（返回稳定引用）、`getServerSnapshot`（服务端/水合兜底），并用 `useSyncExternalStore` 接进组件；
3. 解释"稳定引用"铁律：为什么 `getSnapshot` 每次返回新对象会触发无限循环；
4. 实现断线重连状态机（connecting → open → reconnecting → closed，指数退避、重试上限），并把它映射成 UI 上的四种徽章状态；
5. 在"新版接法"与 `useState + useEffect` 老写法之间做出选择：组件私有的一次性副作用用 effect，跨组件共享的持续数据源用外部 store。

## 核心概念

**外部世界的形状。** 真实 WebSocket 的接口就四样：`onopen` / `onmessage` / `onclose` 回调 + `send()`。它的生命周期不受 React 管——组件挂载时它可能已经连着，卸载后它还在推消息。所以接它的第一原则不是"怎么读"，而是"怎么订阅、怎么退订"。

**三件套契约。** `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`：

- `subscribe(listener)`：挂上耳朵，**返回退订函数**——React 在清理副作用时调用它（第 2 课 cleanup 在这里的兑现）；
- `getSnapshot()`：返回当前快照。铁律：**数据没变就返回同一个引用**。React 拿引用对比决定要不要重渲染；
- `getServerSnapshot()`：服务端渲染/水合时读的快照，必须是和客户端"形状一致"的静态值。浏览器渲染可以省略它，但组件一旦可能跑在服务端就必须提供。

**稳定引用为什么是生死线。** 假设 `getSnapshot` 写成 `return { prices: this._prices, status }`——每次调用都新建对象，引用永远不同。React 的判断逻辑是"订阅通知后取快照对比引用，不同就重渲染"，于是：渲染 → 取快照 → 引用变了 → 再渲染 → 引用又"变了"……无限循环，页面直接卡死。正确做法是 store 内部维护一个 `_snapshot` 缓存字段，只在数据真正变化时（发布通道里）整体换新引用。

**tearing（撕裂），一句带过。** React 18 并发渲染下，多个组件分别用 `useEffect + setState` 订阅同一外部源，可能在同一次提交里读到不同版本的数据（一个组件显示 100.2，另一个显示 100.5）。`useSyncExternalStore` 保证渲染过程中读到的快照永远一致——这就是它存在的核心理由，比"省几行代码"重要得多。

**重连状态机。** 网络是不可靠的，生产级 socket 库（socket.io 等）都内置重连。手写版只有四个状态：`connecting`（握手中）→ `open`（正常）→ 断线后 `reconnecting`（指数退避：800ms → 1600ms → 3200ms）→ 重试上限后 `closed`。两条铁律：手动 `close()` 与意外断线必须分流（手动关闭永不自动重连，否则你关不掉它）；重试用尽要把决定权交回 UI（用户点"重连"才复活），而不是无限重试。

## 代码导读

### `src/components/lesson28/mockSocket.js` —— 用 EventTarget 模拟 WebSocket

- 继承 `EventTarget`，但 `onopen` / `onmessage` / `onclose` 是用 `Object.defineProperty` 的 getter/setter **转接**成 `addEventListener`/`removeEventListener` 的——因为普通 EventTarget 只对 DOM 元素上已注册的 `on<事件名>` 属性做自动派发，随手赋值 `socket.onmessage = fn` 在 plain EventTarget 上只是普通属性，`dispatchEvent` 不会调用它。这是"模拟 on* 属性"的标准手法，也是本文件最值得抄走的知识点；
- 每个 on* 属性只挂一个处理器（setter 覆盖前先移除旧的），与真实 WebSocket 行为一致；
- `connect()` 用 120ms 定时器模拟握手，成功后 `setInterval` 每 1 秒推一条行情消息（`MessageEvent`，`data` 是 JSON 字符串——和真实 socket 一样，线上的数据永远是字符串，要自己 `JSON.parse`）；
- `simulateDrop()` 是教学开关：不设 `_manuallyClosed`，`close` 事件后进入重连状态机；`_scheduleReconnect()` 实现指数退避（`BASE * 2^已试次数`），每次重连 70% 概率成功、30% 继续退避，`MAX_RETRIES`（3 次）用尽后彻底 `closed`；
- 注意 `_teardown()` 只停数据流、**不清 on* 回调**：清理订阅是使用方（React 组件）的职责，socket 不越权。

### `src/components/lesson28/priceStore.js` —— 外部 store 三件套

- 模块级**单例**：`import` 到处拿到同一个 store，PriceTicker 和 LiveLog 因此共享同一条连接、同一份计数。连接是昂贵资源（网络 + 定时器），绝不每组件开一条；
- `subscribe` 里做**引用计数**：第一个订阅者出现才 `connect()`，最后一个退订时 `close()`——"谁也不用了就撤掉副作用"是第 2 课在模块层的重演；
- `getSnapshot` 返回缓存字段 `_snapshot`；唯一的发布通道 `_publish()` 先换新快照引用、再逐个通知听众——顺序保证了通知不会落空。状态（`status`）、重试次数（`attempt`）、消息总数（`updates`）都编进快照：UI 只有一个数据源，徽章不另存 state；
- 价格更新用不可变更新 `{ ...this._prices, [symbol]: next }`（第 8 课套路）：旧快照原封不动，还在读它的人（并发渲染中的组件）不受影响；
- `logSubscribe` 是给对照版 LiveLog 的后门：直接挂 socket 的原始 `message` 事件（不走快照），故意展示"消息级订阅"长什么样。它**不负责 connect**——连接的启停统一由 `subscribe()` 的引用计数管，单一入口。

### `src/components/lesson28/PriceTicker.jsx` —— 新版接法

- 核心就四行：`useSyncExternalStore(priceStore.subscribe, priceStore.getSnapshot, priceStore.getServerSnapshot)`。注意传的是 store 的**箭头函数方法**——普通方法传引用会丢 `this`，这是接线时最常见的坑（store 里全部写成类字段箭头函数就是为这一刻）；
- 状态徽章是纯映射：`STATUS_META` 常量把四种状态翻译成文案 + 配色类名，组件体内只剩渲染（渲染必须纯）。重连中时徽章显示"第 N/3 次重试"，让指数退避肉眼可见；
- 三个按钮接 store 的命令方法：手动断开（`close()`，永不自动重连）、手动重连（`connect()`，重试计数清零）、模拟断线（`simulateDrop()`，触发状态机）。组件不直接碰 socket——**接缝只有一个（store）**，这是和外部世界打交道的边界纪律。

### `src/components/lesson28/LiveLog.jsx` —— 对照版老写法

- `useEffect(() => { const unsub = priceStore.logSubscribe(...); return unsub }, [])`：订阅一次、cleanup 退订，是第 2 课清理原则的标准兑现。它能跑，但每条消息 `setState` 一次 = 每条消息重渲染一次本组件；多个组件都这样订阅时还有 tearing 风险（见核心概念）；
- 日志截断 `slice(0, MAX_LINES)`：无限增长的实时流会撑爆内存，保留窗口是常识；
- 结论写在注释里：**一次性、组件私有的副作用用 useEffect；跨组件共享、持续变化的外部数据源，用外部 store + useSyncExternalStore**。

### `src/pages/Lesson28.jsx` / `lesson28.css`

- 页面纯编排，不持任何 state，两块内容同屏对照；样式全部 `l28-` 前缀，徽章四色对应状态机四态（琥珀/绿/橙/红）。

## 动手试一试

1. **给 store 加"涨跌箭头"**：在 `_publish` 时对比新旧价格，把 `direction: 'up' | 'down' | 'flat'` 编进快照，行情行里显示 ↑/↓——体会"派生数据编进快照"比"组件里再存一份 state"干净在哪。
2. **把重连改成"上限后自动恢复"**：`closed` 后让 store 在 10 秒后自动 `manualOpen()` 一次。想清楚：这个定时器该谁持有、何时清理？（提示：又一处要兑现的 cleanup。）
3. **给 LiveLog 换接缝**：把 `logSubscribe` 的消息也编进快照（如 `lastMessage` 字段），删掉 `useState + useEffect`，让日志也走 `useSyncExternalStore`——对比两个版本，确认你理解什么时候老写法才是对的。

## 易错点

1. **`getSnapshot` 每次返回新对象**：现象是页面卡死/控制台爆 "The result of getSnapshot should be cached to avoid an infinite loop"。原因：引用永远不同 → React 判定快照永远在变 → 无限重渲染。正确做法：缓存快照字段，只在发布时换新引用。
2. **普通方法直接传给 `useSyncExternalStore`**：现象是 `this._listeners` undefined 报错。原因：`useSyncExternalStore(store.subscribe, ...)` 传走的是函数引用，调用时 `this` 不是 store。正确做法：store 方法全部写成类字段箭头函数，或在接线处 `store.subscribe.bind(store)`。
3. **手动断开也触发自动重连**：现象是点了"断开"徽章却跳回"重连中"，永远关不掉。原因：close 事件不分流，一律进重连状态机。正确做法：`_manuallyClosed` 开关分流——手动关闭永不重连。
4. **cleanup 里忘了退订**：现象是组件卸载后日志/快照仍在更新，控制台警告"对已卸载组件更新 state"。原因：effect 只订阅不清理，监听器泄漏。正确做法：`subscribe` 的返回值（退订函数）原样作为 effect 的 cleanup 返回。
5. **依赖数组写错导致反复重连**：现象是 socket 连了断、断了连，像在抽搐。原因：effect 依赖数组里放了每次渲染都变的新对象/函数，订阅反复拆装。正确做法：订阅 effect 用空依赖 `[]`，订阅目标来自稳定的模块级单例。

## 自测题

1. `useSyncExternalStore` 的三个参数各是什么契约？哪一个是"数据没变就返回同一引用"？
2. 为什么说 `useEffect + setState` 订阅外部源在 React 18 下有 tearing 风险？`useSyncExternalStore` 怎么消除它？
3. 断线重连状态机里，"手动 close"和"意外断线"为什么必须分流？重试用尽后应该做什么？
4. store 的 `subscribe` 为什么要在"最后一个听众退订"时断开连接？这一步对应第 2 课的哪条原则？

### 参考答案

1. `subscribe(listener)`：注册监听并**返回退订函数**；`getSnapshot()`：返回当前快照，且必须**缓存引用**（数据没变返回同一引用）；`getServerSnapshot()`：服务端渲染/水合时读的静态快照。第二个参数是稳定引用的那一个。
2. 各组件的 `useEffect` 各自开订阅窗口，触发时机与并发渲染的提交时序对不齐，同一次提交里不同组件可能读到外部源的不同版本（撕裂）。`useSyncExternalStore` 由 React 统一管理"读取快照"的时机，保证渲染过程中所有组件读到同一版本。
3. 语义不同：手动关闭表达了"用户/代码不想再连"的意志，自动重连会违背它、让连接永远关不掉；意外断线才该重试。重试用尽后进入 `closed`，把决定权交回 UI——由用户点"重连"复活，而不是无限重试空耗资源。
4. 连接是昂贵的外部资源（网络连接 + 定时器），没有读者的连接是纯泄漏。这正是第 2 课"副作用必须能被撤销"在模块层的应用：订阅建立副作用，最后一个退订 = 撤销副作用。

## 下一课预告

第 29 课 · 调试与 DevTools：React DevTools、Performance 面板、"为什么它渲染了"的排查方法论——当 bug 不再是拼写错误，而要靠推理和工具破案时，怎么有条理地找到它。
