// 第 22 课页面 · 组件设计模式
//
// 本文件教什么：
// 三种经典模式各占一卡，每卡走同一条叙事线：
//   它解决什么 → 现场演示（真的能点） → "什么时候用它"的判断。
// 页面自己只做编排，不持有任何模式的状态——逻辑全在三个组件文件里：
//   ① Tabs（组合组件）：本页面就是"调用方"，用 Tabs.List / Tabs.Tab / Tabs.Panel
//     的 JSX 拼出标签内容——组合组件的用法长什么样，看本文件的卡片一。
//   ② RenderPropsDemo（render props）：同一个 Toggle 配出台灯和密码框两种皮肤。
//   ③ StopwatchContainer / StopwatchMerged（容器/展示）：同一秒表的分离版与合并版。
// 最后一卡是选型结论：今天的默认答案是 Hooks + 组合，
// HOC / render props / 容器组件都进了"库源码认读区"。

import Tabs from '../components/lesson22/Tabs.jsx'
import RenderPropsDemo from '../components/lesson22/RenderProps.jsx'
import StopwatchContainer, { StopwatchMerged } from '../components/lesson22/ContainerPresenter.jsx'
import './lesson22.css'

function Lesson22() {
  return (
    <div className="page">
      <header>
        <h1>第 22 课：组件设计模式</h1>
        <p>
          逻辑复用与结构复用的三代答案：组合组件、render props、容器/展示分离。
          每张卡片都能点，最后一卡给出今天的选型结论。
          讲义见 <code>doc/lesson-22.md</code>。
        </p>
      </header>

      <main>
        {/* ── 卡片一：组合组件。注意这里的 JSX 就是"调用方视角"—— ──
            四个组件 import 进来的只有一个 Tabs，子组件全靠挂在父对象上的静态属性；
            Tab 和 Panel 之间没有传过任何 props，激活状态走 Context（第 6 课）。 */}
        <section className="card">
          <h2>① 组合组件：结构复用，Context 当隐形线</h2>
          <p>
            父组件 Tabs 只管 activeId；子组件由调用方用 JSX 随意拼装——
            加一个标签就是多一行 <code>&lt;Tabs.Tab&gt;</code>，面板想放哪就放哪。
          </p>
          <Tabs defaultValue="what">
            <Tabs.List>
              <Tabs.Tab id="what">是什么</Tabs.Tab>
              <Tabs.Tab id="where">常见于哪</Tabs.Tab>
              <Tabs.Tab id="cost">代价</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel id="what">
              把"一家人"组件（Tabs、手风琴、菜单）的内部结构交给调用方拼装：
              父组件管状态，子组件之间零 props，靠 Context 共享激活状态。
            </Tabs.Panel>
            <Tabs.Panel id="where">
              Radix UI、Ant Design、MUI 的 Tabs / Accordion / Dropdown
              几乎都是这个形状——你天天在用，只是没拆开看过。
            </Tabs.Panel>
            <Tabs.Panel id="cost">
              状态藏在父组件里，调用方拿不到 activeId（要受控就得加 value/onChange，
              见"动手试一试"）；子组件必须包在 &lt;Tabs&gt; 里，单独用会抛错——设计使然。
            </Tabs.Panel>
          </Tabs>
          <p className="l22-verdict">
            <strong>什么时候用它：</strong>
            做"结构由调用方决定"的一家人 UI（Tabs、Accordion、Select、Dialog 内容区）——
            这是 2026 年写 UI 库的标准姿势。
          </p>
        </section>

        {/* ── 卡片二：render props。同一个 Toggle，台灯和密码框两种皮肤。 ── */}
        <section className="card">
          <h2>② render props：把渲染权交给调用方</h2>
          <p>
            行为组件只提供"状态 + 操作"（on / toggle），通过函数 prop 递出去；
            数据来源写在参数表上，一眼可查——这正是它当年取代 HOC 的理由。
          </p>
          <RenderPropsDemo />
          <p className="l22-verdict">
            <strong>什么时候用它：</strong>
            需要把"一份行为"配出多种皮肤，或作为库作者开放渲染结构给用户时
            （表格列渲染、虚拟列表行渲染）。自己写业务代码时，这类逻辑壳子
            今天默认写成自定义 Hook（useToggle），不需要函数 prop。
          </p>
        </section>

        {/* ── 卡片三：容器/展示分离 vs 合并版。两个秒表各跑各的，行为完全一样。 ── */}
        <section className="card">
          <h2>③ 容器/展示分离：退场的模式，不死的思想</h2>
          <p>
            左边是 2015–2020 的标准分工：容器管状态与副作用，纯展示组件接收什么画什么
            （还被 HOC 活化石 withLog 包了一层，控制台可见挂载日志）；
            右边是 Hooks 时代大家直接写的合并版。行为一模一样，差别只在代码组织。
          </p>
          <div className="l22-stopwatch-grid">
            <div>
              <p className="l22-vs-tag">分离版：容器（状态）+ 纯展示（视图）</p>
              <StopwatchContainer />
            </div>
            <div>
              <p className="l22-vs-tag">合并版：一个组件全包（今天的主流）</p>
              <StopwatchMerged />
            </div>
          </div>
          <p className="l22-verdict">
            <strong>什么时候用这套思想：</strong>
            逻辑要被多处复用、或要单独测试时——今天把它抽成自定义 Hook（容器转世），
            组件只负责画（展示转世）。"容器组件"这个物种灭绝了，
            "逻辑与视图分离"这条原则永生。
          </p>
        </section>

        {/* ── 选型结论卡：三代模式各自的今天。 ── */}
        <section className="card">
          <h2>选型结论：2026 年的默认答案</h2>
          <ul className="l22-verdict-list">
            <li>
              <strong>逻辑复用 → 自定义 Hook。</strong>
              无包装、无嵌套、来源清晰，HOC 和 render props 的接力棒最终交给了它。
            </li>
            <li>
              <strong>结构复用 → 组合组件 + Context。</strong>
              一家人 UI 的标准姿势；Context 负责"平级兄弟读父状态"（第 6 课的复用）。
            </li>
            <li>
              <strong>HOC → 认得即可。</strong>
              redux 的 connect、老 react-router 的 withRouter、各种 withXxx——
              看到组件进组件出的函数，知道是它在做横切注入。
            </li>
            <li>
              <strong>render props → 认得即可。</strong>
              downshift、表格列渲染、children 当函数——看到"函数 prop 递 UI"知道是它。
            </li>
            <li>
              <strong>容器/展示 → 思想并入 Hook + 组件。</strong>
              再看到"页面组件 + useXxx() 分层"，你已经认识它的转世。
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Lesson22
