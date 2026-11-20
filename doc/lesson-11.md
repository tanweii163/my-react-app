# 第 11 课 · 数据获取进阶

## 学习目标

完成本课后，你应该能够：

1. 说清楚第 2 课"一次性请求"和真实页面需求的差距：可复用、可重试、可分页、防竞态；
2. 会把请求逻辑抽成通用自定义 hook `useFetch(fn, deps)`，说清它的返回值形状与两种用法（deps 自动重发 / refetch 手动重发）；
3. 掌握防竞态的"双保险"：AbortController + 请求序号，并能解释为什么两个都要；
4. 实现"加载更多"追加式分页，理解"每条请求的 loading/error 独立于已加载的数据"；
5. 会用"模拟失败"开关 + 重试按钮，主动验证错误处理路径，而不是祈祷接口永远不挂。

本课对应的示例代码：

- `src/components/lesson11/fetchUsers.js` —— mock 分页接口：分页切片 + 延迟 + 可取消 + 可失败
- `src/components/lesson11/useFetch.js` —— 通用请求 hook：三态 + refetch + 防竞态双保险
- `src/components/lesson11/PaginatedList.jsx` —— "加载更多"分页列表 + 失败重试
- 页面入口在 `src/pages/Lesson11.jsx`（含 deps 驱动用法的 SingleFetchDemo）

## 核心概念

### 从"一次性请求"到"可复用请求"

第 2 课的 `UserList` 把请求写死在组件里：依赖 `[]`、写死 `fetch('/users.json')`、状态变量全是私有的。真实页面很快会遇到四个新需求：

- **可复用**：换个页面也要发请求，总不能每次复制 40 行 effect；
- **可重试**：失败后用户要能点"重试"，而不是刷新整个页面；
- **可分页**：数据几万条，一次全拉下来谁都受不了，要"加载更多"；
- **防竞态**：用户快速翻页/快速点击时，慢的旧响应不能覆盖新数据。

解法是把"请求"抽成一个自定义 hook（第 8 课的知识），接口形状先定下来：

```js
const { data, loading, error, refetch } = useFetch(fn, deps)
// fn   —— 怎么请求：接收一个 AbortSignal，返回 Promise
// deps —— 什么时候自动重新请求；传 [] 表示只在挂载时请求一次
```

`data / loading / error` 就是第 2 课的"请求四件套"去掉手写部分；新增的 `refetch` 是"手动重发"的入口。**形状定好了，组件怎么用就定好了**——这是设计 hook 第一步该做的事。

### 防竞态双保险：AbortController + 请求序号

竞态场景回放：第 2 页请求还没回来，用户又点了第 3 页；第 3 页先到、第 2 页后到——界面显示的是第 2 页的旧数据。

第 2 课的解法是 AbortController，但它有个前提：**请求源要听得懂取消**。真 `fetch` 听得懂（传 `{ signal }` 即可），可第三方请求封装未必；就算都懂，取消也有力所不及的瞬间——响应恰好在 abort 生效前后到达。

所以工程上的标准做法是**双保险**：

```js
const seq = ++seqRef.current // ① 每次请求发一个递增编号
const result = await fn(signal)
if (seq !== seqRef.current) return // ② 响应回来先对号，过期就扔掉
setData(result)
```

分工明确：**AbortController 负责"少干活"**（能取消的请求提前取消，省流量省计算）；**序号负责"不出错"**（不管请求源听不听得懂取消，过期响应一律进不了 state）。只靠取消，遇到不配合的请求源就漏；只靠序号，过期请求照样跑完全程浪费资源。

### refetch 为什么永远调用"最新的 fn"

一个隐蔽的坑：`refetch` 用 `useCallback([])` 固定成永久一个函数，它内部如果直接捕获第一轮渲染的 `fn`，那么闭包里的 `page` 永远是 1——**点十次"加载更多"，请求十次第一页**。

useFetch 的解法是 ref 保鲜：

