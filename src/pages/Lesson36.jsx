// 第 36 课页面 · E2E 测试 Playwright
//
// 本文件教什么：
//   1. 本课的"教材"不在浏览器里，在终端里：e2e/*.spec.js 由 Playwright 驱动真实 Chromium 执行，
//      页面本身只负责讲清楚三件事——E2E 在测试金字塔里的位置、怎么跑、每个 spec 各测什么；
//   2. 页面上不放可跑测试：教学页没有交互 demo，卡片里的命令都要去终端敲——
//      E2E 的价值（真实浏览器、真实时序、真实持久化）恰恰是页面内嵌 demo 给不了的；
//   3. 页面底部贴了一段【真实测试输出】（跑 npx playwright test 的原样摘要）：
//      讲义和现实对得上，是这套课程的底线——你跑出来的数字应该和它一致（速度列除外）。
import './lesson36.css'

// 测试金字塔数据：越往上越慢、越脆、越贵，所以数量越少；宽度的递减就是数量的递减
const PYRAMID = [
  { key: 'e2e', label: 'E2E · 关键用户路径（本课）', cls: 'l36-pyramid-e2e' },
  { key: 'integration', label: '集成 / 组件测试 · 第 15 课 vitest', cls: 'l36-pyramid-integration' },
  { key: 'unit', label: '单元测试 · 纯函数 / Hook（最多）', cls: 'l36-pyramid-unit' },
]

// 常用命令：跑法不同，用途不同
const COMMANDS = [
  { cmd: 'npx playwright test', note: '无头模式跑全部 9 个用例，跑完给摘要' },
  { cmd: 'npx playwright test --headed', note: '打开真浏览器窗口，肉眼看它点击/输入' },
  { cmd: 'npx playwright test --ui', note: 'Playwright UI 模式：可单步、看时间线、逐步回放' },
  { cmd: 'npx playwright test e2e/lesson32.spec.js', note: '只跑一个 spec 文件' },
  { cmd: 'npx playwright test --trace on', note: '录 trace，失败后 npx playwright show-trace 回放案发经过' },
  { cmd: 'npx playwright show-report', note: '跑完看 HTML 报告（耗时、步骤、截图）' },
]

// 每个 spec 各测什么：文件 → 用例列表（数量与 e2e/ 目录严格一致，改了测试记得同步这张表）
const SPECS = [
  {
    file: 'e2e/home.spec.js',
    tests: [
      '首页课程目录渲染 ≥ 39 张课程卡片（40 课 / 39 卡：第 3 课的教材就是 App.jsx/Home.jsx 本身，无独立页面）',
      '点第 1 课链接到达 /lesson/1（URL + 标题双断言）',
      'NavLink 激活态：当前页导航项带 active 类，非当前项不带（正反向成对）',
    ],
  },
  {
    file: 'e2e/lesson1.spec.js',
    tests: [
      '计数器：点 +5 后大数字从 0 变 5（先钉初始值，防假阳性）',
      '待办：添加一条后"共 N 项"计数从 2 到 3，新条目可见',
    ],
  },
  {
    file: 'e2e/lesson32.spec.js',
    tests: [
      '裸版：100000 行全部渲染进 DOM（一行没省，卡顿的元凶）',
      '虚拟版：DOM 里只有不到 50 行——jsdom 没有视口，这是单元测试做不到的 E2E 价值示范',
    ],
  },
  {
    file: 'e2e/lesson33.spec.js',
    tests: [
      '切 English 后整页标题变英文（黑盒断言用户看见的文案）',
      '刷新后语言保持（localStorage 持久化：真刷新清空内存 state）',
    ],
  },
]

