// 第 29 课 · 组件三：错误监控概念卡 + 两个兜底事件的真机捕获演示
//
// 本文件教什么：
// 1. window 的 'error' 与 'unhandledrejection' 是“最后一层网”：
//    React 的 ErrorBoundary 管不到事件处理器、定时器、没人 catch 的 Promise，
//    这些错误最终都会落到这两个浏览器级事件上——监控类工具（Sentry 等）
//    的自动上报就是在它们之上封装的。本组件真实挂上这两个监听，
//    页面里的 demo 错误会被面板实时捕获展示。
// 2. 三张概念卡：两个兜底事件各管什么、Sentry 类工具的上报边界、
//    source map 与生产调试的关系（呼应第 24 课：线上不发 map + 平台私有上传）。
import { useEffect, useRef, useState } from 'react'

// —— 三张概念卡的数据：内容与讲义 doc/lesson-29.md 保持同源 ——
const CONCEPT_CARDS = [
  {
    title: '① 两个兜底事件各管什么',
    points: [
      "window 'error'：同步未捕获错误（包括定时器/事件回调里的 throw）+ 资源加载失败。",
      "'unhandledrejection'：Promise 链上没有任何 catch 时的兜底；e.reason 是 reject 的值。",
      '监听要挂在应用入口最早处；React 错误边界管不到这三者之外的异步世界——兜底事件是最后一层网。',
    ],
  },
  {
    title: '② Sentry 类工具的上报边界',
    points: [
      '该自动报：uncaught error、unhandled rejection；该手动报：try/catch 住但你判定必须上报的（captureException）。',
      '要节制：开发环境静音或打 env 标；采样率限流；同一错误聚合计数而不是刷一千条；beforeSend 里做 PII 脱敏——错误消息可能夹带用户数据。',
      '循环抛错必须节流：上报失败再触发错误 → 再上报……监控自身也会雪崩。',
    ],
  },
  {
    title: '③ source map 与生产调试（呼应第 24 课）',
    points: [
      '生产 bundle 压缩混淆：堆栈里全是 a.b(...) 与精确到字符的列号，人读不懂。',
      'source map 是“产物位置 → 源码位置”的映射；vite build 默认不生成（build.sourcemap 才开）。',
      '两全做法：线上不出 map（map ≈ 公开源码）+ 每次构建的 map 私有上传监控平台，release 版本一一配对——线上堆栈在平台里还原成源码行。',
    ],
  },
]

export default function MonitorConcepts() {
  // 捕获面板：最新的排最前，只留最近 6 条（面板不是数据库，别让它无限长）
  const [captures, setCaptures] = useState([])
  // 条目序号：不参与渲染，用 ref 计数生成 key
  const seqRef = useRef(0)

  useEffect(() => {
    function push(kind, message) {
      seqRef.current += 1
      const entry = {
        key: seqRef.current,
        kind,
        message,
        at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      }
      setCaptures((prev) => [entry, ...prev].slice(0, 6))
    }

    function onError(e) {
      // e.message：错误文本；e.filename / lineno / colno：发生位置——
      // 注意这是“压缩产物里的位置”，没有 source map 还原不出源码行（见概念卡③）
      push(
        'error',
        e.message || '（无 message 的 error 事件——多半是资源加载失败）',
      )
      // 此处可以 e.preventDefault() 拦下浏览器的默认 console 报红，
      // 本页故意不拦：让你亲眼确认“面板捕获的”和“console 报的”是同一条错误。
    }

    function onRejection(e) {
      const reason = e.reason
      push(
        'rejection',
        reason instanceof Error ? reason.message : String(reason),
      )
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    // 清理函数：切到别的课时摘掉监听——不摘的话每进出本页一次就多挂一对，越积越多
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  function throwSync() {
    // 在事件处理器里直接 throw：React 不接事件处理器里的错误，
    // 它最终成为一条未捕获错误，落进 window 的 'error' 事件——上面的监听会接住它。
    throw new Error('演示：同步错误——在按钮的事件处理器里直接 throw')
  }

  function rejectPromise() {
    // 只 reject 不 catch：约一拍之后浏览器派发 'unhandledrejection'。
    // 故意不给返回值挂 .catch——这正是“漏 catch”的真实形态。
    Promise.reject(new Error('演示：Promise 被 reject，且没有任何 catch'))
  }

  return (
    <section className="card">
      <h2>
        错误监控：从“console 报红”到“平台上报”
        <span className="l29-badge">呼应第 13 · 24 课</span>
      </h2>
      <p>
        第 13 课的 ErrorBoundary 只能兜<strong>渲染期</strong>的错误；
        事件处理器、定时器、没人 catch 的 Promise 都归下面两个浏览器级兜底事件管。
        本页已经真实挂上监听——点按钮制造两条 demo 错误，看面板接住它们：
      </p>
      <div className="row">
        <button type="button" onClick={throwSync}>
          🧨 抛一个同步错误
        </button>
        <button type="button" onClick={rejectPromise}>
          🔥 触发未处理的 Promise 拒绝
        </button>
        <button type="button" onClick={() => setCaptures([])}>
          清空面板
        </button>
      </div>

      <div className="l29-panel" aria-live="polite">
        {/* aria-live：捕获到新错误时读屏器自动播报——监控面板本身就是无障碍受益者 */}
        {captures.length === 0 ? (
          <p className="l29-panel-empty">
            面板空空如也。点上面的按钮制造两条 demo 错误，同时开着 DevTools
            的 Console 对比——面板捕获的和 console 报红的是同一条错误。
          </p>
        ) : (
          <ul>
            {captures.map((c) => (
              <li key={c.key} className="l29-item">
                <span
                  className={`l29-tag l29-tag-${c.kind === 'error' ? 'error' : 'rejection'}`}
                >
                  {c.kind === 'error' ? '同步错误' : 'Promise 拒绝'}
                </span>
                <span className="l29-item-msg">{c.message}</span>
                <span className="l29-item-time">{c.at}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="l29-grid3">
        {CONCEPT_CARDS.map((card) => (
          <div key={card.title} className="l29-sub">
            <h3>{card.title}</h3>
            <ul>
              {card.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
