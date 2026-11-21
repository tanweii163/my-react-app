/**
 * 第 38 课 · 手写 SVG 数据可视化 —— 图表无障碍对照（ChartA11y）
 *
 * 本文件教什么：图表对屏幕阅读器默认是"一坨没有名字的图形"。图表库常常做错的
 * 三件事，这里一次做对（图表无障碍三件套）：
 *
 * 1. role="img"：把整块图表当成"一张图片"播报——内部几十个 rect/text 不再逐个念出来，
 *    屏读用户听到的是一句话，而不是"矩形、矩形、文本、矩形……"。
 * 2. aria-label 写"完整结论句"：比如"6 月销售额 89 万元为上半年最高，2 月 32 万元最低"，
 *    不是"柱状图"三个字。结论句 = 替用户把图"看"完；标签要能独立成立，
 *    不依赖旁边的标题（aria-label 不会被翻译成可见文字）。
 * 3. 视觉隐藏的 <table> 数据回退：屏读用户可逐格听数、爬虫/SEO 可索引结构化数据。
 *    视觉隐藏用 clip 方案，绝不能用 display:none——那会连无障碍树和搜索索引一起消失。
 *
 * 【必讲易错】table 必须放在 role="img" 元素的"外面"（兄弟节点）——
 * role="img" 会把所有后代从无障碍树剪掉，藏在里面等于没写。这是很多图表库翻车的第 4 处。
 */

/**
 * 图表的无障碍外壳。
 * @param label   string   完整结论句（给 role="img" 的 aria-label）
 * @param table   object   { caption, head: string[], rows: string[][] } 隐藏数据表
 * @param chart   element  可见图表本体（<svg>），放进 role="img" 容器
 * @param legend  element? 可见图例（如 DonutLegend），放在 role="img" 外面才能被读到
 */
export default function ChartA11y({ label, table, chart, legend }) {
  return (
    <figure className="l38-figure">
      {/* 只有"图"本身进 role="img"；图例作为兄弟节点放在外面，语义才保得住 */}
      <div role="img" aria-label={label}>
        {chart}
      </div>
      {legend}

      {/* 数据回退表：看得见的人看不见，屏读/爬虫逐格读得到。
          caption 告诉屏读用户"这张表是什么"，th 的 scope 声明表头方向。 */}
      <table className="l38-visually-hidden">
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            {table.head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
