# 第 1 课 · JSX、Props、State

对应页面：<http://localhost:5173/lesson/1>（源码 `src/pages/Lesson1.jsx`、`src/components/Greeting.jsx`、`src/components/Counter.jsx`、`src/components/TodoList.jsx`）。

## 学习目标

完成本课后，你应该能够：

1. 说出 JSX 的四条基本规则，并且一眼看出别人 JSX 里违反规则的地方。
2. 理解并会画 **UI = f(state)** 这张"核心心智图"——页面不是被逐步操作的，而是由数据"算"出来的。
3. 正确使用 props：知道它是只读的、怎么给默认值、`children` 是什么。
4. 正确使用 `useState`：setter 函数、函数式更新、不可变更新，这三条铁律一条都不能少。
5. 会写受控表单（`value` + `onChange`），知道为什么 key 不能用数组下标。

## 核心概念

### 1. JSX：在 JavaScript 里写"HTML"

JSX 不是 HTML，它是一种语法糖，最终会被编译成 `createElement(...)` 函数调用，产出普通的 JS 对象（虚拟 DOM）。四条规则：

| 规则 | 说明 | 反例 |
|---|---|---|
| **必须有单根** | `return` 的 JSX 只能有一个最外层元素（或用 `<></>` 空标签） | `return <p>a</p><p>b</p>` ❌ |
| **`{}` 里写表达式** | 任何 JS **表达式**（有值的东西）都能塞进 `{}`，但**语句**不行 | `{if (x) {...}}` ❌（三元 `?:` 可以） |
| **用 `className`** | `class` 是 JS 保留字，所以类名写作 `className` | `<div class="card">` ❌ |
| **标签必须闭合** | 单标签也要自闭合 | `<input>` ❌ → `<input />` ✅ |

`src/pages/Lesson1.jsx` 头部就演示了表达式：

```jsx
<p>
  你好，{name}！今天是学习 React 的第 {isLearning ? '一' : '零'} 天。
</p>
<p>表达式可以出现在任何地方：{2 + 3}、{'字符串'.toUpperCase()}、{today}</p>
```

### 2. UI = f(state)：React 最核心的一句话

传统 jQuery 式开发是"命令式"的：拿到数据变了 → 手动找到那个 `<span>` → 手动改它的文本。React 是"声明式"的：

```
UI = f(state)
```

**界面是当前数据的一个函数**。你只负责描述"数据长什么样时界面长什么样"，数据一变，React 自动重新调用你的组件函数、算出新的界面并更新浏览器。`Counter.jsx` 里只写了一行 `setCount((c) => c + step)`，页面上 `{count}` 就自己变了——你没有碰过任何 DOM。

由此推出两条直觉：

- 想改界面 → 改数据（state），而不是改 DOM。
- 同样的 state 一定渲染出同样的 UI → 所以组件函数要"纯"，不该有副作用（这也是 `today` 被放在模块顶层只算一次的原因，见代码注释）。

### 3. Props：父传子的只读参数

组件就是一个"接收 props、返回 JSX"的函数，props 就是它的参数：

```jsx
function Greeting({ name, mood = '🙂', children }) { ... }

<Greeting name="小明" />          // mood 用默认值 🙂
<Greeting name="小红" mood="😄" /> // mood 被覆盖
```

三个要点：

- **只读**：props 是父组件的数据，子组件改它等于改别人家的东西，React 的单向数据流会被破坏。想"改"只能让父组件传一个回调下来（第 4 课讲状态提升时正式展开）。
- **默认值**：解构时写 `mood = '🙂'`，就是函数默认参数，没传就用它。
- **children**：写在 `<Greeting>...</Greeting>` 标签**之间**的内容会作为 `children` prop 传进来。它是 React 里"插槽"的实现方式，布局组件（卡片、弹窗外壳）全靠它。

### 4. useState：让函数组件拥有记忆

函数组件每次渲染都是一次全新的函数调用，局部变量活不过一次渲染。`useState` 给了它"跨渲染的记忆"：

```jsx
const [count, setCount] = useState(0)
//     ↑ 当前值      ↑ 修改函数        ↑ 初始值（只在首次渲染生效）
```

四条铁律：

1. **只能通过 setter 改**。直接 `count++` 只改了一个普通局部变量，React 不知道，页面不会更新（`Counter.jsx` 的 hint 就是让你去控制台试这个）。
2. **setter 是"替换"不是"合并"**。`setCount(5)` 就是把 count 整个换成 5。对象类型的 state 尤其注意：改一个字段要 `{ ...old, field: newVal }` 整个换新。
3. **基于旧值算新值时，用函数式更新** `setCount((c) => c + 1)`。因为 state 更新是异步批处理的，连续两次 `setCount(count + 1)` 两次读到的都是同一个旧值，结果只加了一次；函数形式的 `c` 永远是最新值。
4. **不可变更新**。永远创建新数组/新对象，不要 `push`、不要改原对象——React 靠"引用变没变"来判断要不要重渲染，原地修改引用没变，它就当你什么都没做。`Counter.jsx` 的 `[...h, \`+${step}\`]` 和 `TodoList.jsx` 的 `t.map(...)`、`t.filter(...)` 都是这个套路。

