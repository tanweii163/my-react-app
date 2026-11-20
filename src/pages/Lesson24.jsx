// 第 24 课页面 · 构建与部署
//
// 本文件教什么：
// 1. dev 与 prod 的边界：npm run dev 的一切便利（HMR、按需编译、代理、详细报错）
//    都是"开发期服务"，线上统统不存在——线上只有 dist/ 里的静态文件 + 托管平台配置。
//    所以部署前的最后一验永远是 npx vite preview（验的是产物，不是 dev server）；
// 2. 部署 = 把 dist/ 原样放到任意静态文件服务器 + 配好 SPA 路由回退，没有更多魔法；
// 3. 三种主流静态托管（Vercel / Netlify / GitHub Pages）的步骤与差异：
//    共同点是"构建命令 npm run build、产物目录 dist"，差异在回退规则怎么配；
// 4. SPA 路由回退为什么必须：本项目 main.jsx 用 <BrowserRouter>（第 3 课），
//    /lesson/24 只是前端路由——服务器上并不存在 lesson/24 这个文件。
//    直接打开/刷新这个 URL 时请求先到服务器，服务器找不到文件 → 404。
//    回退规则"找不到的路径一律回 index.html"让 HTML 先到、Router 再接管 URL 渲染 Lesson24。
//
// 页面编排：演示一 EnvDemo（环境变量）→ 演示二 BundleTips（产物知识卡）
// → build 产物卡 → 托管三卡 → 回退原理卡 → 上线 checklist。
// 数据全是模块顶部的常量数组，组件只负责渲染——这就是"页面 = 编排"的收尾示范。

import EnvDemo from '../components/lesson24/EnvDemo.jsx'
import BundleTips from '../components/lesson24/BundleTips.jsx'
import './lesson24.css'

// 三种托管的步骤概览：build 命令与产物目录完全一致，差异全在"SPA 回退怎么配"
const HOSTS = [
  {
    name: 'Vercel',
    steps: [
      '控制台从 GitHub 导入仓库（自动识别 Vite 项目）',
      'Build Command：npm run build',
      'Output Directory：dist',
      'Rewrites：{ "source": "/(.*)", "destination": "/index.html" }（面板或 vercel.json）',
    ],
    note: '对 SPA 最省心：推送即自动构建部署，回退规则一条搞定。',
  },
  {
    name: 'Netlify',
    steps: [
      '连接 Git 仓库',
      'Build command：npm run build',
      'Publish directory：dist',
      'Redirects：/* → /index.html  200（netlify.toml 或面板）',
    ],
    note: '与 Vercel 同级的好用；重定向规则里必须写 200（代理回退），写 301 会变成真跳转。',
  },
  {
    name: 'GitHub Pages',
    steps: [
      'Actions workflow（或 gh-pages 分支）里跑 npm run build',
      '子路径部署必须配 base：vite build --base=/仓库名/（否则资源 404）',
      '没有自定义回退规则 → 把 dist/index.html 复制一份为 404.html 兜底',
    ],
    note: '免费但最折腾：base 漏配资源加载 404；404.html 不配则深链接刷新就 404。',
  },
]

// 上线 checklist（完整版含逐条解释，见 doc/lesson-24.md）
const CHECKLIST = [
  'npm run lint / npm test 全绿——上线前最后一道质量门',
  'npm run build 本地成功，读一遍构建输出确认无警告',
  'npx vite preview 亲测核心交互——preview 跑的是构建产物，不是 dev server',
  '.env 里没有密钥；暴露给前端的只有 VITE_ 开头且"可公开"的变量',
  'base 路径与托管目录匹配（GitHub Pages 子路径必须 --base=/仓库名/）',
  'SPA 回退规则已配（Rewrites / Redirects / 404.html）',
  '深链接实测：浏览器直接打开 https://…/lesson/24 不 404',
  'index.html 的 <title>、favicon、meta 描述已定制',
  'Lighthouse 跑一遍，把五项分数记下来当基线，之后每次改版对比',
]

