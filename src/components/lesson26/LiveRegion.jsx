// 第 26 课 · 可访问性 ③ —— aria-live 动态播报 + 状态的三重编码
//
// 本文件教什么：
// 一、动态更新对读屏用户默认是"静音"的：文字变了、列表变了，屏幕上看得见，
//     读屏器一声不吭——除非你提前圈一块"直播区"告诉它：这的内容会变，变了请播报。
//     这就是 aria-live，只有两档，选择标准是"这条消息配不配打断别人"：
//       polite    —— 排队播报：等读屏器把当前的话说完再插播。90% 的动态更新用这档。
//       assertive —— 插播打断：立刻切断当前播报。只留给错误、紧急、限时操作。
//     两条使用铁律（都是"不遵守就静音"级别）：
//       ① 先挂载、后更新：live region 第一帧就要在 DOM 里，之后只改文字；
//         消息到达那一刻才挂载的区域，读屏器常常当它不存在。
//       ② 换文字才会再播报：内容与上次一模一样，多数读屏器不再出声——
//         想再次提醒就换内容（本例给每单通知加序号就是这个原因）。
// 二、"不能只靠颜色传达状态"：约 8% 男性有不同形式的色觉障碍，黑白打印、
//     强光看屏、低端墨水屏也都会"吃掉"颜色。规则：颜色 + 图标 + 文字，
//     至少两重编码，颜色永远只是锦上添花的那一重。
//     本文件给同一份服务器状态做了两版 UI：反例（只有色点）与正解（三重编码），
//     再配一个 grayscale(1) 滤镜开关，一键切换"黑白视图"亲眼对比。

import { useEffect, useRef, useState } from 'react'

// 演示用服务器列表：三台机器，一台可以"宕机"，状态在 正常/宕机 间切换
const SERVERS = [
  { id: 'web-01', name: 'web-01 · 北京' },
  { id: 'web-02', name: 'web-02 · 上海' },
  { id: 'db-01', name: 'db-01 · 广州' },
]

