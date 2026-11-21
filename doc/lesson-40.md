# 第 40 课 · 从 Mock 到真实后端

最后一课。前 39 课里所有叫 mock 的文件（第 11 课的 fetchUsers、第 16 课的网络面板、第 19 课的 mockApi、第 28/30 课的 MockSocket）都住在你页面的同一个进程里——这次我们把它们换成真的：一个 Node + Express + ws 写的后端，跑在 **http://localhost:4310**，跨着源、隔着网络、会拒绝你、也会失联。打开 http://localhost:5173/lesson/40 之前，先 `cd server && node server.js`——本课页面离开这个服务器就只剩"网络错误"四个字，这正是教学的一部分。

## 学习目标

完成本课后，你应该能够：

1. 说清同源策略的判定标准（协议 + 域名 + 端口，三者缺一即跨源），并手写一遍 CORS 中间件：预检 OPTIONS、放行头、为什么不推荐 `*`；
2. 复述 REST 设计的基本约定：URL 是名词、方法是动词、状态码说结果（200/201/400/500），以及"服务端永远不信任客户端"的校验原则；
3. 用一句话讲出 WebSocket 握手的本质（HTTP Upgrade → 101 Switching Protocols → 同一条 TCP 变双向长连接），并说出它与 fetch 在跨源处理上的关键差异（无预检、Origin 头由服务端自校验）；
4. 说出四个 Mock 里不存在的问题（网络错误 / CORS / 并发 / 序列化），并能在本课页面里逐个指出它们的"现场"；
5. 解释为什么"接口不变、只换实现"能让替换成本为零：对比第 28 课 MockSocket 与本课 LiveSocket 的接口清单。

本课对应的示例代码：

- `server/server.js` —— Express + ws 同端口服务器：CORS 中间件、REST 读写端点、服务端校验、2 秒遥测心跳、note:created 广播
- `src/components/lesson40/apiClient.js` —— fetch 封装（三类错误分诊）+ LiveSocket（真 WebSocket + 指数退避重连，接口与 MockSocket 对齐）
- `src/components/lesson40/LiveBoard.jsx` —— 真数据看板：列表三态、POST 表单（400 直达 UI）、有界遥测流、连接徽章与手动断开/重连
- `src/pages/Lesson40.jsx` —— 页面编排：启动指引 + LiveBoard + "Mock 掩盖了什么" + 全课程总结
- `src/pages/lesson40.css` —— `l40-` 前缀样式（状态点沿用第 30 课色彩语义）

## 核心概念

### 同源策略与 CORS 手把手

**什么是"源"**：`协议 + 域名 + 端口` 三元组。`http://localhost:5173` 与 `http://localhost:4310` 只有端口不同，就是两个不同的源。同源策略是浏览器的默认行为：**A 源的页面里，JS 默认不许读 B 源的响应**。

手把手走一遍本课的跨源请求（页面在 5173，服务器在 4310）：

1. LiveBoard 挂载，调用 `fetch('http://localhost:4310/api/notes')`；
2. 这是 GET，属"简单请求"——浏览器**直接发出**请求（去 Network 面板看，请求真的到了服务器），服务器也正常处理并返回；
3. 响应回来时浏览器检查头：没有 `Access-Control-Allow-Origin: http://localhost:5173`？**扣下响应**，JS 拿到的是一个措辞含糊的 TypeError——连服务器给的错误信息都不给你看（这是故意的，防止拿 CORS 当探测工具）；
4. 服务器加了 CORS 中间件（`server.js` 里手写的那段）：正式响应带上放行头，浏览器放行，JS 拿到 JSON；
5. POST 是"非简单请求"（带 `Content-Type: application/json` 体）：浏览器**先发 OPTIONS 预检**问"你允许这个方法、这个头吗"，服务器答 `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers` + 204，然后才发真正的 POST——所以 CORS 中间件必须接得住 OPTIONS。

**两个易混淆点**：① CORS 报错出现在浏览器控制台，但服务器端日志一切正常——拦截发生在浏览器，不是服务器拒绝；② `Access-Control-Allow-Origin: *` 看似省事，但带凭据（cookie）的请求禁止用 `*`，生产做法是白名单（本课写死 5173 就是白名单）。