```js
const fnRef = useRef(fn)
useEffect(() => { fnRef.current = fn }) // 每次渲染后同步
// run 内部：await fnRef.current(signal) —— 永远调最新的 fn
```

这是第 2 课"闭包过期值"的反向利用：既然长期存活的函数不能信任闭包变量，那就让它每次都从 ref 里读最新值。`fn` 闭包里读的 `nextPage`、`fail`，在"点按钮那一刻"是什么就是什么。

### 追加式分页：新数据"拼上去"，不是"换掉它"

一次性请求是**替换**：`setUsers(新数据)`，旧列表整个被换掉。分页是**追加**：已加载的列表留在页面上，新页拼在后面。三件事要注意：

1. 需要一个**累积 state**（`items`）存所有已追加的数据，和 useFetch 的 `data`（本次请求的结果）分开——`data` 是"最新一页"，`items` 是"全部已加载"；
2. 新页到达后的追加动作必须放在 effect 里：`useEffect(() => { setItems(prev => [...prev, ...data.list]) }, [data])`。**写进渲染体会死循环**——渲染里 setState 又触发渲染，没完没了；
3. "还有没有下一页"（`hasMore`）和"共几条"（`total`）由接口每次回显，按钮藏不藏、统计怎么写全从 `data` 派生，不要自己再存一份。

### deps 与 refetch 的分工：什么时候用哪个

| 用法 | 语义 | 典型场景 |
|---|---|---|
| `useFetch(fn, [keyword])` | 依赖变了 → 自动取消旧的、发新的 | 搜索词变了自动搜索、tab 切换自动刷新 |
| `useFetch(fn, [])` + `refetch()` | 挂载请求一次，之后全靠手动触发 | "加载更多"分页、"重试"、"刷新"按钮 |

判断标准一句话：**数据自己变化导致的重发，进 deps；用户动作导致的重发，用 refetch**。本课的 `PaginatedList` 把 `nextPage`（页码）和 `fail`（失败开关）都排除在 deps 外，就是坚持这条线：翻页和开关都是用户动作，只该影响下一次 `refetch`。

### mock 接口的设计：形状比内容重要

没有后端也能开发前端——前提是 mock 的**形状**和真接口一致：

- 返回 Promise，resolve 的结构一样（本课是 `{ list, page, size, total, hasMore }`）；
- 失败时 reject 普通 Error；被取消时 reject `name === 'AbortError'` 的错误，和真 `fetch` 的行为一模一样；
- 保留网络延迟（setTimeout 几百毫秒），否则 loading 态一闪而过，等于没测。

形状一致，将来从 mock 换到真 `fetch`，组件层一行不用改。

## 代码导读

### `src/components/lesson11/fetchUsers.js` —— mock 分页接口

- 顶部常量 `ALL_USERS`：30 条用户数据（≥25 条），字段贴近真实接口（id / name / role / city）；
- `fetchUsers(page, size, fail, signal)` 返回 Promise，内部 `setTimeout` 模拟 700ms 网络延迟；
- 定时器回调里依次判断：`signal.aborted` → reject AbortError（取消的请求不返回数据）；`fail` → reject 普通 Error（模拟 HTTP 500）；否则切片 `ALL_USERS.slice(start, start + size)` 并 resolve `{ list, page, size, total, hasMore }`；
- 关键细节：`signal.addEventListener('abort', ...)` 让取消**立刻**生效，而不是等 700ms 后才被发现——这正是真 fetch 的行为；监听时顺手 `clearTimeout`（第 2 课铁律：谁开的定时器谁关）并 `{ once: true }` 自动移除；
- `makeAbortError()` 手工造 `name === 'AbortError'` 的错误对象——上层靠这个名字区分"取消"和"真失败"，mock 必须保持同名。

### `src/components/lesson11/useFetch.js` —— 通用请求 hook