### 5. 事件处理：传函数，不传调用

```jsx
<button onClick={() => add(1)}>+1</button>   // ✅ 传箭头函数，点击时才执行
<button onClick={reset}>重置</button>         // ✅ 直接传函数引用
<button onClick={add(1)}>+1</button>          // ❌ 渲染时就调用了，且返回值当 handler
```

`onClick` 需要的是一个**函数**，React 在事件发生时替你调用它。写 `add(1)` 是在渲染瞬间就执行了，等于"页面一加载就加一"，之后点击没有任何处理函数。需要传参时，包一层箭头函数。

### 6. 列表渲染与 key：为什么不用数组下标

用 `.map()` 把数据数组变成 JSX 数组，每个元素给一个稳定的 `key`：

```jsx
{todos.map((todo) => (
  <li key={todo.id} ...>...</li>
))}
```

key 是 React 用来识别"列表里哪个是哪个"的身份证：重渲染时它拿着 key 对比新旧两份列表，决定哪些项要更新、移动、删除。**数组下标当 key 的问题是：它不是稳定的身份证**。往头部插入一项后，原来第 0 项的"下标"变成了 1——React 以为"0 号还在，只是内容变了"，可能把状态挂到错误的项上（比如输入框内容串位、动画错乱）。删除中间项同理。所以 key 要用数据自带的、稳定的唯一 id（本项目用 `Date.now()` 生成）。

### 7. 受控表单：value + onChange

```jsx
<input
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
/>
```

输入框的值完全由 state `draft` 驱动，每次输入触发 `onChange` → 更新 state → 重新渲染 → 输入框显示新值。React 成为**唯一数据源**，输入框内容和 state 永远同步，于是"清空输入框"就只是 `setDraft('')` 一行。与之相对的"非受控"（用 ref 去读 DOM 的值）第 5 课再讲。

另外注意 `onSubmit` 里的 `e.preventDefault()`：不阻止的话浏览器会走原生表单提交、整页刷新，你的 state 全部归零。

## 代码导读

### `src/pages/Lesson1.jsx` —— 本课的"教室"

- 顶部注释交代了它从 `App.jsx` 拆出来的背景：路由让"每课一页"，`App.jsx` 只当布局外壳。
- `<header>` 是 JSX 表达式的练兵场：变量插值 `{name}`、三元表达式 `{isLearning ? '一' : '零'}`、运算 `{2 + 3}`、方法调用 `{'字符串'.toUpperCase()}`。
- `const today = ...` 放在**模块顶层**而不是组件函数体里，配的注释是重要伏笔："渲染函数体内 `new Date()` 是不纯的"——组件每次渲染都会重新执行，放 `new Date()` 会导致每次渲染时间都可能不同，这是"组件应当是纯函数"的直观例子。
- 同一个 `<Greeting>` 用了三种姿势：只传 `name`、传 `name + mood`、传 children——props 的三种用法一屏看全。
- `<Counter />`、`<TodoList />` 不带任何 props，说明组件也可以完全自治、自己管自己的 state。

### `src/components/Greeting.jsx` —— Props 教具

- 解构参数 `{ name, mood = '🙂', children }`：一行同时演示了取值、默认值、children。
- `{children && <p>children 内容：{children}</p>}`：条件渲染的惯用写法——`&&` 左边为假值时右边不渲染。没传 children 时这个 `<p>` 整个消失。
- 全程没有修改 props 的代码，身体力行"props 只读"。

### `src/components/Counter.jsx` —— useState 教具

- 两个独立 state：`count`（数字）和 `history`（字符串数组）。**相关的数据不必强行合成一个对象**，按粒度拆开往往更好维护。
- `add` 里两个 setter 都用函数式更新 `setCount((c) => c + step)`、`setHistory((h) => [...h, ...])`，并注释了原因："c 是最新的 count"。
- `{history.length ? history.join('、') : '（暂无）'}`：又一处条件渲染 + 表达式。
- `.hint` 那句话是刻意设计的实验：去控制台试图直接改 count，体会铁律 1。

### `src/components/TodoList.jsx` —— 不可变更新 + 受控表单 + 列表 key，三合一

- `addTodo`：`[...t, { id: Date.now(), text, done: false }]` 是"不可变追加"的标准写法；`draft.trim()` 空则 `return`，小防御。
- `toggle`：`t.map(...)` 里只有目标项换成新对象 `{ ...todo, done: !todo.done }`，其余项**原样引用保留**——不可变更新不代表全部重建，够用就好。
- `remove`：`t.filter(...)` 天然返回新数组，是"不可变删除"的惯用法。
- 表单：`value={draft}` + `onChange` + `onSubmit` 里 `e.preventDefault()`，受控表单完整闭环；按钮用 `type="submit"`，回车也能提交。
- 列表：`key={todo.id}`，注释直接点名"不要用数组下标当 key"。
- 底部统计 `todos.filter((t) => t.done).length`：**派生数据不要存成 state**，渲染时现算即可——存了就会出现两份数据不同步的经典 bug。

