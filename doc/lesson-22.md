# 第 22 课 · 组件设计模式

## 学习目标

完成本课后，你应该能够：

1. 说清楚 React 组件的两种"复用"——**逻辑复用**（状态与副作用）和**结构复用**（UI 的拼装方式）是两道不同的题，各自的答案不同；
2. 能读能写三种经典模式：**组合组件**（Tabs.List / Tabs.Tab 静态挂载 + Context 广播状态）、**render props**（行为组件把状态与操作当参数递给调用方的函数）、**容器/展示分离**（逻辑与视图分家），并说出各自解决什么问题；
3. 能完整讲出演进史 **mixin → HOC → render props → Hooks**：每一代解决了上一代的什么痛点，又引入了什么新问题；
4. 理解组合组件为什么**必须**配 Context——子组件在调用方的 JSX 里是互不认识的平级兄弟，父组件拿到的只有打包好的 children，没有正规通道往里塞 props；
5. 形成今天的选型判断：**默认 Hooks + 组合**；HOC / render props / 容器组件进入"库源码认读区"，看到认得、不必再写。

本课对应的示例代码：

- `src/components/lesson22/Tabs.jsx` —— 模式一：组合组件。Tabs / TabsList / Tab / TabPanel 四个独立组件，子组件静态挂载在父对象上（`Tabs.List = List`），激活状态走 Context
- `src/components/lesson22/RenderProps.jsx` —— 模式二：`<Toggle render={(on, toggle) => …} />`，台灯与密码可见性两个调用方共用同一个行为组件
- `src/components/lesson22/ContainerPresenter.jsx` —— 模式三：同一个秒表的分离版（容器 + 纯展示，外加 HOC 活化石 `withLog`）与合并版对照
- 页面入口在 `src/pages/Lesson22.jsx`（三卡编排 + 每卡"什么时候用它"），样式在 `src/pages/lesson22.css`

## 核心概念

### 演进史：mixin → HOC → render props → Hooks

React 只有一样东西真正难复用：**带着状态的逻辑**。UI 好办（拆组件就行），难的是"这份状态、这个副作用、这套操作"想在多个组件里用。这个难题先后出现过四代答案，每一代都解决了上一代的问题，又引入了自己的新问题：

| 代际 | 代表 | 解决了什么 | 引入了什么新问题 |
|---|---|---|---|
| **mixin**（2013–2015，`React.createClass` + `mixins: [...]`） | `FluxMixin`、`PureRenderMixin` | 第一次尝试"把一段逻辑塞进多个组件"：混入的方法、state 直接长在组件身上 | **隐式依赖**（组件用了 mixin 里哪几个方法，代码上看不出来）；**命名冲突**（两个 mixin 都定义了 `componentDidMount` 就互相覆盖）；**来源不明**（`this.getFluxStore()` 这种方法从哪来？）。2015 年 React 转向 ES6 class 语法——class 不支持 mixin，官方路线就此终结 |
| **HOC**（2015–2017） | redux 的 `connect()`、relay、各种 `withXxx` | 把"隐式注入"变成"组件进、增强组件出"的纯函数变换：`WithLog(Tabs)` 包一层，横切逻辑（日志/埋点/权限/订阅 store）写在外面，被包组件拿到的 props 是显式的 | **包装地狱**（`withA(withB(withC(Comp)))`，DevTools 里一层层包装纸，调试时先剥洋葱）；**props 来源不明**（换了个角度继续"天上掉 props"——组件体内还是看不出某个 prop 是谁给的）；**props 命名冲突**（两层 HOC 注入了同名的 prop，外层悄悄覆盖内层）；ref 转发要专门加 `forwardRef` 补丁 |
| **render props**（2017–2019） | downshift、react-motion、老 react-router 的 `<Route render={…}>` | 把数据来源摆上台面：行为组件不决定画什么，把"状态 + 操作"当**函数参数**递出去，调用方在参数表上亲眼看到 `(on, toggle) => …`——来源问题根治；一个组件也可以只复用行为不绑死皮肤 | **嵌套地狱**（每个要复用的行为一层函数嵌套，`<Mouse>{(m) => <Cat>{(c) => …`）；**闭包重建**（render 函数每次渲染都是新函数，下游任何依赖函数引用相等性的 memo 优化都会失效）；"先逻辑后渲染"的灵活度不如后来的 Hook |
| **Hooks**（2019–） | 自定义 Hook：`useToggle`、`useStopwatch`、`useFetch`（第 8/11 课） | 无包装、无嵌套、来源清晰——每个 `useXxx()` 调用就写在组件体里，用了几份逻辑一目了然；逻辑可以按"能力"切分而不是按生命周期切分 | **新的心智负担**：规则（只在顶层调用，第 8 课铁律）、闭包陷阱、`useEffect` 依赖数组的心智成本。但这是四代里第一个"没有结构性新问题"的答案——所以它成了终点站 |

