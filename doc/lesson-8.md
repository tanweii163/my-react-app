# 第 8 课 · 自定义 Hook——逻辑复用

## 学习目标

完成本课后，你应该能够：

1. 说清楚自定义 Hook 是什么：**名字以 `use` 开头、内部调用了其他 Hook 的普通函数**——它不是新 API，而是官方 Hook 的组合与命名；
2. 会判断"这段逻辑该不该抽成自定义 Hook"：它同时包含状态和副作用（或派生逻辑）、且在多个组件里会重复出现；
3. 读懂 `useLocalStorage` 的完整实现：读放在惰性初始化、写放在 `useEffect`、返回值与 `useState` 同形；
4. 读懂 `useDebounce` 的实现，明白"清理函数"就是防抖本身，并能把它和第 2 课的定时器清理联系起来；
5. 记住两条 Hook 规则，并理解它们为什么对自定义 Hook 同样生效。

本课对应的示例代码：

- `src/components/lesson8/useLocalStorage.js` —— 持久化 Hook：读在惰性初始化、写在 `useEffect`
- `src/components/lesson8/useDebounce.js` —— 防抖 Hook：`setTimeout` + 清理函数
- `src/components/lesson8/NotesSearch.jsx` —— 实战：一个组件同时组合上面两个 Hook
- 页面入口在 `src/pages/Lesson8.jsx`

## 核心概念

### 自定义 Hook 是什么

前面几课你已经写过不少"固定搭配"：定时器要配清理函数、持久化要先读后写、搜索框要防抖。这些逻辑换个组件还得再抄一遍。自定义 Hook 就是解决"**有状态的逻辑怎么复用**"的官方答案：

```js
// 一个最小但完整的自定义 Hook：让浏览器标签页标题跟着参数变
import { useEffect } from 'react'

function useTitle(title) {
  useEffect(() => {
    document.title = title
  }, [title])
}

// 用起来和其他 Hook 没有任何区别
useTitle('第 8 课')
```

三点说清楚它的本质：

- 它是一个**普通函数**，没有任何新的语法或 API；
- 名字必须以 `use` 开头——这是给人和检查器看的约定：`useTitle` 里可以放心地调用 `useState` / `useEffect`，普通函数 `formatDate` 里则不行；
- **组件管 UI，Hook 管可复用逻辑**。抽走逻辑之后，组件剩下的应该只有"把数据接到界面上"这件事。

### 每次调用，独立的一份状态

自定义 Hook 不是全局共享的单例。`useState` 被调用一次就有一份自己的状态，自定义 Hook 内部调用了 `useState`，所以**每个调用处各有一份**：

```jsx
function A() {
  const [notes, setNotes] = useLocalStorage('notes', []) // 一份
}
function B() {
  const [draft, setDraft] = useLocalStorage('draft', '') // 另一份，互不干扰
}
```

这也是它和"把变量提到模块顶层共享"的本质区别：Hook 的状态仍然属于**调用它的那个组件实例**。

### useLocalStorage：读在惰性初始化，写在 useEffect

持久化分两个方向，方向不同、位置不同：

- **读（localStorage → state）**：只需要做一次，放在 `useState` 的**惰性初始化**里——`useState(() => ...)` 传函数，首次渲染执行一次，之后再也不跑；
- **写（state → localStorage）**：值每次变化都要做，而"写外部存储"是副作用，按第 2 课的铁律放 `useEffect`，依赖 `[key, value]`。

```js
const [value, setValue] = useState(() => {
  const stored = localStorage.getItem('lesson8:' + key)
  return stored !== null ? JSON.parse(stored) : initialValue
})

useEffect(() => {
  localStorage.setItem('lesson8:' + key, JSON.stringify(value))
}, [key, value])

return [value, setValue] // 和 useState 同形：[值, 修改函数]
```

**"与 useState 同形"是它好用的关键**：调用方写的还是 `const [x, setX] = ...`，从 `useState` 换成 `useLocalStorage`（或反向换回去）时，其余代码一行不用改。

### useDebounce：清理函数就是防抖本身

防抖：值连续变化时，等它**安静 `delay` 毫秒**才真正更新。实现完全复用第 2 课的定时器套路，只是把 `setInterval` 换成 `setTimeout`：

```js
const [debounced, setDebounced] = useState(value)

useEffect(() => {
  const timer = setTimeout(() => setDebounced(value), delay)
  return () => clearTimeout(timer) // 没有这一行就没有防抖
}, [value, delay])
```

跟着一次输入走一遍（`delay = 300`）：

