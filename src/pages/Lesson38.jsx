/**
 * 第 38 课 · 手写 SVG 数据可视化 —— 页面编排
 *
 * 本文件教什么：
 * 1. 选型卡：什么时候手写 SVG（三五种基础图、全定制视觉、零依赖），
 *    什么时候上库（ECharts / Recharts：复杂交互、大数据量、现成图表类型多）。
 * 2. 三张手写图的真实编排：柱状图（比例尺 + 轴 + hover）、折线图（path d + 逆函数 hover）、
 *    环形图（dasharray 弧长 + 图例）——每张图都套 ChartA11y 无障碍外壳。
 * 3. "换一组数据"按钮：数据变了、比例尺不动（domain 固定），柱子用 CSS 过渡平滑长过去。
 * 4. 为什么不用 div 拼柱状图（L12 的 HeavyChart 就是一个手写 SVG 的现成例子）。
 *
 * 【零依赖宣言】本课所有图 = SVG 标准标签 + 初中数学。package.json 一个新依赖都没有。
 */

import { useState } from 'react'
import BarChart from '../components/lesson38/BarChart.jsx'
import LineChart from '../components/lesson38/LineChart.jsx'
import DonutChart, { DonutLegend } from '../components/lesson38/DonutChart.jsx'
import ChartA11y from '../components/lesson38/ChartA11y.jsx'
import './lesson38.css'

// 柱状图示例数据：上半年月度销售额（万元）。种子数据写死保证首次渲染稳定；
// "换一组数据"用 Math.random 覆盖值——顺便观察：比例尺不动（domain 固定 [0,100]），
// 只有数据在变，柱子就自己长到新位置。
const SALES_SEED = [
  { label: '1月', value: 42 },
  { label: '2月', value: 31 },
  { label: '3月', value: 58 },
  { label: '4月', value: 74 },
  { label: '5月', value: 66 },
  { label: '6月', value: 89 },
]

// 环形图示例数据：前端团队技术栈人数分布
const STACK = [
  { label: 'React', value: 46 },
  { label: 'Vue', value: 27 },
  { label: '小程序', value: 15 },
  { label: '其他', value: 12 },
]

// 折线图示例数据：48 次温度采样（确定性公式 sin + 缓升，不用 Math.random——教学示例要可复现）。
// 数据在页面生成、同时喂给 LineChart 和无障碍数据表：图和它的数据表必须同源，
// 两处各算一遍迟早改岔（这也是 ChartA11y 的设计前提：table 参数由页面传入）。
const LINE_SAMPLES = Array.from({ length: 48 }, (_, i) => ({
  i,
  v: Math.round(24 + 8 * Math.sin(i / 4) + i * 0.12),
}))

// 从数据里算"结论"：无障碍 label 必须是结论句，结论得先统计出来——
// 这也是本课的一个隐藏收获：图表的语义来自数据统计，不来自视觉。
function extremes(data) {
  let max = data[0]
  let min = data[0]
  for (const d of data) {
    if (d.value > max.value) max = d
    if (d.value < min.value) min = d
  }
  return { max, min }
}

