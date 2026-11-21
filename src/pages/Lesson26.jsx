// 第 26 课页面 · 可访问性 (a11y)
//
// 本文件教什么：
// 页面照旧只做编排，不持有任何演示的状态（第 25 课"纯编排页"的纪律延续）：
//   卡〇  三条铁律——本课主线，先立起来再看演示；
//   卡一  无障碍标签页——页面扮演"调用方"（第 22 课同款视角），
//         用升级版 Tabs 的组合 API 拼标签，API 与第 22 课完全一致，
//         说明"a11y 升级"可以做到对调用方零破坏；
//   卡二  无障碍对话框——焦点管理四件套的现场（打开移入 / Tab 困住 /
//         Esc 关闭 / 关闭归还）；
//   卡三+卡四  aria-live 播报与三重编码（LiveRegion 自带两张卡，直接整块摆放）。
// 每张卡都写了"键盘路线"提示：本课的验收标准就是——全程不碰鼠标，走完每一张卡。
import AccessibleTabs from '../components/lesson26/AccessibleTabs.jsx'
import AccessibleModal from '../components/lesson26/AccessibleModal.jsx'
import LiveRegionDemo from '../components/lesson26/LiveRegion.jsx'
import './lesson26.css'

function Lesson26() {
  return (
    <div className="page">
      <header>
        <h1>第 26 课：可访问性 (a11y)</h1>
        <p>
          a11y 是"accessibility 首尾字母中间夹 11 个字母"的缩写：让残障用户
          （视障、听障、行动障碍）、临时受限用户（骨折的手、强光下的屏幕）和
          特殊环境用户（读屏器、黑白打印）都能用你的界面。本课不聊"要不要做"，
          只练三件最基本也最值钱的事。讲义见 <code>doc/lesson-26.md</code>。
        </p>
      </header>

      {/* ── 卡〇：三条铁律。本课所有代码都是这三句话的展开。 ── */}
      <section className="card">
        <h2>本课主线：三条铁律</h2>
        <ol className="l26-rules">
          <li>
            <strong>语义化 HTML 优先</strong>：原生 <code>&lt;button&gt;</code> 优于{' '}
            <code>&lt;div onClick&gt;</code>——聚焦、Enter/Space 激活、读屏器念"按钮"，
            这些行为写一行 ARIA 也换不来。
          </li>
          <li>
            <strong>ARIA 是补充不是替代</strong>：role/aria 只把结构"翻译"给读屏器，
            不产生任何行为——键盘导航、焦点管理都得亲手写。
          </li>
          <li>
            <strong>键盘可达是底线</strong>：Tab / 方向键 / Esc / Enter / Space
            能完成一切核心操作。做不到这条，上面两条都是空话。
          </li>
        </ol>
        <p className="hint">
          验收方式：下面每张卡的"键盘路线"都要能不碰鼠标走通。想体验读屏器，
          macOS 上 Cmd+F5 唤起 VoiceOver，用 VO+方向键（Ctrl+Option+方向键）漫游。
        </p>
      </section>

      {/* ── 卡一：无障碍标签页。页面是调用方——组合 API 与第 22 课一字未变， ──
          但 Tab 键只在整组停一站、方向键在组内导航、Home/End 跳两端。 */}
      <section className="card">
        <h2>无障碍标签页：roving tabindex 与方向键导航</h2>
        <p className="hint">
          键盘路线：<kbd>Tab</kbd> 进入标签组（只停一次）→ <kbd>←</kbd> <kbd>→</kbd>{' '}
          逐个换标签（面板跟着切）→ <kbd>Home</kbd>/<kbd>End</kbd> 跳到第一个/最后一个 →{' '}
          再按 <kbd>Tab</kbd> 离开组、进入当前面板。
        </p>
        <AccessibleTabs defaultValue="why" label="React 可访问性要点">
          <AccessibleTabs.List>
            <AccessibleTabs.Tab id="why">为什么</AccessibleTabs.Tab>
            <AccessibleTabs.Tab id="how">怎么做</AccessibleTabs.Tab>
            <AccessibleTabs.Tab id="check">自检清单</AccessibleTabs.Tab>
          </AccessibleTabs.List>
          <AccessibleTabs.Panel id="why">
            约 8% 的男性用户有色觉障碍，还有大量读屏器、纯键盘、语音控制用户。
            a11y 不是合规负担：语义化结构同时改善 SEO、可维护性和所有人在
            非理想环境（强光、单手、拥挤地铁）下的体验——" curb cut effect"：
            为轮椅用户削的路缘坡，最后方便的是推车、拉箱子的一切人。
          </AccessibleTabs.Panel>
          <AccessibleTabs.Panel id="how">
            先用对 HTML（button/a/input/label），再补 ARIA（角色 + 状态 + 关系），
            最后键盘实测：只用 Tab、方向键、Esc、Enter、Space 把核心流程走一遍。
            顺序不能反——ARIA 盖在错误的结构上，只是把错误翻译得更响亮。
          </AccessibleTabs.Panel>
          <AccessibleTabs.Panel id="check">
            每个图标按钮有可访问名称（aria-label）？弹窗有焦点四件套？
            动态更新有 live region？状态不只靠颜色？焦点样式看得见
            （从不 outline:none 裸奔）？表单每个输入框有 label？——
            六个都打勾，你就超过了大多数真实项目。
          </AccessibleTabs.Panel>
        </AccessibleTabs>
      </section>

      {/* ── 卡二：无障碍对话框。打开后焦点应自动落在弹窗上（读屏器会报"退款政策"）， ──
          Tab 会在弹窗内的三个可聚焦元素间转圈，Esc / 关闭按钮 / 点遮罩都能关，
          关闭后焦点回到触发按钮——用读屏器或按 Tab 即可亲自验证"回家"。 */}
      <section className="card">
        <h2>无障碍对话框：焦点四件套</h2>
        <p className="hint">
          键盘路线：<kbd>Tab</kbd> 到"申请退款"按钮 → <kbd>Enter</kbd> 打开
          （焦点自动进弹窗）→ <kbd>Tab</kbd>/<kbd>Shift</kbd>+<kbd>Tab</kbd> 在弹窗内转圈，
          永远出不去（focus trap）→ <kbd>Esc</kbd> 关闭 → 焦点回到触发按钮。
        </p>
        <AccessibleModal title="申请退款" buttonText="申请退款">
          <p>请在下方填写退款原因，我们会在 3 个工作日内处理。</p>
          <div className="l26-form-row">
            <label htmlFor="refund-reason">退款原因</label>
            <input
              id="refund-reason"
              type="text"
              placeholder="例如：商品与描述不符"
            />
          </div>
          <div className="row">
            <button type="button" className="l26-btn">
              提交申请
            </button>
            <button type="button" className="l26-btn l26-btn-ghost">
              取消
            </button>
          </div>
        </AccessibleModal>
      </section>

      {/* ── 卡三 + 卡四：aria-live 播报对比 & 三重编码（组件自带两张卡） ── */}
      <LiveRegionDemo />
    </div>
  )
}

export default Lesson26
