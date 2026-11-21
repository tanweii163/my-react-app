// 第 40 课 · 从 Mock 到真实后端 —— LiveBoard.jsx：第一个吃"真数据"的看板
//
// 本文件教什么：
//   1. REST 拉取（GET）+ 提交（POST）+ WS 推送三路数据汇进同一个看板：
//      列表来自真实 HTTP 请求；添加笔记走 POST，但列表刷新不靠返回值直接塞——
//      等服务器把 note:created 广播回来后重拉一次（单一数据源，还顺带让
//      其他窗口/标签页同步）；价格与日志来自 WS 每 2 秒的推送。
//   2. 与第 30 课一脉相承的三个铁律在这里再次生效：
//      ① 连接活在组件树之外（apiClient 的模块级单例），组件只是订阅者；
//      ② 实时流缓冲区必须有界（MAX_TELEMETRY 条，多了就丢最旧的）；
//      ③ 副作用必须能被清理（effect 返回的清理函数摘掉每个回调）。
//   3. 真数据才有的 UI 状态：加载中 / 网络错误+重试按钮 / 空列表——
//      Mock 时代"永远成功"，这三态从未被真正渲染过。

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNotes, createNote, liveSocket, SOCKET_STATUS } from './apiClient.js'

// 遥测缓冲上限：不封顶，内存和渲染迟早一起爆炸（第 30 课铁律的复读机模式）
const MAX_TELEMETRY = 30

// 徽章文案：颜色之外永远有文字（第 26 课：颜色不作唯一信号）
const STATUS_LABEL = {
  [SOCKET_STATUS.CONNECTING]: '连接中…',
  [SOCKET_STATUS.OPEN]: '已连接',
  [SOCKET_STATUS.RECONNECTING]: '重连中',
  [SOCKET_STATUS.CLOSED]: '已断开',
}

// 时间戳只给机器看，人看的永远是格式化好的本地时间
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