export default function Lesson38() {
  const [sales, setSales] = useState(SALES_SEED)
  const { max, min } = extremes(sales)

  // 换一组随机数据（30–95 万元）。换完 extremes 重算 → aria-label 的结论句也跟着变：
  // 无障碍描述不是写死的文案，而是从数据推导的"实时结论"。
  const reshuffle = () => {
    setSales(SALES_SEED.map((m) => ({ ...m, value: Math.round(30 + Math.random() * 65) })))
  }

  return (
    <article className="page">
      <header>
        <h1>第 38 课 · 手写 SVG 数据可视化</h1>
        <p>
          不装任何图表库：线性比例尺 + <code>&lt;rect&gt;</code> 画柱状图、<code>&lt;path&gt;</code>{' '}
          的 d 字符串拼折线、<code>strokeDasharray</code> 裁环形图——
          全部数学是"一次函数 + 圆的周长 2πr"。
        </p>
      </header>

      {/* 卡片一：选型卡 */}
      <section className="card">
        <h2>一、选型卡：什么时候手写，什么时候上库</h2>
        <table className="l38-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>手写 SVG（本课）</th>
              <th>图表库（ECharts / Recharts）</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>图表种类</td>
              <td>三五种基础图（柱 / 折 / 环 / 面积）绰绰有余</td>
              <td>几十种开箱即用，含地图、关系图、3D</td>
            </tr>
            <tr>
              <td>视觉定制</td>
              <td>完全自由：坐标、颜色、动画都是你自己写的属性</td>
              <td>在主题配置项里定制；深挖要读源码</td>
            </tr>
            <tr>
              <td>交互</td>
              <td>hover / 简单 tooltip 手写可做；缩放、刷选、图例联动成本高</td>
              <td>dataZoom、legend 联动、toolbox 开箱即用</td>
            </tr>
            <tr>
              <td>数据量</td>
              <td>SVG 节点数 = 元素数，上千个点会卡（记得抽稀）</td>
              <td>ECharts 可切 Canvas 渲染，扛得住大数据量</td>
            </tr>
            <tr>
              <td>包体积</td>
              <td>
                <strong>0 KB，零依赖</strong>
              </td>
              <td>Recharts ≈100 KB+、ECharts ≈300 KB+（可按需引入）</td>
            </tr>
          </tbody>
        </table>
        <p className="hint">
          <strong>零依赖宣言：</strong>
          本课所有图 = SVG 标准标签 + 初中数学，<code>package.json</code> 没有任何新依赖。
          经验法则：只需要柱 / 折 / 环几种基础图、视觉要完全贴合设计稿 → 手写更便宜；
          要缩放刷选、实时大数据、几十种图 → 直接上库，别硬造。
        </p>
      </section>

      {/* 卡片二：柱状图 */}
      <section className="card">
        <h2>二、柱状图：线性比例尺是图表的心脏</h2>
        <p>
          比例尺 = 把数据域（domain，如 0–100 万元）等比映射到像素域（range，如绘图区高度）的
          <strong>纯函数</strong>：f(x) = r₀ + (x − d₀)·k，其中斜率
          k = (r₁ − r₀) / (d₁ − d₀)。柱子的 y、height 全部由它换算，代码里没有一个魔法数字。
        </p>
        <ChartA11y
          label={`上半年月度销售额柱状图（示例数据）：${max.label} 最高 ${max.value} 万元，${min.label} 最低 ${min.value} 万元。`}
          table={{
            caption: '上半年月度销售额数据表（万元）',
            head: ['月份', '销售额（万元）'],
            rows: sales.map((m) => [m.label, `${m.value}`]),
          }}
          chart={<BarChart data={sales} />}
        />
        <div className="row">
          <button type="button" onClick={reshuffle}>
            换一组数据（看柱子平滑生长）
          </button>
          <span className="hint">
            数据变了、比例尺不动——柱子的 y/height 是 SVG2 几何 CSS 属性，CSS transition 直接生效。
          </span>
        </div>
      </section>

      {/* 卡片三：折线图 */}
      <section className="card">
        <h2>三、折线图：path 的 d 字符串 + 比例尺逆函数</h2>
        <p>
          折线没有组件：<code>d = "M x0 y0 L x1 y1 L x2 y2 …"</code> 拼好交给
          <code>&lt;path&gt;</code> 就有线。48 个点远小于 420px 绘图宽，抽稀函数直接放行；
          点数超过像素宽时它才开始工作（步长取样，保形状的高级版是 Douglas–Peucker / LTTB）。
        </p>
        <p>
          <strong>把鼠标在线上滑动</strong>：hover 用的是比例尺的<em>逆函数</em>——
          屏幕像素 →（除以缩放系数）→ viewBox 逻辑坐标 →（逆 x 比例尺）→ 数据索引，
          四舍五入取最近采样点。画图走正向（数据→像素），交互走逆向（像素→数据）。
        </p>
        <ChartA11y
          label="某传感器 48 次采样的温度折线图（示例数据）：温度围绕 24–36 ℃ 波动并缓慢上升，呈先震荡后上行的波形。"
          table={{
            caption: '传感器采样数据表',
            head: ['采样', '温度（℃）'],
            rows: LINE_SAMPLES.map((p) => [`第 ${p.i + 1} 次`, `${p.v}`]),
          }}
          chart={<LineChart samples={LINE_SAMPLES} />}
        />
      </section>

      {/* 卡片四：环形图 */}
      <section className="card">
        <h2>四、环形图：周长公式 + dasharray 裁弧</h2>
        <p>
          不算角度、不写弧线路径：环形图 = 一个粗描边的圆，扇区是圆的一段弧长。
          周长 C = 2πr；每个扇区 <code>dasharray = "弧长 C"</code>（画一段、空一圈），
          <code>dashoffset = −前面累计弧长</code>（起点前移、首尾相接）。
          <strong>把鼠标放到扇区上</strong>：中心文字会切换成该扇区的占比。
        </p>
        <div className="l38-donut-wrap">
          <ChartA11y
            label={`前端团队技术栈分布环形图（示例数据）：React ${((STACK[0].value / STACK.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}% 占比最高，共 ${STACK.reduce((s, d) => s + d.value, 0)} 人。`}
            table={{
              caption: '前端团队技术栈分布数据表',
              head: ['技术栈', '人数'],
              rows: STACK.map((s) => [s.label, `${s.value}`]),
            }}
            chart={<DonutChart data={STACK} />}
            legend={<DonutLegend data={STACK} />}
          />
        </div>
        <p className="hint">
          图例（legend 插槽）被放在 role="img" 容器<strong>外面</strong>——role="img"
          会把后代从无障碍树剪掉，图例藏进去就没人读了。
        </p>
      </section>

      {/* 卡片五：无障碍三件套 */}
      <section className="card">
        <h2>五、图表无障碍三件套（图表库常常做错的事）</h2>
        <ol className="l38-steps">
          <li>
            <code>role="img"</code>：整个图表当成一张图片播报，内部几十个图形元素不再逐个念。
          </li>
          <li>
            <code>aria-label</code> 完整结论句："{max.label} 最高 {max.value} 万元，{min.label} 最低{' '}
            {min.value} 万元"——替用户把图看完，而不是"柱状图"三个字。本课的结论句是
            <strong>从数据实时统计出来的</strong>：点"换一组数据"，描述也跟着变。
          </li>
          <li>
            视觉隐藏的 <code>&lt;table&gt;</code> 数据回退：屏读用户逐格听数、爬虫 / SEO
            索引结构化数据。隐藏用 clip 方案（<code>.l38-visually-hidden</code>），
            绝不能 <code>display:none</code>——那会连无障碍树和搜索索引一起消失。
          </li>
        </ol>
        <p className="hint">
          验证方法：DevTools → Elements → Accessibility 面板，看图表区域是不是
          <code>img</code> 角色 + 完整 label；再在 Elements 里找到 <code>.l38-visually-hidden</code>{' '}
          的表格。很多图表库只输出一个空 <code>&lt;canvas&gt;</code> 或裸 <code>&lt;svg&gt;</code>，
          什么语义都不留——这就是"图表库常常做错的事"。
        </p>
      </section>

      {/* 卡片六：为什么不用 div 拼柱状图 */}
      <section className="card">
        <h2>六、为什么不用 div 拼柱状图</h2>
        <p>
          L12 的 <code>HeavyChart</code> 就是一个手写 SVG 图表的现成例子——它"假装"是个 500KB
          的图表库，实际是零依赖的内联 SVG。为什么不用 div + height% 拼柱子？四个理由：
        </p>
        <ol className="l38-steps">
          <li>
            <strong>div 只能是矩形</strong>：折线的斜线、环形的弧、面积图的填充，div 拼不出来
            （skew / rotate 是 Hack，角度计算比比例尺还绕）；SVG 一条 <code>&lt;path&gt;</code>{' '}
            就画完 48 个点的折线。
          </li>
          <li>
            <strong>DOM 数量</strong>：div 方案每根柱至少 3 个节点（容器 / 柱 / 标签），
            SVG 一根柱一个 <code>&lt;rect&gt;</code>；节点越少，布局越便宜。
          </li>
          <li>
            <strong>布局 vs 绘制</strong>：div 改 height 触发 layout + paint（第 23 课的流水线）；
            SVG 图形是"绘制结果"，尺寸交给 viewBox，改几何属性只走重绘。若动画只用
            transform / opacity，浏览器可以留在合成层——主线程零参与（第 23 课铁律）。
          </li>
          <li>
            <strong>缩放免费</strong>：viewBox 响应式（见 doc/lesson-38.md）让"逻辑坐标写死一份、
            显示尺寸跟容器走"，不需要 ResizeObserver 重新算像素；div 柱高用 % 也能缩放，
            但文字、间距、轴全部要另行布局，SVG 里它们和图形共用同一套坐标系。
          </li>
        </ol>
        <p className="hint">
          viewBox 响应式一句话：<code>viewBox="0 0 480 280"</code> 定义逻辑坐标系，
          <code>width="100%"</code> 让显示尺寸跟随容器，浏览器按"逻辑坐标 × 缩放系数"重绘矢量——
          代价是交互时要用 <code>getBoundingClientRect</code> 把屏幕坐标换算回逻辑坐标（折线图 hover 演示的
          第 1 步）。
        </p>
      </section>
    </article>
  )
}

