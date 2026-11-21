// 第 27 课组件 1 · XSS 演示：React 的默认转义 vs dangerouslySetInnerHTML
//
// 本文件教什么：
// 1. React 默认是"安全"的：你在 JSX 里写 {userInput}，React 会把它当作
//    【字符串】插入 DOM（等价于 textContent），<img onerror=...> 这类内容
//    只会原样显示为文字，浏览器绝不会把它当 HTML 解析执行。
//    铁律：默认插值 = 自动转义，这是 React 送你的第一道防线。
// 2. dangerouslySetInnerHTML 是 React 的"逃生舱"：它告诉你——
//    "你要亲手绕过转义，内容由你负责"。一旦用上，React 不再保护你。
//    铁律：绝不能把用户输入直接喂给它。
// 3. 本页的"恶意演示区"遵循 sandbox 思路：只把假恶意串【当文本】展示，
//    并用注释说明"如果真的渲染会发生什么"——页面内零危险调用。
import { useState } from 'react'

// 一个"假的恶意串"：仅供展示讲解，本文件任何地方都没有把它交给
// dangerouslySetInnerHTML 或 innerHTML。把它渲染成真 HTML 的后果（注释说明，
// 不是可运行代码）：
//   如果真的执行 <img src=x onerror=alert(document.cookie)>，
//   浏览器会加载一个必然失败的图片，随后触发 onerror 里的 JS——
//   攻击者就能在你的页面上下文里偷 cookie、伪造请求、改写页面。
//   这就是存储型 XSS 的完整链路：恶意文本 → 被当 HTML → 脚本执行。
const FAKE_PAYLOAD = '<img src=x onerror="alert(你的Cookie被盗了)">'

function XssDemo() {
  const [input, setInput] = useState('')

  return (
    <div className="card">
      <h2>1 · React 默认转义：你打什么，就显示什么</h2>
      <p>
        在下面输入框里粘贴一段"像代码"的文本（例如{' '}
        <code>{'<img src=x onerror=...>'}</code>），观察它只会被当作文字显示。
      </p>
      {/* 易错点提醒：value/onChange 受控组合是第 7 课的内容，这里复用 */}
      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="试试粘贴 <img src=x onerror=...>"
          style={{ flex: 1 }}
        />
      </div>
      <p className="hint">
        你输入的原始文本（React 自动转义， safe by default）：
      </p>
      <pre className="l27-escape-box">{input || '（还没输入）'}</pre>
      {/* 关键对比：同样的内容，插值渲染——注意它仍是纯文本，不会变成真的图片标签 */}
      <p>插值渲染到段落里的效果（注意它不会"活"过来）：</p>
      <div className="l27-render-box">{input || '（还没输入）'}</div>

      <h2 style={{ marginTop: 24 }}>2 · dangerouslySetInnerHTML：逃生舱长什么样</h2>
      <p>
        React 提供的绕过转义的 API 叫 <code>dangerouslySetInnerHTML</code>，
        名字里带 dangerously 就是提醒你：用了它，转义保护关闭，内容安全性由你负责。
      </p>
      {/* sandbox 思路：下面只【展示】攻击载荷的文本和"如果渲染会发生什么"的说明，
          绝不真的调用 dangerouslySetInnerHTML 执行它。
          反面教材（不要抄）：
          <div dangerouslySetInnerHTML={{ __html: FAKE_PAYLOAD }} />
          —— 这一行如果存在，打开本页就会触发弹窗，页面被注入。 */}
      <div className="l27-payload-box">
        <strong>假想攻击载荷（仅作文本展示）：</strong>
        <pre>{FAKE_PAYLOAD}</pre>
        <p>
          <strong>如果真的把它交给 dangerouslySetInnerHTML 会发生什么：</strong>
          浏览器把这段字符串当 HTML 解析 → 解析出 img 标签 → 图片加载失败 →
          触发 onerror 里的 JavaScript → 攻击者在你的页面上下文里执行任意代码
          （偷 localStorage / cookie、伪造请求、劫持界面）。
        </p>
        <p className="hint">
          什么时候才允许用 dangerouslySetInnerHTML？只有当你能证明内容完全可信
          （例如构建期写死的富文本），且最好先经过 DOMPurify 这类库消毒。
          永远不要让它接触用户输入、接口返回的富文本、URL 参数。
        </p>
      </div>
    </div>
  )
}

export default XssDemo
