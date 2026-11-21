/**
 * 第 40 课 · 从 Mock 到真实后端 —— 页面编排（全课程最终课）
 *
 * 本文件教什么：把"换掉 Mock"这件事的完整语境摆到一张页面上：
 * 1. 启动指引卡 —— 怎么把真实后端跑起来（cd server && node server.js）、
 *    怎么用 curl 直接和它对话（绕过浏览器，看见最裸的 REST）；
 * 2. LiveBoard —— 真数据看板本体：REST 拉取 + POST 提交 + ws 推送 + 连接徽章；
 * 3. 「Mock 掩盖了什么」卡 —— 网络错误 / CORS / 并发 / 序列化，
 *    四个在 Mock 里根本不存在的问题，以及每个问题在本课的"现场位置"；
 * 4. 全课程总结卡 —— 40 课路线图一段话收尾。
 *
 * 【主题句】第 28 课把 MockSocket 的接口定好，第 40 课把实现换成真 socket，
 * 组件一行没改——Mock 与真实的边界画在哪里，决定了替换的成本有多低。
 */

import LiveBoard from '../components/lesson40/LiveBoard.jsx'
import './lesson40.css'

// 四个 Mock 里不存在的问题：每条 = Mock 的假象 → 真实世界的表现 → 本课现场
const MOCK_BLINDSPOTS = [
  {
    key: 'network',
    title: '① 网络错误',
    mock: 'Mock 的 Promise 永远成功，连"失败开关"也只是函数里一个 if，失败是排练出来的。',
    real: '真 fetch 只在网络层失败时才 reject：服务器没开、断网、超时、CORS 被拦——而且这些错误措辞含糊，需要分诊（apiClient.js 的 request 函数）。',
    scene: '现场：开着本课页面 Ctrl+C 杀掉服务器 → 徽章进入重连状态机、遥测停摆；列表给"重试"按钮。重启服务器，一切自动恢复。',
  },
  {
    key: 'cors',
    title: '② CORS 与同源策略',
    mock: 'Mock 是页面进程里的一个函数调用，"另一个源"这个概念压根不存在。',
    real: '5173 的页面请求 4310：非简单请求先发 OPTIONS 预检；服务器不回 Access-Control-Allow-Origin，浏览器就把响应扣下，JS 连错误响应体都看不到。',
    scene: '现场：注释掉 server.js 的 CORS 中间件、重启、刷新——控制台的红色报错和 Network 面板里的"(CORS error)"就是教材。',
  },
  {
    key: 'concurrency',
    title: '③ 并发',
    mock: 'Mock 的世界里只有你一个用户，任何时刻只有一条数据在流动。',
    real: '真实后端同时服务 N 个客户端：你 POST 的同时别人也在 POST；广播会扎堆到达；重拉列表可能重叠。',
    scene: '现场：开两个浏览器窗口都看 LiveBoard，A 窗口添加 → B 窗口列表自动刷新（note:created 广播）；连点添加，看 LiveBoard 用 200ms 去抖把刷新合并成一次 GET。',
  },
  {
    key: 'serialization',
    title: '④ 序列化',
    mock: 'Mock 直接传对象引用——"传过去"和"传到的"是同一个对象，改哪儿都同步。',
    real: '跨网络只有字节：发之前 JSON.stringify，收之后 JSON.parse，而且 parse 可能失败（非法字节）；请求体大小有限制（server.js 的 10kb）；字段的类型和编码服务器都要重新校验。',
    scene: '现场：apiClient.js 里 request 的每次 stringify/parse 都有 try/catch；服务器用 validateNote 把"客户端说的"重新验一遍——永远不信任客户端。',
  },
]

// 40 课路线图：按 doc/README.md 的主线分组，一段话讲完
const ROADMAP = [
  { stage: '地基（1–10）', text: 'JSX/Props/State、useEffect、Router、状态提升、useRef、Context、useReducer、自定义 Hook、渲染性能——最终合体成第一个真实小应用。' },
  { stage: '进阶（11–15）', text: '数据获取工程化、代码分割、错误边界、并发渲染、Vitest 测试——给应用装上工业级的骨架。' },
  { stage: '实战库（16–20）', text: 'TanStack Query、react-hook-form + zod、Zustand、React 19 新特性——学会借力生态，而不是事事手搓。' },
  { stage: '收官（21–25）', text: 'TypeScript、组件设计模式、动画、构建部署，到第 25 课的学习护照毕业。' },
  { stage: '工程素养（26–30）', text: '可访问性、前端安全、useSyncExternalStore 与实时数据、调试方法论——写出"别人也能用、黑客难以碰、出了错能查"的代码。' },
  { stage: '新领域（31–35）', text: 'Next.js/RSC、虚拟列表、i18n、Tailwind、PWA——把边界往外推。' },
  { stage: '贯通（36–40）', text: 'Playwright 端到端、framer-motion、SVG 可视化、Web Vitals，最后这一课：接上真实世界。' },
]

