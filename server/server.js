// 第 40 课 · 从 Mock 到真实后端 —— server/server.js：一个真实的 Node 后端
//
// 本文件教什么：
//   1. 为什么端口故意是 4310，而不是挂在主 dev server（5173）上？
//      —— 这是一次「同源策略」的现场教学。浏览器把"协议 + 域名 + 端口"三者
//      合起来才算一个「源（origin）」，http://localhost:5173 和
//      http://localhost:4310 端口不同 ⇒ 两个不同的源 ⇒ 页面里的 fetch 是
//      「跨源请求（CORS 问题）」。前 39 课的 Mock 全住在页面自己的进程里，
//      从来没有"另一个源"这种东西；一旦数据来自别的源，浏览器会先斩后奏：
//      请求照样发出去（你能在 Network 面板看到响应），但如果响应头里没有
//      服务器的「放行声明」，浏览器就把响应扣下、不交给你的 JS。
//      所以后端必须显式回 Access-Control-Allow-Origin 等头（见下面的 CORS
//      中间件）——注释掉它再刷新页面，控制台的红色报错就是本课的活教材。
//   2. REST 端点的基本约定：URL 是名词（/api/notes）、方法是动词
//      （GET 读 / POST 建）、状态码说结果（200/201/400/500）、
//      错误信息放 JSON body 里说人话（前端直接展示给用户）。
//   3. WebSocket 挂在同一个 HTTP server 上：ws 库监听的是 HTTP 的
//      "升级"请求（Upgrade: websocket → 101 Switching Protocols），
//      握手完成后这条 TCP 连接就变成双向长连接。注意：WebSocket 握手
//      没有 CORS 预检这一说——浏览器会带上 Origin 头，但放不放行完全由
//      服务端自己判断（本文件里手写了这道检查），这是和 fetch 的关键差异。
//   4. 内存存储的取舍：笔记存在一个普通数组里，进程一重启就清零。
//      真实后端会落数据库；演示项目不持久化，是为了让你能用 Ctrl+C /
//      node server.js 随意折腾「重启」这个动作——这正是断线重连演示的一环。
//      这是演示取舍，不是最佳实践，别把它带进生产代码。
//
// 运行方式（在本仓库根目录）：
//   cd server && node server.js
// 然后打开 http://localhost:5173/lesson/40 实测。

import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = process.env.PORT || 4310
// 唯一放行的源：主 dev server 的页面住在这里。写死白名单比 '*' 安全——
// 带 credentials 的请求根本不允许用 '*'，白名单是生产的标准姿势
const ALLOWED_ORIGIN = 'http://localhost:5173'

// ---------- 内存"数据库"：重启即失忆（见文件头第 4 点） ----------
// 自增主键：模拟后端"新增记录时分配 id"的行为（第 16 课 mock 同款思路）
let nextId = 4
const notes = [
  { id: 1, title: '第 28 课的 MockSocket 接口没变', content: '第 40 课把它换成了真 WebSocket，组件一行没改。', createdAt: '2026-01-01T08:00:00.000Z' },
  { id: 2, title: 'REST 的状态码会说话', content: '201 是"新建成功"，400 是"你的请求有问题"，500 是"我的锅"。', createdAt: '2026-01-01T08:05:00.000Z' },
  { id: 3, title: '重启我就消失', content: '这份笔记住在内存里，server 一重启就没了——演示取舍，真实后端请落库。', createdAt: '2026-01-01T08:10:00.000Z' },
]

const app = express()

// ---------- CORS 中间件：本课的主角之一 ----------
// 浏览器对跨源请求的分两步：先问（预检）再发。带 application/json 体的
// POST 属于"非简单请求"，浏览器会先发一个 OPTIONS 询问服务器"你允许吗"，
// 允许了才发真正的 POST。所以中间件必须既给正式响应带头，也接得住 OPTIONS。
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN) // 谁能读我的响应
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS') // 允许哪些方法
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type') // 允许带哪些自定义头
  // 预检请求本身不需要业务逻辑，答完 204 直接返回，不往下走
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ---------- REST 端点 ----------
// 读：GET 是"安全"方法，不产生副作用，可以随便重试/缓存
app.get('/api/notes', (_req, res) => {
  // 返回 { notes: [...] } 而不是裸数组：将来加分页（{ notes, total, page }）
  // 时客户端不用改解析逻辑——返回形状要留扩展余地
  res.json({ notes })
})

// 服务端校验：永远不信任客户端。第 17 课的 zod 在浏览器里挡了一层，
// 那层可以被绕过（curl / 脚本直连），所以服务器必须再挡一层。
// 返回 { error } 或 { value }：错误信息用中文说人话，前端会直接展示给用户
function validateNote(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) return { error: 'title 必填，且不能是纯空白字符' }
  if (title.length > 40) return { error: `title 最长 40 字（当前 ${title.length} 字）` }
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (content.length > 200) return { error: `content 最长 200 字（当前 ${content.length} 字）` }
  return { value: { title, content } }
}

// 写：POST 有副作用。express.json() 只挂在这条路由上——按需加载中间件，
// 其他路由（比如纯读接口）不需要解析请求体的开销
app.post('/api/notes', express.json({ limit: '10kb' }), (req, res) => {
  const { error, value } = validateNote(req.body)
  // 400 Bad Request：是"客户端的锅"，错误信息必须能直接给人看
  if (error) return res.status(400).json({ error })

  const note = {
    id: nextId++,
    title: value.title,
    content: value.content,
    createdAt: new Date().toISOString(), // 时间戳由服务器生成——客户端的钟不可信
  }
  notes.push(note)

  // 广播"有新笔记"给所有 ws 客户端（包括提交者自己）。
  // LiveBoard 收到后重拉列表——这就是"POST 成功 → ws 广播 → 列表刷新"的闭环。
  // 先广播还是先回复 POST 都行（客户端的重拉是幂等 GET）；
  // 真实系统习惯"先答写请求的人，再广播旁听的人"。
  broadcast({ type: 'note:created', note, ts: Date.now() })

  // 201 Created：REST 约定"新建成功"不是 200——状态码本身就在传达"资源已创建"，
  // 并把资源本体（含服务器分配的 id）返回给调用方
  res.status(201).json(note)
})

