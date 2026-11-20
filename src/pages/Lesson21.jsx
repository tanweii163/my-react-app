// 第 21 课页面 · React + TypeScript 入门
//
// 本文件教什么：
// 1. JS 页面直接用 TS 组件：本文件是 .jsx，却 import 了三个 .tsx 组件——
//    Vite 看到扩展名就自动用 esbuild 把 TS "剥掉类型"编译成 JS，浏览器拿到的
//    和普通组件没有任何区别。所以"要不要上 TS"不影响运行，只影响开发体验；
// 2. ★ 关键认知：Vite 原生编译 TS，但**不做类型检查**。esbuild 转译时只删类型、
//    不看对错——类型写错了页面照样跑。类型错误只在两个地方报：
//    编辑器（实时红色波浪线 + 悬停提示）和命令行 `npx tsc --noEmit`（CI 用的关卡）。
//    本课 tsconfig 开了 strict 模式，这三行命令就是本课的"单元测试"；
// 3. 页内用 <pre> 摆了同一个 Badge 组件的 JS / TS 声明对比——
//    差别只在"有没有合同"，以及拼错属性名时谁先知道（见第四张卡片）。
//
// 一个诚实的边界（渐进迁移的现实）：本页是 .jsx，TS 组件被 JS 文件调用时，
// 调用方传的 props **不受**类型检查——合同只对 .tsx 的调用方生效。
// 所以真实项目迁移到一半的仓库里，"TS 组件 + JS 调用方"只是半保护状态，
// 要把调用方也改成 .tsx 才算迁移完最后一公里（doc/lesson-21.md 的迁移策略节）。

import { useState } from 'react'
// 显式写全 .tsx 扩展名（本项目惯例）：强调"这是 TS 源文件"，也让"Vite 负责编译"这件事看得见。
// 类型零配置：没有 ts-loader、没有 babel 插件——Vite 原生支持 .ts/.tsx。
import Badge from '../components/lesson21/Badge.tsx'
import EventDemo from '../components/lesson21/EventDemo.tsx'
import GenericList from '../components/lesson21/GenericList.tsx'
import './lesson21.css'

// —— 演示一的状态放在页面里（Badge 本体保持"给什么画什么"的纯展示性）——
// 注意：这里是 .jsx，useState('success') 没有类型加持，variant 实际是 string——
// 想让这个 useState 也被约束成 'success' | 'warning' | 'error'，得把页面迁成 .tsx。
const VARIANTS = ['success', 'warning', 'error']

// —— 演示三的两种数据：形状完全不同（数字 id 的词表 / 字符串 id + 多字段的学员表），
// 同一个 GenericList 零改动。注：纯字符串数组（['React', 'Vite']）没有 id，
// 进不了 GenericList 的 extends Item 约束——真实项目的常见做法是先 map 成带 id 的对象。
const WORDS = [
  { id: 1, word: 'React' },
  { id: 2, word: 'TypeScript' },
  { id: 3, word: 'Vite' },
]

const STUDENTS = [
  { id: 's-01', name: '小张', score: 92 },
  { id: 's-02', name: '小王', score: 67 },
  { id: 's-03', name: '小李', score: 45 },
]

// 分数 → 徽章语义色：把业务规则提成小函数，renderItem 里保持一行调用
function scoreVariant(score) {
  if (score >= 90) return 'success'
  if (score >= 60) return 'warning'
  return 'error'
}

// —— JS vs TS 声明对比（第四张卡片的 <pre> 内容）——
// 模板字符串里的 ` 和 ${ 要转义（\`、\${），否则会被 JS 当成插值执行
const JS_SNIPPET = `// Badge.jsx —— props 靠注释"口头约定"
function Badge({ label, variant = 'success' }) {
  return <span className={\`l21-badge l21-badge--\${variant}\`}>{label}</span>
}

// <Badge variant="sucess" />  ← 拼错了？编辑器毫无反应，样式悄悄不对
// <Badge />                   ← 少传 label？渲染出空标签，页面照常运行
// 这类错误要等"肉眼看到不对劲"才被发现`

const TS_SNIPPET = `// Badge.tsx —— props 是"书面合同"
interface BadgeProps {
  label: string
  variant?: 'success' | 'warning' | 'error'
}
function Badge({ label, variant = 'success' }: BadgeProps) {
  return <span className={\`l21-badge l21-badge--\${variant}\`}>{label}</span>
}

// <Badge variant="sucess" />  ← 编译错误：不在三个合法值里
// <Badge />                   ← 编译错误：label 是必选属性
// dev server 都不用启动，编辑器 / tsc 直接拦下`

