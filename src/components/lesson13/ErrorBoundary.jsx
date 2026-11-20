// 本文件教什么：错误边界（Error Boundary）——React 里唯一"还需要 class 组件"的常见场景。
// 核心概念：错误边界是子树的 try/catch。子组件在【渲染期】抛错时，
//   距离它最近的、实现了 getDerivedStateFromError 的祖先组件会接住错误，
//   只让这一小片子树降级为 fallback UI，页面其他部分毫发无损。
// 两个生命周期各司其职（铁律，别写反）：
//   - static getDerivedStateFromError(error)：渲染期调用，返回值并入 state → 用来"切换降级 UI"。
//   - componentDidCatch(error, info)：提交期调用，副作用位置 → 用来"打日志/上报"，不要在这里 setState 切 UI。
// 恢复机制：错误一旦被接住，子组件被整体卸载重挂（state 归零）。恢复方式有两种：
//   ① 在 fallback 里给一个"重置"入口（本组件把 reset 通过 fallback 函数传出去）；
//   ② resetKeys：外部传入一组值（如 key、版本号），变化时自动重置——适合"切换了数据源就该恢复"的场景。
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    // hasError：是否已接住错误。为 true 时渲染 fallback 而不是 children。
    this.state = { hasError: false, error: null }
  }

  // 渲染期钩子：子树抛错时 React 逆着组件树向上找最近的错误边界，调用它。
  // 必须是 static，返回值会 this.state 浅合并——这里记下错误并切换降级标记。
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  // 提交期钩子：适合打日志、上报监控（副作用放这里，就像副作用放 useEffect 而不是渲染体）。
  // info.componentStack 能打印出出错组件的调用栈，排查"是哪个组件炸了"非常好用。
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[错误边界] 接住了一个渲染期错误：', error, '\n组件栈：', info.componentStack)
  }

  // resetKeys 恢复：依赖数组变化时（比如外部换了重置信号）自动清除错误状态。
  componentDidUpdate(prevProps) {
    if (!this.state.hasError) return
    const prev = prevProps.resetKeys || []
    const next = this.props.resetKeys || []
    const changed =
      prev.length !== next.length || next.some((k, i) => !Object.is(k, prev[i]))
    if (changed) {
      // 易错点：重置时必须连 error 一起清掉，否则 fallback 里可能读到旧错误。
      // oxlint 的 no-did-update-set-state 在这里是误报：resetKeys 变化时清错误状态
      // 是官方推荐的模式（见 React 文档 Error Boundary 的 resetKeys 方案），可放心 setState。
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false, error: null })
    }
  }

  // 手动重置：交给 fallback 里的按钮调用。重置后 children 重新挂载，如同刚打开页面。
  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      // fallback 支持两种写法：
      //   - 传节点：<ErrorBoundary fallback={<p>炸了</p>}> —— 最简单，但没有重置入口
      //   - 传函数：<ErrorBoundary fallback={({ error, reset }) => ...}> —— 能拿到错误信息和重置函数
      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.reset })
      }
      return fallback ?? <p role="alert">这一片区域出错了。</p>
    }
    return this.props.children
  }
}

export default ErrorBoundary
