# 第 16 课 · TanStack Query 数据请求库

## 学习目标

完成本课后，你应该能够：

1. 说清楚"服务端状态"和普通 state 的区别，以及它带来的五个新问题：缓存、去重、重试、失效、聚焦同步——这正是第 11 课手写 useFetch 没覆盖的部分；
2. 会用 `QueryClientProvider` + `useQuery({ queryKey, queryFn })` 发请求，理解 queryKey 是"缓存门牌号"：同 key 共享缓存并合并请求，不同 key 各存各的格子；
3. 会用 `staleTime` 和 `refetchOnWindowFocus` 控制"什么时候才重新请求"，知道默认行为（永远视为过期 + 聚焦即重取）比想象中勤快；
4. 会用 `useMutation` 做写操作，并在 `onSuccess` 里用 `invalidateQueries` 失效广播，让所有观察同一数据的组件自动刷新；
5. 会配置 `retry` 控制失败自动重试，并能用网络日志/DevTools 亲眼看清每次请求的来龙去脉。

本课对应的示例代码：

- `src/components/lesson16/api.js` —— mock 资源接口：读 + 写两个接口、延迟、fail 开关、网络日志（请求计数 + 事件记录）
- `src/components/lesson16/ResourceList.jsx` —— 演示一（queryKey 共享缓存/去重/重试）与演示二（staleTime / refetchOnWindowFocus）
- `src/components/lesson16/AddResourceForm.jsx` —— 演示三：useMutation + invalidateQueries 失效广播
- 页面入口在 `src/pages/Lesson16.jsx`（含 QueryClientProvider 与网络面板）

## 核心概念

### 服务端状态不是普通 state

第 11 课的 `useFetch` 已经把"发一个请求"做成了通用能力：三态、取消、防竞态。但列表数据这类"服务端状态"还有个普通 state 没有的麻烦：**真正的所有者在服务器**，你手里的只是某一刻的快照——它会过期，也会被别的写操作改掉。自己管它，就必须回答五个问题：

| 问题 | 手写方案的答案 | Query 的配置 |
|---|---|---|
| 数据存哪、存多久 | 自己想（多数人根本不存） | `QueryClient` 缓存 + `gcTime` |
| 几个组件读同一份数据 | 各发各的请求，互不相识 | 同 `queryKey` 共享缓存 + 去重 |
| 数据多久算过期 | 没有概念 | `staleTime` |
| 写操作后谁去拿新的 | 手动 setXxx，容易漏副本 | `invalidateQueries` 失效广播 |
| 用户切走又切回来 | 没有 | `refetchOnWindowFocus` |

Query 的做法是集中一个"缓存管家"（QueryClient）：每份数据用 queryKey 登记进缓存，组件通过 `useQuery` 声明"我要观察这个 key"，写操作通过 `useMutation` + 失效广播闭环。取消、去重、重试、调度这些机制活全部内置——**手写方案里要写代码的地方，这里都变成了配置**。

### queryKey：缓存的门牌号

`queryKey` 是一个**可序列化的数组**（字符串、数字、普通对象都行；函数、class 实例不行），它就是这条数据在缓存格子上的门牌：

```js
useQuery({ queryKey: ['resources'], queryFn: fetchResources })
// 另一个组件也写 ['resources'] → 共享同一个格子：只发一次请求（后到的搭在飞的顺风车）
useQuery({ queryKey: ['resources', 'copy'], queryFn: fetchResources })
// 门牌多一段 → 另一个格子：数据一样也各自发请求
```

两个推论值得记牢：

1. **变化的参数进 key**：分页就是 `['resources', 'page', page]`。key 一变，Query 自动去拿那个格子的数据（没有就发请求）——第 11 课"deps 变了自动重发"的翻版，但每个页码的结果都被缓存保留，翻回来不用重新等。
2. **用户动作不进 key**：本课的"模拟失败"开关只是 `queryFn` 闭包里的变量，拨开关不触发新请求——和第 11 课"用户动作不进 deps"是同一条原则。

