// 第 4 课组件 · BoilingVerdict：纯展示组件
//
// 本组件教什么：
//   "子组件只管显示"的极致形态 —— 纯展示（presentational）组件：
//     - 输入只有 props，输出只有 JSX
//     - 没有状态、没有事件、没有副作用
//     - 好处：极易复用、极易测试，谁给它 props 它就显示什么
//
// 摄氏 100°C 是标准大气压下水的沸点，所以判断条件是 celsius >= 100。

function BoilingVerdict({ celsius }) {
  // 空输入时不显示任何结论，避免一进页面就看到"水不会沸腾"的误导
  if (celsius === '' || celsius === null || celsius === undefined) {
    return <p className="hint">输入一个温度，看看水会不会沸腾。</p>
  }

  const willBoil = Number(celsius) >= 100
  return (
    // className 随结论切换，颜色区分（样式见 lesson4.css）
    <p className={willBoil ? 'verdict boil' : 'verdict no-boil'}>
      {willBoil ? '💧 水会沸腾。' : '🧊 水不会沸腾。'}
    </p>
  )
}

export default BoilingVerdict
