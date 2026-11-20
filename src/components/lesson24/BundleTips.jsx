// 第 24 课 · 演示二：打包产物知识卡
//
// 本文件教什么：npm run build 之后的 dist/ 里到底发生了什么——
// 1. 产物与 hash 指纹：产物文件名里的 [hash] 是**内容指纹**，内容变名字才变。
//    浏览器缓存按"文件名"命中：没改的文件（第三方库等）hash 不变 → 缓存继续命中。
//    这是"JS/CSS 敢设一年强缓存"的基础——index.html 不带 hash，必须保证每次都能拿到新的；
// 2. chunk 从哪来：入口代码 → index chunk；React.lazy(() => import('./X')) 的每个动态导入点
//    → 单独一个 chunk，访问到才下载（第 12 课 lazy 你已经在网络面板见过它）；
//    第三方依赖体量大时，可用构建配置（manualChunks 等）把 node_modules 拆成 vendors chunk，
//    让"业务代码天天变"和"依赖几乎不变"分开缓存，互不拖累；
// 3. tree-shaking（摇树）：打包器利用 ESM 的**静态结构**在编译期分析 import/export 图，
//    没被任何地方引用的导出直接不进产物。生效三条件：
//      ① 源码用 import/export（CommonJS 的 require 是运行时调用，没法静态分析）
//      ② 具名导入，而不是整包默认导入
//      ③ 依赖包自身"可摇"（package.json 的 sideEffects 声明干净，如 lodash-es）；
// 4. source map：一张"压缩后位置 → 源码位置"的映射表。
//    产物是压缩混淆过的（变量变 a/b/c、空行全无），报错堆栈人读不懂；
//    有了 map，浏览器 DevTools 和错误监控平台能把堆栈还原成你写的源码。
//    Vite build 默认**不生成** map（build.sourcemap 打开）——map 等于把未压缩源码公开发布，
//    商业项目常选"线上不出 map，错误监控平台私有上传"来两全；
// 5. gzip/brotli 一句话：产物是纯文本，托管平台按 gzip/brotli 压缩传输、浏览器解压执行，
//    体积通常再降 60–80%；npm run build 输出末尾的 gzip 列就是线上实际传输量的近似。

import { useState } from 'react'

// 知识卡数据：模块级常量——内容不会变，没必要每次渲染都重建数组（第 9 课"渲染体里别造对象"）
const CARDS = [
  {
    title: '产物与 hash 指纹',
    body:
      'dist/index.html + assets/index-[hash].js / index-[hash].css。hash 是内容指纹：' +
      '内容变名字才变，浏览器按文件名命中缓存。没改的文件 hash 不变 → 继续命中缓存，' +
      '改过的文件 hash 变 → 自动失效重新下载。这就是"静态资源敢设一年强缓存"的机制。',
  },
  {
    title: 'chunk 从哪来',
    body:
      '入口代码 → index chunk；React.lazy / 动态 import() → 每个导入点单独成 chunk、按需下载' +
      '（本项目 Lesson12 的 LazySection 就是活的例子）；第三方依赖太大时用构建配置拆出 ' +
      'vendors chunk。分包不是为了"文件好看"，是为了**缓存命中**和**首屏只加载首屏要用的代码**。',
  },
  {
    title: 'tree-shaking 的生效条件',
    body:
      'ESM 的 import/export 是编译期可分析的静态结构，打包器顺着引用图把没人用的导出删掉。' +
      '三个条件缺一不可：写 ESM 语法（别 require）、具名导入（别整包默认导入）、包本身可摇' +
      '（sideEffects 干净，选 lodash-es 这类 ESM 版）。下面的小测可以亲手翻牌验证。',
  },
  {
    title: 'source map 是什么',
    body:
      '"压缩后位置 → 源码位置"的映射表。产物被压缩混淆（变量成 a/b/c），报错堆栈没法人读；' +
      '有 map 才能在 DevTools / 错误监控里还原成源码。Vite build 默认不生成' +
      '（build.sourcemap: true 打开）——map 等于公开未压缩源码，生产排错通常靠监控平台私有上传。',
  },
  {
    title: 'gzip / brotli（一句话）',
    body:
      '产物是纯文本，托管平台默认按 gzip/brotli 压缩传输、浏览器解压执行，体积通常再降 60–80%；' +
      'npm run build 输出里每行末尾的 gzip 数字，就是线上实际传输量的近似。',
  },
]

// 摇树小测：code 用作 React key 和翻面标记（字符串稳定且唯一）
const QUIZ = [
  {
    code: "import { debounce } from 'lodash-es'",
    ok: true,
    why: 'ESM 具名导入 + 包声明干净（sideEffects）：只有 debounce 及其依赖进包，其余全被摇掉。',
  },
  {
    code: "import _ from 'lodash'",
    ok: false,
    why: '整包默认导入，且 lodash 主包是 CommonJS/UMD：打包器无法知道你用了哪些方法，只能全量进包。想摇树请换 lodash-es。',
  },
  {
    code: "const { debounce } = require('lodash')",
    ok: false,
    why: 'require 是运行时函数调用，解构发生在运行期，编译期无法静态分析 → 摇树直接失效。这是"坚持 ESM"最硬的理由。',
  },
  {
    code: "import './lesson24.css'",
    ok: false,
    why: 'CSS 导入是副作用（往页面注入样式），没有"可摇的导出"可言，整个文件照单全收。瘦身靠压缩和删未用样式，不靠摇树。',
  },
]

export default function BundleTips() {
  // 已翻开的卡片集合：Set 存 code。不可变更新（换新 Set），React 才会重渲染
  const [revealed, setRevealed] = useState(() => new Set())

  const toggle = (code) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  return (
    <div>
      <div className="l24-tip-grid">
        {CARDS.map((card) => (
          <section className="l24-tip" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </section>
        ))}
      </div>

      <section className="l24-quiz">
        <h3>小测：哪些写法能被 tree-shaking？点击翻面</h3>
        <ul>
          {QUIZ.map((item) => {
            const open = revealed.has(item.code)
            return (
              <li key={item.code}>
                <button type="button" onClick={() => toggle(item.code)}>
                  <code>{item.code}</code>
                  <span className="l24-quiz-flip">{open ? '收起' : '翻面'}</span>
                </button>
                {open && (
                  <p className={item.ok ? 'l24-ok' : 'l24-bad'}>
                    {item.ok ? '✅ 能：' : '❌ 不能：'}
                    {item.why}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
