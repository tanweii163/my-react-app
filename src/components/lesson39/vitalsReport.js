/**
 * 第 39 课 · Web Vitals 真实测量 —— 指标采集与上报模块
 *
 * 本文件教什么：
 * 1. 用官方 web-vitals 库接入五个指标：LCP / CLS / INP / FCP / TTFB
 *    （Core Web Vitals 是前三个；FCP、TTFB 是诊断用的辅助指标）；
 * 2. 按官方阈值表把数值分级：good / needs-improvement / poor；
 * 3. 库只负责"测量 + 回调"，往哪上报、怎么上报由业务层决定——
 *    本课上报到自定义回调（面板组件），并附一个 sendBeacon 生产上报示例；
 * 4. dev 环境下用带色彩的 console.log 打印，肉眼即可对照分级。
 *
 * 【铁律】onXxx() 用的是 buffered PerformanceObserver：注册时会"回放"注册之前
 * 已发生的记录，所以像本课这样在路由组件挂载后才注册，也能拿到本次加载的
 * LCP / FCP / TTFB。但 INP 必须等用户真的交互过才可能有值——没交互就是没数据，
 * 要如实展示"尚无交互"，不能造假数据。
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

/**
 * 官方阈值表（硬编码自 web.dev 的 Core Web Vitals 文档）：
 * 每个指标一个 [good 上限, poor 下限]，夹在中间就是 needs-improvement。
 * 单位：CLS 无量纲（位移分数累加值），其余都是毫秒。
 * 注意边界写法与库内部一致：value <= good 算 good，value > poor 算 poor。
 */
export const THRESHOLDS = {
  // LCP 最大内容绘制：视口内最大元素渲染完成的时刻，代表"主内容出齐"
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  // CLS 累积布局偏移：页面寿命内所有"意外位移"分数之和，0.1 ≈ 基本不跳动
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  // INP 交互到下一次绘制：整页寿命内交互响应的最差值（约第 98 百分位取法）
  INP: { good: 200, poor: 500, unit: 'ms' },
  // FCP 首次内容绘制：第一段文字/图片出现，诊断"白屏多久"（辅助指标）
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  // TTFB 首字节时间：网络 + 服务器快不快，诊断"卡在哪一环"（辅助指标）
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
}

/**
 * 阈值分级函数：good / needs-improvement / poor。
 * web-vitals 回调里的 metric.rating 其实就是按这张表打的分——这里自己再实现一遍，
 * 是为了讲清"分级规则是公开的表"，任何上报端（后端、表格工具）都能照着算。
 */
export function rateMetric(name, value) {
  const t = THRESHOLDS[name]
  if (!t || value == null || value < 0) return undefined
  if (value <= t.good) return 'good'
  if (value > t.poor) return 'poor'
  return 'needs-improvement'
}

/** 分级对应的中文标签，供面板与日志复用 */
export const RATING_LABEL = {
  good: '良好',
  'needs-improvement': '需改进',
  poor: '差',
}

/** dev 日志的色彩样式：绿/橙/红三档，一眼分出好坏 */
const RATING_COLOR = {
  good: '#0a7d3e',
  'needs-improvement': '#b45309',
  poor: '#b42318',
}

/** 数值格式化：CLS 保留 3 位小数，毫秒取整 */
export function formatValue(name, value) {
  if (value == null) return '—'
  return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`
}

/**
 * dev 环境才打印：%c 可以给同一条 console.log 的不同片段分别上色，
 * 这是浏览器控制台的原生能力，与 React 无关。
 */
function devLog(metric) {
  if (!import.meta.env.DEV) return
  const color = RATING_COLOR[metric.rating] ?? '#6b7280'
  console.log(
    `%c ${metric.name} %c ${formatValue(metric.name, metric.value)} %c ${metric.rating}`,
    'background:#1f2430;color:#fff;border-radius:4px;padding:1px 6px;',
    'color:#111827;font-weight:700;',
    `color:${color};font-weight:600;`,
  )
}

/**
 * 注册全部指标，每个都上报到同一个自定义回调 onReport。
 *
 * 【易错】React StrictMode 在 dev 下会把 effect 跑两遍：web-vitals 的 onXxx()
 * 没有配对的"注销"函数，直接注册两次就会收到两份回调。所以这里用模块级
 * 标志位保证整个页面寿命只注册一次——这也是生产代码里常见的防重手段。
 *
 * @param {(metric: import('web-vitals').Metric) => void} onReport 自定义回调
 */
export function initVitalsReport(onReport) {
  if (initVitalsReport.started) return
  initVitalsReport.started = true

  const handle = (metric) => {
    devLog(metric)
    onReport?.(metric)
  }
  // LCP/CLS/INP 用默认配置时，回调要等"页面隐藏"才触发（指标此时才"定稿"）。
  // 面板要求打开页面就显示、交互后立即更新，所以开 reportAllChanges：
  // LCP/CLS 注册时 buffered 回放立即报一次（CLS 真实值 0 就是 0）；
  // INP 初始值为 -1（不算有效值）→ 没交互依然不回调，"尚无交互"如实保留，
  // 用户交互后每次更新立即报。
  onCLS(handle, { reportAllChanges: true })
  onLCP(handle, { reportAllChanges: true })
  onINP(handle, { reportAllChanges: true })
  // FCP/TTFB 一次就定稿，默认即可
  onFCP(handle)
  onTTFB(handle)
}

/**
 * 生产上报示例（本课未实际调用，避免往不存在的接口发请求）：
 *
 * 【为什么用 sendBeacon】页面卸载（关标签页/跳转）时，普通 fetch 会被浏览器
 * 直接掐断，数据大概率发不出去；sendBeacon 是浏览器专门为"卸载时上报"设计的
 * API——放入队后就不管了，浏览器保证在页面关闭后仍把数据发完。fetch 的
 * keepalive: true 是同类兜底，但有体积上限（64KB）。
 *
 * 注意 sendBeacon 只能发 POST、拿不到响应，所以适合"发了就忘"的埋点。
 */
export function sendToAnalytics(metric) {
  const payload = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id, // 同一次加载的同名指标共享一个 id，后端据此去重/合并
    page: location.pathname,
    ts: Date.now(),
  })
  if (navigator.sendBeacon) {
    // Blob 指定 application/json，后端才能按 JSON 解析
    navigator.sendBeacon('/api/vitals', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/vitals', { method: 'POST', body: payload, keepalive: true })
  }
}
