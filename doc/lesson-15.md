# 第 15 课 · 测试入门

## 学习目标

完成本课后，你应该能够：

1. 说清楚"测什么、按什么比例测"——测试金字塔在组件层的落点：重逻辑测纯函数、交互用 RTL 查询、快照少用；
2. 会用 vitest 给纯函数写单元测试：`describe / it / expect` 三段式用例、覆盖边界、验证不可变性；
3. 会用 @testing-library/react 的 `render + screen + getByRole` 测受控组件的渲染与交互，用 `vi.fn` 断言事件上报；
4. 会用 `renderHook + act` 测自定义 Hook 的初始值与越界钳制；
5. 记住测试的命名约定与运行命令：`被测文件名.test.js` 与被测文件同目录，`npx vitest run` 一键回归。

本课对应的示例代码（被测对象在前，测试文件在后，成对出现）：

- `src/components/lesson15/miniCartReducer.js` + `.test.js` —— 纯函数 reducer 及其单元测试
- `src/components/lesson15/RatingStars.jsx` + `.test.jsx` —— 受控组件及其交互测试
- `src/components/lesson15/useCounter.js` + `.test.js` —— 自定义 Hook 及其 renderHook 测试
- `src/components/lesson15/setup.js`、`vitest.config.js` —— 测试基建
- 页面入口在 `src/pages/Lesson15.jsx`（页面里跑的 demo 与测试文件是同一批代码）

## 核心概念

### 为什么要测试

没有测试的改动流程是：改代码 → 手动把页面点一遍 → 没发现问题 → 上线赌一把。问题在于"点一遍"只覆盖你此刻想到的路径，三周后你改购物车时，不会记得把评分组件也点一遍。测试把"点一遍"固化成代码：**写一次断言，以后每次 `npx vitest run` 都替你把所有承诺过的行为回归一遍**。红灯 = 有个承诺被你改破了。

### 测试金字塔在组件层的落点

经典测试金字塔说"单元测试要多、端到端要少"。落到 React 组件开发，就是按"被测对象离浏览器有多远"分四层：

| 层 | 测什么 | 工具 | 本课文件 | 速度 |
|---|---|---|---|---|
| 纯函数测试 | reducer、计算、格式化——输入到输出 | vitest 的 `expect` | `miniCartReducer.test.js` | 毫秒级，应该最多 |
| Hook 测试 | 自定义 Hook 的状态规则 | `renderHook + act` | `useCounter.test.js` | 很快 |
| 组件交互测试 | 用户视角：渲染对不对、点击上报对不对 | RTL 的 `render + screen` | `RatingStars.test.jsx` | 较慢，只测关键路径 |
| 快照测试 | 渲染结果整坨存档比对 | `toMatchSnapshot` | （没有，故意不写） | 快但容易失守 |

两条使用原则：

1. **重逻辑下沉到纯函数，优先测它**。`miniCartReducer` 不依赖 React、不依赖 DOM，测试就是"给输入、断输出"，一行 DOM 都不用挂。所以设计组件时的老规矩（渲染保持纯、逻辑抽出去）同时也是"可测试性设计"——不是为了测试重构业务，而是业务本来就该这么写。
2. **快照少用**。快照红了的正确动作是"人来读差异、判断谁对"，但工具贴心地提供了 `--update` 一键更新快照。红灯被一键抹平，判断环节形同虚设——这是快照测试最常见的腐烂方式。真要用，也只给真正稳定的输出（如工具函数的格式化结果）用。

### 组件测试 = 像用户一样查页面：getByRole 为什么优于 querySelector

```jsx
// ❌ 按"代码怎么写"找：类名、DOM 顺序、第几个孩子
container.querySelector('.star:nth-child(3)')

// ✅ 按"用户看到什么"找：这里有一个角色是 button、可读名字是"3 星"的按钮
screen.getByRole('button', { name: '3 星' })
```

三种优势：

