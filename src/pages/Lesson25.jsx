// 第 25 课页面 · 毕业项目：学习护照
//
// 本文件教什么：
// 1. 毕业页是纯编排页：自身不持有任何 state，
//    三块内容（自检清单 / 课程总结 / 后续路线）各自独立成组件——
//    页面只决定"摆什么、按什么顺序"，这正是第 22 课"容器与展示"的收尾示范；
// 2. 页头三件套：课程名 + 三大篇章徽章 + 毕业致辞——
//    徽章是"结构导航"（点开护照就知道这门课分几段），致辞是"情绪锚点"（毕业页该有一点仪式感）。
// 讲义见 doc/lesson-25.md；勾选进度在 PassportChecklist 里持久化到 localStorage。
import PassportChecklist from '../components/lesson25/PassportChecklist.jsx'
import CourseSummary from '../components/lesson25/CourseSummary.jsx'
import RoadMap from '../components/lesson25/RoadMap.jsx'
import './lesson25.css'

// 三大篇章徽章：文案与 CourseSummary / doc/README.md 保持同源一致
const STAGE_BADGES = [
  { id: 'advanced', label: '进阶篇 · 11–15' },
  { id: 'libs', label: '实战库篇 · 16–20' },
  { id: 'final', label: '收官篇 · 21–25' },
]

function Lesson25() {
  return (
    <div className="page">
      <header>
        <div className="l25-head-row">
          <h1>第 25 课：毕业项目 —— 学习护照</h1>
          {/* role/aria：徽章是装饰性结构导航，列表语义帮助读屏器一次读完 */}
          <div className="l25-badges" role="list" aria-label="三大篇章">
            {STAGE_BADGES.map((badge) => (
              <span
                key={badge.id}
                className={`l25-badge l25-badge-${badge.id}`}
                role="listitem"
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
        <p>
          这是最后一课：没有新 API，只有一张"学习护照"——25 条"我能解释 /
          我能写出"检查项（每课至少一条）替你把整门课复盘一遍。
          讲义见 <code>doc/lesson-25.md</code>。
        </p>

        {/* 毕业致辞：学完不是终点——毕业页的情绪落点 */}
        <div className="l25-address">
          <strong>毕业致辞</strong>
          <p>
            25 课走完，你已经从第一个计数器走到了把项目部署上线。但毕业证不是终点线，
            是起跑线：这门课教的所有知识都只是"把想法变成界面"的工具，
            真正的成长发生在构建真实项目的时候——你会遇到讲义里没有的 bug，
            会被真实用户逼着做取舍，会在删掉自己三天前的代码时学会谦逊。
            去构建吧：把第 24 课部署的项目发给朋友，给本项目加一节你自己的第 26 课，
            把作品集的第一条写上今天。
          </p>
        </div>
      </header>

      {/* 三个内容组件：自检清单（有状态、可交互）→ 课程总结（纯展示）→ 后续路线（纯展示） */}
      <PassportChecklist />
      <CourseSummary />
      <RoadMap />
    </div>
  )
}

export default Lesson25