**WebSocket 的特殊待遇**：ws 握手**没有预检**，同源策略拦不住它——浏览器会带上 `Origin` 头，但放不放行完全由服务端决定。所以 `server.js` 在 `connection` 事件里手写了 Origin 白名单检查（不允许就 `close(1008)`）。"WebSocket 不受 CORS 管"是正确但危险的说法：不受浏览器管，不等于不用管。

### REST 设计基本约定

| 约定 | 本课的落地 | 为什么 |
| --- | --- | --- |
| URL 是名词，方法是动词 | `GET /api/notes`（读列表）、`POST /api/notes`（新建） | 同一个 URL，GET 和 POST 是两种不同操作——资源不变，动作由方法表达 |
| 状态码说结果 | 200 读到 / 201 新建成功 / 400 你请求有问题 / 500 我的锅 | 状态码是机器可判断的第一信号；`res.ok` 就是它的前端化身 |
| 错误信息说人话 | 400 响应体 `{ error: 'title 最长 40 字…' }` | 前端把 `err.message` 直接上 UI——错误信息的终点是用户眼前 |
| 返回形状留余地 | `{ notes: [...] }` 而非裸数组 | 将来加分页 `{ notes, total, page }` 时客户端解析逻辑零改动 |
| 服务端不信任客户端 | `validateNote` 在服务器再校验一遍 | 第 17 课的 zod 只挡浏览器里的君子；curl 和脚本可以绕过一切前端校验 |
| 幂等性 | GET 幂等可随便重试，POST 不幂等 | 这就是为什么"重拉列表"敢无脑多调，"提交订单"要防重复 |

### ws 协议握手（一句话版）

WebSocket 握手就是一次特殊的 HTTP 请求：客户端发 `Upgrade: websocket`，服务器答 **101 Switching Protocols**，此后这条 TCP 连接脱离"一问一答"模式变成双向长通道——所以 ws 能和 Express 共用同一个端口（`server.js` 手动 `app.listen` 拿到 HTTP server，交给 `new WebSocketServer({ server, path: '/ws' })`）。握手成本与普通 HTTP 相同，之后的每条消息都不再带 HTTP 头，这是它比轮询省的账。

### 为什么真实环境才能学到这四种问题

| 问题 | Mock 里的假象 | 真实世界的表现 | 本课现场 |
| --- | --- | --- | --- |
| 网络错误 | Promise 永远成功，"失败开关"只是一个 if | fetch 仅在网络层失败时 reject，且措辞含糊；HTTP 400/500 反而不抛错，要靠 `res.ok` 分诊 | 杀掉服务器 → 徽章进重连状态机、遥测停摆；列表出"重试"按钮 |
| CORS | 同进程函数调用，没有"别的源" | 预检、放行头、浏览器扣响应、控制台红字 | 注释掉 CORS 中间件重启，现场看报错 |
| 并发 | 只有你一个用户 | 多客户端同时读写；广播扎堆；重拉重叠 | 开两个窗口，A 添加 → B 列表自动刷新；去抖合并刷新 |
| 序列化 | 直接传对象引用 | 只有字节：stringify / parse 都可能失败；大小有限制；字段要重验 | apiClient 每次序列化都有 try/catch；服务器 validateNote 重验一切 |

Mock 不是偷懒，是教学隔离——先把 React 概念一个个讲干净。但隔离的四样代价，只有接上真实世界才能补齐。

### "接口不变、只换实现"清单

第 28 课 MockSocket → 本课 LiveSocket，接口逐项对照：

| 接口 | MockSocket（28 课） | LiveSocket（40 课） |
| --- | --- | --- |
| `connect()` / `close()` / `status` | ✅ | ✅ 原样（含"手动 close 永不自动重连"分流） |
| `onopen` / `onmessage` / `onclose` | ✅ | ✅ 原样（message 的 `data` 仍是字符串） |
| `onstatuschange` 参数 | Event（读 `socket.status`） | meta 对象 `{ status, attempt, nextDelayMs }`——UI 要显示重试进度，传对象更干净 |
| `simulateDrop()` | 有（教学开关） | 删——真实断线不用模拟，杀服务器就是教具 |
| 重试上限 | 3 次后放弃 | 无上限 + 封顶退避（800ms→8s）+ ±30% 抖动——真实服务器重启多久没人知道 |
| 事件来源 | 定时器自产自销 | 浏览器原生 WebSocket；断线重连状态机完整保留 |

