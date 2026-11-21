/**
 * 第 35 课 · SW 注册组件（ServiceWorkerRegister）
 *
 * 本文件教什么：
 * 1. 仅生产环境注册 SW：import.meta.env.PROD 判断（呼应第 24 课的环境变量）。
 *    【必讲易错】dev 下 Vite 依赖 HMR 精确热更新，如果 SW 在 5173 上缓存了模块请求，
 *    HMR 更新会被旧缓存挡住，页面"改了代码不生效"——这是 PWA 开发最经典的坑。
 *    所以规则是：dev 完全不注册，只在 npm run build && preview 的产物里启用。
 * 2. 更新提示 UI：registration.waiting 存在 ⇒ 有新 SW 在排队 ⇒ 显示"点击刷新"，
 *    点击后向它 postMessage('SKIP_WAITING')，SW 内部调 self.skipWaiting() 立即接管。
 * 3. 在线/离线徽章：navigator.onLine + window 的 online/offline 事件。
 *    【易错】onLine 只读一次是不够的，必须监听事件才能翻转 UI。
 * 4. Cache API 直接演示：把一条"用户数据"写进 caches，再读出来——
 *    Cache Storage 不只给 SW 用，页面主线程也能读写，这就是"离线数据可用"的底层能力。
 */

import { useEffect, useState } from 'react'

// 更新消息常量：与 public/sw.js 里的 message 监听约定一致。
const SKIP_WAITING = 'SKIP_WAITING'

export default function ServiceWorkerRegister() {
  // SW 的 registration 对象：注册结果的句柄，waiting 字段告诉我们是否有待接管的更新。
  const [registration, setRegistration] = useState(null)
  // online/offline 徽章：初始值取 navigator.onLine，之后靠事件翻转。
  const [online, setOnline] = useState(navigator.onLine)
  // Cache API 演示：写入/读取的结果文本。
  const [cacheDemo, setCacheDemo] = useState('（点击按钮体验 Cache API）')

  useEffect(() => {
    // ① 仅生产环境注册。dev 下这个分支直接短路，HMR 不受任何干扰。
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg)
          // 注册完成后浏览器会异步去服务器检查 sw.js 是否有字节差异 → 触发更新流程。
          // 有差异时新 SW 走 install → 停在 waiting，此时 reg.waiting 才非空。
          reg.addEventListener('updatefound', () => setRegistration(reg))
        })
        // 注册失败不阻断页面：PWA 是渐进增强，SW 挂了应用照常在线运行。
        .catch((err) => console.warn('[lesson35] SW 注册失败（页面仍可在线使用）:', err))
    }

    // ② online/offline 事件：浏览器网络状态变化时触发，据此翻转徽章。
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ③ 用户点击"刷新更新"：通知 waiting 的 SW 立即接管，然后刷新页面加载新资源。
  const applyUpdate = () => {
    registration?.waiting?.postMessage(SKIP_WAITING)
    // skipWaiting 后旧 SW 释放控制权需要一点时间，监听 controllerchange 再刷新最稳。
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    })
  }

  // ④ Cache API 演示：写一条用户数据进缓存 → 再读出来渲染。
  const runCacheDemo = async () => {
    try {
      const cache = await caches.open('l35-user-data')
      // Cache Storage 存的是 Response 对象，任何数据先包成 Response 再 put。
      await cache.put(
        '/api/me',
        new Response(JSON.stringify({ name: '小React', role: 'offline-learner' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
      const cached = await cache.match('/api/me')
      const user = await cached.json()
      setCacheDemo(`已写入并读回缓存：${user.name}（${user.role}）——断网后这段数据依然在。`)
    } catch (err) {
      setCacheDemo(`Cache API 演示失败：${err.message}`)
    }
  }

  return (
    <>
      {/* 在线/离线徽章：role="status" 让屏幕阅读器也能听到状态翻转（呼应第 26 课） */}
      <p
        className={`l35-badge ${online ? 'l35-badge-online' : 'l35-badge-offline'}`}
        role="status"
      >
        {online ? '🟢 在线' : '🔴 离线（内容来自缓存）'}
      </p>

      {import.meta.env.PROD ? (
        <p className="hint">SW 已注册（生产构建）。当前 controller：{navigator.serviceWorker.controller ? '有 ✅' : '暂无（首次访问，activate 后接管）'}</p>
      ) : (
        <p className="hint">
          当前是 dev 模式：<strong>故意不注册 SW</strong>——否则缓存会搅乱 HMR。请用
          <code>npm run build && npm run preview</code> 体验真实离线。
        </p>
      )}

      {/* 更新提示：waiting 非空 ⇒ 有新版本在排队 */}
      {registration?.waiting && (
        <div className="card l35-update">
          🔔 检测到新版本（新 SW 正在 waiting）。{' '}
          <button type="button" onClick={applyUpdate}>
            点击刷新更新
          </button>
        </div>
      )}

      <div className="row">
        <button type="button" onClick={runCacheDemo}>
          演示：把用户数据写进 Cache API
        </button>
        <span className="hint">{cacheDemo}</span>
      </div>
    </>
  )
}