还有一条工程铁律：**同 key 必同 queryFn**。缓存条目上的 queryFn 会被"发起请求的观察者"的最新选项覆盖，如果几个观察者的 queryFn 行为不一致（比如一个读失败开关、一个不读），一次重取或重试执行到谁的闭包取决于"谁刚渲染过"，行为无法预测。本课页面因此把 fail 开关提升到页面组件，所有观察者读同一份 state。开发模式还有个观感陷阱：React StrictMode 会把组件"挂载→卸载→再挂载"演练一遍，所以初次加载时每个 key 会看到两条请求记录；生产构建才是一条。观察去重最干净的办法是页面上的实验：清空日志后点任一面板的「重新请求」——三个观察者共享的那份数据只多一条请求。

### staleTime 与 refetchOnWindowFocus：什么时候才重新请求

- `staleTime`（默认 0）：数据保鲜期。期内数据算"新鲜"，组件重新挂载、窗口聚焦都不重取；过了才算"过期（stale）"，这些时机就会重取。**默认 0 意味着每次挂载/聚焦都会重取**——Query 默认比你想象的勤快。
- `refetchOnWindowFocus`（默认 true）：切回浏览器标签页时，过期的数据自动补一次最新。演示二让你亲手开关对比。
- 注意两个概念的角色不同：**queryKey 决定"用哪个格子"，staleTime 决定"何时重取"，重取时机是观察者自己的偏好**——同一个 key 允许不同组件配不同 staleTime；但 queryFn 应当保持一致，否则"这次重取用了谁的请求函数"取决于谁触发，行为无法预测。

### useMutation 与失效广播：写操作的闭环

读和写在 Query 里是两套 API，因为性质完全不同：`useQuery` 进缓存、可能自动发；`useMutation` 不进缓存、**永远等 `mutate()` 调用**，成功失败由 `mutationFn` 返回的 Promise 决定。真正的重点是善后——写操作改了"服务端的数据库"，缓存里的旧快照就过时了：

```js
onSuccess: (created) => {
  queryClient.invalidateQueries({ queryKey: ['resources'] })
}
```

`invalidateQueries` 把匹配的 key 标记为过期，并**自动重新请求所有正在观察它的组件**——一处更新，处处同步。而且失效按 **前缀匹配**：`invalidate(['resources'])` 会同时命中 `['resources']` 和 `['resources', 'copy']`（所以演示三里对照组面板也会刷新），将来分页时 `invalidate(['resources'])` 一句话就能刷掉所有页。失败分支则什么都不用做：服务端没变，缓存还是对的，错误对象放进 `mutation.error` 展示即可。

### retry：失败自动重试

`retry` 配置失败后的自动重试次数（默认 3 次），间隔默认指数退避（约 1s → 2s → 4s，封顶 30s），也可用 `retryDelay` 改固定间隔。观察方法：把"模拟接口失败"打开再手动重取，网络日志里每次重试都是一次真实的 `fetchResources`，全部失败后才轮到 `useQuery` 的 `error` 登场，配 `failureCount` 告诉用户"已经试过 N 次"。第 11 课"动手试一试"里的自动重试练习题，在这里是一行配置。

### 与手写方案对比

以第 11 课的 `useFetch` 为参照（第 1/5 课的表单、第 6 课的 Context、传统受控表单的对照分别在 17/18/19 课的文档里）：

| 能力 | 手写 useFetch（lesson11） | TanStack Query（本课） |
|---|---|---|
| 三态 + 加载反馈 | ✅ 自己写了 | ✅ 内置（`isPending`/`error`） |
| 取消 + 防竞态 | ✅ AbortController + 序号，写了几十行 | ✅ 内置（`signal` 交给 queryFn 即可） |
| 手动重发 | ✅ `refetch()` | ✅ `refetch()` |
| **跨组件缓存** | ❌ state 是组件私有的，换个组件就得重新等 | ✅ 同 key 全局共享，回到页面秒显旧数据 |
| **请求去重** | ❌ 十个组件同数据发十次请求 | ✅ 同 key 合并成一次在飞请求 |
| **失败自动重试** | ❌ 要自己加（当时是练习题） | ✅ `retry` 一行配置 |
| **失效广播** | ❌ 写操作后要手动改每个相关组件的 state | ✅ `invalidateQueries` 一处声明，处处刷新 |
| **聚焦重取** | ❌ 没有 | ✅ 默认开启，可配置 |
| 心智成本 | 全在自己代码里，看得见摸得着 | 多一套概念（key 设计/staleTime/gcTime/invalidate），调试的是库的状态机 |
| 依赖成本 | 零 | 一个依赖 + 入口包一次 Provider + 约 13KB |

