# 第 6 课 · useContext 与跨层传值

## 学习目标

完成本课后，你应该能够：

1. 说清 props 钻透（prop drilling）是什么，为什么层级一深它就是灾难。
2. 熟练使用三步走：`createContext` 造频道 → Provider 广播 → `useContext` 收听。
3. 会把 context 封装成「`XxxProvider` 组件 + `useXxx` 自定义 hook」这套标准姿势，并理解「未包 Provider 就抛错」的防御写法。
4. 能判断什么数据适合放 context（全局、低频：主题 / 语言 / 当前用户），什么不适合（局部、高频）。
5. 理解「React 管 state、CSS 变量管外观」的主题切换方案（`data-theme` 属性 + 两套变量）。

## 核心概念

### props 钻透

props 只能从父传给子。如果一个数据（比如主题）诞生在 App，真正的使用者却在三层之下，中间每层都必须「收下 → 再转手」：

```jsx
function Page({ theme }) {
  // Page 自己完全不用 theme，却被迫接收并转发
  return <Sidebar theme={theme} />
}
```

中间层被无关数据污染：改字段名要动一串文件，层级越深越容易漏传。**这不是某个人的代码写得差，是「父传子」这一条通道天生扛不住跨层需求。**

### context 三步走

context 给组件树开了一条「广播频道」：数据从 Provider 发出，势力范围内的任意后代直接收听，中间层全程隐身。

```jsx
// 第 1 步：造频道（默认值只在「没有 Provider 包住」时生效）
const ThemeContext = createContext(null)

// 第 2 步：Provider 广播（value 变化 → 所有消费者重渲染）
<ThemeContext.Provider value={{ theme, toggleTheme }}>
  {children}
</ThemeContext.Provider>

// 第 3 步：任意后代直接收听
const { theme } = useContext(ThemeContext)
```

### 封装成 Provider 组件 + 自定义 hook

实际项目里很少直接裸用这三个 API，标准姿势是：

- `ThemeProvider`：内部用 `useState` 持有数据（它才是数据的真正所有者），渲染 `<ThemeContext.Provider>` 和 `children`；
- `useTheme()`：内部调 `useContext`，把「没包 Provider」的防御检查集中写一次：

```jsx
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (ctx === null) throw new Error('useTheme 必须在 <ThemeProvider> 内部使用')
  return ctx
}
```

宁可抛错也别悄悄降级——错误堆栈直接指到出错的组件，比「页面颜色莫名不对」好查一百倍。

### 适合与不适合

| 适合放 context | 不适合放 context |
| --- | --- |
| 主题、界面语言 | 输入框草稿、hover/焦点 |
| 当前登录用户 | 每秒刷新的数字、动画数据 |
| 全局配置开关 | 只有一两个组件用的局部 state |

原因：Provider 的 `value` 每次渲染都是新对象，它一变，**所有**消费者连同它们的子树全部重渲染。全局低频数据无所谓，高频局部数据会把大片组件拖垮。

## 代码导读

### `src/components/lesson6/ThemeContext.jsx` —— 频道与数据所有者

- `createContext(null)`：故意把默认值设为 `null` 而不是一个像样的主题，这样「忘了包 Provider」会在 `useTheme` 里被防御检查当场拦下。
- `ThemeProvider`：`useState('light')` 持有主题——**context 只负责「传」，不负责「存」**，state 还是它自己的。`value = { theme, toggleTheme }` 同时广播数据和修改数据的方法，后代因此既能读也能写。
- `useEffect` 把主题写到 `<html>` 的 `data-theme` 属性上，清理函数在卸载时删掉属性，避免深色主题「泄漏」到其他课的页面。注意 Provider 里同时渲染了切换按钮和 `children`——Provider 也是普通组件，数据和 UI 共存毫无问题。
- 设计取舍：显式写出 `<ThemeContext.Provider value={value}>` 而不是把按钮藏进别的组件，为的是让你在本课亲眼看到三步走的第 2 步原形。

### `src/components/lesson6/ThemeDemo.jsx` —— 中间层隐身

- 嵌套结构 `ThemeDemo → Panel → DeepChild`。对比痛点小节的手递手版本：`Panel` 不接收、不转发任何主题 props，连 `ThemeContext` 都不 import——它彻底不知道 context 的存在。
- 注意 `Panel` 透传 `children` **不算**钻透：children 是 React 自带的组合机制，父组件塞什么它渲染什么，Panel 并不「认识」内容。

### `src/components/lesson6/DeepChild.jsx` —— 最深层的收听者

- 函数签名里没有任何 props，`useTheme()` 一行拿到主题。props 是「按血缘传」，context 是「按位置取」——只要在 Provider 势力范围内，隔多少层都能收听。
- 卡片的配色**没有一行 if 判断**：className 背后的颜色全部来自 CSS 变量，主题名文字才来自 context。

### `src/pages/Lesson6.jsx` —— 教学主线编排

- 痛点小节是静态示意（一个字符串常量 + 列表），不参与运行；三步走小节给出 API 原形；演示小节才是活的组件树：`<ThemeProvider>` 包住 `<ThemeDemo />`，切换按钮在 Provider 手里，消费在最底层。
- 最后一个「适合 / 别用」小节压住适用边界，防止学完就把 context 当万能胶水。

