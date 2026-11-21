/**
 * 第 39 课 · Web Vitals 真实测量 —— 页面内实时面板
 *
 * 本文件教什么：
 * 1. 把 web-vitals 的回调接到 React state 上：指标一更新卡片就变色——
 *    "测量"在 vitalsReport.js，"展示"在这里，职责分开；
 * 2. PerformanceObserver 原生演示：longtask 观察器捕获 >50ms 的长任务，
 *    配一个按钮故意阻塞主线程 200ms 做对比；
 * 3. Resource Timing：performance.getEntriesByType('resource') 看每个资源
 *    的大小与耗时；
 * 4. Navigation Timing：DNS / 连接 / 请求 / 响应的关键阶段时间线——
 *    localhost 下这些全部接近 0，只有真实网络才测得出意义。
 *
 * 【铁律】面板展示的都是本次页面加载的真实测量值，不是假数据：
 * LCP/CLS/FCP/TTFB 注册即报（buffered 回放 + reportAllChanges），
 * INP 没交互就是没值，如实显示"尚无交互"。
 */

import { useEffect, useState } from 'react'
import {
  THRESHOLDS,
  formatValue,
  initVitalsReport,
  rateMetric,
} from './vitalsReport.js'

/** 卡片固定顺序：三个 Core Web Vitals 打头，两个辅助指标殿后 */
const METRIC_ORDER = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB']

/**
 * 模块级快照：web-vitals 的 onXxx() 在整个页面寿命里只注册一次
 * （见 vitalsReport.js 的防重），所以回调必须写到组件外的模块变量里——
 * 这样路由切走再切回来，新面板实例也能从快照恢复，不会丢数据。
 */
const latestMetrics = {}

/** 分级 → 卡片配色类名（CSS 里 l39-good / l39-ni / l39-poor / l39-none） */
const RATING_CLASS = {
  good: 'l39-good',
  'needs-improvement': 'l39-ni',
  poor: 'l39-poor',
  none: 'l39-none',
}

/** 故意阻塞主线程：忙等 ms 毫秒。期间浏览器无法响应、无法渲染。 */
function blockMainThread(ms) {
  const end = performance.now() + ms
  while (performance.now() < end) {
    // 空转占住主线程——这就是"长任务"的制造方式
  }
}

/** 把资源 URL 缩短成文件名展示（dev 下 Vite 的模块 URL 又长又多） */
function shortName(entry) {
  const url = entry.name.split('?')[0]
  return decodeURIComponent(url.split('/').pop() || url)
}

/** Resource Timing：dev 下每个源码模块都是一次独立请求，条目很多，只看前 8 条 */
function readResources() {
  return performance.getEntriesByType('resource').slice(0, 8)
}

/**
 * Navigation Timing：本次加载的 DNS/连接/请求/响应各阶段耗时。
 * 取 navigation 类型唯一的条目；responseStart 为 0 说明条目不可用（如 prerender）。
 */
function readNavigation() {
  const n = performance.getEntriesByType('navigation')[0]
  if (!n || n.responseStart <= 0) return null
  return {
    dns: n.domainLookupEnd - n.domainLookupStart,
    connect: n.connectEnd - n.connectStart, // 含 TCP + TLS
    request: n.responseStart - n.requestStart, // 发出请求到收到首字节（服务端处理 + 网络）
    response: n.responseEnd - n.responseStart, // 首字节到下载完
  }
}

