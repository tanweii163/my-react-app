/**
 * 第 39 课 · Web Vitals 真实测量 —— 页面编排
 *
 * 本文件教什么：
 * 1. Core Web Vitals 三指标是什么、官方阈值是多少（一张表背下来）；
 * 2. INP 为什么取代 FID——不是换个名字，而是测量口径全面升级；
 * 3. RUM（真实用户监控）vs 实验室数据（Lighthouse）：两种数据回答两种问题，
 *    Core Web Vitals 的官方口径是"真实用户的现场数据"；
 * 4. VitalsPanel 实测区：本次加载的真实 LCP/CLS/INP/FCP/TTFB +
 *    长任务捕获 + Resource/Navigation Timing。
 *
 * 【铁律】dev/localhost 上测出的数值只能当"接口能用"的证明；
 * 真实的性能结论必须来自生产环境的现场数据（RUM）。
 */

import VitalsPanel from '../components/lesson39/VitalsPanel.jsx'
import './lesson39.css'

export default function Lesson39() {
  return (
    <article className="page">
      <header>
        <h1>第 39 课 · Web Vitals 真实测量</h1>
        <p>
          性能优化（第 24 课）的"果"要用尺子量：这一课接入 Google 官方的{' '}
          <code>web-vitals</code> 库，在页面里展示本次加载的真实指标。
        </p>
      </header>

      {/* 卡片一：三指标定义 + 官方阈值表 */}
      <section className="card">
        <h2>一、Core Web Vitals：三个指标 + 官方阈值表</h2>
        <p>
          Core Web Vitals 是 Google 选定的三个"用户体验核心指标"，每年可能微调
          （2024 年 3 月起 INP 取代 FID）。每档阈值都按"真实用户数据里绝大多数站点能达到的水平"划定：
        </p>
        <table className="l39-table">
          <thead>
            <tr>
              <th>指标</th>
              <th>测什么</th>
              <th>良好</th>
              <th>需改进</th>
              <th>差</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>LCP</strong> 最大内容绘制
              </td>
              <td>视口内最大元素渲染完成的时刻——"主内容出齐了"</td>
              <td>≤ 2500ms</td>
              <td>2500–4000ms</td>
              <td>&gt; 4000ms</td>
            </tr>
            <tr>
              <td>
                <strong>CLS</strong> 累积布局偏移
              </td>
              <td>页面寿命内所有"意外位移"分数之和——"内容跳不跳"</td>
              <td>≤ 0.1</td>
              <td>0.1–0.25</td>
              <td>&gt; 0.25</td>
            </tr>
            <tr>
              <td>
                <strong>INP</strong> 交互到下一次绘制
              </td>
              <td>整页寿命内交互响应的最差值（约取最差的 2% 交互）——"点了卡不卡"</td>
              <td>≤ 200ms</td>
              <td>200–500ms</td>
              <td>&gt; 500ms</td>
            </tr>
          </tbody>
        </table>
        <p className="hint">
          辅助诊断指标：<code>FCP</code>（首次内容绘制，≤1800ms 良好）回答"白屏多久"，
          <code>TTFB</code>（首字节时间，≤800ms 良好）回答"网络/服务器慢不慢"。
          面板里 LCP 偏大先看 TTFB，再查资源体积——顺着指标链排查。
        </p>
        <p>
          <strong>INP 为什么取代 FID？</strong>FID 只测"第一次交互"的输入延迟，且只量到
          事件处理<em>开始执行</em>为止——不包含处理耗时和渲染，用户感知不到这个"半截"数据。
          INP 量到<em>画出来</em>（下一次绘制）为止，覆盖整页寿命的所有交互（不是只有第一次），
          长任务卡顿、事件处理器太重都会被如实反映。一句话：FID 测"点得进吗"，INP 测"跟得上吗"。
        </p>
      </section>

      {/* 卡片二：RUM vs 实验室数据 */}
      <section className="card">
        <h2>二、RUM vs 实验室数据：两种尺子量两种问题</h2>
        <table className="l39-table">
          <thead>
            <tr>
              <th></th>
              <th>实验室数据（Lighthouse）</th>
              <th>现场数据（RUM / web-vitals）</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>谁来测</td>
              <td>受控环境：模拟中端手机 + 4G，单次跑分</td>
              <td>真实用户：真实设备、真实网络、真实交互</td>
            </tr>
            <tr>
              <td>能回答</td>
              <td>"这次改动有没有变快？"——可复现、可对比</td>
              <td>"用户实际体验如何？"——唯一的事实</td>
            </tr>
            <tr>
              <td>不能回答</td>
              <td>不同用户的设备/网络差异；CLS、INP 几乎测不到（没有交互）</td>
              <td>具体是哪次改动导致的变慢</td>
            </tr>
            <tr>
              <td>本课对应</td>
              <td>DevTools → Lighthouse（第 24 课用过）</td>
              <td>web-vitals 库 + 本课面板</td>
            </tr>
          </tbody>
        </table>
        <p className="hint">
          Core Web Vitals 的官方口径是<strong>现场数据按 75 百分位</strong>（75% 的用户达到"良好"），
          数据源如 Google 的 CrUX 数据集（PageSpeed Insights、搜索控制台用的就是它）。
          Lighthouse 分数再高，也替代不了真实用户的现场数据。
        </p>
      </section>

      {/* 卡片三：实测区 */}
      <section className="card">
        <h2>三、实测区：本次加载的真实指标</h2>
        <VitalsPanel />
      </section>

      {/* 卡片四：优化清单指向第 24 课 */}
      <section className="card">
        <h2>四、指标差了怎么办：优化清单（呼应第 24 课）</h2>
        <ul className="l39-checklist">
          <li>
            <strong>LCP 差</strong> → 首屏资源太大/太晚：路由级代码分割（<code>React.lazy</code>）、
            图片压缩与懒加载、关键资源 <code>preload</code>、上 CDN——全是第 24 课构建优化的内容。
          </li>
          <li>
            <strong>CLS 差</strong> → 尺寸未知的图片/广告/动态插入的内容把布局顶开：
            给媒体元素写死宽高占位，避免在已有内容上方插入 DOM。
          </li>
          <li>
            <strong>INP 差</strong> → 长任务阻塞主线程：拆分大计算（分片/移入 Worker）、
            减少不必要的重渲染——本课面板的长任务捕获就是排查入口。
          </li>
          <li>
            <strong>TTFB 差</strong> → 服务器/网络慢：缓存策略、CDN、边缘渲染——前端代码再快也救不了这一段。
          </li>
        </ul>
        <p className="hint">
          第 24 课讲过：dev server（5173）没有压缩、没有代码分割、没有网络延迟——
          优化手段的<strong>效果</strong>同样要在 <code>npm run build</code> 的产物上验证。
        </p>
      </section>
    </article>
  )
}