- 三个 state：`data`（null = 还没拿到）、`loading`（初始 true，挂载即请求）、`error`；
- 两个 ref：`seqRef`（请求序号，只增不减）、`controllerRef`（当前在飞请求的 AbortController）；
- `fnRef` 保鲜：每次渲染后把最新 `fn` 存进 ref，`refetch` 永远调用最新闭包（见核心概念）；
- `run`（也就是返回的 `refetch`）：发号 → 取消上一个在飞请求 → 建新 controller → 清旧错误 → await → **对号**（seq 不匹配直接扔）→ catch 里区分"过期 / AbortError / 真错误" → finally 里**只有仍是最新且未被取消**才关 loading；
- effect 部分：`run()` + 清理函数取消在飞请求，依赖数组就是调用方传入的 `deps`。这里故意用动态数组而不是字面量——若把 `fn` 列进字面量依赖，`fn` 每次渲染都是新引用，会每帧重新请求；`fn` 的保鲜已由 `fnRef` 负责。
- 为什么 `run` 要 `useCallback([])` 固定：它就是 `refetch`，如果每次渲染换新引用，传给子组件会破坏 memo（第 9 课）。

### `src/components/lesson11/PaginatedList.jsx` —— 分页列表

- 三个 state：`items`（累积列表）、`nextPage`（下一页页码，**只在成功后 +1**）、`fail`（模拟失败开关）；
- `useFetch((signal) => fetchUsers(nextPage, PAGE_SIZE, fail, signal), [])`：deps 留空，挂载只请求第一页；`nextPage`、`fail` 都在 `fn` 闭包里读、不进 deps——用户动作不自动触发请求；
- 追加 effect：`data` 一变（新页到达）→ `setItems(prev => [...prev, ...data.list])` + `setNextPage(data.page + 1)`。失败重试时 `data` 没变、`nextPage` 没动，重试的就是失败的那一页——**重试永远不会跳页漏数据**；
- 渲染分层：列表本体只渲染 `items`（任何 loading/error 都不清空它）；下方是"当前这条请求"的独立状态区——loading 提示行 / 红色错误盒 + 重试按钮 / "加载更多"按钮（loading 时禁用并显示"加载中…"）/ "到底啦"提示，四者按状态互斥出现；
- 统计栏 `已加载 X / 共 Y 条 · 第 N 页` 全部从 `items` 和 `data` 派生，没有额外 state。

### `src/pages/Lesson11.jsx` —— 两种用法对照

- `SingleFetchDemo`：`useFetch(fn, [reloadKey])` 的 deps 用法。点"reloadKey +1"按钮 → effect 重跑 → 自动重新请求；旁边还有个"手动 refetch()"按钮，效果一样但机制不同，页面上可以对着感受；
- `PaginatedList`：deps 留空 + refetch 的手动用法；
- 页面组件本身没有请求逻辑——它只负责把两种用法摆在一起对照。这也是个设计示范：**页面负责编排，能力下沉到 hook**。

## 动手试一试

1. **把"加载更多"改成滚动到底自动加载**：用 `IntersectionObserver` 观察列表末尾的哨兵元素（比如列表最后一个 `li` 或一个空 div），它进入视口且 `hasMore && !loading && !error` 时调 `refetch()`。提示：observer 要在 effect 里创建、清理函数里 `disconnect`；`nextPage` 要用 ref 还是能直接读？想清楚"回调触发那一刻"读到的是哪个值。
2. **给 useFetch 加一层缓存**：模块级放一个 `Map`，`useFetch(fn, deps, options)` 加第三个参数，`options.key` 作为缓存键（想想为什么不能拿 `fn` 当键——它每次渲染都是新引用）。发起请求前先查 Map，命中就直接 `setData(缓存值)` 不发请求；成功后写回。进阶：想想缓存什么时候该失效（比如 refetch 强制刷新时要不要绕过缓存）。
3. **失败自动重试**：请求失败时不等用户点按钮，自动重试最多 2 次、间隔 1 秒。提示：在 `run` 的失败分支里判断"这是第几次尝试"，用 `setTimeout` 安排重试，别忘了 effect 清理函数里把没触发的定时器清掉（组件都卸载了就别再重试了）。