1. 敲下 `R` → effect 重跑：清掉（不存在的）旧定时器，挂一个 300ms 后把 `debounced` 设为 `"R"` 的定时器；
2. 50ms 后敲下 `e` → effect 重跑：**清掉那个还没执行的旧定时器**，再挂新的（目标值 `"Re"`）；
3. 只要你连续输入，旧定时器就一直"活不到执行"；停手超过 300ms，最后一个定时器才落地，`debounced` 追上来。

所以"防抖"不是什么新机制，就是**清理函数反复取消旧定时器**——你在第 2 课已经学完了全部所需知识。

### 两条规则为什么存在

1. **只在最顶层调用**（不要在循环、条件、嵌套函数里调用）。React 不靠变量名记录 Hook，而是靠**调用顺序**：每次渲染按同样的顺序过一遍 Hook 列表，第 1 个 `useState` 对第 1 个状态……如果某次渲染条件分支导致少调了一次，后面的 Hook 全部错位，状态张冠李戴。
2. **只在 React 函数里调用**（组件或另一个自定义 Hook）。普通函数没有"渲染"的概念，Hook 的状态挂在组件实例上，脱离组件调用没有意义。自定义 Hook 必须 `use` 开头，正是让检查器（和读者）认出"这个函数有资格调用 Hook"。

## 代码导读

### `src/components/lesson8/useLocalStorage.js`

- 顶部定义 `PREFIX = 'lesson8:'`，所有 key 统一加前缀，避免和其他课程/页面的数据互相覆盖；
- **惰性初始化**：`useState(() => {...})` 里读 `localStorage`。注意判断用的是 `stored !== null` 而不是 `if (stored)`——否则存过的空字符串会被误判成"没存过"；
- `try / catch` 包住读写：`localStorage` 可能被浏览器禁用，旧数据也可能是坏 JSON，出错时退回 `initialValue`，别让整页崩掉；
- **写**放在 `useEffect`，依赖 `[key, value]`：`key` 或 `value` 任一变化就序列化写盘一次。渲染函数里绝不直接 `setItem`；
- 返回 `[value, setValue]`，与 `useState` 同形。

### `src/components/lesson8/useDebounce.js`

- 内部 `useState(value)` 存"防抖后的值"，初始就等于传入值；
- 一个 effect、两件事：挂 `setTimeout`，返回清理函数 `clearTimeout`；依赖 `[value, delay]`；
- 整个文件 20 行以内——**好的自定义 Hook 往往小而专**，一个 Hook 只管一件事。

### `src/components/lesson8/NotesSearch.jsx`

- 顶部 `DEFAULT_NOTES`：8 条预置笔记，只作为 `useLocalStorage` 的**初始值**——第一次访问被写进 localStorage，之后一直以 localStorage 里的数据为准，改常量不会"改回"用户的数据；
- 组件里两行核心接线：

  ```js
  const [notes, setNotes] = useLocalStorage('notes', DEFAULT_NOTES) // 持久化
  const debouncedKeyword = useDebounce(keyword, 300)                // 防抖
  ```

  注意 `keyword` 用的是普通 `useState`——输入框要**每敲一键就响应**，不该被防抖；被防抖的只是"用来过滤的那份值"；
- 过滤只用 `debouncedKeyword`：列表最多 300ms 动一次，不跟着按键抖；
- `pending = keyword !== debouncedKeyword`：两个值不一致说明防抖还没结束，页面上据此显示「⏳ 防抖中… / ✅ 已同步」角标，把两个时间尺度的值并排展示给你看；
- `toggleStar` 用第 4 课的不可变更新（`map` 只替换目标项）；点 ⭐、点「重置笔记」都会改 `notes`，`useLocalStorage` 的 effect 随即写盘——这就是"刷新不丢"的全部原理。

### `src/pages/Lesson8.jsx`

- 页面骨架和其他课一致：`header` + `main`，额外加了一张"两条铁律"卡片，因为规则是本课主线之一；
- 注意本课的组件放在 `src/components/lesson8/` 子目录里（前几课是平铺在 `components/` 下）——课一多，按课分目录更好找。

## 动手试一试