export default function LiveBoard() {
  // —— 笔记列表的三态：loading / error / ready。Mock 时代只有 ready ——
  const [notes, setNotes] = useState([])
  const [notesPhase, setNotesPhase] = useState('loading')
  const [loadError, setLoadError] = useState('')

  // —— 遥测流：有界缓冲，最新在最上 ——
  const [telemetry, setTelemetry] = useState([])

  // —— 表单状态 ——
  const [title, setTitle] = useState('')
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)

  // —— 连接状态（含重试元信息），初始值直接问单例要 ——
  const [meta, setMeta] = useState(() => ({
    status: liveSocket.status,
    attempt: 0,
    nextDelayMs: null,
  }))

  // 拉取列表：POST 广播触发的重拉、首次加载、手动重试走同一个函数（幂等 GET，多调无害）。
  // 注意这里没有任何"进入函数就 setState"——loading 状态由调用方负责：
  // 首次挂载时 state 初始值本来就是 loading；重试按钮在事件处理器里先置 loading
  // （事件里同步 setState 没问题）；广播触发的静默刷新则保持当前状态不闪屏
  const loadNotes = useCallback(async () => {
    try {
      const data = await fetchNotes() // 跨源请求！Network 面板里能看到 CORS 头
      setNotes(data.notes)
      setNotesPhase('ready')
    } catch (err) {
      // 真网络才会走到的分支：服务器没开 / 断网 / CORS 被拦 / 超时
      setLoadError(err.message)
      setNotesPhase('error')
    }
  }, [])

  // 刷新去抖：广播可能扎堆（自己 POST + 别的窗口 POST 连着来），
  // 合并成 200ms 内的一次 GET——"并发"在客户端的第一课：先少发请求
  const refreshTimer = useRef(null)
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(loadNotes, 200)
  }, [loadNotes])

  // effect 一：连接生命周期 + 状态徽章订阅
  useEffect(() => {
    liveSocket.connect() // 幂等：已连接/重连中时是空操作（StrictMode 双挂载安全）
    liveSocket.onstatuschange = (m) => setMeta({ ...m })
    // 初始快照不用在这里手动对齐——上面的 useState 惰性初始化已经读过单例的
    // 当前状态；订阅后每次状态变化都会经 onstatuschange 推进来
    return () => {
      liveSocket.onstatuschange = null // 只摘自己的回调，连接本身不关——它是单例资产
    }
  }, [])

  // effect 二：消息订阅。分诊三类事件：新笔记广播 → 重拉列表；遥测 → 进缓冲区
  useEffect(() => {
    liveSocket.onmessage = (event) => {
      let data
      try {
        data = JSON.parse(event.data) // 真网络来的字节不保证合法——Mock 从没教过这一课
      } catch {
        return // 坏包直接丢弃：一颗老鼠屎不能坏一锅粥
      }
      if (data.type === 'note:created') {
        scheduleRefresh() // 不直接用广播里的 note 塞列表：以 GET 到的服务器状态为准
      } else if (data.type === 'price' || data.type === 'log') {
        setTelemetry((prev) => [data, ...prev].slice(0, MAX_TELEMETRY)) // 不可变更新 + 有界
      }
      // hello（握手确认）不需要上 UI，静默忽略
    }
    return () => {
      liveSocket.onmessage = null
      clearTimeout(refreshTimer.current)
    }
  }, [scheduleRefresh])

  // effect 三：首次挂载拉一次列表。
  // loadNotes 里的 setState 都发生在 await 之后（响应回来才落地），
  // 不是该规则要防的"渲染 → effect 无条件 setState → 再渲染"连锁；
  // 请求状态机的初始 loading 由 useState 初始值承担，此处只是发起请求。
  // 与第 11 课 useFetch 的处理同款——该规则对"挂载即请求"的误报按惯例豁免。
  useEffect(() => {
    // eslint-disable-next-line set-state-in-effect -- setState 全在 await 之后，见上方说明
    loadNotes()
  }, [loadNotes])

  // 提交新笔记：POST 201 之后这里不碰列表——等 note:created 广播回来统一重拉。
  // 唯一的例外：此刻 socket 恰好断着（广播收不到），就自己重拉，保证"我的操作我看得见"
  async function handleAdd(e) {
    e.preventDefault() // 表单提交的第一行永远是它——别让浏览器真的去发请求
    const trimmed = title.trim()
    if (!trimmed) {
      setFormError('标题不能为空（前端第一道校验，服务器还有第二道）')
      return
    }
    setAdding(true)
    setFormError('')
    try {
      await createNote(trimmed)
      if (liveSocket.status !== SOCKET_STATUS.OPEN) loadNotes()
      setTitle('') // 成功才清空输入框——失败的提交要让用户的话原样保留
    } catch (err) {
      // 400 的中文错误信息来自服务器（validateNote 写给人看的话），直接上 UI
      setFormError(err.message)
    } finally {
      setAdding(false)
    }
  }

  // 教学按钮：故意提交非法数据，亲眼看看服务器的 400 如何长途跋涉回到 UI
  async function handleForce400() {
    setAdding(true)
    setFormError('')
    try {
      await createNote('这个标题故意超长'.repeat(6)) // 48 字 > 40 字上限：服务器的 validateNote 必须回 400
    } catch (err) {
      setFormError(`服务器返回：${err.message}（HTTP ${err.status}）`)
    } finally {
      setAdding(false)
    }
  }

  const s = meta.status

  return (
    <section className="card">
      <h2>真实数据看板（LiveBoard）</h2>
      <p className="hint">
        列表来自 <code>GET /api/notes</code>（跨源 REST），遥测来自 <code>ws://localhost:4310/ws</code>（每 2 秒一条）。
        试试 Ctrl+C 杀掉服务器，看徽章进入重连状态机；重启服务器，看它自动恢复。
      </p>

      {/* —— 连接状态条：状态点 + 文案 + 重试元信息 + 手动控制 —— */}
      <div className="l40-statusbar">
        <span className={`l40-dot l40-dot-${s}`} aria-hidden="true" />
        <strong className="l40-status-text">{STATUS_LABEL[s]}</strong>
        {s === SOCKET_STATUS.RECONNECTING && (
          <span className="l40-retry-meta">
            第 {meta.attempt} 次重试{meta.nextDelayMs ? ` · 约 ${meta.nextDelayMs}ms 后` : ''}
          </span>
        )}
        <span className="l40-status-actions">
          <button type="button" onClick={() => liveSocket.close()} disabled={s === SOCKET_STATUS.CLOSED}>
            主动断开
          </button>
          <button type="button" onClick={() => liveSocket.connect()} disabled={s !== SOCKET_STATUS.CLOSED}>
            重新连接
          </button>
        </span>
      </div>
      <p className="hint">
        「主动断开」走手动关闭路径——永不自动重连（用户说不要 ≠ 网络说不行，第 28 课的分流逻辑原样保留）。
      </p>

      {/* —— 笔记区：REST 拉取 + POST 表单 —— */}
      <div className="l40-notes">
        <h3>笔记（来自真实后端）</h3>
        {notesPhase === 'loading' && <p className="hint">正在从 http://localhost:4310 拉取…（去 Network 面板看这次跨源请求）</p>}
        {notesPhase === 'error' && (
          <div className="l40-load-error" role="alert">
            <p>拉取失败：{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setNotesPhase('loading') // 重试的即时反馈：事件处理器里同步 setState 是安全的
                loadNotes()
              }}
            >
              重试
            </button>
          </div>
        )}
        {notesPhase === 'ready' && (
          <ul>
            {[...notes].reverse().map((note) => (
              <li key={note.id}>
                {/* key 用服务器分配的 id：它是身份，不是下标（列表渲染的铁律） */}
                <label>
                  <strong>{note.title}</strong>
                  <small className="l40-note-meta">#{note.id} · {fmtTime(note.createdAt)}</small>
                </label>
              </li>
            ))}
          </ul>
        )}
        {/* 新笔记在提交后由 ws 广播触发重拉出现在这里——POST 本身不直接改列表 */}
        <form onSubmit={handleAdd}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新笔记标题（服务端会再校验一遍，最长 40 字）"
            maxLength={60}
            aria-label="新笔记标题"
          />
          <button type="submit" disabled={adding}>
            {adding ? '提交中…' : '添加'}
          </button>
          <button type="button" onClick={handleForce400} disabled={adding} className="l40-danger-btn">
            演示：触发 400
          </button>
        </form>
        {formError && (
          <p className="l40-form-error" role="alert">
            {formError}
          </p>
        )}
      </div>

      {/* —— 遥测区：WS 推送的滚动流 —— */}
      <div className="l40-tele">
        <h3>实时遥测（ws 推送，最新在上，只留 {MAX_TELEMETRY} 条）</h3>
        {telemetry.length === 0 ? (
          <p className="hint">连接成功后，这里每 2 秒滚入一条价格/日志——数据形状与第 28/30 课完全相同</p>
        ) : (
          <ul className="l40-tele-list">
            {telemetry.map((item) => (
              <li key={item.ts + item.type + (item.id ?? '')} className={`l40-tele-item l40-tele-${item.type}${item.type === 'log' ? `-${item.level}` : ''}`}>
                {/* key 组合出唯一性：同毫秒的 price/log 不会撞 */}
                <span className="l40-tele-time">{fmtTime(item.ts)}</span>
                {item.type === 'price' ? (
                  <span className="l40-tele-body">
                    {item.symbol} <strong>${item.price.toFixed(2)}</strong>
                  </span>
                ) : (
                  <span className="l40-tele-body">
                    <span className="l40-tele-level">[{item.level}]</span> {item.text}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