export default function VitalsPanel() {
  // 指标快照：{ LCP: { value, rating }, ... }，初始为空，注册后陆续补齐
  const [metrics, setMetrics] = useState({ ...latestMetrics })
  // longtask 观察器捕获到的长任务列表（最新的排最后）
  const [longTasks, setLongTasks] = useState([])
  // Resource Timing 快照（有"刷新"按钮，需要 state）。
  // 【技巧】performance API 是同步可读的（页面加载早已完成），所以用 useState 的
  // 惰性初始化在首次渲染时直接取值——不需要 effect 里再 setState 一轮。
  const [resources, setResources] = useState(readResources)
  // Navigation Timing 没有交互入口，渲染时直接读即可，连 state 都不需要
  const nav = readNavigation()

  useEffect(() => {
    // 注册 web-vitals：内部有防重，StrictMode 双挂载也只会注册一次。
    // 回调里同时更新模块快照与组件 state。
    initVitalsReport((metric) => {
      latestMetrics[metric.name] = { value: metric.value, rating: metric.rating }
      // 展开成新对象——【铁律】React 靠"引用变化"感知更新，原地改对象不触发重渲染
      setMetrics({ ...latestMetrics })
    })
  }, [])

  useEffect(() => {
    // longtask 观察器：任何 >50ms 的主线程任务都会被捕获。
    // buffered: true 会回放注册之前的长任务（比如页面加载时就有）。
    if (!('PerformanceObserver' in window)) return
    let observer
    try {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries().map((e) => ({
          start: Math.round(e.startTime),
          duration: Math.round(e.duration),
        }))
        // 只留最近 10 条，防止列表无限增长
        setLongTasks((prev) => [...prev, ...entries].slice(-10))
      })
      observer.observe({ type: 'longtask', buffered: true })
    } catch {
      // 【易错】Safari 至今不支持 longtask 类型：observe 会直接抛错，
      // 必须 try/catch 兜底，不能让整页崩掉。
    }
    return () => observer?.disconnect()
  }, [])

  /** Resource Timing：dev 下每个源码模块都是一次独立请求，条目很多，只看前 8 条 */
  function refreshResources() {
    setResources(readResources())
  }

  return (
    <div className="l39-panel">
      {/* —— 五指标卡片 —— */}
      <div className="l39-cards">
        {METRIC_ORDER.map((name) => {
          const m = metrics[name]
          const t = THRESHOLDS[name]
          // 用本课自己实现的分级函数算色块——证明"分级规则就是一张公开的表"
          const rating = m ? rateMetric(name, m.value) : 'none'
          return (
            <div key={name} className={`l39-metric ${RATING_CLASS[rating]}`}>
              <div className="l39-metric-head">
                <strong>{name}</strong>
                {/* INP 没交互就没值，如实展示，不能造假数据 */}
                <span className="l39-badge">{m ? rating : '尚无交互'}</span>
              </div>
              <div className="l39-value">{formatValue(name, m?.value)}</div>
              <div className="l39-threshold">
                {t.unit ? `阈值：≤${t.good}${t.unit} 良好 · >${t.poor}${t.unit} 差` : '阈值：≤0.1 良好 · >0.25 差'}
              </div>
            </div>
          )
        })}
      </div>
      <p className="hint">
        以上是本次页面加载的真实测量值（dev 控制台里有同款彩色日志）。
        INP 在你第一次点击页面元素后才会有值——点下面的"制造长任务"按钮，
        顺便观察 INP 卡片变化：那次被阻塞的点击本身，就成了一个慢交互。
      </p>

      {/* —— longtask 观察器演示 —— */}
      <h3>长任务观察器（PerformanceObserver · longtask）</h3>
      <p>
        主线程任务超过 <strong>50ms</strong> 就是"长任务"——期间浏览器既不能响应输入也不能渲染，
        是 INP 变差的第一元凶。点按钮阻塞 200ms，下方列表会立刻捕获它：
      </p>
      <div className="row">
        <button onClick={() => blockMainThread(200)}>制造 200ms 阻塞（点完页面会卡一下）</button>
        <button onClick={() => setLongTasks([])}>清空列表</button>
      </div>
      {longTasks.length === 0 ? (
        <p className="l39-empty">还没捕获到长任务——点上面的按钮试试。</p>
      ) : (
        <ul className="l39-task-list">
          {longTasks
            .slice()
            .reverse()
            .map((t, i) => (
              <li key={`${t.start}-${i}`}>
                长任务 · 开始于页面加载后 {t.start}ms · 持续 <strong>{t.duration}ms</strong>
                {t.duration > 200 && '（比 50ms 阈值超标 4 倍以上）'}
              </li>
            ))}
        </ul>
      )}

      {/* —— Navigation Timing 时间线 —— */}
      <h3>Navigation Timing：本次加载的阶段时间线</h3>
      {nav ? (
        <table className="l39-table">
          <thead>
            <tr>
              <th>阶段</th>
              <th>耗时</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DNS 解析</td>
              <td>{formatMs(nav.dns)}</td>
              <td>域名 → IP。localhost 没有这一步，永远 ≈ 0</td>
            </tr>
            <tr>
              <td>建立连接</td>
              <td>{formatMs(nav.connect)}</td>
              <td>TCP 握手 + TLS。真实网络下动辄上百毫秒</td>
            </tr>
            <tr>
              <td>请求 → 首字节</td>
              <td>{formatMs(nav.request)}</td>
              <td>服务器处理 + 回程网络，TTFB 的主体</td>
            </tr>
            <tr>
              <td>响应下载</td>
              <td>{formatMs(nav.response)}</td>
              <td>首字节 → HTML 下载完成</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="l39-empty">当前环境拿不到 navigation 条目。</p>
      )}
      <p className="hint">
        【注意】localhost 上这四行全接近 0——不是"网站快"，而是"没有网络可测"。
        把页面部署到真实域名（或用 DevTools 的网络限速）再测，DNS/连接才会显形。
      </p>

      {/* —— Resource Timing 表 —— */}
      <h3>Resource Timing：前 8 个资源的体积与耗时</h3>
      <div className="row">
        <button onClick={refreshResources}>刷新资源列表</button>
        <span className="l39-count">共 {performance.getEntriesByType('resource').length} 个资源，只展示前 8 个</span>
      </div>
      {resources.length === 0 ? (
        <p className="l39-empty">还没有资源记录。</p>
      ) : (
        <table className="l39-table">
          <thead>
            <tr>
              <th>资源</th>
              <th>传输大小</th>
              <th>解压后</th>
              <th>耗时</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.name}>
                <td className="l39-res-name">{shortName(r)}</td>
                <td>{r.transferSize > 0 ? `${r.transferSize} B` : '缓存/本地'}</td>
                <td>{r.decodedBodySize > 0 ? `${r.decodedBodySize} B` : '—'}</td>
                <td>{formatMs(r.duration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="hint">
        transferSize 为 0 通常意味着命中缓存或本地 dev 服务；"解压后"是 decodedBodySize，
        两者差距就是压缩（gzip/brotli）省下的流量——生产构建必须开压缩，dev 下 Vite 只对部分类型压缩。
      </p>
    </div>
  )
}

/** 毫秒格式化：小于 1 显示 <1ms，其余取整 */
function formatMs(ms) {
  return ms < 1 ? '<1ms' : `${Math.round(ms)}ms`
}