1. **测试钉住的是行为，不是实现**。改类名、换标签、调 DOM 顺序，`querySelector` 立刻红，但用户体验毫无变化——这种红灯是假警报。`getByRole` 只关心"屏幕上有没有一个叫 3 星的按钮"，实现随便重构，它稳如泰山。
2. **报错信息就是文档**。查不到时 RTL 会把页面上所有可查询的角色和名字列出来，你不用开 DevTools 就知道页面现在长什么样。
3. **顺带检查可访问性**。角色和可读名字来自 `aria-label` 等标注，查不到往往说明标注缺失——测试红灯帮你提前暴露读屏用户也遇到的问题。好测和好用在这里是同一件事。

配套查询速记：`getBy*` 查不到就抛错（断言"应该有"）；`queryBy*` 查不到返回 null/[]（断言"应该没有"）；`getAllBy*` / `findAllBy*` 处理多个或异步出现。

### act 的意义（一句版）

**act(fn) 告诉 React"我正在模拟一次真实使用"，fn 里触发的更新会被当场结算——出来再断言，拿到的就是最终结果，而不是"还没渲染完"的旧值。** `render`、`fireEvent` 内部已经包了 act，所以组件测试里多数时候感觉不到它；但在 renderHook 里手动调用 `result.current.increment()` 这种更新，必须自己包一层。

### renderHook：给 Hook 造一个一次性宿主

Hook 只能在组件渲染过程里运行，没法像纯函数那样裸调。`renderHook(() => useCounter(9, { max: 10 }))` 帮你造一个一次性的宿主组件把 Hook 挂起来，返回两个抓手：`result.current` 是 Hook 的最新返回值（读它来断言），`rerender(...)` 可模拟参数变化后的重渲染。测试节奏三拍：挂载 → `act` 里调用 → 读 `result.current` 断言。

### vi.fn：不用真的接收方，也能验证"上报了什么"

受控组件的 `onChange` 要有人接。测试里传一个 `vi.fn()`——它什么也不做，只忠实记录被调用的次数和参数：

```jsx
const onChange = vi.fn()
fireEvent.click(screen.getByRole('button', { name: '3 星' }))
expect(onChange).toHaveBeenCalledWith(3)
```

这比去窥探组件内部存了什么强得多：断言的是"组件对外做了什么"，而不是"内部怎么实现"。

### 命名约定与文件职责

- **命名约定**：测试文件和被测文件放在**同一目录**，命名为 `被测文件名.test.js`；文件里有 JSX 就用 `.test.jsx`。同目录的好处：`import RatingStars from './RatingStars.jsx'` 一个相对路径就够，改版时两边一起挪。vitest 靠这个后缀自动发现测试文件，不用登记清单。
- **`vitest.config.js`**：定测试环境（`environment: 'jsdom'`，在 Node 里模拟浏览器）和前置文件（`setupFiles`）。注意铁律：它**完全替代** `vite.config.js`，不会自动合并，所以 react 插件要在里面再写一遍。
- **`setup.js`**：每个测试文件运行前先执行。干两件事：把 jest-dom 的匹配器（`toBeInTheDocument`、`toHaveClass`……）装到 expect 上；注册 `afterEach(cleanup)` 让每个用例从白纸开始。
- **显式 import**：我们没开 `globals`，`describe / it / expect / vi` 都要在测试文件第一行显式 `import { describe, it, expect } from 'vitest'`。它们不是 JavaScript 内置，显式写出来源，编辑器跳转、补全、追溯都受益。

## 代码导读

### `src/components/lesson15/miniCartReducer.js` —— 被测对象①

- `miniCartReducer(items, action)`：三个 action。`add` 同款（同 id）合并数量、新品追加一行；`inc` / `dec` 调整数量，`dec` 减到 0 时移除该商品。
- 每个分支都返回**新数组或新对象**（`map` / `filter` / 展开式），绝不 `push`、绝不改旧对象——纯函数铁律，也是"不可变性"用例敢写 `expect(before).toEqual(snapshot)` 的底气。
- 容错边界：`dec` 一个不存在的 id、未知 action 类型，都原样返回不抛错。reducer 是状态机的转移函数，对任何输入的安全回应是"停在原地"。
- `cartTotal(items)`：总价是**派生数据**，不存进 state，用的时候现算（第 2 课铁律的延续）——函数永远算得对，而且它本身也是纯函数，顺手就能测。

