// 第 24 课 · 演示一：环境变量（import.meta.env）
//
// 本文件教什么：
// 1. import.meta.env 是 Vite 注入的"构建时常量"：dev server 启动或 npm run build 时，
//    把 .env 文件里的值在**打包那一刻直接替换进代码**，不是运行时去读任何文件。
//    推论：改了 .env 必须重启 dev server / 重新 build 才生效，热更新不感知它（高频易错点）；
// 2. VITE_ 前缀规则：只有 VITE_ 开头的变量会被暴露给前端代码。
//    这是白名单防御：.env 里往往混着数据库密码、支付密钥这类"服务器变量"，
//    若全量注入，任何人 F12 打开控制台 console.log(import.meta.env) 就能全拿走。
//    Vite 的原则：**不主动进包，显式标 VITE_ 才放行**；
// 3. 非 VITE_ 变量去哪了：不是被加密藏起来，而是**根本没被替换**——
//    import.meta.env.DATABASE_PASSWORD 在白名单里查不到，打包时直接写成 undefined，
//    它从未进入前端包，只活在服务器 / CI 的环境里。前端拿它永远拿不到，也不该拿到；
// 4. .env 文件优先级（从低到高，后者覆盖前者）：
//      .env → .env.local → .env.[mode] → .env.[mode].local
//    npm run dev 加载 development 组，npm run build 加载 production 组——
//    所以 .env.production 的值只在构建产物里生效，dev 时看不见；
//    *.local 放"只属于我这台机器"的覆盖值，通常写进 .gitignore 不提交；
// 5. 四个内置变量：MODE（模式名）、DEV / PROD（布尔开关）、BASE_URL（部署基路径），
//    它们不需要你配置，Vite 按"当前在 dev 还是 build"自动填好。

import { useState } from 'react'

// 构建时替换：本项目没建 .env，VITE_COURSE_NAME 是 undefined → undefined 是假值 → 走 || 兜底。
// 谁在 .env 里配了 VITE_COURSE_NAME，这里就会变成谁的值——一行代码兼容"配了/没配"两种环境。
const COURSE_NAME = import.meta.env.VITE_COURSE_NAME || 'React 学习课程'

// 教学演示：故意读一个没有 VITE_ 前缀的"敏感变量"。
// 真实项目里它只在服务器上有值；前端这里拿到的是 undefined——这正是安全红线在起作用的证明。
const SECRET_FROM_SERVER = import.meta.env.DATABASE_PASSWORD

// 当前被放行进前端的 VITE_ 变量名单（本项目一个都没有，全是兜底）。
// 顺带演示一个冷知识：Object.keys(import.meta.env) 的结果 dev 和 build 不一样——
// dev 时能看到 Vite 预注入的调试字段，build 后整个对象被静态替换，只剩内置变量和白名单变量。
const exposedKeys = Object.keys(import.meta.env).filter((key) => key.startsWith('VITE_'))

// 单行表格：label + 值。tone 可选（l24-ok / l24-bad），给"安全/泄漏"两类值上色
function EnvRow({ label, value, tone }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className={tone}>{value}</td>
    </tr>
  )
}

export default function EnvDemo() {
  // 是否展开"import.meta.env 里实际有什么"的完整 key 名单
  const [showAllKeys, setShowAllKeys] = useState(false)
  const allKeys = Object.keys(import.meta.env)

  return (
    <div>
      <table className="l24-env-table">
        <tbody>
          <EnvRow
            label="import.meta.env.VITE_COURSE_NAME"
            value={import.meta.env.VITE_COURSE_NAME ?? '未配置（undefined）'}
          />
          <EnvRow
            label="页面标题（读值 + || 兜底）"
            value={COURSE_NAME}
            tone="l24-ok"
          />
          <EnvRow label="import.meta.env.MODE" value={import.meta.env.MODE} />
          <EnvRow label="import.meta.env.DEV（是否 dev）" value={String(import.meta.env.DEV)} />
          <EnvRow label="import.meta.env.PROD（是否生产构建）" value={String(import.meta.env.PROD)} />
          <EnvRow
            label="DATABASE_PASSWORD（无 VITE_ 前缀）"
            value={
              SECRET_FROM_SERVER === undefined
                ? 'undefined —— 根本没进前端包 ✅'
                : SECRET_FROM_SERVER
            }
            tone="l24-bad"
          />
        </tbody>
      </table>

      <div className="l24-keys">
        <p className="hint">
          当前白名单里有 {exposedKeys.length} 个 VITE_ 变量：{exposedKeys.join('、') || '（无）'}。
          想亲手加一个？在项目根目录建 <code>.env</code>，写一行{' '}
          <code>VITE_COURSE_NAME=我的课程</code>，然后<strong>重启 dev server</strong> 再回来看——
          热更新不感知 .env 变化，不重启永远读到旧值。
        </p>
        <button type="button" onClick={() => setShowAllKeys((v) => !v)}>
          {showAllKeys ? '收起' : '看看 import.meta.env 里实际有什么'}
        </button>
        {showAllKeys && (
          <ul className="l24-key-list">
            {allKeys.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">
          这份名单 dev 与 build 后不同：dev 里能看到 Vite 预注入的调试字段，build 后只剩内置变量 +
          白名单变量——因为打包时整个对象被静态替换成了字面量（详见 <code>doc/lesson-24.md</code>）。
        </p>
      </div>
    </div>
  )
}
