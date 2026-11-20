# 第 21 课 · React + TypeScript 入门

## 学习目标

完成本课后，你应该能够：

1. 说清楚 TypeScript 的本质——JS + 一层只在编译时存在的类型：运行时被剥得干干净净，程序不会因此变慢；同时认清 Vite 的分工：**它负责编译 TS（剥类型），但从不检查类型**，类型错误只在编辑器和 `npx tsc --noEmit` 里报；
2. 会用 interface 给组件 props 立合同：必选属性、可选属性（`?`）、联合字面量类型（`'success' | 'warning' | 'error'`）、解构默认值，并能一句话说清 interface 和 type 怎么选；
3. 会给 React 事件处理器标类型（`ChangeEvent` / `FormEvent` / `MouseEvent`），知道"内联箭头函数自动推断、抽出的函数必须手标"这条分工，以及泛型参数为什么必须是元素类型；
4. 会给 Hooks 写泛型：`useState<User | null>(null)`、`useRef<HTMLInputElement>(null)`，理解为什么 `useState(null)` 必须显式写、联合类型如何把判空从"自觉"变成"强制"；
5. 能落地一套渐进迁移策略：真实项目从 `.jsx` 逐文件改 `.tsx`，strict 从第一天就开，而不是"停服三个月全量重写"。

本课对应的示例代码：

- `src/components/lesson21/Badge.tsx` —— 第一个 TS 组件：interface props 合同、联合字面量、默认值
- `src/components/lesson21/EventDemo.tsx` —— 事件类型三件套 + `useState<User | null>(null)` 的判空收窄
- `src/components/lesson21/GenericList.tsx` —— 泛型组件：`<T extends Item>` + `renderItem` 回调
- 页面入口在 `src/pages/Lesson21.jsx`（**故意保持 JS**：演示 TS 组件能被 JS 页面直接使用，以及这条路的保护边界）

## 核心概念

### 类型是"编译时的合同"，运行时不存在

TypeScript 不改变 JS 的运行方式：`.tsx` 文件交给浏览器前，esbuild 把所有类型标注剥掉，产出的就是普通 JS。这带来两个推论：

1. **类型零运行时成本**——类型多了不会让页面变慢，也永远别指望"运行时按类型分支"（`typeof` 检查的是运行时值，不是 TS 类型）；
2. **Vite 不做类型检查**——esbuild 转译只删类型、不看对错，`label` 拼成 `lebale` 页面照样跑。类型检查是另外两个角色的活：**编辑器**（写代码时的红色波浪线，体验最好）和 **`npx tsc --noEmit`**（不产出文件、只当检查器用，CI 的关卡）。开发流程是"编辑器实时提示 + 提交前 tsc 把关"，Vite 自顾自编译，两边互不知道对方存在。

所以本课的正确学习姿势：源文件里的类型要看，编辑器里的红线要信，页面"跑得起来"不代表类型写对了。

### props 类型化：合同写在 interface 里

props 是组件对外的承诺，类型化的第一步就是把承诺写成合同：

```tsx
interface BadgeProps {
  label: string                                    // 必选：不传就是编译错误
  variant?: 'success' | 'warning' | 'error'        // 可选 + 联合字面量：合法值只有三个
  size?: 'sm' | 'md'                               // 可选，配合解构默认值
}

function Badge({ label, variant = 'success', size = 'md' }: BadgeProps) { ... }
```

三个要点：

- **可选属性（`?`）+ 解构默认值是绝配**：类型上说"可以不传"，运行上"不传也有值"。只写 `variant?: ...` 不给默认值，调用方拿到的是 `undefined`；
- **联合字面量类型是"枚举值"的廉价解**：`variant` 的类型不是 `string` 而是三个具体字符串的联合。拼错一个字母（`'sucess'`）、传一个没定义的值（`'info'`），编辑器立刻红线——这类 bug 在 JS 里要等"样式悄悄不对"才发现；
- **类型标注的位置**：给整个参数对象标（`({ label }: BadgeProps)`），不是给每个解构变量挨个标。