### `src/components/lesson15/miniCartReducer.test.js` —— 纯函数测试样板

- 第一行显式 `import { describe, it, expect } from 'vitest'`（globals 没开）。
- 顶部一个 `item(id, name, price)` 小工厂：重复三次以上的造数据样板就该抽，参数只留用例真正关心的字段。
- 9 个用例全是三段式：**arrange 准备初始 state → act dispatch 一个 action → assert 断言新 state**。覆盖正常加购、同款合并、减到 0 移除、总价正确，以及三个边界（不存在的 id、未知 action、空车总价 0）。
- "不可变性"用例先 `structuredClone` 拍快照，dispatch 后对比旧 state 分毫未动——把纯函数铁律变成一条会红的断言。

### `src/components/lesson15/RatingStars.jsx` —— 被测对象②

- 受控组件：不持有评分 state，只有 `value`（显示几星）和 `onChange`（上报点了第几颗）两个 props，渲染纯靠 props 推导。
- 每颗星是 `button`，带 `aria-label="N 星"` 和 `aria-pressed`——读屏用户和 `getByRole` 查询共用同一套标注。
- 高亮规则 `n <= value` 加 `active` 类；`onClick={() => onChange?.(n)}` 用可选链，父组件没传也不崩。

### `src/components/lesson15/RatingStars.test.jsx` —— 交互测试样板

- `render` 挂载后统一从 `screen` 查询。四个用例：渲染 5 颗星（`getAllByRole` + 正则配名字）、点第 3 颗 `onChange` 收到 3（`vi.fn` 间谍 + `fireEvent.click`）、`value=4` 时高亮类与 `aria-pressed` 落对位置（`toHaveClass` / `toHaveAttribute`，来自 jest-dom）、`value=0` 时 `queryAllByRole('button', { pressed: true })` 为空——断言"应该没有"用 query 系列。
- 断言 class 用 `toHaveClass('active')` 而不是比对完整 className 字符串：将来组件加一个基础类，测试不该误红。

### `src/components/lesson15/useCounter.js` + `useCounter.test.js` —— Hook 测试样板

- Hook 本体刻意很薄：`increment` 用函数式更新 + `Math.min(c + 1, max)` 钳制，越界停在边界而不是报错——这是产品决定，测试把它钉死。
- 测试三拍节奏：`renderHook` 挂载 → `act(() => result.current.increment())` → 读 `result.current.count` 断言。7 个用例覆盖初始值、默认 0、正常加减、**越过 max 被钳制**、initial 已等于 max 时纹丝不动、reset。

### `vitest.config.js` + `setup.js` —— 测试基建

- 配置里 `environment: 'jsdom'`（组件要挂真实 DOM）、`setupFiles` 指向 setup、`globals: false`（显式 import 教学理由见核心概念）。
- setup.js 装 `@testing-library/jest-dom/vitest` 匹配器（**不是**默认入口，原因见易错点 1），并 `afterEach(cleanup)`（原因见易错点 2）。

### `src/pages/Lesson15.jsx` —— 教学页

- 页面不跑测试，只做两件事：讲测试金字塔的落点；把三个被测对象做成活体 demo（购物车直接 dispatch、星星受控接 `useState`、计数器 `max=3` 钳制肉眼可见），每张卡片底部给出对应测试文件的用例清单和 `npx vitest run` 命令。
- demo 调用的就是被测模块本体——页面展示行为，测试钉住契约，两处消费同一份逻辑。

## 动手试一试

1. **给 reducer 加 `clear` action**：一键清空购物车。先写两个测试（正常清空后长度为 0；对空购物车 clear 仍为空且不报错），再改实现让它们变绿——体验一次"测试先行"。
2. **把点击测试换成 user-event**：`@testing-library/user-event` 已装好。用 `const user = userEvent.setup()`，点击改成 `await user.click(...)`（记得给测试函数加 `async`）。对比 fireEvent 感受差异：user-event 会补全焦点转移、键盘可达性这些真实浏览器行为。
3. **给 useCounter 加 `{ min }` 下限**：`decrement` 不低于 min（对称于 max 的钳制）。照着 max 的两个边界用例各写一个测试再动实现。

## 易错点