一句话总结：**库解决的是"手写方案没有的"和"手写方案每处都要重复写的"**——跨组件缓存、去重、失效广播这些，手写要么做不到，要么每次都要写一遍且容易漏；代价是多一层抽象、一套新概念和一个全局 Provider。数据一旦"多组件共享 + 会被写操作改"，学习成本很快被手写成本反超，值得上库；一次性单组件的小请求，第 11 课的 `useFetch` 依然够用。

## 代码导读

### `src/components/lesson16/api.js` —— mock 资源接口 + 网络面板

- 模块内 `ALL_RESOURCES`：12 条学习资源（要求 ≥10 条），字段 `id / title / category / minutes`；这个数组扮演"服务端的数据库"，`addResource` 成功时直接 push——缓存毫不知情，等失效重取才能看见，这正是失效广播要填补的断点；
- `fetchResources({ fail, signal })`：和第 11 课 fetchUsers 同款骨架——`setTimeout` 模拟 700ms 延迟、`fail` 时 reject 普通 Error、`signal.aborted` / abort 事件两处检查保证"取消瞬间生效、取消的请求绝不返回数据"；
- `addResource({ title, category, fail })`：600ms 延迟，成功分配自增 id 并写入"数据库"，resolve 副本；
- **本课独有：网络日志**。`requestCount` 计数（每次真实执行 +1，重试也算）、`logLines` 事件记录（新事件插最前、最多留 14 条）；`subscribeNetworkLog / getNetworkLog / clearNetworkLog` 三个函数是给页面 `useSyncExternalStore` 用的订阅三件套——mock 是 React 之外的普通模块，`logLines` 用不可变更新（每次写换新数组），快照引用变了 React 才会重渲染；
- `formatTimeOrDefault`：给组件展示 `dataUpdatedAt` 用，没拿到数据时（时间戳为 0）显示占位符。

### `src/components/lesson16/ResourceList.jsx` —— 演示一与演示二

- `ResourcePanel`（内部组件，实例化两次当"面板甲/乙"）：`useQuery({ queryKey: ['resources'], queryFn, retry, retryDelay: 700 })`。`queryFn` 是 `({ signal }) => fetchResources({ fail, signal })`——把 Query 传来的 `signal` 转交 mock，卸载/换 key 时请求真正取消；`fail` 在闭包里读、不进 key（用户动作不进 key）。渲染分层：`isPending` 首载提示 / 失败红盒（`error.message` + `failureCount` + 手动重试）/ 数据列表 + `更新于 dataUpdatedAt` / `refetch()` 按钮（`isFetching` 时禁用）；
- `SharedCacheDemo`（演示一容器）：`fail` 是页面组件提升下来的同一份 state（**同 key 必同 queryFn**——缓存条目的 queryFn 会被最近渲染的观察者覆盖，所有观察者读同一份 fail 才能保证闭包行为一致），`retry` 本地持有，**原封不动传给甲乙两个面板**；甲乙并排 + `CopyKeyPanel` 对照组；
- `CopyKeyPanel`：key 是 `['resources', 'copy']`，`staleTime: Infinity`，queryFn 与甲乙同款——另一个缓存格子，挂载时自己发请求；注释里埋了"失效按前缀匹配"的伏笔；
- `FocusDemo`（演示二）：同一个 key 的第三个观察者，自带 `staleTime` 下拉（0 / 10s / Infinity）和 `refetchOnWindowFocus` 开关；一个每秒心跳的 `setInterval`（清理函数里 `clearInterval`，第 2 课铁律）让"已缓存 N 秒"活起来，配合 `isStale` 徽章把"新鲜/过期"变成看得见的状态。queryFn 与甲乙读同一份 fail，注释解释了"queryFn 必须一致、重取时机可以不同"的分工；

