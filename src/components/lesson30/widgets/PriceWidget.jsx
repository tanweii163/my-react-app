// 第 30 课 · 价格 widget：实时看板的"心跳"面
//
// 本文件教什么：
//   1. 纯读者组件：只调 usePrices() 拿 prices 切片，不碰 socket、不碰 store 内部——
//      数据永远单向流动（数据源 → store → UI），这是第 28 课模式的落点；
//   2. 实时流的渲染成本观：价格每秒跳，组件每秒重渲染，这不是 bug 是预期。
//      小面积组件不值得 memo（第 9 课：先测量，再优化；没有证据的优化是复杂度）；
//   3. CrashSwitch 演示"任何 widget 都能一键炸掉"——炸的只有自己这张卡，
//      上面的错误边界（ErrorBoundary.jsx）负责接住并降级。
import { usePrices } from '../telemetryStore.js'
import { CrashSwitch } from '../ErrorBoundary.jsx'

// 格式化放模块级纯函数：不在组件里重新创建，也不用 useMemo 包——
// 它不是"昂贵的计算"，包 useMemo 反而是表演式优化（第 9 课的反面教材）
const fmt = (n) => `$${n.toFixed(2)}`
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })

function PriceWidget() {
  const prices = usePrices()
  const symbols = Object.keys(prices)

  return (
    <section className="card l30-widget" aria-label="价格心跳">
      <div className="l30-widget-head">
        <h2>📈 价格心跳</h2>
        {/* 崩溃开关：边界包住整张卡，所以它炸的是整卡，重置后原样回来 */}
        <CrashSwitch label="价格组件" />
      </div>
      <p className="hint">每秒一跳由 MockSocket 推送 → store 替换 prices → 本组件重渲染。箭头和颜色是派生的展示，数据里只有事实。</p>

      {symbols.length === 0 ? (
        // 空态也是信息：刚挂载（还没收到第一拍）或刚清屏，都落在这里
        <p className="hint">尚未收到心跳——等连接建立后第一拍数据会自动出现。</p>
      ) : (
        <ul className="l30-price-grid">
          {symbols.map((symbol) => {
            const item = prices[symbol]
            // dir → 箭头/色调的翻译只发生在渲染层：数据层存 1/-1/0，视图层决定怎么"说人话"
            const arrow = item.dir > 0 ? '↑' : item.dir < 0 ? '↓' : '·'
            const tone = item.dir > 0 ? 'l30-up' : item.dir < 0 ? 'l30-down' : ''
            // aria-label：箭头符号对读屏器是"上箭头"这种噪音，翻译成"涨/跌"才有意义（第 26 课习惯）
            const spoken = item.dir > 0 ? '上涨' : item.dir < 0 ? '下跌' : '持平'
            return (
              <li key={symbol} className={`l30-price-item ${tone}`}>
                <span className="l30-symbol">{symbol}</span>
                <span className="big-number">{fmt(item.price)}</span>
                <span className="l30-price-meta" aria-label={`${symbol} 现价 ${fmt(item.price)}，${spoken}`}>
                  {arrow} {fmtTime(item.ts)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default PriceWidget