读这张表的正确姿势：**每一代的死因，都是下一代的第一卖点**。mixin 死于隐式 → HOC 用显式包装解决 → HOC 死于包装 → render props 用函数参数解决 → render props 死于嵌套 → Hooks 用平铺调用解决。这不是"新版本替代旧版本"的普通迭代，而是一个问题（带状态逻辑的复用）被反复重解的历史——看懂它，你读任何 React 老代码、任何库的 changelog 都不慌。

（顺带修正一个常见误解：Hooks 出现后 `React.createClass` 时代的容器组件确实退场了，但 render props 并没有"死"——它作为库 API 里的渲染约定活得好好的，只是不再承担"通用逻辑复用"的职责。）

### 三种模式各自长什么样

**组合组件（Compound Components）**解决的是另一道题——**结构复用**：Tabs、手风琴、下拉菜单这类"一家人"组件，调用方想自己决定内部怎么排布（哪个标签在前、面板里放什么内容），而不是拿一个只吃配置数组 props 的黑盒：

```jsx
<Tabs defaultValue="what">
  <Tabs.List>
    <Tabs.Tab id="what">是什么</Tabs.Tab>
    <Tabs.Tab id="cost">代价</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="what">…</Tabs.Panel>
  <Tabs.Panel id="cost">…</Tabs.Panel>
</Tabs>
```

三个约定：① 子组件**静态挂载**在父对象上（`Tabs.List = List`）——JS 里组件也是对象，长属性只是命名空间把戏，不是继承；② 子组件之间**零 props**，谁也不知道谁的存在；③ 父组件只管状态（activeId），`children` 原样渲染，一个字都不加工。

**render props** 解决**逻辑复用**（HOC 的继任者）：行为组件只持有状态与操作，渲染权完全交给调用方：

```jsx
<Toggle render={(on, toggle) => (
  <button onClick={toggle}>{on ? '关灯' : '开灯'}</button>
)} />
```

`Toggle` 自己渲染出来的东西 = 调用方函数的返回值。同一份 on/off 逻辑，配台灯是台灯，配密码框是密码框——本课的 `RenderProps.jsx` 里这两块并排跑着，皮肤完全不同。

**容器/展示分离**（2015 年 Dan Abramov 的名文确立）解决**职责划分**：容器（Container）管数据与行为——状态、副作用、回调都在这层，自己几乎不写 UI；展示（Presentational）管长相——props 进、JSX 出，没有一行 hook。本课 `ContainerPresenter.jsx` 里同一个秒表写了分离版和合并版，行为完全一致，让你亲眼对比"组织方式"和"行为"是两回事。

### 为什么组合组件必须配 Context

这是本课最容易"用的时候没感觉，自己写就栽坑"的一环。回到 Tabs 的用法：

- `<Tabs.Tab>` 和 `<Tabs.Panel>` 是**调用方**写进 JSX 的，父组件 Tabs 拿到的只有 `children` 这个打包好的整体；
- React 的规则是：**children 一旦交出去，父组件只能原样渲染**——它没有办法"往里面塞 props"（JSX 已经是编译好的对象树，Tab 组件接收什么 props 在调用方写下的那一刻就定死了）；
- 可是 Tab 需要知道"当前激活的是不是我"（读 activeId），Tab 被点击后还要通知所有 Panel"换人了"（写 activeId）——这些数据**必须**跨过"调用方 JSX"这道墙传给平级兄弟；
- 硬闯的邪门写法是 `React.cloneElement`：父组件遍历 children、逐个克隆并注入 props。能跑，但要求子组件必须是自己的直接孩子（中间多包一层 div 就断了），而且"偷偷改人家 props"违背了"children 原样渲染"的约定，是公认的脆弱方案；
- 正规通道只有一条：**Context**（第 6 课）。父组件把 `{ activeId, setActiveId }` 放进 Provider，不管调用方把子组件埋多深、中间包多少层，Tab 和 Panel 都能直接收听——Context 天生就是"跨过中间所有层"的广播，这道墙对它不存在。