**interface vs type 一句选型**：描述对象形状用 `interface`（可被 extends/implements、报错信息友好），需要联合类型、映射、条件变形等"类型运算"时用 `type`（`type ID = number | string` 这种联合没法用 interface 表达）。团队统一其中一种风格比选哪种更重要。

### 事件类型速查表

React 的 SyntheticEvent 按家族分类，泛型参数填"事件发生在哪种元素上"——这一步不是仪式感：`e.target` 的静态类型是 `EventTarget`（所有元素的祖先，没有 `.value`），只有把泛型参数标成具体元素，`.value`、`.checked`、`.clientX` 这些元素专属属性的提示和检查才生效。

| 场景 | 类型 | 常用属性 |
|---|---|---|
| 输入框/textarea 变化 | `ChangeEvent<HTMLInputElement>` / `ChangeEvent<HTMLTextAreaElement>` | `e.target.value` |
| 下拉框变化 | `ChangeEvent<HTMLSelectElement>` | `e.target.value` |
| 复选框变化 | `ChangeEvent<HTMLInputElement>` | `e.target.checked` |
| 表单提交 | `FormEvent<HTMLFormElement>` | `e.preventDefault()` |
| 点击 | `MouseEvent<HTMLButtonElement>` | `e.clientX / e.clientY` |
| 键盘按键 | `KeyboardEvent<HTMLInputElement>` | `e.key / e.code` |
| 聚焦/失焦 | `FocusEvent<HTMLInputElement>` | `e.target.value`（relatedTarget 少用） |

分工铁律：**内联箭头函数不用标**（`onChange={(e) => setName(e.target.value)}` 里 `e` 的类型由位置自动推断）；**抽成独立函数必须手标**（推断上下文没了，strict 模式下不标的 `e` 是隐式 `any`，直接报错）。

### 泛型：useState / useRef / 泛型组件

**useState** 大多数时候不用写泛型（初始值就能推断：`useState('')` 是 string）；必须显式写的两个场景：

```tsx
const [user, setUser] = useState<User | null>(null)
// useState(null) 会被推断成 null——之后 setUser(user) 直接报错"不能把 User 赋给 null"。
// 显式写联合类型，"有数据"和"还没拿到"两种可能都进了类型。

const [items, setItems] = useState<Item[]>([])
// 初始值是空数组时，元素类型推断不出来，显式写防止被推成 never[]。
```

联合类型还带来一份礼物：`user` 的类型是 `User | null`，直接 `user.name` 编译不过（"对象可能为 null"），必须先判空收窄——JS 时代最常见的 `Cannot read properties of null`，在这里被提前到编译期。

**useRef** 同理，两种常用写法：

```tsx
const inputRef = useRef<HTMLInputElement>(null)   // 挂在 DOM 元素上：初始 null，之后是元素
const timerRef = useRef<number | undefined>(undefined) // 存 setInterval 的 id（浏览器里是 number）
```

第一种的回报在 `inputRef.current.focus()`：不判空会被 strict 拦下，"`current` 可能是 null"。第二种的坑在 `setInterval` 的返回值浏览器是 `number`、Node 是 `NodeJS.Timeout`，写 `number` 是前端项目的通行约定。

**泛型组件**把"逻辑复用不限类型"变成现实（见 `GenericList.tsx`）：

```tsx
interface Item { id: Key }                       // 最低要求：有 id（key 需要）
interface GenericListProps<T extends Item> {
  items: T[]
  renderItem: (item: T) => ReactNode
}
function GenericList<T extends Item>({ items, renderItem }: GenericListProps<T>) { ... }
```

`T` 由喂进来的数据自动推断；`extends Item` 是约束——没有约束，组件里写 `item.id` 会红线（裸的 `T` "可能没有 id"），**约束越准，组件内部越敢用字段**。`renderItem` 回调是 render props 套路：组件管遍历/key/空态（要复用的），调用方管每项画成什么样（要定制的）。喂词表、喂学员表，组件一行不改。

