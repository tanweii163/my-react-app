# 第 2 课 · useEffect 与副作用

## 学习目标

完成本课后，你应该能够：

1. 说清楚什么是"纯渲染"，为什么副作用不能写在渲染过程中；
2. 熟练写出 `useEffect` 的三段结构：副作用函数、清理函数、依赖数组；
3. 用"同步"的心智模型解释依赖数组三种写法（不传 / `[]` / `[a, b]`）各自的含义；
4. 写出发请求的标准"四件套"：loading / error / data / 清理，并用 `AbortController` 防竞态；
5. 理解闭包过期值问题，知道为什么定时器回调里要写 `setSeconds(s => s + 1)`。

本课对应的示例代码：

- `src/components/TimerDemo.jsx` —— 定时器：清理函数与依赖数组
- `src/components/UserList.jsx` —— 数据请求：loading / error / data / AbortController
- 页面入口在 `src/pages/Lesson2.jsx`

## 核心概念

### 渲染必须是纯的

React 假定：**渲染过程（组件函数执行）只做一件事——根据 props 和 state 算出 JSX**。它不修改外部变量、不发请求、不操作 DOM、不 `setTimeout`。满足"同样输入 → 同样输出，且不改外部世界"的函数叫**纯函数**。

为什么？React 可能随时重新渲染组件（StrictMode 下甚至会故意渲染两次来帮你发现问题），如果渲染过程里有副作用，就会执行多次、时序不可控。所以渲染里只做计算，任何"对外的动作"都要放进 `useEffect`。

### 什么是副作用

**副作用（side effect）**：超出"算出返回值"范围、影响外部世界的事。常见例子：

- 发网络请求（fetch）
- 启动/清除定时器（`setInterval` / `setTimeout`）
- 手动操作 DOM、订阅事件、写 `localStorage`

副作用本身不是坏事，只是必须放在 React 能管理的位置——`useEffect`。

### useEffect 的三段结构

```jsx
useEffect(() => {
  // ① 副作用函数：渲染完成后执行
  const timer = setInterval(() => { /* ... */ }, 1000)

  // ② 清理函数（可选返回值）：下一次副作用执行前、以及组件卸载时被调用
  return () => clearInterval(timer)
}, [running]) // ③ 依赖数组：决定什么时候"重新执行"
```

**执行时机是铁律**：`useEffect` 不是"渲染时执行"，而是"**渲染完成后**"执行——React 先把页面画出来，再跑副作用。所以 effect 里改 state 会触发"再渲染一次"，而不是打断当前渲染。

### 依赖数组的三种写法：一个"同步"心智模型

把 `useEffect` 理解为一句声明："**让这段副作用，与依赖保持同步**"：

| 写法 | 含义 |
|---|---|
| `useEffect(fn)` 不传第二个参数 | 每次渲染完成后都执行（几乎不用，容易死循环） |
| `useEffect(fn, [])` | 空依赖：只在**挂载后**执行一次，卸载时清理（如一次性 fetch） |
| `useEffect(fn, [a, b])` | 挂载后执行一次；之后**每次渲染完成后，若 `a` 或 `b` 与上次不同**，先跑上次 effect 的清理函数，再重新执行 |

第三种写法是理解关键：依赖变化时，React 的动作序列是 **清理旧的 → 执行新的**。`TimerDemo` 里 `[running]` 就是这个用法——暂停时清掉定时器，继续时重新挂一个。

### 定时器必须清理，否则会叠加

`setInterval` 启动后不会自己消失。如果每次 effect 执行都新开一个定时器、却不清旧的，定时器会越积越多，秒数一秒 +2、+3……越走越快。所以规则是：**谁开的定时器，谁在清理函数里关掉**。

### 闭包过期值：为什么回调里写 `s => s + 1`

effect 函数在"那次渲染"执行，它里面创建的回调捕获的是**那次渲染时的变量**（闭包）。如果写：

```jsx
setInterval(() => setSeconds(seconds + 1), 1000) // ❌
```

这里的 `seconds` 永远是 effect 执行那一刻的旧值（比如 0），回调每秒都执行 `setSeconds(0 + 1)`，数字永远停在 1。解决办法是**函数式更新**：

```jsx
setSeconds(s => s + 1) // ✅ s 由 React 传入，永远是最新值
```

回调不再引用外面的 `seconds`，闭包过期问题就不存在了。

### fetch 四件套

