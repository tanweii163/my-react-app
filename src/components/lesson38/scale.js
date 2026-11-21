/**
 * 第 38 课 · 比例尺工具（scale）—— 图表的"数学心脏"，单独成文件
 *
 * 本文件教什么：线性比例尺的正、逆两个方向。它是纯数学模块：没有组件、没有 JSX、
 * 不碰 React——好测试、好复用，也满足 Fast Refresh 的约束
 * （一个文件同时导出"组件 + 非组件"会破坏热更新的边界，lint 的建议正是拆成新文件）。
 *
 * 1. scaleLinear 正向：数据域 domain → 像素域 range。数学是一次函数 f(x) = k·x + b，
 *    两点确定一条直线：k = (r₁ − r₀)/(d₁ − d₀)，b = r₀ − k·d₀。
 * 2. makeTicks：用 nice numbers 算法生成"好看"的整数刻度（轴就是"比例尺的可视化"）。
 * 3. invertLinear 逆向：像素 → 数据。斜率取倒数（1/k）——有正必有逆，
 *    缺逆函数的图表做不了精确交互（hover 的本质就是"像素反算回数据"）。
 *
 * 【铁律】比例尺必须是纯函数：不碰 state、不碰 DOM，同样的入参永远同样的输出。
 * 【易错】SVG 的 y 轴朝下：柱状图 yScale 的 range 要写 [底部y, 顶部y]，值越大 y 越小。
 */

// 线性比例尺工厂：scaleLinear([0, 100], [280, 20]) 返回换算函数。
// 推导：设 f(x) = k·x + b，代入 f(d0) = r0、f(d1) = r1，
// 两式相减得斜率 k，回代得截距 b。三个极端值帮助理解：
//   x = d0 → 返回 r0；x = d1 → 返回 r1；x 在中间 → 按比例插值。
export function scaleLinear(domain, range) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = (r1 - r0) / (d1 - d0) // 斜率：1 个数据单位 = 多少像素
  return (value) => r0 + (value - d0) * k
}

// 逆比例尺：domain/range 角色对调，斜率取倒数。正向画图，逆向交互——同一套数学两个方向。
export function invertLinear(domain, range) {
  const [d0, d1] = domain
  const [r0, r1] = range
  return (pixel) => d0 + (pixel - r0) * ((d1 - d0) / (r1 - r0))
}

// 生成刻度（nice numbers）：先按均分算出"原始步长"，再向上取整到 1/2/5×10ⁿ 的好看数字，
// 刻度从 ceil(d0/step)·step 开始、不超过 d1——人爱看的整数轴，浮点长尾巴（23.3333…）会糊成一团。
// 这就是 d3.ticks 的核心思路（本课手写实现）；count 是"期望刻度数"，实际数量可能略少。
export function makeTicks(domain, count) {
  const [d0, d1] = domain
  if (d0 === d1) return [d0]
  const rawStep = (d1 - d0) / count
  const mag = 10 ** Math.floor(Math.log10(rawStep)) // 步长的数量级：1 / 10 / 100…
  const norm = rawStep / mag // 归一化到 1–10，才好判断取 1、2 还是 5
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  const step = niceNorm * mag
  const start = Math.ceil(d0 / step) * step
  const n = Math.floor((d1 - start) / step + 1e-9)
  return Array.from({ length: n + 1 }, (_, i) => Number((start + i * step).toFixed(10))) // toFixed 清浮点尾尘
}
