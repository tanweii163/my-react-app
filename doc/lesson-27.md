# 第 27 课 · 前端安全：XSS、URL 注入与信任边界

## 学习目标

完成本课后，你应该能够：

1. 说清 React 默认转义的原理：JSX 插值 `{userInput}` 编译后是**字符串**（走 `textContent` 路径），不是 HTML——`<img onerror=...>` 粘进输入框只会显示为文字；
2. 理解 `dangerouslySetInnerHTML` 为什么叫 "dangerously"：它关掉转义保护，把安全性责任交还给你，并知道什么情况下才允许碰它（内容完全可信 + 消毒库）；
3. 会写 URL 白名单校验函数：`http / https / mailto` 之外一律拦截，堵住 `javascript:` 伪协议在 `<a href>`、`<img src>` 里的注入；
4. 建立**信任边界**意识：localStorage、URL 参数、postMessage、npm 依赖——跨过这四条线的数据生来不可信，进门先校验；
5. 了解 CSP（内容安全策略）能防什么、不能防什么，把它当纵深防御的一层而不是唯一防线。

本课对应的示例代码：

- `src/components/lesson27/XssDemo.jsx` —— React 默认转义对照演示 + dangerouslySetInnerHTML 原理区（sandbox 思路：恶意串只作文本展示，页面内零危险调用）
- `src/components/lesson27/UrlSafety.jsx` —— `isSafeUrl` 白名单校验函数 + `<a href>` / `<img src>` 两个场景实测
- `src/components/lesson27/TrustBoundary.jsx` —— 四条信任边界手风琴清单卡
- `src/pages/Lesson27.jsx` —— 纯编排页，按"转义 → URL 注入 → 信任边界"递进排列
- 样式在 `src/pages/lesson27.css`（`l27-` 前缀，不与 App.css 的通用类冲突）

## 核心概念

### React 为什么默认安全：插值是字符串，不是 HTML

JSX 写 `<p>{userInput}</p>`，Babel 编译后大致是：

```js
React.createElement('p', null, userInput)
// 渲染时等价于：p.textContent = userInput
```

关键在于 `textContent`：**给 DOM 的文本节点赋值，浏览器不会解析其中的标签**。所以用户输入 `<img src=x onerror=alert(1)>`，页面上出现的就是这段原样文字——脚本永远不会"活"。这是框架送你的第一道防线，也是 React 相比手拼 `innerHTML` 字符串最大的安全红利。

**保护何时失效？** 只要你主动绕过它：

```jsx
// 反面教材，不要抄：
<div dangerouslySetInnerHTML={{ __html: userInput }} />
<a href={userUrl}>点我</a>
```

第一条把字符串重新变回 HTML（转义被关闭）；第二条不涉及 HTML 结构所以转义帮不上忙，但 URL 本身可以携带 `javascript:` 伪协议。**框架只保护"插值 = 文本"这一条路，你开了别的门，就得自己装门禁。**

### 白名单，不是黑名单

校验 URL 协议时，黑名单思路是"拦掉 `javascript:`"——但它永远漏：攻击者会写 `JaVaScRiPt:`（大小写）、`java\tscript:`（控制字符）、`data:text/html,...`（换载体）。白名单思路是"只放行 `http` / `https` / `mailto`"，其余一律拒绝。白名单只要列全就稳，黑名单永远在追赶。本课的 `isSafeUrl` 用 `new URL()` 解析而不是手写正则，就是为了正确处理大小写、空白和控制字符这些花招：