所以"组合组件 + Context"不是搭配偏好，而是**结构上的必然**：组合组件把"结构控制权"交给了调用方，调用方拿走的正是"props 通道"，那么剩下的唯一通信线就是 Context。第 6 课学的三步走（createContext → Provider → useContext）在这里原样复用，只是主题从"主题数据"换成了"激活状态"。

### 选型结论：今天的默认答案

2026 年写 React，选型是清晰的：

1. **逻辑复用 → 自定义 Hook。** `useToggle`、`useStopwatch`、`useFetch`——无包装、无嵌套、来源清晰，四代演进在它这里收束。先想"这段逻辑能不能抽成 hook"，这是默认动作。
2. **结构复用 → 组合组件 + Context。** 做"一家人"UI（Tabs、Accordion、Select、Dialog）的标准姿势。本课的 Tabs 就是照着 Radix / AntD 的形状写的。
3. **HOC → 认得即可。** 看到组件进、组件出的函数（`connect()(Comp)`、`withRouter(Comp)`），知道是"老逻辑复用手段 + 横切注入"就行；新代码不写。
4. **render props → 认得即可。** 作为库 API 仍然常见：表格列渲染、虚拟列表行渲染、downshift、children 当函数。看到"函数 prop 递 UI"知道渲染权在谁手里即可。
5. **容器/展示 → 思想并入 Hook + 组件。** "容器组件"这个物种灭绝了，但它的遗嘱写进了今天的默认分工：**自定义 Hook 就是容器（逻辑），组件就是展示（视图）**。要复用逻辑就抽 hook，组件保持薄——这条纪律就是容器/展示分离的转世。

一句话：**默认 Hooks + 组合，其余模式在库源码里认得即可。** 学习历史不是为了复古，而是为了读得懂历史留下的代码——今天任何一个中型 React 项目里，上面四代答案你都会遇到。

## 代码导读

### `src/components/lesson22/Tabs.jsx` —— 组合组件

- 第 6 课三步走原样复用：`createContext(null)` 故意给 null 默认值 + `useTabsContext` 里抛错（fail fast：忘包 `<Tabs>` 第一秒炸出来，而不是悄悄失灵）；`useContext` 包成自定义 hook，防御只写一次；
- `Tabs` 是唯一的状态所有者：`useState(defaultValue)` 管 activeId，渲染体只有 Provider + 一个 div + `{children}` 原样摆出——**父组件对子组件的结构零干预**，这正是"结构由调用方决定"的实现方式；
- `Tab` 只读 Context 拿 `{ activeId, setActiveId }`：props 只有 `id` 和按钮文字，与"当前激活是谁"完全无关；`TabPanel` 只读不写（职责再切薄）；非当前面板 `return null` 直接卸载——省渲染但丢面板内部状态（输入框、滚动位置），要保留就改渲染但 `display: none`，两种取舍都注释在代码里；
- 挂牌动作压轴：`Tabs.List = TabsList; Tabs.Tab = Tab; Tabs.Panel = TabPanel`——注释里专门强调这不是继承，只是给"一家人"上户口，让调用方 import 一个名字用全家；
- 无障碍顺手做了：`role="tablist" / tab / tabpanel` + `aria-selected`，做库就该带这些。

### `src/components/lesson22/RenderProps.jsx` —— render props

- `Toggle` 是"行为组件"的标本：只有 `useState` 一个状态、`toggle` 一个操作，渲染体只有一行 `return render(on, toggle)`——**自己不画任何 JSX，画的权利整个让给调用方**；
- 两个调用方 `LampDemo`（台灯：on 决定灯泡颜色和文案）与 `PasswordDemo`（密码框：on 决定 `input` 的 type）共用同一个 Toggle——"同一逻辑、任意皮肤"就是复用的证明；
- 文件尾部的注释备忘两个变体：children 当函数用（`<Toggle>{(on, toggle) => …}</Toggle>`，机制与 render prop 完全相同）和经典案例 `<MouseTracker render={(x, y) => …} />`——以及它们在 Hooks 时代的对应物 `useToggle()` / `useMousePosition()`，思路同源。

