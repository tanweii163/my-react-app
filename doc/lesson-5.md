# 第 5 课 · useRef 与 DOM 操作

## 学习目标

- 理解 useRef 返回的"盒子"结构：`{ current: 初始值 }`，会读写 `.current`
- 说出 ref 与 state 的两条本质区别：改 `.current` 不触发重渲染；盒子跨渲染保持不变
- 会用 ref 拿到 DOM 节点并直接调用其方法（如 `focus()`）
- 掌握"什么进 state、什么进 ref"的判断标准
- 会写非受控表单：提交时用 ref 和 FormData 一次性读值

## 核心概念

`useRef(initialValue)` 只做一件事：给你一个**在组件一生中保持同一个**的盒子对象：

```jsx
const box = useRef(0)
// box === { current: 0 }
box.current = 99 // 随便改，React 不会重渲染
```

| 对比项         | useState                  | useRef                       |
| -------------- | ------------------------- | ---------------------------- |
| 存什么         | 要画到屏幕上的数据         | 内部记事本：DOM 节点、定时器 id、上次值 |
| 改了之后       | 触发重渲染                 | 什么也不发生                  |
| 重渲染之后     | 拿到最新值                 | 盒子还是同一个（`.current` 不重置） |
| 修改方式       | 只能通过 set 函数           | 直接改 `.current`             |

给 JSX 元素挂 ref，React 会在挂载后把真实 DOM 节点写进 `.current`：

```jsx
const inputRef = useRef(null)
<input ref={inputRef} />        // 挂载后 inputRef.current 是 <input> DOM 节点
inputRef.current.focus()        // 直接命令 DOM —— state 做不到这种事
```

## 代码导读

### `src/components/lesson5/FocusDemo.jsx`

- `inputRef` 装 DOM 节点：点按钮调 `inputRef.current.focus()`，输入框聚焦，**但页面不重渲染**。
- `renderCount`（ref）装渲染次数账本，`renderCountShown`（state）装给屏幕看的数字——同一个值两种载体的对比。
- 【铁律】渲染函数体必须纯：不能直接写 `renderCount.current++`（StrictMode 下渲染体可能跑两次，会数出双份）。计数在 `useEffect` 里做，渲染完再"补记"。
- 点"强制重渲染一次"按钮 → state 变 → 重渲染 → useEffect +1 并写入 state → 数字更新。这就是 ref↔state 的协作闭环。

### `src/components/lesson5/StopwatchDemo.jsx`

- 经过秒数 `seconds`、运行状态 `running` 进 **state**（要画到屏幕上）。
- 定时器 id 进 **ref**（stop 时要用它调 `clearInterval`，跟画面无关）。
- 为什么 id 不进 state：它不是界面数据，set 一次触发一次无意义渲染；在 effect 里 set 还可能造成死循环。
- 注意 `useEffect(..., [running])` 的标准模式：effect 里建定时器，cleanup（return 的函数）里拆——running 变化或组件卸载都不会泄漏定时器。
- `setSeconds((s) => s + 1)` 用函数形式：interval 的闭包会捕获过期值（第 1 课讲过的坑）。

### `src/components/lesson5/UncontrolledForm.jsx`

- input 不写 `value`、不写 `onChange`：打字时 React 完全不知情，DOM 自己管值——这是"非受控"。
- 提交时两种读法：`nameRef.current.value` 精确读一个；`new FormData(formRef.current)` 一次读走全部（**input 必须有 name 属性**）。
- 与第 1 课受控表单对比：

|          | 受控（第 1 课 TodoList）   | 非受控（本课）        |
| -------- | -------------------------- | --------------------- |
| 谁驱动   | React state                | DOM 自己              |
| 每次按键 | onChange 触发重渲染        | 不触发重渲染          |
| 何时校验 | 每次输入，可实时反馈        | 提交时一次性          |
| 代码量   | 多（每个 input 一套 state） | 少                    |

选择建议：需要实时校验/联动/限制输入 → 受控；简单的"提交时读一次" → 非受控更快。

- React 19 小知识：函数组件可以直接把 `ref` 当 prop 接收，不再需要 `forwardRef` 包裹，本课只用到 DOM ref，知道即可。

### `src/pages/Lesson5.jsx`

页面外壳，只负责标题和把三个演示摆出来；布局复用 App.css 的 `.page/.card/.row/.big-number/.hint`，本课没有新增 css 文件。

## 动手试一试

1. **滚动到顶部按钮**：给页面底部加一个按钮，点击后用 `window.scrollTo({ top: 0, behavior: 'smooth' })` 回顶部。（提示：这不需要 ref，体会"命令 DOM"还有哪些入口。）
2. **暂停记忆的秒表**：给 StopwatchDemo 加"记一次分（lap）"按钮，把 lap 存进一个 ref 数组；再点击时把它显示出来会需要什么？（提示：显示 = 画到屏幕 = state，体会从 ref "晋升"到 state 的时刻。）
3. **受控/非受控双版表单**：把 UncontrolledForm 改写成受控版本，加实时校验（邮箱为空时提交按钮禁用），对比两边代码量。

## 易错点

1. **在渲染体里直接 `xxxRef.current++`**：现象——StrictMode 下计数翻倍；原因——渲染体必须纯，可能被执行多次。记账放 `useEffect`。
2. **ref.current 是 null 就调方法**：现象——`Cannot read properties of null (reading 'focus')`；原因——元素还没挂载（初始渲染前、或被条件渲染隐藏）时 `.current` 是 null。用前先 `if (inputRef.current)`。
3. **把定时器 id / DOM 节点存进 state**：现象——无意义的多余渲染；在 effect 里 set 还可能死循环；原因——state 是给"要画到屏幕上的数据"用的。
4. **非受控 input 忘写 name**：现象——FormData 读出来是空对象；原因——FormData 按 name 属性取值。
5. **忘记清理 interval**：现象——停止后秒数还在跳/卸载后还在 setState；原因——effect 建的定时器必须在 cleanup 里 `clearInterval`。

## 自测题

1. `useRef(0)` 返回的是什么？改它的 `.current` 会让组件重渲染吗？
2. 秒表例子里，为什么 `seconds` 用 state、interval id 用 ref？反过来会怎样？
3. 受控表单和非受控表单，"每次按键"分别发生什么？
4. 为什么不能在渲染函数体里写 `renderCount.current++`？正确做法是什么？

**参考答案**

1. `{ current: 0 }` 对象；不会触发重渲染（React 不追踪 ref 的变化），但组件一生中盒子是同一个。
2. seconds 要显示在屏幕上，必须驱动重渲染；id 只是 stop 时找定时器用的记事本。反过来：id 进 state 产生无意义渲染甚至死循环；seconds 进 ref 则界面永远不更新。
3. 受控：onChange 更新 state → 重渲染 → input 的 value 由 React 决定；非受控：DOM 自己改自己的值，React 无感知、不重渲染。
4. 渲染体必须纯（StrictMode 下可能执行两次，计数会翻倍）；正确做法是在 `useEffect` 里累加。

## 下一课预告

第 6 课：useContext —— 当 props 要一层层穿透好几级组件时，用一个"全局广播"直达。