// 首页给个"服务器名片"，curl 一发就知道服务活着、端口对不对
app.get('/', (_req, res) => {
  res.json({ name: 'lesson40 后端', now: new Date().toISOString(), endpoints: ['GET /api/notes', 'POST /api/notes', 'WS /ws'] })
})

// ---------- 错误处理中间件：必须是 4 个参数，Express 靠参数个数认它 ----------
// express.json() 遇到非法 JSON 会抛错并落到这里（不会进路由处理器）——
// 序列化问题在服务端的现场：客户端发的字节不保证是合法 JSON
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体不是合法 JSON' })
  }
  console.error('未预期错误：', err) // 真实后端这里该接日志系统，console 只是演示
  res.status(500).json({ error: '服务器内部错误' })
})

// ---------- WebSocket：和 REST 共用同一个 HTTP server ----------
// 手动 createServer 是为了把 Express 和 ws 接到同一个端口上：
// 普通请求走 Express 路由，带 Upgrade: websocket 头的请求被 ws 接管完成握手
const server = app.listen(PORT, () => {
  console.log(`lesson40 服务器已启动（http://localhost:${PORT}）`)
  console.log(`  REST: GET/POST http://localhost:${PORT}/api/notes`)
  console.log(`  WS  : ws://localhost:${PORT}/ws（每 2 秒推一条遥测 + 新笔记广播）`)
  console.log(`  CORS: 仅放行 ${ALLOWED_ORIGIN}`)
})

const wss = new WebSocketServer({ server, path: '/ws' })

// 广播工具：JSON.stringify 一次（省 CPU），只发给还连着的客户端。
// 发送前的 readyState 检查不是仪式——给半死的连接 send 会抛异常
function broadcast(event) {
  const payload = JSON.stringify(event)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

// 握手完成（connection 事件）后：浏览器发来的 Origin 头在这里接受检查。
// 注意与 fetch 的差异：WebSocket 没有 CORS 预检，放不放行全看服务端这一行。
// origin 为 undefined 的通常是 curl / Node 脚本（浏览器一定会带 Origin），
// 放行它们方便命令行调试
wss.on('connection', (socket, req) => {
  const origin = req.headers.origin
  if (origin && origin !== ALLOWED_ORIGIN) {
    // 1008 = Policy Violation（策略不允许），语义化关闭码
    socket.close(1008, 'Origin 不在白名单')
    return
  }
  console.log(`ws 客户端接入（当前在线 ${wss.clients.size}）`)
  // 握手确认：客户端连上立刻有反馈，不用干等 2 秒后的第一条遥测
  socket.send(JSON.stringify({ type: 'hello', text: '已连上 lesson40 实时通道', ts: Date.now() }))
  socket.on('close', () => console.log(`ws 客户端断开（当前在线 ${wss.clients.size}）`))
})

// ---------- 每 2 秒的遥测心跳：数据形状复用第 28/30 课 ----------
// 全局一个定时器（而不是每个客户端各一个）：数据只游走一份，广播给所有人。
// 客户端多起来时这是成本差异巨大的设计决策
const SYMBOLS = [
  { symbol: 'AAPL', price: 187.4 },
  { symbol: 'GOOG', price: 141.5 },
  { symbol: 'TSLA', price: 248.9 },
]
let tickCount = 0
let logSeq = 0 // 给每条日志一个稳定 id：列表渲染的 key 要的是"身份"不是下标（第 30 课铁律）

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 日志模板：info 打底、warn/error 少量掺入——真实日志流就是这种分布（第 30 课同款）
const LOG_LINES = [
  () => ({ level: 'info', text: `健康检查通过 · P99 延迟 ${randInt(12, 60)}ms` }),
  () => ({ level: 'info', text: `缓存命中率 ${randInt(72, 99)}%，淘汰 ${randInt(0, 3)} 条` }),
  () => ({ level: 'info', text: `磁盘占用 ${randInt(41, 60)}%，一切正常` }),
  () => ({ level: 'warn', text: `慢查询告警 · 某条 SQL 耗时 ${randInt(300, 1200)}ms` }),
  () => ({ level: 'warn', text: `内存占用 ${randInt(70, 84)}%，接近告警线` }),
  () => ({ level: 'error', text: '上游返回 502 · 自动重试成功' }),
]

setInterval(() => {
  tickCount += 1
  if (wss.clients.size === 0) return // 没有观众就不演出：省掉无意义的计算与序列化

  // ① 价格心跳：随机挑一只股票走一步（±1.2% 以内的小幅波动），形状同第 28 课
  const stock = SYMBOLS[randInt(0, SYMBOLS.length - 1)]
  stock.price = Math.max(1, +(stock.price * (1 + (Math.random() - 0.5) * 0.024)).toFixed(2))
  broadcast({ type: 'price', symbol: stock.symbol, price: stock.price, ts: Date.now() })

  // ② 每 3 拍掺一条日志，形状同第 30 课的 { id, level, text, ts }
  if (tickCount % 3 === 0) {
    const line = LOG_LINES[randInt(0, LOG_LINES.length - 1)]()
    broadcast({ type: 'log', id: ++logSeq, level: line.level, text: line.text, ts: Date.now() })
  }
}, 2000)
