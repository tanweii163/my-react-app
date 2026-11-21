// 第 27 课组件 2 · URL 安全：javascript: 协议注入与白名单校验
//
// 本文件教什么：
// 1. HTML 里凡是能放 URL 的地方（a href、img src、iframe src、form action…）
//    都可能被塞进 javascript: 伪协议——用户点了链接，脚本就在你的页面里执行。
//    这是最经典也最容易被漏掉的注入入口，因为"它看起来只是个链接"。
// 2. 防御思路：白名单，不是黑名单。校验协议必须是 http / https / mailto
//    之一，其余（javascript:、data:、vbscript:）一律拦截。
//    铁律：黑名单永远漏（攻击者会写 JaVaScRiPt:、java\tscript: 绕过大小写
//    和控制符过滤），白名单只要列全就稳。
// 3. React 不会替你校验 href：<a href={userUrl}> 里塞 javascript: 
//    照样危险——插值只转义"HTML 结构"，不校验"URL 语义"。
import { useState } from 'react'

// 白名单协议校验函数：本课核心代码，值得抄进自己的项目
// 返回 true 表示"这个 URL 可以安全地放进 href / src"
function isSafeUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') return false
  try {
    // 用 URL 构造函数解析，而不是手写字符串匹配——
    // 它会正确处理大小写、空白、控制字符（如 javascript\u0000: 的花招）
    const parsed = new URL(url, 'https://example.com')
    // 相对地址解析后协议继承 base 的 https，天然通过
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    // 解析失败 = 不是合法 URL = 不放行
    return false
  }
}

function UrlSafety() {
  const [url, setUrl] = useState('javascript:alert(1)')
  const safe = isSafeUrl(url)
  const origin = url.trim().startsWith('javascript:') || url.trim().startsWith('data:')

  return (
    <div className="card">
      <h2>3 · javascript: URL 注入：白名单校验</h2>
      <p>
        下面输入框预填了一个恶意 URL。<code>&lt;a href&gt;</code> 里的
        javascript: 会让"点链接"变成"执行脚本"——React 不会帮你拦。
      </p>
      <div className="row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1 }}
          placeholder="输入任意 URL，如 https://... 或 javascript:alert(1)"
        />
      </div>
      <p>
        校验结果：
        <span className={`l27-verdict ${safe ? 'l27-ok' : 'l27-bad'}`}>
          {safe ? '✅ 放行（http / https / mailto）' : '🚫 拦截（协议不在白名单）'}
        </span>
      </p>
      {/* 防御落地方式一：渲染前校验，不通过就不渲染成可点链接 */}
      {safe ? (
        <a href={url} onClick={(e) => { if (url.trim() === '') e.preventDefault() }}>
          打开这个链接（已通过校验）
        </a>
      ) : (
        <span className="hint">
          已拦截，不渲染成 &lt;a&gt;。原文按文本展示： <code>{url}</code>
          {origin && '（这就是经典注入串——点下去本来会执行脚本）'}
        </span>
      )}
      <p className="hint">
        防御落地方式二：即使放行，也永远不要渲染用户提供的 <code>javascript:</code>{' '}
        或 <code>data:</code>（data:text/html 同样能执行脚本）。白名单是唯一可靠策略。
      </p>

      <h3>&lt;img src&gt; 场景</h3>
      <p>
        img 的 src 塞 javascript: 在现代浏览器大多不再执行脚本，但会变成
        "图片加载失败"的注入面（旧浏览器/某些环境仍可利用），所以同样要过白名单。
        演示：恶意串被拦截时显示占位，不放行：
      </p>
      <div className="row" style={{ alignItems: 'center' }}>
        {safe ? (
          <img src={url} alt="用户提供的图片（URL 已过白名单）" width={80} height={80} />
        ) : (
          <div className="l27-blocked-img" aria-label="URL 被拦截，不渲染 img">
            🚫 已拦截
          </div>
        )}
        <span className="hint">
          校验不过就不渲染 &lt;img&gt;——比"渲染了但失败"更干净，也不给攻击者探测空间。
        </span>
      </div>
    </div>
  )
}

export default UrlSafety
