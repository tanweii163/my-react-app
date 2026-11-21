// 第 27 课组件 3 · 信任边界：哪些数据"生来不可信"
//
// 本文件教什么：
// 1. 信任边界（trust boundary）：数据从"能被攻击者影响的地方"跨进你的代码
//    的那条线。跨线的数据必须校验——不管它看起来多正常。
// 2. 四条最常见的边界，每一条都对应真实事故模式：
//    - localStorage：用户可以用开发者工具随手改（呼应第 18 课：我们的
//      待办清单就存在那里），读出来的东西要当"用户输入"重新校验；
//    - URL 参数：?user=xxx 人人可编辑，构造恶意链接发给受害者是攻击标配；
//    - postMessage：跨窗口消息必须校验 event.origin，否则任意网页都能
//      给你发消息冒充可信来源；
//    - 依赖供应链：你 npm install 的每一个包都是别人写的代码在你页面运行。
import { useState } from 'react'

// 四条信任边界清单：每条 = 数据来源 + 风险 + 校验动作
const BOUNDARIES = [
  {
    id: 'localstorage',
    icon: '💾',
    title: 'localStorage 内容不可信',
    risk: '用户随时可在开发者工具里改写它；旧数据可能是被篡改过的（呼应第 18 课：我们的待办就存在这里）。',
    action: '读取后按 schema 校验类型与取值范围，非法值回退默认；不要把 localStorage 里的东西直接塞进 dangerouslySetInnerHTML。',
  },
  {
    id: 'url',
    icon: '🔗',
    title: 'URL 参数不可信',
    risk: '?user=xxx 任何人都能改；攻击者会把恶意链接发给受害者点开（反射型 XSS 的经典入口）。',
    action: 'useSearchParams 读出的值一律当用户输入：校验白名单、转义展示、URL 域名过 isSafeUrl。',
  },
  {
    id: 'postmessage',
    icon: '📨',
    title: 'postMessage 必须校验 origin',
    risk: '不校验 event.origin，任何网站的页面都能 window.open 你的页面并给你发消息冒充"可信父窗口"。',
    action: '监听 message 时先比对 event.origin 是否在白名单，再校验数据结构，最后才使用。',
  },
  {
    id: 'supply',
    icon: '📦',
    title: '依赖供应链不可信',
    risk: 'npm install 的每个包都会在你的用户浏览器里运行；恶意包/被劫持的维护者账号是真实发生过的事故。',
    action: 'npm audit 定期扫已知漏洞；提交锁文件（package-lock.json）让安装可复现；警惕 install/postinstall 等生命周期脚本；新依赖先看维护活跃度与下载量。',
  },
]

function TrustBoundary() {
  const [openId, setOpenId] = useState(null)

  return (
    <div className="card">
      <h2>4 · 信任边界清单：数据进门先查证件</h2>
      <p className="hint">
        点击每张卡片展开"为什么危险 / 怎么防"。共同铁律：
        <strong>跨过信任边界的数据 = 用户输入，必须校验后再用。</strong>
      </p>
      <div className="l27-boundary-list">
        {BOUNDARIES.map((b) => {
          const open = openId === b.id
          return (
            <div key={b.id} className={`l27-boundary ${open ? 'l27-boundary-open' : ''}`}>
              {/* 交互演示：手风琴式展开，第 14 课条件渲染的复用 */}
              <button
                type="button"
                className="l27-boundary-head"
                onClick={() => setOpenId(open ? null : b.id)}
                aria-expanded={open}
              >
                <span aria-hidden="true">{b.icon}</span> {b.title}
                <span className="l27-arrow" aria-hidden="true">{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <div className="l27-boundary-body">
                  <p><strong>为什么危险：</strong>{b.risk}</p>
                  <p><strong>防御动作：</strong>{b.action}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TrustBoundary