发请求要同时管四种局面：

1. **loading** —— 请求中，显示"加载中…"；
2. **error** —— 失败时显示错误信息，而不是白屏或卡死在 loading；
3. **data** —— 成功后渲染；
4. **清理** —— 组件卸载或依赖变化时，取消过期请求。

### fetch 对 404 不会抛错

一个反直觉的事实：`fetch` 只有网络层失败（断网、DNS）才 reject。**服务器返回 404、500 时 fetch 照样"成功"**，`res` 里只是状态码不同。所以必须手动检查：

```js
const res = await fetch('/users.json')
if (!res.ok) throw new Error(`HTTP ${res.status}`) // res.ok = 状态码 2xx
```

忘了这一步，404 时 `res.json()` 通常解析失败或数据为空，界面表现成莫名其妙的错，而不是清晰的"HTTP 404"。

### AbortController：防卸载 setState 与竞态

两个真实问题：

- **卸载后 setState**：请求还没回来组件就被卸载（比如用户切走了路由），回调里的 `setUsers` 无意义，还会触发 React 警告。
- **竞态（race condition）**：连续发起两个请求，先发的慢、后发的快，慢结果后到，覆盖了新数据——界面显示旧内容。

解法是 `AbortController`：effect 里创建一个，把它的 `signal` 传给 fetch，在**清理函数里调用 `controller.abort()`**。被 abort 的请求会抛出 `AbortError`，在 catch 里识别并忽略它（那不是真错误）。

### StrictMode 双挂载：控制台里的 ERR_ABORTED 是特性不是 bug

开发模式下，React 的 `<StrictMode>` 会**故意把每个组件挂载 → 卸载 → 再挂载**一次，用来暴露"清理函数没写对"的组件。后果是：effect 跑两次，第一个请求发出后立刻被 abort——于是 Network/控制台里出现一条 `users.json ERR_ABORTED`。

**这是特性，不是 bug**：它恰恰证明了清理函数在起作用（第一个请求被正确取消）。生产构建不会有双挂载，也不会有这条日志。看到它别去"修"，只需确认第二次请求成功渲染即可。

### 派生数据：直接算，不要放进 state

能用现有 state **直接算出来**的数据（如"按关键词过滤后的用户列表"），就不要再 `useState` 存一份——存了就有两份数据，可能不同步。正确做法是在渲染时直接算：

```jsx
const shown = users.filter(u => u.name.includes(keyword))
```

判断标准：**改 A 时如果忘了改 B，B 会不会显示错的值？会 → B 是派生数据，直接算。**

## 代码导读

### `src/components/TimerDemo.jsx` —— 定时器与清理

- 顶部注释：本组件教 useEffect 的基本结构与清理函数。
- `const [seconds, setSeconds] = useState(0)` + `const [running, setRunning] = useState(true)`：两个 state，`running` 是 effect 的依赖。
- effect 内 `if (!running) return`：暂停时不挂定时器。注意这里 return 的是 `undefined`，没有清理函数——因为没开定时器，也就没什么可清理。
- `setSeconds(s => s + 1)`：函数式更新，规避闭包过期值（见核心概念）。
- `return () => clearInterval(timer)`：清理函数。点"暂停/继续"按钮时，React 先清旧定时器再按新 `running` 重建——依赖数组 `[running]` 的"先清理、再执行"完整演示。
- "归零"按钮直接 `setSeconds(0)`：`seconds` 不在依赖里，因为 effect 内部并不读它（用的函数式更新），定时器不需要因它重建。

### `src/pages/Lesson2.jsx` —— 页面组织

页面组件本身没有任何 state 和 effect，只负责排版引入两个示例卡片。这本身也是一个示范：**不是每个组件都需要副作用**，能只用纯渲染就不必用 useEffect。

### `src/components/UserList.jsx` —— 请求四件套

- 四个 state：`users`（null = 还没拿到）、`loading`、`error`、`keyword`（筛选词）。
- effect（依赖 `[]`，挂载后执行一次）：
  - `new AbortController()` 每次执行新建一个，`signal` 传给 fetch；
  - `load()` 里先 `setLoading(true)`、`setError(null)`（重置上次错误）；
  - `if (!res.ok) throw new Error(...)`：手动把 404/500 变成可捕获的错误；
  - `catch` 里区分：`e.name === 'AbortError'` 是主动取消，不算错误，忽略；其余才 `setError(e)`；
  - `finally` 里 `if (!controller.signal.aborted) setLoading(false)`：卸载后不再 setState；
  - `return () => controller.abort()`：卸载/清理时取消未完成请求。