1. **写一个 `useToggle(initial = false)`**：返回 `[on, toggle]`，`toggle` 不接受参数、每次调用取反。提示：内部只需要一行 `useState`；取反记得用函数式更新 `setX(x => !x)`，想想为什么（提示：连续调用两次 `toggle()`）。写完在 NotesSearch 上试试能不能替换某个布尔状态。
2. **写一个 `useWindowSize()`**：返回 `{ width, height }`，窗口缩放时实时更新。提示：初始值用 `window.innerWidth/innerHeight`；一个 effect 里 `addEventListener('resize', ...)` + 清理时 `removeEventListener`；依赖数组是 `[]`（监听器只需挂一次）。可以顺手给"窗口太窄"加个提示条。
3. **进阶：给 NotesSearch 加"只看 ⭐"开关**：加一个开关，勾上后列表只显示加星的笔记。追问自己两个问题：这个开关的值该不该走 `useDebounce`？该不该走 `useLocalStorage`（想想 key 叫什么、和 `notes` 为什么要用不同的 key）？

## 易错点

1. **自定义 Hook 名字没以 `use` 开头**：比如叫 `makeLocalStorage`。现象：在里面调 `useState` 时，ESLint 直接报错 "React Hook 'useState' cannot be called in a function that is neither a React function component nor a custom Hook"。原因：检查器完全靠 `use` 前缀静态判断谁能调用 Hook。
2. **在条件或循环里调用 Hook**：比如 `if (ready) { const [x, setX] = useState(0) }`。现象：一旦条件翻转，控制台报 "Rendered fewer hooks than expected" 或状态莫名串位。原因：React 按调用顺序对号入座，某次渲染少调/多调了一次，后面的全部错位。
3. **把 `localStorage.setItem` 写在渲染过程里**：现象是"看起来也能工作"，但 StrictMode 下每次渲染写两次，而且渲染不再纯净。原因：写存储是副作用，必须放 `useEffect`；顺手放进渲染体是初学者最常见的越界。
4. **`useDebounce` 忘了返回清理函数**：现象是"防抖失效"——停手后过一会儿，之前每一键对应的旧值还会陆续生效（一串旧定时器挨个执行）。原因：没有 `clearTimeout`，旧的 `setTimeout` 永远活着。
5. **往 localStorage 存对象时忘了 `JSON.stringify`**：`setItem(key, someObject)` 会把对象变成字符串 `"[object Object]"`，读回来不是你的数据了。现象：刷新后笔记全变空/乱码。反向也要注意：读出来必须 `JSON.parse`，且用 `try/catch` 兜底坏数据。

## 自测题

1. 自定义 Hook 和普通函数的区别是什么？React（和 ESLint）靠什么区分它们？
2. 两个不同的组件各自调用 `useLocalStorage('draft', '')` 和 `useLocalStorage('notes', [])`，它们的状态会互相影响吗？为什么？
3. `useDebounce` 里如果删掉 `return () => clearTimeout(timer)`，从"连续输入 5 个字符"到"停手"之间，定时器的生老病死是怎样的？用户会看到什么？
4. `useLocalStorage` 为什么"读"放在 `useState` 的惰性初始化里、"写"放在 `useEffect` 里？把写的位置换成"渲染时直接 `setItem`"行不行？

### 参考答案

1. 没有语法上的区别——自定义 Hook 就是内部调用了其他 Hook 的普通函数。区别全在约定上：名字以 `use` 开头，检查器据此允许（并要求）它遵守 Hook 规则；普通 JS 函数里调用 Hook 会直接被报错。语义上，Hook 属于"渲染"这个概念，普通函数不属于。
2. 不会。Hook 的状态属于**调用它的组件实例**，每次调用 `useState` 都产生独立的一份。两个组件、两次调用，各管各的；它们只通过 localStorage 里不同的 key（`lesson8:draft`、`lesson8:notes`）在存储层分开。
3. 连续输入 5 次，effect 跑 5 次：第 1 次挂的定时器活到第 2 次 effect 前（约一次按键间隔）被杀；第 2 次挂的被第 3 次杀……第 5 次挂的没有第 6 次来杀它，停手 300ms 后执行。没有清理时，前 4 个旧定时器全部活着，会在停手后挨个执行 `setDebounced`，`debounced` 会依次经过前 4 个旧值"倒带"一遍才停——列表跟着闪好几次。
4. 读只需要一次，惰性初始化保证"首次渲染执行一次、之后不再跑"；写要跟着每次值变化走，且属于副作用，必须放 `useEffect` 让 React 管理。渲染时直接 `setItem` 不行：渲染必须纯（StrictMode 下会执行两次），而且渲染期间修改外部世界会让"渲染"变得不可预测——这正是第 2 课的铁律。

## 下一课预告

第 9 课：性能优化——当列表变长、组件变大，用 `memo` / `useMemo` / `useCallback` 砍掉那些"白干的渲染"。
