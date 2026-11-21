/**
 * 第 35 课 · 手写 Service Worker（教学版）
 *
 * 本文件教什么：
 * 1. SW 的三个生命周期阶段：install（预缓存）→ activate（清旧缓存）→ fetch（拦截请求）。
 * 2. 为什么不用"精确文件列表"预缓存：Vite 构建产物带 content hash（如 index-B3xk9.js），
 *    文件名每次构建都会变，手写列表必然过期失效。所以本课用「导航预缓存 + 运行时缓存」替代：
 *    - install 时只预缓存"入口壳" `/`（SPA 的 index.html）和少量稳定资产；
 *    - js/css 等 hash 文件在用户首次访问时被 fetch 阶段的"运行时缓存"顺手存下。
 * 3. 两种缓存策略的取舍：
 *    - 页面导航（HTML）：network-first —— 保证用户总能拿到最新入口，断网才回退缓存；
 *    - 静态资源（带 hash 的 js/css/图片）：cache-first —— hash 文件名即版本号，缓存命中即可信。
 *
 * 【铁律】SW 作用域由文件路径决定：放在 public/ 根 ⇒ 默认接管整个 origin 的所有页面。
 * 放到子目录就只能控制该子目录下的页面。
 */

// 版本号常量：改任何预缓存内容时必须手动 +1，否则 activate 清不掉旧缓存。
// 生产项目通常用构建工具把 build hash 注入这里，教学版手动维护。
const CACHE_VERSION = 'l35-v1'

// install 阶段预缓存的"稳定资产"：只放文件名不会变的入口壳。
// 【易错】不要把 /assets/index-xxxx.js 写进这里——hash 一变这个 URL 就 404，install 直接失败。
const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      // addAll 是原子的：任何一个 URL 失败，整个 install 失败（保证壳完整）。
      await cache.addAll(PRECACHE_URLS)
    })()
  )
  // 取舍：这里故意【不】调用 self.skipWaiting()。
  // - 调了：新 SW 立即接管，页面可能正被旧缓存支撑，新旧资源混用有风险；
  // - 不调：新 SW 进入 waiting 状态，等所有标签页关闭或页面 postMessage SKIP_WAITING，
  //   由页面弹出"有新版本，点击刷新"让用户决定（见 ServiceWorkerRegister.jsx）——更安全的默认。
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清理：删掉所有不属于当前版本命名的旧缓存。
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
      // clients.claim()：让 activate 后的 SW 立即接管"打开时它还没注册"的页面。
      // 首次访问时页面通常尚未被 SW 控制，没有这句，fetch 拦截要等下一次刷新才生效。
      await self.clients.claim()
    })()
  )
})

// 页面发来的 postMessage：用户点了"刷新更新"按钮 → 让 waiting 的 SW 立刻接管。
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // 只拦截同源 GET：跨域请求与非 GET（POST 等）原样放行给网络。
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // 策略一 · 导航请求 network-first：在线拿最新 HTML，断网回退缓存里的壳。
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          // 顺手更新缓存里的壳，让离线版本尽量不过期。
          const cache = await caches.open(CACHE_VERSION)
          cache.put('/', fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(request)
          return cached || caches.match('/')
        }
      })()
    )
    return
  }

  // 策略二 · 其余同源静态资源 cache-first：hash 文件名 = 内容版本，命中即可信；
  // 未命中才走网络，并把响应存入缓存供下次离线使用。
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const fresh = await fetch(request)
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, fresh.clone())
      return fresh
    })()
  )
})