### `src/pages/lesson6.css` —— 两套变量一套组件

- `:root` 写浅色变量，`[data-theme='dark']` 覆盖成深色；变量统一加 `l6-` 前缀防撞名。
- React 和 CSS 的分工：Provider 只改一个 HTML 属性，换肤是 CSS 变量级联的自动结果——组件代码不需要为「有两套主题」做任何分支。

## 动手试一试

1. **亲手触发防御错误**：把 `DeepChild` 从 `<ThemeProvider>` 里拿出来单独渲染（比如临时放到 Lesson6 页面顶部），观察控制台报错信息和堆栈指向；再把 `createContext(null)` 的默认值改成 `'light'`，对比「抛错」和「悄悄降级」两种体验哪个更好排查。
2. **字号偏好 context**：仿照本课，写一个 `FontSizeContext`（`createContext` + `FontSizeProvider` + `useFontSize`）。Provider 里用 `useState` 存字号（如 14 / 16 / 20），给两个调整按钮；嵌套两层以上的组件用 `useFontSize` 读字号渲染文字，不传任何 props。进阶：把字号也通过 `style` 或 `data-size` 属性挂到 `<html>` 上，像主题一样让 CSS 接管。
3. **登录用户名片 context**：`UserContext` 存 `{ name: '张三', avatar: '🦊' }`，Provider 提供「登录 / 退出」切换（`user` 在对象和 `null` 之间切换）。深处的 `UserCard` 组件读到 `user` 就渲染名片，读到 `null` 就渲染「请登录」按钮——想想这个分支应该写在哪个组件里，`value` 里要不要放 `setUser`。

## 易错点

1. **忘了包 Provider，页面用的是默认值**。现象：怎么切换按钮都没反应，或者读到永远不变的值。原因：`useContext` 拿到的是 `createContext(默认值)` 里的默认值——它只在「头顶没有 Provider」时生效。本课故意让默认值为 `null` 并在 `useTheme` 里抛错，就是这个坑的疫苗。
2. **写了 Provider 却忘了传 `value`**。现象：消费组件永远拿到默认值，且控制台提示 value 缺失。原因：`<ThemeContext.Provider>` 的 `value` 不是可选参数，漏写等于什么都没广播。
3. **在组件外、循环或条件里调用 `useContext`**。现象：直接抛「Invalid hook call」或 hook 顺序错乱。原因：`useContext` 是 hook，必须遵守 hook 规则——只能在组件或自定义 hook 的顶层调用。
4. **以为 context 会像 props 一样只在「用它的组件」里更新**。现象：切换主题时，明明只有两三处用到主题，却感觉一大片都在刷新。原因：Provider 重渲染时 `value` 是新对象，所有消费者连同子树全部重渲染——这是 context 的固有代价，所以高频数据别放进去。
5. **把 context 当状态管理库**。现象：找不到「改 context」的 API。原因：context 只解决「传」的问题，「存」和「改」永远是 `useState` / `setState`（藏在 Provider 里）。先想清楚谁是数据的所有者，再考虑要不要广播。

## 自测题

1. context 三步走分别是哪三步？每一步用到的 API 是什么？
2. `DeepChild` 没有接收任何 props，为什么还能拿到 `theme`？这个数据物理上存在哪里、由谁修改？
3. 把 `<DeepChild />` 渲染到 `<ThemeProvider>` 外面会发生什么？本课为什么故意把 `createContext` 的默认值设为 `null`？
4. 产品经理要求做一个「每 100ms 更新一次的秒表」，多个组件都要显示。适合用 context 广播吗？为什么？应该怎么做？

### 参考答案

1. ① `createContext(默认值)` 造一个 context（频道）；② `<Context.Provider value={...}>` 包住需要数据的范围，数据从这里广播；③ 后代任意一层 `useContext(Context)` 直接取值。本项目把 ② 封装成 `ThemeProvider`、把 ③ 封装成 `useTheme()`。
2. 因为它调用 `useTheme()`（内部是 `useContext(ThemeContext)`），按「位置」在 context 频道里收听，不依赖 props 血缘。数据物理上存在 `ThemeProvider` 里的 `useState` 中，由 Provider 提供的 `toggleTheme` 修改——context 只负责广播，不负责存储。
3. `useContext` 会拿到 `createContext` 的默认值。默认值若是 `'light'`，页面会「看起来正常」地渲染成浅色，bug 被悄悄吞掉；本课设为 `null` 并在 `useTheme` 里检查抛错，让「忘了包 Provider」在开发期立刻暴露。
4. 不适合。每 100ms 更新意味着 `value` 频繁变成新对象，所有消费者（连同子树）跟着高频重渲染，其中大部分渲染是浪费。秒表 state 应该放在真正需要它的组件的局部 state / props 里（第 2 课的 `TimerDemo` 就是这么做的），或等后续课程的状态管理方案。

## 下一课预告

第 7 课 · useReducer：当一个状态的修改方式越攒越多，把「怎么改」集中收进一个纯函数里。
