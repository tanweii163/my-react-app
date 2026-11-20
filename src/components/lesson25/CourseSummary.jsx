// 第 25 课 · CourseSummary —— 课程总结卡：三大篇章结构图 + "学完你能做什么"
//
// 本文件教什么：
// 1. 结构图可以完全用 JSX + CSS 画——不需要图片库或图表库：
//    篇章是一个个"块"，块与块之间用带 ↓ 的连接条表达"主线递进"，
//    颜色/缩进表达"地基 → 三大篇章 → 毕业"的层次，纯 CSS 就够；
// 2. 文案复用 doc/README.md 的课程主线（单一事实来源）：
//    讲义、总目录、页面三处讲同一套篇章故事，学生在哪里看到都一致；
// 3. 本组件无 state——它是"展示型组件"（第 22 课术语）：
//    数据进来、界面出去，复杂的都在样式里。
import { Fragment } from 'react'

// 三大篇章的结构数据：文案取自 doc/README.md 的"课程主线"。
// canDo 就是每篇章那句"学完你能做什么"——总结要具体到能力，不是罗列课名。
const STAGES = [
  {
    id: 'base',
    tag: '地基',
    title: '基础篇 · 第 1–10 课',
    line: 'JSX/Props/State → useEffect → Router → 状态提升 → useRef → Context → useReducer → 自定义 Hook → 性能 → 综合实战',
    canDo: '独立完成一个真实小应用——第 10 课的学习笔记（CRUD + 持久化 + 防抖搜索）就是你的第一个完整作品。',
  },
  {
    id: 'advanced',
    tag: '进阶篇',
    title: '进阶篇 · 第 11–15 课',
    line: '数据获取工程化 → 按需加载 → 错误兜底 → 并发渲染 → 测试',
    canDo: '把"能跑的 demo"升级成"可靠的工程"：请求不竞态、大列表不卡输入、出错有兜底、改动有测试护航。',
  },
  {
    id: 'libs',
    tag: '实战库篇',
    title: '实战库篇 · 第 16–20 课',
    line: 'TanStack Query → react-hook-form + zod → Zustand → React 19 → 综合实战 II',
    canDo: '按状态类型选对工具：服务器态交给 Query、全局态交给 Zustand、表单交给 RHF+zod、提交体验用 React 19——第 20 课看板就是一次四库联装。',
  },
  {
    id: 'final',
    tag: '收官篇',
    title: '收官篇 · 第 21–25 课',
    line: 'TypeScript → 组件设计模式 → 动画与过渡 → 构建与部署 → 毕业',
    canDo: '给代码上类型护栏、用模式组织结构、做出动效，并把项目真正部署上线——从"会写"到"能交付"。',
  },
]

export default function CourseSummary() {
  return (
    <section className="card l25-summary">
      <h2>🗺️ 课程总结：25 课的主线</h2>
      <p className="hint">
        结构图与 doc/README.md 的"课程主线"同源：一段地基铺路，三大篇章登山。
        每个篇章回答同一个问题——<strong>学完它，你能做什么？</strong>
      </p>

      {/* 纯 JSX/CSS 结构图：块与块之间插一条 ↓ 连接条。
          Fragment 占位不带真实 DOM，key 挂在它头上——列表项仍有稳定的 key */}
      <div className="l25-map">
        {STAGES.map((stage, index) => (
          <Fragment key={stage.id}>
            {index > 0 && (
              <div className="l25-map-arrow" aria-hidden="true">
                ↓
              </div>
            )}
            <div className={`l25-stage l25-stage-${stage.id}`}>
              <div className="l25-stage-head">
                <span className={`l25-stage-tag l25-stage-tag-${stage.id}`}>
                  {stage.tag}
                </span>
                <strong>{stage.title}</strong>
              </div>
              <p className="l25-stage-line">{stage.line}</p>
              <p className="l25-stage-can">
                <span className="l25-can-label">学完你能做什么：</span>
                {stage.canDo}
              </p>
            </div>
          </Fragment>
        ))}
        <div className="l25-map-arrow" aria-hidden="true">
          ↓
        </div>
        <div className="l25-stage l25-stage-grad">
          🎓 毕业：学习护照上的 25 格全部盖章
        </div>
      </div>
    </section>
  )
}