function Lesson21() {
  // 演示一：当前展示的 variant（.jsx 里没有联合类型约束——见文件头注释的"诚实边界"）
  const [variant, setVariant] = useState('success')

  return (
    <div className="page">
      <header>
        <h1>第 21 课：React + TypeScript 入门</h1>
        <p>
          TypeScript = JavaScript + 类型层：类型只在编译时存在，运行时被剥得干干净净。
          本课学三件事——给 props 立合同（interface + 联合字面量）、给事件标类型、
          用泛型写出"喂什么类型都能用"的组件；顺便认清 Vite 的角色：
          它负责编译 TS，但类型检查归编辑器和 tsc。讲义见 <code>doc/lesson-21.md</code>。
        </p>
      </header>
      <main>
        <div className="card">
          <h2>心智模型：类型是编译时的合同，运行时不存在</h2>
          <p>
            .tsx 文件在浏览器里拿到之前就被 esbuild 剥掉了全部类型——
            所以 TS 不会让程序变慢，但它也<strong>不会自动帮你抓 bug</strong>：
            Vite 的转译只删类型、不查对错，类型错误页面照样跑。
            想让合同真正生效，要靠编辑器的实时检查（写代码时红线）
            和 <code>npx tsc --noEmit</code>（CI 上的关卡，本项目已配好 strict 模式）。
            下面三个演示的组件都是 .tsx——去源文件里看类型写法，
            在编辑器里故意写错一个 prop，就能看到合同咬人。
          </p>
        </div>

        <div className="card">
          <h2>演示一 · Badge：给 props 立合同</h2>
          <p>
            variant 的合法值只有三个（联合字面量类型），label 是必选、size 可选、
            variant/size 都有默认值。看 <code>src/components/lesson21/Badge.tsx</code> 的
            interface 写法，再点按钮切换右下角徽章：
          </p>
          <div className="l21-badge-row">
            <Badge label="构建通过" variant="success" />
            <Badge label="有警告" variant="warning" />
            <Badge label="构建失败" variant="error" />
            {/* 不传 variant / size：走解构默认值 success / md */}
            <Badge label="默认值徽章" />
          </div>
          <div className="row">
            {VARIANTS.map((v) => (
              <button key={v} type="button" onClick={() => setVariant(v)}>
                切到 {v}
              </button>
            ))}
            <Badge label={`当前 variant：${variant}`} variant={variant} />
          </div>
        </div>

        <div className="card">
          <h2>演示二 · EventDemo：事件类型 + useState 泛型</h2>
          <p>
            输入框变化是 <code>ChangeEvent&lt;HTMLInputElement&gt;</code>、
            表单提交是 <code>FormEvent&lt;HTMLFormElement&gt;</code>、
            点击是 <code>MouseEvent&lt;HTMLButtonElement&gt;</code>；
            <code>useState&lt;User | null&gt;(null)</code> 把"还没拿到用户"写进类型，
            用 user 前必须判空——null 崩溃被提前到编译期。动手试：
          </p>
          <EventDemo />
        </div>

        <div className="card">
          <h2>演示三 · GenericList：泛型组件，喂什么类型都能用</h2>
          <p>
            组件只要求"列表项有 id"（<code>&lt;T extends Item&gt;</code>），
            遍历、key、空态它管；每项画成什么样，调用方的 renderItem 回调管。
            下面两个列表的数据形状完全不同（数字 id 的词表 / 字符串 id 的学员表），
            同一个组件零改动；学员列表还把演示一的 Badge 嵌进了 renderItem——
            类型化组件照样自由组合：
          </p>
          <div className="row">
            <GenericList items={WORDS} renderItem={(w) => <strong>{w.word}</strong>} />
            <GenericList
              items={STUDENTS}
              emptyText="没有学员"
              renderItem={(s) => (
                <span>
                  {s.name}{' '}
                  <Badge label={`${s.score} 分`} variant={scoreVariant(s.score)} size="sm" />
                </span>
              )}
            />
          </div>
        </div>

        <div className="card">
          <h2>同一个组件的 JS vs TS 声明对比</h2>
          <p>
            差别只在"有没有合同"：JS 版的 props 约定只活在注释和自觉里，
            TS 版把字段、必选/可选、合法值全部写进类型——谁用错了，写错的瞬间就被拦下。
          </p>
          <div className="l21-compare">
            <div>
              <span className="l21-compare-tag">JavaScript</span>
              <pre>{JS_SNIPPET}</pre>
            </div>
            <div>
              <span className="l21-compare-tag l21-compare-tag--ts">TypeScript</span>
              <pre>{TS_SNIPPET}</pre>
            </div>
          </div>
          <p>
            收尾提醒：本课三个 .tsx 组件的类型正确性，来自仓库根目录
            <code> npx tsc --noEmit </code>零输出（tsconfig 已开 strict）——
            这条命令不产出任何文件，只当"类型检查器"用；Vite 在这条命令之外，
            自顾自地把类型剥掉编译，两边互不知道对方的存在。
          </p>
        </div>
      </main>
    </div>
  )
}

export default Lesson21