### 为什么 strict 模式（以及为什么第一天就开）

`strict: true` 是一组检查的总开关，最要命也最有价值的是 `strictNullChecks`：`null`/`undefined` 不再"什么类型都能塞进去"，必须显式写进类型（`User | null`）并判空收窄。其余成员（`noImplicitAny`、`noImplicitThis`、`alwaysStrict` 等）把"不写类型就隐式放过"的口子全部堵上。

**第一天就开**的理由是经济学的：类型债务和 CSS 一样只会越欠越多。开着 strict 写新代码，每个类型都是"边写边确认"的；事后补，每个类型都是"考古后填表"，成本翻几倍。真实项目的痛点（`undefined is not a function`、字段拼错、重构改漏一处）大多属于"值的形状和想象不符"，这正是 strict 全天候盯着的东西。代价只是前期多写标注——而且是越写越少的：多数类型靠推断自动产生，手标的只有 props、函数签名和边界处。

### 渐进迁移策略：从 .jsx 逐步改 .tsx

真实项目几乎没人"停服重写"，通行做法是**逐文件迁移，新债不欠、旧债分期**：

1. **入口即地基**：`tsconfig.json` + `allowJs: true` 写好（本课的 tsconfig 已就位），TS 项目天然允许 `.js` 和 `.ts` 共存编译，Vite 对两种扩展名一视同仁；
2. **新代码全 TS**：从今天起新文件一律 `.tsx`，存量文件不动——代码增量立刻获得保护；
3. **顺着改动迁移**：哪个文件要改功能，就顺手迁哪个（改 `.tsx` → 补类型 → `tsc --noEmit` 清零）。高频改动的文件最先变干净，冷文件永远不迁也不亏；
4. **自底向上**：先迁工具函数、数据模型（纯 TS，无 JSX，最便宜），再迁叶子组件，最后迁页面容器——被依赖者先有类型，依赖它的文件迁移时提示才齐全；
5. **`any` 是缓冲区不是终点**：一时标不准的地方允许 `any`/`// @ts-expect-error` 过渡，但要留 TODO 和清理计划，别让"暂时的 any"变成永久免检通行证；
6. **注意保护边界**：`.tsx` 组件被 `.jsx` 文件调用时，**调用方传的 props 不受检查**（本课页面就是活例子）——迁完组件要迁调用方，"最后一公里"没走完只是半保护状态。

## 代码导读

### `src/components/lesson21/Badge.tsx` —— 第一份 props 合同

- `BadgeProps` interface：`label: string` 必选、`variant?: 'success' | 'warning' | 'error'` 可选 + 联合字面量、`size?: 'sm' | 'md'`；interface **export** 出去——合同不导出，别的文件就引用不到；
- 组件参数解构处直接给默认值（`variant = 'success'`）：可选属性 + 默认值的组合拳；类型标注给整个参数对象（`: BadgeProps`），不给单个变量挨个标；
- `variant` 直接当 CSS 类名的一段拼进 className：合法值有限，永远拼不出未知类名——类型替样式兜底；
- 文件尾注释故意留了两个"编译错误示范"（拼错 variant、漏传 label）：别抄进代码，抄进去 `tsc` 真会拦。

### `src/components/lesson21/EventDemo.tsx` —— 事件类型 + useState 泛型

- 三个抽出的处理器各标一种事件类型：`handleNameChange/handleAgeChange` 是 `ChangeEvent<HTMLInputElement>`（顺带演示"同一事件类型按元素种类复用"）、`handleSubmit` 是 `FormEvent<HTMLFormElement>`、`handleClick` 是 `MouseEvent<HTMLButtonElement>`（`clientX/clientY` 只有标对类型才有提示，展示在页面的"上一次事件"文案里）；
- `useState<User | null>(null)`：显式泛型的教科书场景——`useState(null)` 会把类型锁死成 null，后面 `setUser` 直接报错；页面上"还没有用户 / 已创建用户"两个分支就是联合类型逼出来的判空收窄，注释里写了"直接 `user.name` 会怎样"；
- `age` 的 state 是 string：受控 input 的 value 永远是字符串，提交时才 `Number()` 转换——类型在这里如实反映运行时，而不是粉饰太平；
- `import type { ChangeEvent, ... }`：事件类型是纯类型（运行时不存在），用 type 导入一眼分清哪些会被编译器删掉。

