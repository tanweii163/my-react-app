/**
 * 第 35 课 · PWA 与离线体验 —— 页面编排
 *
 * 本文件教什么：把 PWA 三件套串成一张教学页：
 * 1. manifest.webmanifest —— "可安装"的声明（名字/图标/display standalone/theme_color）；
 * 2. Service Worker 生命周期 —— install / activate / fetch 三阶段各做什么；
 * 3. 缓存策略选型 —— cache-first / network-first / stale-while-revalidate 各适合什么；
 * 4. ServiceWorkerRegister 组件 —— 真实注册入口 + 在线徽章 + 更新提示 + Cache API 演示；
 * 5. "如何真实验证离线"步骤卡 —— 生产构建 + preview + DevTools Offline。
 *
 * 【铁律】本课页面只在 dev（5173）展示讲义；SW 真正生效要在 4173（preview）实测。
 */

import ServiceWorkerRegister from '../components/lesson35/ServiceWorkerRegister.jsx'
import './lesson35.css'

export default function Lesson35() {
  return (
    <article className="page">
      <header>
        <h1>第 35 课 · PWA 与离线体验</h1>
        <p>
          PWA 三件套 = <code>manifest</code>（可安装）+ <code>Service Worker</code>（可离线的代理）
          + <code>HTTPS</code>（安全前提，localhost 豁免）。
        </p>
      </header>

      {/* 卡片一：manifest 介绍 */}
      <section className="card">
        <h2>一、manifest.webmanifest：让应用"可安装"</h2>
        <p>
          一个 JSON 文件，在 <code>index.html</code> 用
          <code>&lt;link rel="manifest" href="/manifest.webmanifest"&gt;</code> 引入。
          关键字段：<code>name / short_name</code>（安装后的名字）、<code>icons</code>（本课复用
          favicon.svg）、<code>display: standalone</code>（安装后像独立 App，没有浏览器地址栏）、
          <code>theme_color</code>（标题栏配色）。满足安装条件后，Chrome 地址栏会出现"安装"按钮。
        </p>
      </section>

      {/* 卡片二：SW 生命周期三阶段 */}
      <section className="card">
        <h2>二、Service Worker 生命周期：install → waiting → activate</h2>
        <div className="l35-phase">
          <h4>① install：预缓存</h4>
          <p>SW 文件首次被加载时触发一次。在 event.waitUntil 里把"入口壳"存进 Cache Storage；预缓存全部成功 install 才算完成。</p>
        </div>
        <div className="l35-phase">
          <h4>② waiting（可能是隐形的）：更新排队</h4>
          <p>检测到新 sw.js 字节差异时，新 SW 走 install 后不会立即接管——旧 SW 还控制着页面。新 SW 停在 waiting，直到所有标签页关闭或页面 postMessage SKIP_WAITING。</p>
        </div>
        <div className="l35-phase">
          <h4>③ activate：清旧缓存 + 接管</h4>
          <p>接管前最后机会：按缓存版本号删除旧缓存（否则离线空间越积越大）；配合 clients.claim() 立即控制已打开的页面。</p>
        </div>
        <div className="l35-phase">
          <h4>④ fetch（不是生命周期，是日常）：拦截请求</h4>
          <p>SW 被控制页面发出的每个请求都会流经 fetch 事件——在这里按请求类型套用不同缓存策略。</p>
        </div>
        <p className="hint">
          为什么 sw.js 放 public/ 根？SW 作用域 = 文件所在路径。放根目录 ⇒ 默认接管整站；
          放 /sub/sw.js 只能管 /sub 下的页面。public/ 里的文件会被 Vite 原样拷到产物根目录。
        </p>
      </section>

      {/* 卡片三：缓存策略选型表 */}
      <section className="card">
        <h2>三、缓存策略选型表</h2>
        <table className="l35-table">
          <thead>
            <tr>
              <th>策略</th>
              <th>做法</th>
              <th>适合</th>
              <th>本课对应</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>cache-first</td>
              <td>先查缓存，未命中才走网络</td>
              <td>带 hash 的静态 js/css/图片/字体——文件名即版本，命中即可信</td>
              <td>SW 里的静态资源分支</td>
            </tr>
            <tr>
              <td>network-first</td>
              <td>先走网络，失败回退缓存</td>
              <td>页面导航（HTML）、需要尽量新的数据</td>
              <td>SW 里的 navigate 分支</td>
            </tr>
            <tr>
              <td>stale-while-revalidate</td>
              <td>先回缓存，同时后台更新缓存</td>
              <td>一句话：内容可以稍旧但必须秒开的数据（如头像、文章列表）</td>
              <td>课后练习（Workbox 内置此模式）</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 卡片四：注册组件实测区 */}
      <section className="card">
        <h2>四、注册组件实测区（ServiceWorkerRegister）</h2>
        <ServiceWorkerRegister />
      </section>

      {/* 卡片五：如何真实验证离线 */}
      <section className="card">
        <h2>五、如何真实验证离线</h2>
        <ol className="l35-steps">
          <li>
            生产构建并起 preview：<code>npm run build && npm run preview -- --port 4173</code>
            （dev 下 SW 被故意禁用，必须用构建产物测）。
          </li>
          <li>
            打开 <code>http://localhost:4173/</code>，刷新一次——SW activate 并接管页面。
          </li>
          <li>
            DevTools → Network → 勾选 <strong>Offline</strong>，再刷新页面：壳来自缓存，页面照常渲染，
            徽章翻成"离线"。
          </li>
          <li>
            也可用 DevTools → Application → Service Workers 观察 SW 状态、Cache Storage 查看缓存内容。
          </li>
        </ol>
        <p className="hint">
          为什么必须 HTTPS 或 localhost？SW 能拦截全站请求，是极敏感能力——浏览器要求安全上下文
          （HTTPS）。开发期 localhost 被豁免，第 24 课讲过的 Vite 环境同理。
        </p>
      </section>

      {/* 卡片六：Lighthouse 呼应第 24 课 */}
      <section className="card">
        <h2>六、Lighthouse PWA 评分（呼应第 24 课）</h2>
        <p>
          Chrome DevTools → Lighthouse → 勾选 Progressive Web App。主要检查项：HTTPS、
          manifest 完整（name、icons ≥ 144px、start_url）、离线返回 200、注册了 SW。
          第 24 课用 <code>npm run build</code> 验证产物，这里同理：PWA 只能对"生产构建"打分，
          dev server 测不出真实表现。
        </p>
      </section>
    </article>
  )
}