## 易错点

1. **快速点两次"加载更多"出现重复数据**：现象是同一页被追加两遍。原因：追加逻辑没有防重入——两个在飞请求都成功、都 `setItems`。本项目有两道防线：按钮 loading 时禁用（UI 层挡住绝大部分连点），就算真漏进来两个请求，序号机制也让旧的那个结果作废（数据层兜底）。自己实现分页时，这两层至少要有一层。
2. **把 `nextPage` 或 `fail` 放进 deps**：现象是拨一下"模拟失败"开关就凭空发一个请求；或页码一变自动连发，"加载更多"按钮形同虚设。原因：混淆了两种触发机制——deps 是"数据变了自动重发"，用户动作该走 `refetch`。原则见核心概念的分工表。
3. **追加代码写在渲染体里**：现象是控制台报错或同一条数据无限追加。原因：`if (data) setItems(...)` 写在组件函数体里，渲染中 setState 触发再渲染，而 `data` 没变条件仍成立，反复执行。追加是"对数据到达的响应"，是副作用，必须放 effect。
4. **catch 里不区分 AbortError**：现象是快速操作时错误红盒一闪而过，写着"请求已取消"却当成失败。原因：取消和失败走了同一条路。判断 `e.name === 'AbortError'`（mock 和真 fetch 抛的同名），取消不是错误。
5. **refetch 用了过期闭包**：现象是"加载更多"点多少次都加载第一页。原因：`run` 被 `useCallback([])` 固定，直接捕获了第一轮渲染的 `fn`，闭包里 `nextPage` 永远是 1。解法是 `fnRef` 保鲜（见核心概念）——长期存活的函数不要信任闭包变量，从 ref 里读。

## 自测题

1. `useFetch` 为什么同时需要 AbortController 和请求序号？只用其中一个，分别会漏掉什么？
2. `useFetch(fn, [keyword])` 和 `useFetch(fn, []) + refetch` 各自的语义是什么？"加载更多"为什么必须用后者？如果把 `nextPage` 放进 deps 会发生什么？
3. `PaginatedList` 失败后点"重试"，请求的是哪一页？为什么重试永远不会跳页漏数据？
4. mock 的 `fetchUsers` 为什么要费劲实现 `addEventListener('abort', ...)`？只检查 `signal.aborted`（定时器回调里那一次）行不行？

### 参考答案

1. 取消负责"少干活"，序号负责"不出错"。只用 AbortController：请求源必须听得懂 signal，且存在"abort 与响应到达赛跑"的边界，旧响应仍可能写入 state；只用序号：过期响应确实进不了 state，但过期请求照样跑完全程，白耗流量与服务器资源，也无法真正中断它。
2. 前者是"keyword 变了自动重新请求（先取消旧的再发新的）"，后者是"挂载请求一次，之后由用户动作手动重发"。"加载更多"是用户点击触发的，若把 `nextPage` 放进 deps，页码一变就自动发请求，手动分页变成自动连发；而且 `nextPage` 只在成功后 +1，会形成"请求成功 → 页码变 → 又发请求"的连锁。
3. 请求的是失败的那一页。因为 `nextPage` 只在请求**成功**后经追加 effect `+1`；失败时 `data` 不变、effect 不执行、`nextPage` 不动，所以重试的仍是同一页，成功后页码才前进——任何一页都不会被跳过或重复。
4. 为了让"取消"立刻生效并保持与真 fetch 相同的语义：abort 事件触发时立刻 reject AbortError 并清掉定时器。只靠定时器回调里那一次检查，取消要等 700ms 后响应"到达"时才被发现——这期间定时器照跑、错误也晚到了 700ms，和真 fetch"取消瞬间中断"的行为不一致。

## 下一课预告

第 12 课：首屏越来越重怎么办——用 React.lazy 与 Suspense 把组件变成"用到才加载"。
