// 第 30 课 · 故障隔离：每个 widget 独立的 ErrorBoundary（第 13 课模式 · 监控台工程版）
//
// 本文件教什么：
//   1. 第 13 课的错误边界放进真实场景：监控台一个页面摆三块 widget，
//      一块崩了把整页拖死就是生产事故。所以每块 widget 独立包一层边界——
//      崩溃只降级自己（爆炸半径控制），其他 widget 数据照跳、按钮照按；
//   2. 两个生命周期各司其职的铁律不变（别写反）：
//      - static getDerivedStateFromError：渲染期调用，返回值并入 state → 切换降级 UI；
//      - componentDidCatch：提交期调用，副作用位置 → 打日志/上报（第 29 课调试方法论里
//        "监控自己先看见"的那只眼睛），info.componentStack 能直接指出崩在哪个组件；
//   3. CrashSwitch：内置"模拟崩溃"开关。注意边界只能接住【渲染期】抛的错——
//      事件回调里的错误要用 try/catch 自己兜，这是错误边界最经典的认知盲区（讲义易错点）。
import { Component, useState } from 'react'

class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props)
    // hasError：是否已接住错误。为 true 时渲染本卡片的降级 UI，而不是 children
    this.state = { hasError: false, error: null }
  }

  // 渲染期钩子：子树抛错时 React 逆着组件树向上找最近的错误边界，调用它。
  // 必须是 static，返回值浅合并进 state——这里记下错误并切换降级标记。
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  // 提交期钩子：上报的位置。真实项目里这一行会发给 Sentry / 内部监控；
  // 教学项目里打 console，注意消息写明"已被边界接住"——排查时不会误判为页面崩溃。
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(
      `[监控台]「${this.props.label}」崩了，已被边界接住（模拟崩溃开关触发，属预期演示）:`,
      error,
      '\n组件栈（第 29 课"定位爆炸面"的抓手）:\n',
      info.componentStack,
    )
  }

  // 手动重置：降级卡里的按钮调用。重置 = children 整体重新挂载，
  // 子树的 state（包括崩溃开关）全部归零，如同刚打开页面。
  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // 降级卡是这一块的"替身"：role="alert" 让读屏器立刻播报；
      // 文案必须交代两件事——别的 widget 没事 + 怎么恢复
      return (
        <div className="card l30-fallback" role="alert">
          <h2>💥 {this.props.label}崩了</h2>
          <p>错误被这一层的边界接住：其他 widget 毫发无损，数据照常推送。</p>
          <p className="l30-fallback-err">{String(this.state.error?.message ?? this.state.error)}</p>
          <button type="button" className="l30-reset-btn" onClick={this.reset}>
            重置本组件
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default WidgetErrorBoundary

// 模拟崩溃开关：点一下"上膛"，下一次渲染在函数体里 throw。
// 放在每个 widget 的卡片头部——注意它必须在边界【包住的子树里】，
// 否则它自己抛错就没有边界能接（错误边界接的是"子孙"抛的错，接不住自己或祖先）。
// 重置后 children 重新挂载，这里的 armed 状态随之归零——"可重置"就是这么自然达成的。
export function CrashSwitch({ label = '本组件' }) {
  const [armed, setArmed] = useState(false)
  if (armed) {
    // 渲染期 throw → 沿组件树向上冒泡 → 被最近的 ErrorBoundary 接住。
    // 对比：写在 onClick 里 throw，边界一个字都收不到——只有渲染期的错误才归它管
    throw new Error(`${label}模拟渲染期崩溃（来自 CrashSwitch）`)
  }
  return (
    <button
      type="button"
      className="l30-crash-btn"
      onClick={() => setArmed(true)}
      title="触发一次渲染期错误，演示错误边界只降级本卡片"
    >
      💥 模拟崩溃
    </button>
  )
}
