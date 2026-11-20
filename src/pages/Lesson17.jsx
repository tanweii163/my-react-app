// 第 17 课页面：react-hook-form + zod 表单方案
//
// 本文件教什么：
// 表单的"人肉成本"随字段数线性增长。本课把同一张 4 字段表单写两遍摆在一起：
//   ControlledFormEcho —— 第 1 课的纯手写受控版：每字段 value + onChange + error
//                         state，规则散落在 validate() 里，一眼看尽样板；
//   ResourceForm       —— react-hook-form（register 收集 + handleSubmit 双回调分流）
//                         + zod（规则集中声明在 schema.js，zodResolver 接线）。
// 页面本身零逻辑，只负责把两套方案排成"先手工、后机械化"的对照实验。
import ControlledFormEcho from '../components/lesson17/ControlledFormEcho.jsx'
import ResourceForm from '../components/lesson17/ResourceForm.jsx'
import './lesson17.css'

function Lesson17() {
  return (
    <div className="page">
      <header>
        <h1>第 17 课：react-hook-form + zod 表单方案</h1>
        <p>
          同一张表单写两遍：先手写受控组件（第 1 课），再交给 react-hook-form + zod
          ——体会"字段一多，样板爆炸"和"规则集中一处"的差别。
        </p>
      </header>
      <main>
        <ControlledFormEcho />
        <ResourceForm />
        <section className="card">
          <h2>两套方案怎么选</h2>
          <ul>
            <li>字段很少（一两个）、规则一眼看完：手写受控完全够用，别为了用库而用库；</li>
            <li>字段多、规则多、要异步提交/重置/默认值编排：RHF + zod，规则集中、组件干净；</li>
            <li>zod schema 是纯 JS：同一份规则可以给单元测试、类型推导、甚至后端复用；</li>
            <li>
              代价：多一层抽象（register 的 ref 机制、formState 的 Proxy 订阅），
              排查问题要多读一点库的文档。
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Lesson17