// 回退原理四步：一次刷新在"没有回退规则"和"有回退规则"两种世界里的命运
const FALLBACK_STEPS = [
  '浏览器请求 GET /lesson/24（刷新 / 直接输网址 / 分享链接都算）',
  '静态服务器在 dist/ 里找名为 lesson/24 的文件 → 不存在',
  '没有回退规则 → 返回 404 页面，用户看到白屏/报错，React 根本没机会启动',
  '有回退规则 → 返回 index.html → JS 加载后 BrowserRouter 读取 /lesson/24，路由表渲染 Lesson24',
]

function Lesson24() {
  return (
    <div className="page">
      <header>
        <h1>第 24 课：构建与部署</h1>
        <p>
          dev server 只是开发期的工作台；npm run build 之后的 dist/ 才是真实上线的你。
          本课讲清三件事：环境变量怎么安全地进前端包、构建产物里都有什么、
          以及"静态托管 + SPA 回退"这最后一公里。讲义见 <code>doc/lesson-24.md</code>。
        </p>
      </header>

      {/* 演示一：环境变量。注意本页跑在 dev（MODE=development），
          npm run build 之后这些值的 DEV/PROD 会翻转——doc 里有 build 后的实测对照 */}
      <section className="card">
        <h2>演示一 · import.meta.env：环境变量与安全红线</h2>
        <EnvDemo />
      </section>

      {/* 演示二：产物知识卡。本项目真实构建出来的文件清单与 gzip 前后大小，
          实测记录在 doc/lesson-24.md，学完对照产物目录看一遍 */}
      <section className="card">
        <h2>演示二 · dist/ 里的四件事：chunk、摇树、source map、压缩</h2>
        <BundleTips />
      </section>

      <section className="card">
        <h2>npm run build 之后，产物是什么？</h2>
        <p>
          build 做的事：JSX/TS 转译成浏览器认识的 JS → tree-shaking 摇掉没用的导出 →
          压缩混淆 → 文件名加内容 hash → 拷贝 public/ → 全部写进 <code>dist/</code>。
          部署就是把 <code>dist/</code> 里的文件原样放到任意静态文件服务器上。
        </p>
        <pre className="l24-tree">
          <code>{`dist/
├── index.html            ← 唯一入口（引用带 hash 的 assets，不缓存）
└── assets/
    ├── index-<hash>.js   ← 全部 JS：转译 + 摇树 + 压缩后的结果
    ├── index-<hash>.css  ← 全部 CSS
    └── lazy-<hash>.js    ← 动态 import() 拆出的 chunk（第 12 课的 lazy）`}</code>
        </pre>
        <p className="hint">
          本项目构建产物的真实文件清单与 gzip 前后大小，见{' '}
          <code>doc/lesson-24.md</code> 的"实测记录"一节。
        </p>
      </section>

      <section className="card">
        <h2>三种静态托管：步骤概览</h2>
        <p>
          共同三要素：构建命令 <code>npm run build</code>、产物目录 <code>dist</code>、
          SPA 回退规则。差异只在第三项怎么配。
        </p>
        <div className="l24-host-grid">
          {HOSTS.map((host) => (
            <section className="l24-host" key={host.name}>
              <h3>{host.name}</h3>
              <ol>
                {host.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="hint">{host.note}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>SPA 路由回退：为什么必须配（本项目就是活例子）</h2>
        <p>
          本项目 <code>src/main.jsx</code> 用的是 <code>&lt;BrowserRouter&gt;</code>：
          <code>/lesson/24</code> 是前端路由，服务器上并没有 lesson/24 这个文件。
          没有回退规则，任何人刷新或分享这个链接都会 404；配了回退，路由才能"深链接直达"。
        </p>
        <ol className="l24-fallback">
          {FALLBACK_STEPS.map((step, index) => (
            <li key={step}>
              <strong>第 {index + 1} 步</strong>：{step}
            </li>
          ))}
        </ol>
        <p className="hint">
          不想配回退也有替代品：<code>HashRouter</code>（URL 变成 #/lesson/24，服务器看到的
          永远是 /，天生无此问题）——代价是 URL 难看、SEO 与锚点受限。现代方案首选
          "BrowserRouter + 回退规则"。
        </p>
      </section>

      <section className="card">
        <h2>上线 checklist（速查版）</h2>
        <ul className="l24-checklist">
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="hint">
          每条的展开解释、Lighthouse 五项指标含义与本项目的优化方向，
          见 <code>doc/lesson-24.md</code>。
        </p>
      </section>
    </div>
  )
}

export default Lesson24