- 渲染部分是一个小**状态机**：loading → error → 空数据 → 正常列表，四种情况一一写清楚，没有遗漏的中间态。
- 搜索框 `keyword` 演示派生数据：过滤结果不进 state，渲染时 `.filter` 直接算。

## 动手试一试

1. **给 TimerDemo 加毫秒表**：再开一个每 100ms 跑的 `setInterval`，让页面同时显示秒和"0.1 秒格数"。提示：放同一个 effect 还是新开一个 effect？两种都试试，想想哪个更清晰。
2. **做依赖数组的破坏实验**：把 TimerDemo 的依赖 `[running]` 改成 `[]`，点暂停/继续，观察什么变了；再改成不传依赖数组（注意别放进渲染体直接 `setInterval`，那不是本课要的错误），观察定时器行为。每一步先预测再验证。
3. **给 UserList 加"重新加载"按钮**：加一个 `reloadKey` state，点按钮 +1，把 effect 依赖改成 `[]` 换成 `[reloadKey]`。提示：点按钮会触发"清理旧请求 → 发新请求"，打开 DevTools Network 观察旧请求是否显示 canceled。

## 易错点

1. **定时器不清导致越走越快**：现象是计数一秒跳好几下。原因：effect 依赖变化后重复 `setInterval` 却没在清理函数里 `clearInterval`，定时器叠加。
2. **回调里直接用外层 state**：现象是数字永远停在 1（或其他固定值）。原因：闭包捕获了 effect 执行那次渲染的旧值。改用函数式更新 `setX(s => s + 1)`。
3. **fetch 不检查 `res.ok`**：现象是接口 404 了界面却不像"出错了"的样子，或 `res.json()` 抛出莫名其妙的解析错误。原因：fetch 只在网络层失败时 reject，HTTP 错误状态码要自己抛。
4. **没处理卸载后 setState / 竞态**：现象是路由切换瞬间控制台报 "setState on unmounted component" 类警告；或快速切换筛选/翻页时界面显示旧数据。原因：没有用 AbortController 在清理函数里取消过期请求。
5. **把能算出来的东西塞进 state**：现象是筛选框输入后列表没更新，或需要写 `useEffect` 去"同步"两份 state。原因：派生数据建了副本。直接在渲染时计算即可，不要为它加 state、更不要用 effect 同步。

## 自测题

1. `useEffect` 的副作用函数是在"渲染时"还是"渲染完成后"执行？由此推断：effect 里 `setState` 会发生什么？
2. `useEffect(fn, [running])` 中，当 `running` 从 `true` 变成 `false`，React 会按什么顺序做哪些事？
3. `TimerDemo` 里如果写成 `setSeconds(seconds + 1)`，页面会表现成什么样？为什么？
4. 服务器返回 404 时 `fetch` 的 Promise 会 reject 吗？要怎么把 404 变成可以 `catch` 的错误？
5. 开发模式控制台出现一条 `users.json ERR_ABORTED`，该不该修？它说明了什么？

### 参考答案

1. 渲染完成后。effect 里 setState 会触发一轮新的渲染，React 先画完当前页面再跑副作用，不会打断或死锁；但要避免在每次渲染都执行的 effect 里无条件 setState（会无限循环）。
2. 先调用上一次 effect 返回的清理函数（关掉旧定时器），再执行新的副作用函数（按 `running=false` 这次其实直接 `return`，不挂新定时器）。
3. 数字永远停在 1。每次定时器回调闭包里的 `seconds` 都是 effect 执行那一刻的旧值（0），每秒都在 `setSeconds(0 + 1)`。函数式更新 `s => s + 1` 让 React 传入最新值。
4. 不会，404 时 fetch 照常 resolve。要手动检查 `if (!res.ok) throw new Error(\`HTTP ${res.status}\`)`，把它变成 catch 能捕获的错误。
5. 不该修。它是 StrictMode 开发模式"挂载→卸载→再挂载"导致的：第一次挂载发出的请求被清理函数 abort 了，恰说明清理逻辑工作正常。生产构建没有双挂载，这条日志不会出现。

## 下一课预告

第 3 课我们离开单页内的状态管理，学习 react-router：路由表、布局嵌套与页面导航。
