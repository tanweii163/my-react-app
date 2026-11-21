// 第 27 课页面 · 前端安全
//
// 本文件教什么：页面是纯编排层（同第 25 课的模式）——自己不持有 state，
// 把三个安全主题组件按"XSS 转义 → URL 注入 → 信任边界"的递进顺序摆好。
// 这条顺序本身就是教学线：先理解 React 的默认保护，再看保护覆盖不到的
// 两个洞（URL、绕过转义的 API），最后建立"数据进门先查证件"的全局意识。
// 讲义见 doc/lesson-27.md。
import XssDemo from '../components/lesson27/XssDemo.jsx'
import UrlSafety from '../components/lesson27/UrlSafety.jsx'
import TrustBoundary from '../components/lesson27/TrustBoundary.jsx'
import './lesson27.css'

function Lesson27() {
  return (
    <div className="page">
      <header>
        <h1>第 27 课：前端安全 —— XSS、URL 注入与信任边界</h1>
        <p>
          安全不是"黑客炫技"，是每个日常写法的选择：这一课讲清楚 React 为什么
          默认帮你转义、哪些地方这个保护会失效（dangerouslySetInnerHTML、
          javascript: 链接）、以及四条必须校验的"信任边界"。
          讲义见 <code>doc/lesson-27.md</code>。
        </p>
      </header>

      <XssDemo />
      <UrlSafety />
      <TrustBoundary />

      {/* 本课收尾：一句话原则，供回顾时快速抓住重点 */}
      <div className="card l27-takeaway">
        <strong>本课一句话：</strong>
        默认相信 React 的转义；任何"绕过默认"的写法（dangerouslySetInnerHTML、
        动态 href、localStorage / URL / postMessage / npm 包里的数据）都要过
        白名单校验——<strong>数据进门先查证件</strong>。
      </div>
    </div>
  )
}

export default Lesson27