结果：LiveBoard 的连接管理逻辑与第 28/30 课的组件同构，一行没为"换真 socket"多写。

### 全课程总结表

| 篇章 | 课号 | 主线 | 学完你能做什么 |
| --- | --- | --- | --- |
| 地基 | 1–10 | JSX/State、useEffect、Router、状态提升、useRef、Context、useReducer、自定义 Hook、渲染性能、综合实战 | 独立完成一个真实小应用 |
| 进阶 | 11–15 | 数据获取工程化、代码分割、错误边界、并发渲染、Vitest 测试 | 给应用装上工业级骨架 |
| 实战库 | 16–20 | TanStack Query、react-hook-form + zod、Zustand、React 19、综合实战 II | 学会借力生态而不是手搓 |
| 收官 | 21–25 | TypeScript、设计模式、动画、构建部署、学习护照 | 毕业并把项目真正上线 |
| 工程素养 | 26–30 | 可访问性、前端安全、useSyncExternalStore、调试方法论、迷你监控台 | 写"人人能用、黑客难碰、出错能查"的代码 |
| 新领域 | 31–35 | Next.js/RSC、虚拟列表、i18n、Tailwind、PWA | 把能力边界往外推 |
| 贯通 | 36–40 | Playwright、framer-motion、SVG 可视化、Web Vitals、真实后端 | 端到端质量 + 接上真实世界 |

一条暗线贯穿始终：`UI = f(state)`（第 1 课）→ 状态放哪、副作用怎么办（2–8 课）→ 数据从哪来、坏了怎么办（11–16 课）→ **数据从真实世界的另一头来**（本课）。React 只是 f，本课把输入端接上了真实。

## 代码导读

- `server/server.js`：文件头注释讲清"为什么端口不同 = 跨源"→ 手写 CORS 中间件（放行头 + 接住 OPTIONS 预检）→ `GET /api/notes`（返回 `{ notes }` 留扩展余地）→ `POST /api/notes`（`express.json({ limit: '10kb' })` + `validateNote` 服务端校验 + 201/400 语义）→ 错误中间件（非法 JSON → 400，未预期 → 500）→ `WebSocketServer({ server, path: '/ws' })` 共用 HTTP 端口 + Origin 白名单 + 全局 2 秒遥测（价格随机游走 + 每 3 拍掺一条日志，形状与第 28/30 课一致）→ POST 成功 `broadcast({ type: 'note:created', ... })`。
- `src/components/lesson40/apiClient.js`：`request()` 统一封装——网络层失败（含 5 秒超时）转 `ApiError(status=0)`，HTTP 失败读响应体里的中文错误转 `ApiError(status)`，成功 `res.json()` 反序列化；`LiveSocket` 类逐条对齐 MockSocket 接口（见上表），`_scheduleRetry` 实现封顶退避 + 抖动；模块级单例 `liveSocket`——连接活在组件树之外（第 28/30 课模式）。
- `src/components/lesson40/LiveBoard.jsx`：列表三态（loading / error+重试 / ready）；`onmessage` 分诊三类事件（note:created → 200ms 去抖重拉；price/log → 有界缓冲区头部插入；hello → 忽略）；POST 成功不直接塞列表——等广播重拉（socket 断着才自己补拉一次）；连接徽章 + "主动断开/重新连接"按钮演示手动与意外断线的分流。
- `src/pages/Lesson40.jsx`：启动指引（含 curl 命令）+ LiveBoard + 四个问题网格（每条 = Mock 假象 → 真实表现 → 本课现场）+ 40 课路线图总结。

## 动手试一试