### `src/components/lesson16/AddResourceForm.jsx` —— 演示三：useMutation

- `useQueryClient()` 从 Provider 上下文拿"缓存管家"——这就是页面必须包 Provider 的原因；
- `useMutation({ mutationFn, onSuccess })`：`mutationFn` 接收 `mutate(变量)` 的参数返回 Promise；`onSuccess` 里 `invalidateQueries({ queryKey: ['resources'] })` 触发失效广播（**试试把这行注释掉**，提交成功后列表纹丝不动，感受"没善后的写操作"）；失败分支故意不失效——服务端没变，缓存还是对的，错误在 `mutation.error` 展示；
- 用 `mutate` 而不是 `mutateAsync`：错误走 `onError` 配置，不会在组件里抛未捕获的 Promise 异常；
- 表单本身是普通受控 input（客户端状态，和 Query 无关）——下一课 React Hook Form 会接管这块。

### `src/pages/Lesson16.jsx` —— Provider 与页面编排

- `useState(() => new QueryClient())` **函数式初始化**：写成 `useState(new QueryClient())` 每次渲染都新建管家，缓存丢光、疯狂发请求；
- 页面内包 `QueryClientProvider`：真实项目应在入口（main.jsx）包一次全应用共享；本教程的入口文件归课程统一管理，不能为了一门课动全局，所以本课把 Provider 缩小到页面内——机制完全一样，只是"全局"变成了"本页"，卸载即销毁；
- `NetworkLog`：`useSyncExternalStore(subscribeNetworkLog, getNetworkLog)` 订阅 mock 的日志——这是 React 订阅 React 之外的数据源的官方姿势（第 9 课引用比较 + 快照模式），显示请求计数和事件流水，三个演示的结论全靠它验证；
- 收尾卡浓缩"与手写方案对比"，完整表格在本文档。

## 动手试一试

1. **给列表加分页 `useQuery`**：把演示一改造为分页——key 写成 `['resources', 'page', page]`，`fetchResources` 已经有 total/totalLength 可参考（资源总数是 `ALL_RESOURCES.length`，mock 想要真分页就给 `fetchResources` 加 `page/size` 切片）。观察两件事：翻页时每页各发一次请求（key 不同）；翻回第 1 页秒显旧数据（缓存还在），但 `staleTime: 0` 下重新挂载/聚焦仍会后台重取——把 `staleTime` 调大再对比。再试试 `invalidateQueries({ queryKey: ['resources'] })` 一句话刷掉所有页，体会前缀匹配的威力。
2. **乐观更新，对照第 19 课**：现在演示三是"悲观更新"——等提交成功、失效重取，列表才刷新。改成乐观更新：`useMutation` 的 `onMutate` 里先 `queryClient.setQueryData(['resources'], 旧 => [...旧, 新资源])` 让列表"秒变"，再 `cancelQueries` + 快照旧值；失败时用快照回滚、成功时仍走 `invalidateQueries` 校准。写完后对照第 19 课的手写方案：两边的"先改界面、失败回滚"思想一致，但 Query 版不用自己管"改哪份 state"，失效广播替你同步所有观察者。
3. **把 mock 换成真接口**：用公共测试 API（如 jsonplaceholder）替换 `fetchResources` 的实现，组件层一行都不该改——`queryFn` 里 `fetch(url, { signal })` 把 signal 原样传给真 fetch，取消语义自动成立。做完你会对"mock 的形状必须和真接口一致"（第 11 课铁律）有最直接的体感。

## 易错点