export default function LiveRegionDemo() {
  // —— 第一部分：aria-live 对比 ——
  const [notice, setNotice] = useState('还没有新通知') // polite 区的内容
  const [urgent, setUrgent] = useState('暂无警报') // assertive 区的内容
  // 定时器 id 收进 ref：卸载时清掉，防止"页面走了、回调还在 setState"（第 2 课铁律）
  const noticeTimerRef = useRef(null)
  const urgentTimerRef = useRef(null)
  const parcelNoRef = useRef(0) // 每单序号 +1：文字每次不同，读屏器才会重新播报（铁律②）

  // 卸载清理：返回的函数在组件卸载时执行——定时器是最典型的"必须还的债"。
  useEffect(
    () => () => {
      clearTimeout(noticeTimerRef.current)
      clearTimeout(urgentTimerRef.current)
    },
    [],
  )

  // 模拟异步通知：真实世界的消息不会在点击的同一毫秒到达——
  // 正是这个"1 秒延迟"让 live region 有了存在意义：更新发生时用户焦点在别处。
  const shipParcel = () => {
    parcelNoRef.current += 1
    const no = parcelNoRef.current
    clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => {
      setNotice(`第 ${no} 单包裹已发出：从杭州仓出发，预计三天送达`)
    }, 1000)
  }

  const failPayment = () => {
    clearTimeout(urgentTimerRef.current)
    urgentTimerRef.current = setTimeout(() => {
      setUrgent('支付失败：订单超时未支付，商品已释放给排队买家')
    }, 1000)
  }

  // —— 第二部分：三重编码 ——
  const [downServer, setDownServer] = useState(null) // null = 全部正常；否则是宕机机器的 id
  const [gray, setGray] = useState(false) // grayscale 滤镜开关 = 一键"变成色盲用户"

  const servers = SERVERS.map((server) => ({ ...server, ok: server.id !== downServer }))

  return (
    <>
      {/* ── 卡一：polite vs assertive ── */}
      <section className="card">
        <h2>aria-live：让读屏器"听见"更新</h2>
        <p>
          点按钮 → 模拟 1 秒网络延迟 → 消息到达。视觉上你看见文字变了；
          开着读屏器（macOS：Cmd+F5 唤起 VoiceOver）时，<code>aria-live</code>{' '}
          区域的变化会被自动播报——这就是两条演示的唯一差别所在。
        </p>

        <div className="row">
          <button type="button" className="l26-btn" onClick={shipParcel}>
            模拟：包裹发货通知（polite）
          </button>
          <button type="button" className="l26-btn" onClick={failPayment}>
            模拟：支付失败警报（assertive）
          </button>
        </div>

        {/* polite 区：role="status" 是 aria-live="polite" + aria-atomic="true" 的官方简写，
            这里写全属性便于教学。注意：这两个 div 从第一帧就渲染在页面里——
            之后点一百次按钮也只是改文字，永远不挂载/卸载（铁律①）。 */}
        <div className="l26-live l26-live-polite" role="status" aria-live="polite">
          <strong>polite（排队播报）</strong>
          <p>{notice}</p>
        </div>

        {/* assertive 区：显式写 aria-live="assertive"，配 aria-atomic="true"
            表示"播报就播整块内容，别只念变化的部分"。官方简写是 role="alert"。
            只留给错误/紧急——滥用插播等于对读屏用户大喊大叫。 */}
        <div className="l26-live l26-live-urgent" aria-live="assertive" aria-atomic="true">
          <strong>assertive（打断插播）</strong>
          <p>{urgent}</p>
        </div>
      </section>

      {/* ── 卡二：不能只靠颜色传达状态 ── */}
      <section className="card">
        <h2>三重编码：颜色 + 图标 + 文字</h2>
        <p>
          先点"注入故障"，再开"黑白视图"——左边的反例瞬间变成"三台机器一模一样"，
          右边的正解靠图标形状和文字照样分得出谁宕机。色盲用户看到的
          <strong>从来都是</strong>黑白视图那一版。
        </p>

        <div className="row">
          <button type="button" className="l26-btn" onClick={() => setDownServer('db-01')}>
            注入故障：db-01 宕机
          </button>
          <button type="button" className="l26-btn" onClick={() => setDownServer(null)}>
            全部恢复
          </button>
          {/* 开关按钮（toggle button）模式：同一按钮两种状态，用 aria-pressed 告诉
              读屏器当前是"按下"还是"弹起"——比换按钮文字更稳（文字变了语义也变了）。 */}
          <button
            type="button"
            className="l26-btn"
            aria-pressed={gray}
            onClick={() => setGray((value) => !value)}
          >
            黑白视图模拟：{gray ? '开' : '关'}
          </button>
        </div>

        {/* 滤镜只套在"展示板"上，按钮区域不套——开关自己不能被自己弄瞎。 */}
        <div className={gray ? 'l26-board-row l26-grayscale' : 'l26-board-row'}>
          {/* 反例：状态只用颜色传达。色点是无文字无语义的 span，
              读屏用户得到的是一片空白，色觉障碍用户得到的是三颗一样的点——
              双重出局，这就是"只靠颜色"的全部下场。 */}
          <div className="l26-board">
            <h3>❌ 反例：只靠颜色</h3>
            <ul className="l26-server-list">
              {servers.map((server) => (
                <li key={server.id} className="l26-server">
                  <span className="l26-server-name">{server.name}</span>
                  <span className={server.ok ? 'l26-dot l26-dot-ok' : 'l26-dot l26-dot-down'} />
                </li>
              ))}
            </ul>
          </div>

          {/* 正解：颜色 + 图标 + 文字，三重编码。丢掉任何一维（色盲丢了颜色、
              读屏器丢了图形），剩下两维照样把状态说清楚。 */}
          <div className="l26-board">
            <h3>✅ 正解：三重编码</h3>
            {/* 顺手把两半课接起来：整块清单是 polite live region——
                状态变化读屏用户也听得见。代价是每次变化整表重读（3 台机器）；
                生产里机器多了会改成只播一行摘要（"db-01 宕机"）——粒度取舍见 doc。 */}
            <ul className="l26-server-list" aria-live="polite">
              {servers.map((server) => (
                <li key={server.id} className="l26-server">
                  <span className="l26-server-name">{server.name}</span>
                  <span className={server.ok ? 'l26-status l26-status-ok' : 'l26-status l26-status-down'}>
                    {/* 图标对读屏器是噪音（文字已经说了状态，再念个"对勾"是干扰），
                        aria-hidden 让它只服务眼睛——这是"装饰性内容对辅助技术隐身"的标准写法。 */}
                    <span aria-hidden="true">{server.ok ? '✓' : '✕'}</span>
                    {server.ok ? '运行中' : '宕机'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