```js
function isSafeUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') return false
  try {
    const parsed = new URL(url, 'https://example.com')
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

### 信任边界：数据进门先查证件

**信任边界**是"能被攻击者影响的数据"跨进你代码的那条线。跨线数据必须校验，不管它看起来多正常：

| 边界 | 为什么不可信 | 校验动作 |
|---|---|---|
| localStorage | 用户可随时在开发者工具改写；旧数据可能被篡改过（第 18 课的待办清单就存在这里） | 按 schema 校验类型与范围，非法值回退默认 |
| URL 参数 | `?user=xxx` 任何人可编辑，构造恶意链接发受害者是攻击标配 | 当作用户输入：白名单校验、转义展示 |
| postMessage | 不校验 origin，任何网站都能开窗口冒充可信父窗口 | 先比对 `event.origin`，再校验数据结构 |
| npm 依赖 | 每个包都在你的用户浏览器里运行，维护者账号被劫持是真实事故 | `npm audit`、提交锁文件、警惕 install 脚本 |

### CSP 一段导论：能防什么，不能防什么

**内容安全策略（CSP）**是 HTTP 响应头（或 meta 标签）里的一串指令，告诉浏览器"本页只允许从这些来源加载脚本/样式/图片、只允许执行这些类型的脚本"。它能显著缩小 XSS 的爆炸半径：配上 `script-src 'self'` 和禁止内联脚本后，注入的 `<script>` 或 `onerror=` 属性**即使被解析也不会执行**，因为来源不在白名单。它**不能**防的：你不该渲染却渲染出去的内容本身（比如把用户输入当文本展示是 React 在防，不是 CSP）；`javascript:` 链接的部分场景（CSP 的 `script-src` 不约束 `<a href>` 导航）；以及应用层的逻辑漏洞（越权、CSRF 需要另外的手段）。**CSP 是纵深防御的第二层保险丝，不是第一道门——第一道门永远是：不把不可信数据当 HTML/代码。**

### 真实事故一句话

- **npm 恶意包事件（泛指，如 event-stream 2018、colors/faker 2022）**：维护者账号被劫持或故意投毒，数百万周下载量的包被塞进窃取代码，装上即中招。
- ** Britannica / 各大站存储型 XSS（泛指）**：评论/资料字段没消毒就存库再原样渲染，一条评论毒倒所有打开页面的用户。
- **postMessage 不校验 origin（历史通病）**：大量站点监听 message 不看来源，攻击页面 `window.open` 后伪造消息操纵目标站逻辑。

## 代码导读

### XssDemo.jsx —— 对照实验：同一个输入，两种命运

组件分两段。第一段是受控输入框（第 7 课的模式），输入内容用两条路径展示：`<pre>` 原样文本 + `<div>{input}</div>` 插值渲染——**两条路径都安全**，这是"默认转义"的直观证明。第二段讲 `dangerouslySetInnerHTML`：这里遵循 **sandbox 思路**——假恶意串 `FAKE_PAYLOAD` 只作为文本出现在红框演示区里，"如果真的渲染会发生什么"完整写在注释里（解析 → img 加载失败 → onerror 执行 → 偷 cookie），**页面内零危险调用**。教学上，"看见弹药 + 讲清引信 + 不点火"比真的点火更适合课堂。

设计取舍：反面教材代码放在注释而不是可运行代码里，因为这个教学项目会被部署，任何一行真调用都会把课堂变成事故现场。

### UrlSafety.jsx —— 一把白名单钥匙开两个锁

`isSafeUrl` 是本课唯一要求"抄进自己项目"的函数。组件演示两个场景：`<a href>`——校验不过就不渲染成链接，原文按文本展示；`<img src>`——校验不过渲染一个 🚫 占位块。两个场景的共同取舍是 **"不渲染"优于"渲染了但失败"**：不渲染不给攻击者任何探测空间，也让用户明确看到"这个输入被拦了"。输入框预填 `javascript:alert(1)`，页面加载即呈现"拦截"状态，方便截图讲解。

### TrustBoundary.jsx —— 清单即知识

四条边界做成手风琴卡（第 14 课条件渲染的复用）：每张卡 = 数据来源 + 为什么危险 + 防御动作。折叠态让清单一眼可扫，展开态承载细节——清单组件的通用形态，值得迁移到你自己的项目（部署检查清单、code review 清单同理）。

### Lesson27.jsx —— 页面即教学线

纯编排页（同第 25 课模式），三个组件按 **转义（默认保护）→ URL 注入（保护失效处）→ 信任边界（全局意识）** 排列，页面底部一张 takeaway 卡收口全课原则。

## 动手试一试

1. 在 XSS 演示区输入 `<img src=x onerror=alert(1)>`，打开开发者工具 Elements 面板，找到渲染它的 DOM 节点——观察文本节点里 `&lt;img` 的转义痕迹，理解"显示为文字"的底层原因。
2. 给 `isSafeUrl` 加一条规则：额外放行 `tel:` 协议（电话链接），并在浏览器里验证 `tel:123` 放行、`data:text/html,hi` 仍拦截。
3. 在第 18 课的待办应用里加一层"读取校验"：从 localStorage 读出的每条 todo，校验 `text` 必须是字符串且长度 ≤ 200，非法条目丢弃——体验"写进去的也要防读出来的"。

## 易错点

1. **现象**：输入 `<b>加粗</b>` 后页面上真的出现了加粗文字。**原因**：你用了 `dangerouslySetInnerHTML`（或框架外的 innerHTML）。插值永远不解析标签，出现解析就是绕过了转义。
2. **现象**：链接 `href` 塞了 `javascript:alert(1)`，点了没反应但也没报错，于是以为安全。**原因**：现代浏览器部分场景会拦截执行，但旧环境/嵌入式 WebView 仍会执行——"这次没炸"不等于"安全"，必须靠白名单校验而不是赌浏览器行为。
3. **现象**：手写正则 `/^javascript:/i` 拦截后仍被绕过。**原因**：攻击者用大小写、前导空白、控制字符（`java\0script:`）变形；正则黑名单追不完，要用 `new URL()` 解析后比对协议白名单。
4. **现象**：localStorage 里存的用户昵称显示了奇怪样式/弹窗。**原因**：存入时没消毒、读出时当 HTML 渲染（呼应第 18 课）。localStorage 不是"自家数据"，是跨信任边界的持久化输入。
5. **现象**：装了个 star 很多的 npm 包，CI 里 `npm audit` 爆红却选择忽略。**原因**：audit 报的是已知漏洞，红 = 有公开利用路径；先升级/换包再上线，锁文件（package-lock.json）必须提交，保证团队装到同一份被审过的代码。

## 自测题

1. React 里 `{userInput}` 插入的 `<img onerror=...>` 为什么不会执行？
2. `isSafeUrl` 为什么用 `new URL()` 而不是正则匹配字符串？
3. CSP 能不能防止你把用户输入交给 `dangerouslySetInnerHTML` 渲染出来的文本注入？请分"能防什么 / 不能防什么"回答。
4. postMessage 监听里，收到消息后的前三步应该做什么？

<details>
<summary>答案</summary>

1. 因为 JSX 插值编译后是字符串，渲染走 `textContent` 路径，浏览器不把文本节点内容解析为 HTML，标签只显示为文字。
2. `new URL()` 按标准解析 URL，正确处理大小写、空白、控制字符等变形；正则黑名单容易漏掉 `JaVaScRiPt:`、`java\0script:` 之类绕过写法，而白名单比对解析出的 `protocol` 一步到位。
3. 能防：不在白名单来源的脚本（含注入的 `<script src>` 和大部分内联脚本）不会执行，缩小爆炸半径。不能防：内容本身被当作 HTML 渲染造成的非脚本危害（虚假内容、钓鱼布局）、`<a href="javascript:...">` 导航场景、应用逻辑漏洞。所以第一道门仍是不让不可信数据进 `dangerouslySetInnerHTML`。
4. ① 校验 `event.origin` 是否在可信来源白名单；② 校验数据结构/字段符合预期 schema；③ 都通过后才使用数据。
</details>

## 下一课预告

第 28 课：实时通信 —— WebSocket 与实时数据流。当数据不再是"你请求它才来"，而是"服务器主动推给你"（聊天室、协作编辑、行情推送），组件的生命周期与状态管理会迎来新的挑战：连接谁来管、断了怎么重连、消息怎么去重。