export default function Lesson36() {
  return (
    <div className="page">
      <header>
        <h1>第 36 课 · E2E 测试 Playwright</h1>
        <p>
          单元测试（第 15 课）证明"零件是对的"，E2E 证明"整车能开"：Playwright 驱动一台真实
          Chromium，像用户一样打开页面、点按钮、填表单、读屏幕上的字。本课的教材在
          <code>e2e/</code> 目录里，这一页只讲定位——去终端跑{' '}
          <code>npx playwright test --headed</code> 亲眼看它操作。讲义见 <code>doc/lesson-36.md</code>。
        </p>
      </header>

      {/* 卡片一：测试金字塔定位 */}
      <section className="card">
        <h2>E2E 在测试金字塔里的位置</h2>
        <p>
          越往塔尖：越慢（E2E 秒级 vs 单元毫秒级）、越脆（依赖真实渲染时序）、排查越绕。
          所以数量原则是<strong>"少而关键"</strong>：E2E 只写"断了用户就走不下去"的路径，
          不用 E2E 重写单元测试已经覆盖的东西。本课 4 个 spec 文件、9 个用例，全部打真实 dev server。
        </p>
        <div className="l36-pyramid" aria-hidden="true">
          {PYRAMID.map((tier) => (
            <div key={tier.key} className={`l36-pyramid-tier ${tier.cls}`}>
              {tier.label}
            </div>
          ))}
        </div>
        <p className="l36-pyramid-caption">
          ↑ 底层最多最快 → 顶层最少最真实。宽度 = 数量，颜色越红离用户越近。
        </p>
        <p>
          第 32 课的 spec 是"E2E 不可替代"的样板：裸版 10 万行 vs 虚拟版不到 50 行，
          这件事 jsdom 测不了——jsdom 没有视口和 layout，windowing 的窗口多大由真实浏览器算出来。
          <strong>不是 E2E 更高级，而是有些真相只存在于真实环境里。</strong>
        </p>
      </section>

      {/* 卡片二：怎么跑 */}
      <section className="card">
        <h2>怎么跑</h2>
        <p>
          dev server（http://localhost:5173）已经常驻，playwright.config.js 里{' '}
          <code>reuseExistingServer: true</code> 会直接复用它、绝不重起——
          平时开着 dev server 写代码、随手跑一把 E2E，零成本。
        </p>
        <ul>
          {COMMANDS.map(({ cmd, note }) => (
            <li key={cmd}>
              <code>{cmd}</code> —— {note}
            </li>
          ))}
        </ul>
      </section>

      {/* 卡片三：每个 spec 各测什么 */}
      <section className="card">
        <h2>四个 spec、九个用例，各测什么</h2>
        {SPECS.map(({ file, tests }) => (
          <div key={file}>
            <h3>
              <code>{file}</code>
            </h3>
            <ul>
              {tests.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="hint">
          定位器哲学速记：getByRole 优先（顺带做可访问性审计）；断言钉"用户在乎的事"，
          不钉实现细节。flake 两道防线：自动等待（web 断言在超时内反复重试，绝不手写睡等）+ 自动重试
          （retries，治环境抖动不治确定性 bug）。完整展开在 doc/lesson-36.md。
        </p>
      </section>

      {/* 卡片四：真实测试输出（跑 npx playwright test 的原样摘要，不是编的） */}
      <section className="card">
        <h2>真实测试输出</h2>
        <p>
          下面是本仓库真实执行 <code>npx playwright test</code> 的输出摘要。
          你跑出来的用例数应该和它一致；速度列会随机器浮动。
        </p>
        <pre className="l36-terminal">{`$ npx playwright test

Running 9 tests using 6 workers
·········
  9 passed (5.1s)`}</pre>
        <p className="hint">
          一行点号 = 一个用例（9 个点 = 9 个绿）。worker 数和秒数随机器浮动，用例数不会变；
          若你跑出红的，先看是不是别的课正在改文件（本课程仓库 main.jsx 静态导入所有课页面，
          任何一课保存到一半，全站都会短暂白屏——重跑一次就好）。
        </p>
        <p className="hint">
          还红？先别改断言：跑 <code>npx playwright test --trace on</code>，然后{' '}
          <code>npx playwright show-trace</code> 在 DOM 快照里看案发瞬间页面长什么样——
          盯着控制台猜是 E2E 调试最贵的动作。
        </p>
      </section>
    </div>
  )
}