## 动手试一试

练习 1（热身）：给 `Greeting` 加一个 `age` prop，默认值 `18`，显示"小明 18 岁"。再在 `Lesson1.jsx` 里加一个不传 `age` 的 `<Greeting />`，确认默认值生效。

练习 2（点赞卡片，state 综合）：新建一个 `LikeCard` 组件：内部维护 `liked`（布尔）和 `likes`（数字）两个 state，一个按钮完成两件事——未点赞时显示"👍 点赞"，点击后 `likes` 加 1、按钮变为"已赞 💛"且再点可以**取消**（`likes` 减 1）。提示：一次点击改两个 state，两个 setter 都考虑要不要用函数式更新；能不能只用一个 state 推导出另一个？（想想 TodoList 底部的统计。）

练习 3（进阶，TodoList 增强）：给 `TodoList` 加两个功能——① 勾选完成的条目整行置灰（提示：项目里已有 `.done` 类的思路，检查样式是否需要自己补）；② 列表排序，未完成的排前面、完成的沉底，各自内部保持原有顺序。提示：排序是"派生数据"，不要排序后再 `setTodos` 存回去，而是在渲染前用 `[...todos].sort(...)` 现算——想想为什么不能直接 `sort` 原 state。

## 易错点

1. **`onClick={add(1)}`**。现象：页面一加载就 +1，之后点击无效。原因：`add(1)` 是"调用"，渲染时就执行了，`onClick` 拿到的是它的返回值而不是函数。应写 `onClick={() => add(1)}`。
2. **`{if (...) { ... }}`**。现象：语法报错。原因：`{}` 里只能放表达式，`if` 是语句。改用三元 `condition ? <A /> : <B />` 或 `&&`。
3. **原地修改 state**。现象：`todos.push(newTodo)` 或 `todo.done = true` 之后页面不更新。原因：引用没变，React 认为数据没变，跳过重渲染；即使碰巧渲染了，比较逻辑也可能出问题。永远 `setTodos((t) => [...t, x])`、`{ ...todo, done: !todo.done }`。
4. **连续 `setCount(count + 1)` 只加一次**。现象：一个 handler 里写两次 `setCount(count + 1)`，结果只 +1。原因：两次读到的 `count` 都是本次渲染的旧值（更新是异步批处理的）。改用 `setCount((c) => c + 1)`。
5. **表单提交后页面刷新、state 清零**。现象：点"添加"按钮页面整个重载了。原因：忘了 `onSubmit` 里 `e.preventDefault()`，浏览器执行了原生表单提交。
6. **下标当 key + 列表会变动的组合**。现象：在列表头部插入或删除项后，某些项的内容/勾选状态"串位"。原因：下标不是稳定标识，React 按 key 对比时错认了元素。数据会增删排序的列表，必须用稳定的 id。

## 自测题

1. 下面这段 JSX 有几处错误？分别违反了哪条规则？
   ```jsx
   return (
     <p class="hint">共 {if (n > 0) { n }} 项<input></p>
     <p>第二段</p>
   )
   ```
2. `<Greeting name="小明">你好</Greeting>` 中，字符串 `"你好"` 是通过哪个 prop 传进组件的？子组件能修改它吗？
3. 一个 handler 里要同时 `likes + 1` 和 `liked 取反`，分别写出推荐写法，并说明为什么用函数形式。
4. 为什么 `toggle` 里要用 `t.map(...)` 返回新数组，而不能 `todo.done = !todo.done` 之后 `setTodos(todos)`？

<details>
<summary>参考答案</summary>

1. 四处：`class` 应为 `className`；`{if ...}` 是语句不能放 `{}`（改三元/`&&`）；`<input>` 未闭合（应 `<input />`）；return 有两个并列的 `<p>`，违反单根规则（外面套一个 `<div>` 或 `<></>`）。
2. 通过 `children` prop 传入（`{ name: '小明', children: '你好' }`）。不能修改——props 只读，这是单向数据流的要求；想"改"应由父组件改数据后重新传。
3. `setLikes((l) => l + 1)`、`setLiked((v) => !v)`。函数形式的参数是最新 state：同一轮事件里多个更新是批处理的，直接读旧变量会基于过期值计算（尤其取消点赞和点赞在快速连续点击时）。另外更优的设计是只存 `liked`，`likes` 由外部数据派生，避免两份状态不同步。
4. `todo.done = !todo.done` 是原地修改，`todos` 数组的引用没变，React 判定 state 没变、不重渲染；即使渲染，依赖引用比较的记忆化（第 9 课）也会失效。必须返回新数组（map/filter/展开），且未变的项保留原引用。

</details>

## 下一课预告

下一课：**副作用与 `useEffect`**——当组件需要和"React 之外的世界"打交道（定时器、网络请求、操作 `document.title`）时该怎么做，以及为什么 `StrictMode` 会把 effect 跑两遍。