### `src/components/lesson21/GenericList.tsx` —— 泛型组件

- `Item` interface 只有一个要求：`id: Key`（`Key` 是 React 对 `string | number` 的官方别名，key 的合法类型）——数字 id、字符串 id 的数据都能进；
- `<T extends Item>` 约束换权限：组件内部 `item.id` 敢直接用，因为约束保证了它存在；注释里给了实验："把 extends 删掉试试，立刻红线"；
- `renderItem: (item: T) => ReactNode`：参数是 `T` 不是 `any`——调用方喂什么形状，回调里就拿到什么形状的完整提示；空态文案 `emptyText` 也是复用逻辑的一部分（可选 + 默认值）。

### `src/pages/Lesson21.jsx` —— JS 页面用 TS 组件，以及那条诚实的边界

- 本页**故意不迁 `.tsx`**：演示"JS 文件 import .tsx 组件"零配置可用（Vite 原生编译），同时演示渐进迁移第 6 条的保护边界——`.jsx` 调用方传的 props 不受检查，页面的 `useState('success')` 也只是普通 string；
- 第四张卡片是同一组件的 JS / TS 声明对比（两个 `<pre>` 并排），差别一目了然：合同有没有写在类型上，以及拼错属性名时谁先知道；
- 学员列表把 Badge 嵌进 `renderItem`：`scoreVariant()` 把分数映射成三个合法 variant——业务规则集中在小函数里，类型化组件照样自由组合。

## 动手试一试

1. **给 Badge 加第四种语义**：新需求"info（蓝色提示）"。动手改 `Badge.tsx`：variant 联合类型加 `'info'`、`lesson21.css` 加 `.l21-badge--info` 配色——然后回页面随便用。体会两件事：TS 项目里"加一个枚举值"是编译器指路式的修改（漏改哪里它会提醒）；如果先只改页面用 `variant="info"` 而不改类型，`tsc` 立刻报错——合同生效的体感。
2. **把 GenericList 用在第三种数据上**：在页面里加一组课程数据 `{ id: 3, title: '...', minutes: 25 }`，用 `GenericList` 渲染成"标题 + 时长徽章"。全程只写调用方代码，组件一行不改——这就是"复用列表逻辑不限类型"。再试试喂一个**没有 id 字段**的对象数组，看编辑器/tsc 报什么错（提示：约束在这时咬人）。
3. **体验迁移第一步**：把 `Lesson21.jsx` 复制一份改名为 `Lesson21.tsx`（不接路由，不影响现有页面），给页内的 `WORDS`/`STUDENTS` 补上 interface、给 `useState` 补联合类型泛型，跑 `npx tsc --noEmit` 清零。做完你就掌握了"逐文件迁移"的完整手感：改扩展名 → 补类型 → tsc 把关。

## 易错点