### `src/components/lesson22/ContainerPresenter.jsx` —— 容器/展示对照

- `TimerPresenter` 纯展示的判定标准写在注释里：**没有 useState、没有 useEffect**，props 进 JSX 出（连"毫秒格式化成秒"这类纯展示逻辑都该归它）；
- `StopwatchContainerBase` 容器：状态 + `useEffect` 计时器全在这层，渲染体只做一件事——把状态和行为打包成 props 递给 Presenter，自己一行 UI 不写；interval 的清理函数照第 2 课铁律写在 effect 返回值里；
- `withLog(Wrapped)` 是 HOC 活化石：组件进、增强组件出，挂载/卸载往控制台打日志——HOC 最经典的用途（日志/埋点/权限这类横切逻辑）的活标本，`connect()` 同款形状。打开控制台能看到分离版容器的挂载日志；
- `StopwatchMerged` 合并版：同样的状态、同样的 effect、同样的 JSX 全在一个组件里。对照结论写在注释里：**合并版并不更差**——这正是 Hooks 时代大家回归的写法；分离版的价值要在"逻辑要复用/单独测试"时才显现。

### `src/pages/Lesson22.jsx` 与 `lesson22.css`

- 页面只做编排，不持有任何模式的状态：卡片一的 Tabs JSX 就写在页面里——**页面自己扮演"调用方"**，组合组件的用法不用去组件文件里想象；
- 三张演示卡各带一条 `l22-verdict`（蓝边框"什么时候用它"判断行），第四卡是选型结论清单；
- 样式只加了 `l22-` 前缀的新类（标签条、灯泡、秒表网格、结论行），公共样式 `.card / .row / .big-number / .hint` 全部复用。

## 动手试一试

1. **给 Tabs 加受控模式**：现在的 Tabs 是非受控的（`defaultValue` 起步、状态自持）。仿照第 4 课受控组件的约定加一对 props：`value` + `onChange(newId)`——传了就完全听调用方的，不传就走内部 state（两种模式共存，叫"半受控"）。做完对照第 6 课：Provider 的 value 里多了什么、Tab 的 onClick 多了什么。
2. **写 MouseTracker，再转世成 Hook**：给 `RenderProps.jsx` 补一个 `<MouseTracker render={(x, y) => …} />`——`useEffect` 里在容器 div 上挂 `mousemove` 监听（别挂 window，范围小点不吵），清理函数记得 `removeEventListener`（第 2 课铁律）。然后把它转世成 `useMousePosition()` 自定义 Hook，对比两种写法的调用方代码：一个多一层嵌套，一个平铺一行。
3. **给秒表换皮肤，体会"展示可替换"**：只动 `TimerPresenter`，把大数字换成进度条（外槽 + 内条，宽度绑 `ms`），容器一行不许改——因为容器只依赖 Presenter 的 props 接口，不依赖它长什么样。做完再想想：合并版 StopwatchMerged 想换皮肤要动多少行？（这就是分离的全部意义。）

## 易错点

1. **子组件没包进 `<Tabs>` 就直接用**：现象是点击瞬间控制台抛 `Tabs.Tab / Tabs.Panel 必须放在 <Tabs> 内部使用`。原因：`useTabsContext` 里 `useContext` 拿到的是 `createContext(null)` 的默认值 null——头顶上没有 Provider，防御检查主动抛错。这是设计好的 fail fast（第 6 课同款）：宁可第一秒炸，不要悄悄失灵。
2. **想用 `cloneElement` 给子组件塞 props**：现象是子组件中间多包一层 div（比如 `<div className="wrapper"><Tabs.Tab …/></div>`）后就收不到注入的 props 了。原因：cloneElement 只能遍历**直接** children，孙辈够不着；而且"父组件偷改子组件的 props"违背 children 原样渲染的约定。结论：组合组件的状态分发一律走 Context。
3. **给接收 render/children 函数的组件套 `React.memo` 期待性能提升**：现象是 memo 完全不生效，父组件每次渲染它都跟着重渲染。原因：render 函数是调用方每次渲染内联新建的，引用永远不相等（第 9 课引用比较），memo 的浅比较永远失败。当年 render props 嵌套地狱里这是真实的性能坑；换成本课场景无所谓（组件树很小），但读老代码要知道这坑的存在。
4. **Context value 忘了是"每次渲染新建的对象"**：现象是随便敲一个 Tab，所有 Tab 和 Panel 都重渲染。原因：`value={{ activeId, setActiveId }}` 每次渲染都是新对象引用，Provider 一重渲染全体消费者跟着重渲染（第 6 课的已知代价）。本课树小无所谓；真做库时用 `useMemo` 包 value、或把 state 拆成读写两个 Context（读的多、写的少），渲染范围才收得住。
5. **容器组件里忍不住写了 UI，或展示组件里偷偷加了 useState**：现象是"分离版"写着写着和合并版长得一样，分离失去意义。原因：职责边界靠纪律维持——容器只产出"状态 + 回调"的 props 包裹，展示只做"props → JSX"的映射（包括格式化这类纯展示逻辑）。判断标准就一条：这个组件离开真实的副作用还能不能渲染？能，它就是展示。

