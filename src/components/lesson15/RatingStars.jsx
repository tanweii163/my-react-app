// 第 15 课 · 被测对象 ②：RatingStars —— 一个"受控组件"
//
// 本文件教什么：受控组件（第 4 课的概念用在组件设计上）。
// 本组件【不持有】评分 state，只接两个 props：
//   value   —— 当前几星（数据真身在父组件手里）
//   onChange —— 点击某颗星时上报"用户想要几星"
// 组件只负责两件事：把 value 画出来；把点击意图上报上去。
//
// 这样设计对测试极友好：给它 value={4}，断言 DOM 就是 4 星高亮，
// 不用关心内部怎么存；点一颗星，断言 onChange 收到几，不用猜内部状态。
// "props 进、事件出、没有内部真相"——受控组件的测试都是这么写的。
//
// 附带福利：可访问性标注（aria-label）和测试查询（getByRole 的 name）
// 是同一套语言。为了好测而写的标注，同时让读屏用户受益。

export default function RatingStars({ value = 0, onChange, max = 5 }) {
  // 生成 [1..max] 的星号序号。受控组件不存 state，渲染纯靠 props 推导——
  // 这也让"渲染 5 颗星"变成一行断言就能钉住的行为
  const stars = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <div className="rating" role="group" aria-label="评分">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          // 每颗星一个可读名字：读屏软件念"3 星"，测试里
          // getByRole('button', { name: '3 星' }) 也按它找——一份标注两处受益
          aria-label={`${n} 星`}
          // aria-pressed 表达"这颗星亮没亮"，同时服务读屏用户和测试断言
          aria-pressed={n <= value}
          // 高亮规则：序号 <= 当前值 → 加 active 类。
          // 这行就是测试要钉住的"当前 value 高亮 class 正确"
          className={n <= value ? 'rating-star active' : 'rating-star'}
          // 可选链：父组件忘了传 onChange 时点击也不崩——
          // 受控组件不能假设"数据的主人"一定接得住
          onClick={() => onChange?.(n)}
        >
          ★
        </button>
      ))}
      <span className="rating-value">当前 {value} 星</span>
    </div>
  )
}