1. **断线重连全流程**：开着 `/lesson/40`，在服务器终端 Ctrl+C——徽章应翻成"重连中（第 1 次 · 约 800ms 后）"，退避间隔逐步拉长，遥测停摆；重新 `node server.js`——徽章自动回"已连接"，遥测恢复滚动。再点页面上的「主动断开」：徽章"已断开"且**不会**自动重连（手动关闭与意外断线的分流），点「重新连接」恢复。
2. **双窗口并发**：开两个浏览器窗口都看 LiveBoard，A 窗口添加一条笔记——B 窗口列表自动刷新（note:created 广播 → 去抖重拉）；再快速连点添加，观察网络面板里被去抖合并掉的 GET。
3. **现场拆掉 CORS**：把 `server.js` 里 CORS 中间件的 `res.setHeader('Access-Control-Allow-Origin', ...)` 一行注释掉，重启服务器、刷新页面——控制台红字 + Network 面板"(CORS error)"，列表卡在"拉取失败"。恢复该行再刷新，一切复原。做完记得撤销注释。

## 易错点

1. **以为 fetch 收到 500 会 reject**：不会。只有网络层失败才 reject；HTTP 错误必须自己查 `res.ok` 并抛错——不封装就漏掉全部 HTTP 错误（本课 `request()` 的核心职责）。
2. **CORS 错误去服务器找日志**：服务器一切正常，拦截发生在浏览器；而且浏览器故意不给 JS 错误详情。调试方向是"响应头里有没有放行头"，不是"服务器为什么拒绝"。
3. **忘了 OPTIONS 预检**：CORS 中间件只给 GET/POST 加头、不接 OPTIONS，POST 一律死在预检——控制台报错还指向"真正的 POST 失败"，极具迷惑性。
4. **重连不设退避 / 不做抖动**：固定 1 秒猛敲正在过载的服务器是雪崩式重试（第 28/30 课铁律在这里真实生效）；多客户端无抖动会整齐划一地同一秒重试，把服务器重启变成第二次事故。
5. **把 WebSocket 当成"也受 CORS 管"或"完全不用管"**：前者错（没有预检），后者危险（服务端必须自查 Origin）——两句话各对一半，合起来才是真相。

## 自测题

1. `http://localhost:5173` 的页面请求 `http://127.0.0.1:5173` 算跨源吗？为什么？
2. POST `/api/notes` 发出后一共可能产生几个 HTTP 请求？各是什么？哪个请求的响应头决定预检成败？
3. 服务器进程被 Ctrl+C 杀掉时，LiveSocket 的状态机经历哪些状态？如果是你点了「主动断开」，状态机又走哪条路？两者在代码里靠哪个布尔变量分流？
4. 服务器 400 响应体里的中文错误（如"title 最长 40 字"）经过了哪几层才到达用户眼前？

<details>
<summary>答案</summary>

1. 算。源的判定是"协议 + 域名 + 端口"三元组，`localhost` 和 `127.0.0.1` 是不同的域名——哪怕端口相同、都指向本机，也是两个源。
2. 最多 2 个：先发 `OPTIONS /api/notes` 预检（因为带 `Content-Type: application/json` 的 POST 是非简单请求），预检通过后浏览器才发真正的 POST。预检请求的响应头（`Access-Control-Allow-Origin/Methods/Headers` + 204）决定成败——预检失败则 POST 根本不会发出。
3. 意外断线：open → reconnecting（排定退避重试，attempt 递增、间隔封顶 8s ±30% 抖动）→ 服务器回来后 connecting → open，attempt 清零。主动断开：open → closed，且 `_manuallyClosed = true` 使 onclose 走"永不自动重连"分支。分流变量就是 `_manuallyClosed`。
4. 服务器 `validateNote` 生成中文信息 → 放进 400 响应体 `{ error }` → 浏览器检查 CORS 放行头后放行 → 客户端 `request()` 发现 `res.ok === false`，解析响应体取 `error` 字段包进 `ApiError` → LiveBoard 的 `catch` 把 `err.message` 写进 `formError` state → 渲染为红字。任何一层的 CORS/序列化/状态码处理出问题，用户看到的就退化成含糊的通用文案。

</details>

## 下一课预告

没有第 41 课了——这门 40 课的课程到此结课。从 `UI = f(state)` 到真实后端，你走完的不是知识点清单，而是一条"能独立把一个 React 应用从零做出来、测起来、部署上线、接上真实世界"的完整路径。下一步不再是听讲，而是构建：选一个你自己的问题，用这 40 课的手艺从零做出真实的东西去解决它。毕业快乐，路上见。🎓