1. **以为 Vite 会报类型错误**：现象是类型明明写错了（拼错 prop、漏传必选），页面照常渲染，于是以为类型"没关系"。原因：esbuild 转译只删类型不检查，类型检查归编辑器和 `npx tsc --noEmit`。正确姿势：编辑器红线当天修，提交前跑一次 tsc。
2. **`useState(null)` 不写泛型**：现象是 `setUser(user)` 报 `Type 'User' is not assignable to type 'null'`，一头雾水。原因：TS 从初始值 `null` 推断出 state 永远是 null。正确写法 `useState<User | null>(null)`，把两种可能显式写进类型。
3. **内联事件好好的，抽成函数后报错**（或反之）：现象是抽出的处理器里 `e` 隐式 `any`、或 `e.target` 上没有 `.value`。原因：内联箭头函数的类型靠位置推断，抽出来推断上下文就没了；不标类型在 strict 下是隐式 any 报错，标成裸 `ChangeEvent` 则没有元素专属属性。正确写法：`ChangeEvent<HTMLInputElement>` 这种"事件家族 + 元素类型"的组合。
4. **直接用联合类型里的值**：现象是 `user.name` 报"对象可能为 null"，觉得 TS 多管闲事。原因：`User | null` 的意思是"两种可能都真实存在"，在收窄之前 TS 拒绝假设非空。正确姿势：三元/守卫先判空（本课 EventDemo 的分支写法）；这不是仪式感，是把运行时的 null 崩溃提前到编译期。
5. **以为调用了 TS 组件就万事大吉**：现象是 `.jsx` 文件给 `.tsx` 组件传错 props，编译器一声不吭。原因：类型检查以文件为单位，JS 文件本身不受检，调用方的实参自然也不查（本课页面就是活例子）。正确姿势：迁移要"组件 + 调用方"一起迁，最后一公里没走完只是半保护状态。

## 自测题

1. Vite 在开发时对 `.tsx` 文件做了什么？为什么"页面跑得起来"不能证明类型写对了？类型错误应该在哪些地方看到？
2. `variant?: 'success' | 'warning' | 'error'` 这一个声明同时用了哪两个类型特性？各自解决什么问题？解构默认值 `variant = 'success'` 和 `?` 是什么关系？
3. `onChange={(e) => ...}` 里的 `e` 不用标类型，抽成 `const handle = (e) => {...}` 就必须标，为什么？泛型参数 `<HTMLInputElement>` 不写会怎样？
4. `useState(null)` 和 `useState<User | null>(null)` 的差别是什么？后者除了修复 setUser 报错，还附赠了什么保护？这对 `useRef<HTMLInputElement>(null)` 同样成立吗？

### 参考答案

1. esbuild 把 `.tsx` 里所有类型标注剥掉，编译成普通 JS 再交给浏览器——编译只删不查，所以类型错误不阻止页面运行；"跑得起来"只证明运行时逻辑没炸，不证明类型正确。类型错误在编辑器（实时波浪线）和 `npx tsc --noEmit`（命令行/CI 关卡）里看到。
2. 可选属性（`?`）+ 联合字面量类型。`?` 解决"这个 prop 允许不传"（配合解构默认值保证运行时也有值）；联合字面量解决"合法值只有三个"——传拼错的或没定义的字符串直接编译报错，比裸 `string` 严得多。默认值和 `?` 是绝配：类型上"可不传"，运行上"必有值"。
3. 内联箭头函数的类型由它所处的位置（onChange 期望什么签名）自动推断；抽成独立函数后推断上下文消失，strict 模式下参数不标就是隐式 `any` 报错。泛型参数不写时 `e.target` 只是 `EventTarget`——所有元素的祖先接口，没有 `.value`/`.checked` 这些元素专属属性；标了元素类型，target 才收窄成输入框，属性提示和检查才生效。
4. `useState(null)` 从初始值推断出 state 类型永远是 `null`，`setUser(user)` 会报"User 不能赋给 null"；`useState<User | null>(null)` 显式声明两种可能都合法。附赠的保护：使用 `user` 前必须判空收窄，否则编译不过——运行时的 null 崩溃提前到编译期。对 useRef 同样成立：`useRef<HTMLInputElement>(null)` 的 `current` 类型是 `HTMLInputElement | null`，`.current.focus()` 不判空会被 strict 拦下。

## 下一课预告

第 22 课：组件设计模式。类型的地基打完，回到组件本身的结构问题：哪些逻辑该抽成自定义 Hook、哪些该做成组合组件、容器组件和展示组件怎么分工。你已经偷偷见过一半答案了——本课 GenericList 的 renderItem 就是"render props"模式的现场演示。
