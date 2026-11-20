// 第 4 课组件 · TemperatureInput：一个"受控到父级"的温度输入框
//
// 本组件教什么：
//   状态提升后的子组件长什么样 —— 它自己【不持有】任何 state，
//   只做两件事：
//     1. 显示：父组件给什么值，就渲染什么值（props 向下流）
//     2. 上报：用户输入时，不自己存，而是调用父组件传下来的
//        onChange 函数，把"新值"交给父组件（事件向上报）
//
// 铁律：受控组件的 value 必须来自 props，绝不能在子组件里再
// 用 useState 存一份 —— 那样就有两个"真相来源"，必然不同步。

// scale: 'c' | 'f'，决定显示"摄氏度"还是"华氏度"
// temperature: 当前值（字符串，方便输入框显示中间状态如 "3."）
// onTemperatureChange: 上报函数，父组件传入
function TemperatureInput({ scale, temperature, onTemperatureChange }) {
  const scaleName = scale === 'c' ? '摄氏度 (°C)' : '华氏度 (°F)'

  function handleChange(e) {
    // 注意：这里只负责"上报"，不做换算、不做存储。
    // 换算逻辑放在父组件，因为父组件同时知道两个输入框。
    onTemperatureChange(e.target.value)
  }

  return (
    <div className="temp-input">
      <label>
        {scaleName}：
        {/* value 来自父组件 —— 这就是"受控到父级"。
            易错点：如果这里写 defaultValue 或本地 useState，
            两个输入框就会各存各的，失去联动。 */}
        <input value={temperature} onChange={handleChange} />
      </label>
    </div>
  )
}

export default TemperatureInput
