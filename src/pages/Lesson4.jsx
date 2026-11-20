// 第 4 课页面：状态提升与组件通信
//
// 本文件教什么：
//   React 的核心通信铁律 —— "props 向下流，事件向上报"。
//   React 没有"兄弟组件直接说话"的机制。两个组件要共享数据，
//   唯正道是把 state 放到它们的【最近公共父组件】，父组件用 props
//   把数据发给每个孩子，孩子们用回调（onChange 之类）把变化报给父组件。
//   这一步"把 state 搬上去"就叫【状态提升（Lifting State Up）】。
//
//   本页有三块内容，建议按顺序看：
//     1. ❌ 错误示范：state 留在两个子组件里 → 各存各的，永不同步
//     2. ✅ 正确做法：提升到本组件（父），任一输入另一个自动换算
//     3. 纯展示组件 BoilingVerdict：只吃 props，只管显示
import { useState } from 'react'
import TemperatureInput from '../components/lesson4/TemperatureInput.jsx'
import BoilingVerdict from '../components/lesson4/BoilingVerdict.jsx'
import './lesson4.css'

// ---------- 工具函数：温度换算 ----------
// f -> c；注意除法会产生很长的小数（如 25.5555555...），
// 所以用 toFixed(2) 保留两位再 Number 转回数字，去掉多余 0。
function fahrenheitToCelsius(f) {
  return Number(((f - 32) * 5) / 9)
}
// c -> f
function celsiusToFahrenheit(c) {
  return Number((c * 9) / 5 + 32)
}

// ---------- ❌ 错误示范 ----------
// 故意把 state 留在两个子组件里，演示"不同步"。
// 每个输入框各自 useState 存值：你在一边输入，另一边毫无反应。
function BrokenTemperatureInput({ scale, initial }) {
  // 易错点本尊：子组件自己持有值，兄弟组件互相看不见对方
  const [value, setValue] = useState(initial)
  return (
    <TemperatureInput scale={scale} temperature={value} onTemperatureChange={setValue} />
  )
}

function BrokenInputs() {
  return (
    <div className="row">
      <BrokenTemperatureInput scale="c" initial="25" />
      <BrokenTemperatureInput scale="f" initial="77" />
    </div>
  )
}

function Lesson4() {
  // 真相来源只有一个：两个输入框共享的"摄氏度"。
  // 我们只存摄氏度这一个值，华氏度由它【派生】出来
  // （第 2 课讲过：派生数据不进 state）。
  // 用字符串存是为了让输入框能显示 "3."、"3.0" 这类中间输入状态。
  const [celsius, setCelsius] = useState('25')

  // 两个输入框共用这一个处理函数 —— 这正是"提升"的意义：
  // 逻辑集中在一处，而不是复制到每个子组件。
  function handleTemperatureChange(scale, value) {
    if (scale === 'c') {
      // 输入的是摄氏度：原样存
      setCelsius(value)
    } else {
      // 输入的是华氏度：换算回摄氏度再存。
      // 空字符串没法换算，直接存空。
      setCelsius(value === '' ? '' : String(fahrenheitToCelsius(Number(value))))
    }
  }

  // 华氏度是派生值：每次渲染时现算。注意保留合理精度（两位小数）。
  const fahrenheit = celsius === '' ? '' : String(celsiusToFahrenheit(Number(celsius)))
  // BoilingVerdict 只要摄氏度这个数字
  const celsiusNumber = celsius === '' ? NaN : Number(celsius)

  return (
    <div className="page">
      <header>
        <h1>第 4 课：状态提升与组件通信</h1>
        <p>props 向下流、事件向上报；兄弟组件通过共享父 state 通信。</p>
      </header>
      <main>
        {/* ---------- 第一部分：错误示范 ---------- */}
        <section className="card">
          <h2>❌ 错误示范：state 留在子组件里</h2>
          <p>
            下面的两个输入框各存各的初始值（25°C 和 77°F），你在任意一个框里输入，
            另一个【完全没反应】—— 因为它们互相不知道对方的存在。
          </p>
          <BrokenInputs />
          <p className="hint">
            原因：两个 TemperatureInput 各自持有独立的值，它们是兄弟，React
            不允许兄弟之间直接传数据。要让它们同步，唯一的办法是把值
            <strong> 提升到最近的公共父组件</strong>，见下面第二部分。
          </p>
        </section>

        {/* ---------- 第二部分：正确做法 ---------- */}
        <section className="card">
          <h2>✅ 正确做法：提升到父组件 Lesson4</h2>
          <p>
            现在值（celsius）和修改逻辑（handleTemperatureChange）都住在本组件里。
            试着在任意一个框里输入，另一个会自动换算：
          </p>
          <TemperatureInput
            scale="c"
            temperature={celsius}
            onTemperatureChange={(v) => handleTemperatureChange('c', v)}
          />
          <TemperatureInput
            scale="f"
            temperature={fahrenheit}
            onTemperatureChange={(v) => handleTemperatureChange('f', v)}
          />
          <p className="hint">
            数据流路线：父组件 state → props 向下 → 输入框显示；
            用户输入 → onChange 向上 → 父组件 setState → 重新渲染 → 两个框都更新。
          </p>
        </section>

        {/* ---------- 第三部分：纯展示组件 ---------- */}
        <section className="card">
          <h2>BoilingVerdict：只吃 props 的纯展示组件</h2>
          {/* 温度没输入完（如空串）时不做判断，避免 NaN 干扰 */}
          {!Number.isNaN(celsiusNumber) && <BoilingVerdict celsius={celsiusNumber} />}
          <p className="hint">
            BoilingVerdict 没有 state、没有逻辑，celsius ≥ 100 就说"水会沸腾"。
            它可以被任何父组件复用 —— 这就是"只管显示"的好处。
          </p>
        </section>
      </main>
    </div>
  )
}

export default Lesson4