1. **QueryClient 建在组件体里或 `useState(new QueryClient())`**：现象是页面疯狂发请求、每次渲染缓存都空、`useQueryClient()` 拿到的管家换来换去。原因：每次渲染都新建客户端，上一刻的缓存全部丢失。正确写法是函数式初始化 `useState(() => new QueryClient())`，或入口处模块级建一个（真实项目的做法）。
2. **往 queryKey 里塞不稳定的值**：现象是每次渲染都重新请求（缓存永远 miss），或反过来"该刷新时永远不刷"。原因：key 必须可序列化且稳定——函数、class 实例、每次渲染都新建的对象（如 `new Date()`、内联箭头函数）都不是合格的 key 片段；变化的参数要放进去，但要放"值"（数字、字符串），不要放"引用"。
3. **同一个 key 配了不同的 queryFn**：现象是"有时拿到 A 数据有时拿到 B"。原因：key 相同就共享缓存条目，实际执行哪个 queryFn 取决于"谁触发了这次请求"。规则：同 key 必同 queryFn；staleTime / refetchOnWindowFocus 这类"何时重取"的偏好才允许按观察者各自配置。
4. **拨了"模拟失败"开关却没反应**：现象是打开失败开关后什么都不发生，误以为代码写错了。原因：fail 只是 queryFn 闭包里的变量，不在 key 里，改它不触发新请求——这是设计好的行为（用户动作不进 key，和第 11 课用户动作不进 deps 同源）。要点一下"重新请求"让下一次请求吃到新值。
5. **onSuccess 里忘记 invalidateQueries**：现象是提交成功、toast 都弹了，列表却纹丝不动，刷新页面才看到新数据。原因：写操作只改了"服务端的数据库"，缓存里的旧快照不知道。要么失效广播，要么 `setQueryData` 手动改缓存（乐观更新的路子），二选一，别都不做。

## 自测题

1. 面板甲和面板乙的 queryKey 都是 `['resources']`，页面加载时为什么只发一次请求？把其中一个改成 `['resources', 'copy']` 后会发生什么？
2. `staleTime: 0`（默认）意味着什么行为？为什么说"Query 默认比你想象的勤快"？想让"10 秒内切回窗口不重取"该怎么配？
3. `invalidateQueries({ queryKey: ['resources'] })` 为什么能同时刷新 `['resources']` 和 `['resources', 'copy']` 两个 key 的组件？这和手动更新每个组件的 state 相比，省掉了什么？
4. `useQuery` 和 `useMutation` 有哪三点本质区别？为什么 mutation 成功后必须"善后"，而失败后什么都不用做？

### 参考答案

1. 同 key 共享同一个缓存格子：先挂载的组件触发请求，后挂载的发现同一个 key 的请求正在飞，直接复用这次在飞的 Promise（去重），数据也读同一个格子。改成不同 key 后就是两个格子：各自发请求、各存各的数据，互不同步——除非失效广播前缀命中。
2. 数据永远是"过期"的：任何新观察者挂载、窗口重新聚焦等时机都会触发重取。说它勤快是因为很多人以为"拿到过一次就不用再请求"，实际默认几乎每个时机都在后台默默补最新数据。配 `staleTime: 10000`，10 秒内数据算"新鲜"，挂载/聚焦都不重取，超过 10 秒才恢复默认的重取判断。
3. 失效是**前缀匹配**：`['resources']` 是 `['resources', 'copy']` 的前缀，invalidate 会把所有匹配的 key 标记为过期并重取所有活跃观察者。手动方案里你要知道"哪些组件持有这份数据的副本"并逐个 setXxx——副本漏一个就出现不一致；失效广播把这个"人肉清单"变成一句按门牌匹配的声明，一处更新处处同步。
4. 区别：useQuery 进缓存（mutation 不进）；useQuery 挂载/聚焦等时机可能自动发（mutation 永远等 `mutate()`）；useQuery 描述"读一份共享数据"（mutation 描述"执行一次写操作"）。成功必须善后：写操作改变了服务端数据，缓存里的旧快照已过时，要 invalidateQueries（或 setQueryData）让观察者重新拿到最新；失败不用善后：服务端没变，缓存仍然是正确的，只需把 `mutation.error` 展示给用户。

## 下一课预告

第 17 课：表单。本课只是顺手用了个受控 input——真实项目的表单有一堆字段、校验和错误提示。用 React Hook Form 管注册与校验、Zod 定义数据规则，让"收集用户输入"也变成声明式配置。