1. **jest-dom 用错入口**：现象是测试文件一 import setup 就 `ReferenceError: expect is not defined`。原因：`import '@testing-library/jest-dom'` 默认入口找的是 Jest 的**全局** expect，我们没开 globals，全局里没有这个变量。解法：setup.js 里用 `import '@testing-library/jest-dom/vitest'`——它明确从 vitest 包拿 expect 再扩展。
2. **globals 关了之后测试互相污染**：现象是单独跑测试全绿，全量跑就报 `Found multiple elements with the role "button" and name "3 星"`。原因：RTL 的自动 cleanup 靠探测全局 `afterEach` 挂载，globals 关了它探测不到，上一个用例渲染的组件留在页面里。解法：setup.js 里显式 `afterEach(cleanup)`。
3. **用选择器把测试焊死在实现上**：现象是改个类名、调个 DOM 顺序，功能明明没坏测试却红。原因：`querySelector('.star:nth-child(3)')` 断言的是实现细节。改用 `getByRole('button', { name: '3 星' })`，测试钉行为，不钉写法。
4. **浮点总价**：现象是 `expect(cartTotal([{ price: 0.1, qty: 1 }, ...])).toBe(0.3)` 失败，因为 `0.1 + 0.2 === 0.30000000000000004`。这是 JavaScript 二进制浮点的老坑。解法：价格用"分"为单位的整数存储计算；或者断言用 `toBeCloseTo(0.3)`。
5. **断言测了实现而不是行为**：现象是实现小改（如给返回对象加个字段）后一片红，逐个修断言比改业务还累。原因：断言写了完整对象字面量、比对内部 state 引用这类"实现拷贝"。断言应该钉**契约**：行数、关键数量、总价、上报参数——契约不变，实现随便改。

## 自测题

1. 测试金字塔在组件层的四层落点分别是什么？为什么快照测试要少用？
2. `getByRole('button', { name: '3 星' })` 找不到元素时，除了代码 bug，还可能暴露什么可访问性问题？
3. act 的意义用一句话说是什么？renderHook 测试里手动调用 `result.current.increment()` 为什么要包在 act 里？
4. 本课 setup.js 为什么必须手动 `afterEach(cleanup)`？如果开了 globals，这一步还需要吗？
5. miniCartReducer 测试里的"不可变性"用例是怎么写的？为什么 reducer 必须不可变？

### 参考答案

1. 纯函数测试（最多、毫秒级）→ Hook 测试（renderHook + act）→ 组件交互测试（RTL，只测关键路径）→ 快照测试（尽量少用）。快照红了的正确动作是人来读差异做判断，而 `--update` 一键更新快照让这个判断环节形同虚设，时间一长快照就"永远绿"了。
2. 角色和可读名字来自 `aria-label` 等标注。查不到可能说明按钮没有可访问的名字（如没写 aria-label、文字不可读）——读屏用户同样"查不到"这个按钮。测试红灯提前暴露了可访问性缺陷。
3. act(fn) 告诉 React"我正在模拟一次真实使用"，fn 里触发的更新会被当场结算，出来再断言拿到的就是最终结果而不是旧值。不包 act 的话，setState 触发的重渲染可能还没落实，读 `result.current` 会拿到过期值。
4. 因为 RTL 的自动 cleanup 靠探测全局 `afterEach` 挂载，globals 关了它探测不到，上个用例渲染的组件会污染下一个用例（getByRole 报 multiple elements）。开了 globals 则 RTL 能自动挂 cleanup，不需要手写——但显式写出的代价很小、好处是行为不依赖"魔法探测"。
5. 先 `structuredClone` 拍一份"案发前"的深拷贝快照，dispatch 之后 `expect(before).toEqual(snapshot)` 验证旧 state 分毫未动。reducer 必须不可变，因为 React/useReducer 依赖引用比较判断"状态有没有变"：直接改旧对象，引用没变，界面可能不更新；而且不可变让"同输入同输出"成立，测试和历史回溯（时间旅行调试）才有意义。

## 下一课预告

基础篇（第 1–15 课）到此收官——接下来进阶篇将带着这套"先钉契约再改代码"的习惯，去碰性能优化与服务端数据管理。