## 自测题

1. `<Tabs.Tab>` 和 `<Tabs.Panel>` 之间没有传过任何 props，activeId 是怎么共享的？为什么不能由父组件在渲染 children 时顺手塞给每个子组件？
2. HOC 和 render props 都能复用"带状态的逻辑"，两者各自引入了什么新问题？Hooks 是靠什么特性同时消掉这两个问题的？
3. 本课说"自定义 Hook 是容器组件的转世"。对照分离版秒表：容器干了什么、展示干了什么？转世之后这两份职责分别落在谁头上？
4. Tabs 的 Panel 用 `return null` 隐藏非当前面板，付出了什么代价？什么业务场景必须改成"渲染但 display:none"？

### 参考答案

1. 走 Context：父组件把 `{ activeId, setActiveId }` 放进 Provider，Tab/Panel 通过 `useContext` 直接收听。不能塞 props 的原因：子组件 JSX 是**调用方**写的，父组件拿到的 children 已经是编译好的对象树，props 在写下的那一刻就定死了；children 一旦交出，父组件只能原样渲染，没有正规通道往里注值——硬塞（cloneElement）够不到孙辈且违背约定。Context 是唯一跨过"调用方 JSX"这道墙的通信线，所以组合组件在结构上必然配 Context。
2. HOC 的新问题：包装地狱（层层嵌套组件，DevTools 剥洋葱）、props 来源不明（换个方向继续天上掉 props）、props 命名冲突、ref 转发麻烦。render props 的新问题：嵌套地狱（每个行为一层函数嵌套）、render 函数每次渲染重建导致下游引用比较类优化失效。Hooks 同时消掉两者的靠的是：逻辑复用不再需要"包一层组件"这个载体——自定义 Hook 是普通函数调用，平铺在组件体里，无包装层（包装地狱消失）、来源写在本行代码上（来源不明消失）、也没有函数 prop 的嵌套（嵌套地狱消失）。
3. 分离版：容器持有 ms/running 状态和 interval 副作用，产出 `(ms, running, onStart, onStop, onReset)` 这包 props；展示接收这包 props 纯映射成 JSX，没有一行 hook。转世后：容器 = `useStopwatch()` 这类自定义 Hook（持有状态与副作用，返回状态和操作）；展示 = 组件本身（调 hook 拿返回值画界面）。所以"Hook + 组件"的默认分工就是容器/展示分离思想的现代形态，只是不再强制拆成两个组件。
4. 代价：非当前面板被卸载，面板内部的组件状态（输入框内容、滚动位置、播放进度）全部丢失，切回来从零开始。必须换 display:none 的场景：面板里有用户正在编辑的表单、或切换频繁且面板挂载成本高（比如面板里还有视频/重型列表）——这些时候"保留实例、只藏外观"比"每次重挂"体验好得多；代价是所有面板首次切换前就全部渲染，初始化更重。

## 下一课预告

第 23 课：动画与过渡。组件的进出场不只是"有/没有"的瞬间切换：CSS transition 配 class 切换做进入过渡、React"卸载即消失"带来的退场动画难题（delayedUnmount 模式）、以及新的 View Transitions API。还会立一条性能铁律：动画只动 `transform` / `opacity`（合成层），别碰 `width` / `top`（触发重排）——顺便致敬本课灯泡上那一次小小的 `transition: background`。