export default function Lesson40() {
  return (
    <article className="page">
      <header>
        <h1>第 40 课 · 从 Mock 到真实后端</h1>
        <p>
          40 课的终点：把假的换成真的。REST 用真 HTTP（跨源！），实时用真 WebSocket（会断！），数据会迟到、会缺席、会被拒绝——
          这正是前 39 课的 Mock 替你挡掉的全部真实。
        </p>
      </header>

      {/* 卡片一：启动指引 */}
      <section className="card">
        <h2>一、把真实后端跑起来</h2>
        <ol className="l40-steps">
          <li>
            新开一个终端，在仓库根目录执行：<code>cd server && node server.js</code>
            （不新增 npm script——本课连 package.json 都不动，命令行就是最诚实的启动方式）。
          </li>
          <li>
            用 curl 直接和服务器对话，绕过浏览器看最裸的 REST：
            <pre className="l40-cmd">
              {`curl http://localhost:4310/api/notes            # GET → 200 + 笔记数组
curl -X POST http://localhost:4310/api/notes \\  # POST → 201 + 新笔记
  -H 'Content-Type: application/json' \\
  -d '{"title":"curl 发的第一条笔记"}'
curl -X POST http://localhost:4310/api/notes \\  # 非法数据 → 400 + 中文错误
  -H 'Content-Type: application/json' \\
  -d '{"title":"  "}'`}
            </pre>
          </li>
          <li>
            打开 <code>http://localhost:5173/lesson/40</code>——注意：页面在 5173，服务器在 4310，
            <strong>端口不同就是两个源</strong>，浏览器立刻开始执行同源策略。这是本课第一现场。
          </li>
        </ol>
        <p className="hint">
          为什么服务器不挂在 5173 上？——故意的。挂在同一个端口下就没有跨源，CORS 就成了纸面知识；
          让它真实发生一次，同源策略才从名词变成手感（server.js 文件头有完整讲解）。
        </p>
      </section>

      {/* 卡片二：真数据看板 */}
      <LiveBoard />

      {/* 卡片三：Mock 掩盖了什么 */}
      <section className="card">
        <h2>三、Mock 掩盖了什么——四个 Mock 里不存在的问题</h2>
        <p>
          前 39 课的 Mock 不是偷懒，是教学隔离：先把 React 的概念一个个讲干净。但隔离也意味着，
          有四类问题从未上过桌——它们只在"真实"里发生，也只有在真实环境里才学得会：
        </p>
        <div className="l40-blinds">
          {MOCK_BLINDSPOTS.map((item) => (
            <div key={item.key} className={`l40-blind l40-blind-${item.key}`}>
              <h3>{item.title}</h3>
              <p>
                <strong className="l40-blind-label">Mock 的假象：</strong>
                {item.mock}
              </p>
              <p>
                <strong className="l40-blind-label">真实世界：</strong>
                {item.real}
              </p>
              <p className="l40-blind-scene">{item.scene}</p>
            </div>
          ))}
        </div>
        <p className="hint">
          反过来看一遍：因为第 28 课把 MockSocket 的接口（connect/close/status/on*）定得和真 WebSocket 一致，
          第 40 课的 apiClient.js 换掉实现时，看板组件的逻辑一行都不用改。
          <strong>Mock 与真实的边界画在接口上，替换成本才趋近于零</strong>——这就是"从 Mock 到真实"的全部秘密。
        </p>
      </section>

      {/* 卡片四：全课程总结 */}
      <section className="card">
        <h2>四、全课程总结——40 课路线图</h2>
        <p>
          从第 1 课的 <code>UI = f(state)</code> 到这一课的真实后端，40 课走的是同一条路：
          先把 React 的每个概念孤立地讲干净（地基），再把它放进工程环境接受考验（进阶/实战库），
          然后补上"代码之外"的素养——类型、模式、动效、部署、无障碍、安全、调试（收官/工程素养），
          最后推开边界看更大的世界（新领域），并用测试、动效、可视化、性能指标和真实后端把一切贯通。
        </p>
        <div className="l40-roadmap">
          {ROADMAP.map((item) => (
            <div key={item.stage} className="l40-roadmap-row">
              <span className="l40-roadmap-stage">{item.stage}</span>
              <span className="l40-roadmap-text">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="hint">
          结课不是结束。这门课教的是一门手艺的语法；手艺的精进只发生在一遍遍真实构建里——
          部署它、扩展它、拆了重写它、讲给别人听。第 40 课把"真实"接上了，剩下的路由你自己走。🎓
        </p>
      </section>
    </article>
  )
}
