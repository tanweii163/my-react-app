// 第 33 课 · 咖啡店菜单 —— t() 的三种用法集中演示
//
// 本文件教什么：
//   1. t(key)：纯查表。t('add') → '加一杯'；
//   2. t(key, { 插值 })：占位符替换。t('welcome', { name }) 填 {{name}}；
//      进阶：插值原料可以是另一个 t() 的结果——{{name}} 填 t('espresso.name')，
//      嵌套翻译（"名字"翻译完再当"库存句"的原料）是真实项目每天都在用的组合拳；
//   3. t(key, { count })：count 一出现，i18next 就按当前语言的 Intl.PluralRules 规则
//      给 key 拼复数后缀再查表——en 下 count=1 查 cups_one、其余查 cups_other；
//      zh 只有 cups_other 可查（中文量词不变形）。en 切到 1 时文案变 "1 cup"、
//      2 变 "2 cups"，同一行 JSX，一个字符没改——这就是复数规则该交给库的原因；
//   4. Fallback：调一个不存在的 key（oops.notHere），观察两件事——
//      t() 返回键名本身（页面不会渲染 undefined/空白），控制台多一条
//      i18next::translator: missingKey 警告。宁可响也别静默。
//
// 命名空间用法：useTranslation(['menu', 'common']) 把两个 ns 都登记为本组件可用，
// t() 默认查第一个（menu）；查 common 要显式前缀 t('common:menuTitle')。
// 显式前缀是推荐写法——key 属于哪个 ns 一眼可见，搬组件也不会因 defaultNS 改变而断。

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// 每种咖啡的库存上限和单价：数字不进字典（数字本身不翻译），
// 货币符号进字典（￥ → $）——"什么进字典"的边界：跟语言走的才翻译。
const STOCK = 5
const PRICES = { espresso: 18, latte: 24, mocha: 26 }
const MENU_IDS = ['espresso', 'latte', 'mocha']

export default function TranslatedMenu() {
  // 第一个 ns（menu）是默认查询空间；order 数组语法还能订阅"命名空间加载完成"事件（真实项目懒加载时）
  const { t, i18n } = useTranslation(['menu', 'common'])
  const [name, setName] = useState('小美')
  const [order, setOrder] = useState({ espresso: 0, latte: 0, mocha: 0 })
  const [showMissing, setShowMissing] = useState(false)

  const total = order.espresso + order.latte + order.mocha

  function addOne(id) {
    // 第 1 课的不可变更新：换字段引用而不是原地 ++——i18n 不相关，这是 React 一贯的老规矩
    setOrder((prev) => ({ ...prev, [id]: prev[id] + 1 }))
  }

  return (
    <div className="card">
      <h2>{t('common:menuTitle')}</h2>

      {/* 插值示例：顾客名字是 state，打进欢迎语。input 的值和显示的句子来自同一个 state，
          所以"输入名字 → 句子实时变"和"切语言 → 句子实时变"是同一种重渲染，只是触发源不同 */}
      <div className="l33-name-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          aria-label={t('namePlaceholder')}
        />
        <p className="l33-welcome">
          {t('welcome', { name })} <small>({i18n.language})</small>
        </p>
      </div>

      <ul className="l33-menu-grid">
        {MENU_IDS.map((id) => (
          <li key={id} className="l33-menu-item">
            <strong>{t(`${id}.name`)}</strong>
            <span className="l33-price">{t('price', { price: PRICES[id] })}</span>
            {/* 嵌套翻译：t(`${id}.origin`) 的结果再填进 desc 的 {{origin}}。
                模板字符串拼 key 是合法的，但拼出来的 key 必须真实存在，否则触发 missingKey */}
            <p className="l33-desc">{t(`${id}.desc`, { origin: t(`${id}.origin`) })}</p>
            {/* 复数示例：count = 剩余库存。en 下点 4 杯浓缩 → 剩 1 → 文案从 servings 变 serving，
                "复数在语言切换和数量变化时都会实时重算" */}
            <p className="l33-stock">{t('stock', { count: STOCK - order[id], name: t(`${id}.name`) })}</p>
            <button type="button" onClick={() => addOne(id)}>
              {t('add')}
            </button>
          </li>
        ))}
      </ul>

      <div className="l33-order-bar">
        <h3>{t('orderTitle')}</h3>
        {/* count 是"魔法参数"：它既当复数规则的判定依据，也自动可插值（{{count}}）。
            total=0 时 en 走 cups_other（0 不算 one！），zh 永远 cups_other */}
        <p>{total === 0 ? t('empty') : t('cups', { count: total })}</p>
        <button type="button" onClick={() => setOrder({ espresso: 0, latte: 0, mocha: 0 })} disabled={total === 0}>
          {t('clear')}
        </button>
      </div>

      <div className="l33-fallback">
        <h3>{t('fallbackTitle')}</h3>
        {showMissing ? (
          <p className="l33-fallback-result">
            {t('fallbackResult')}：<code>{t('oops.notHere')}</code>
          </p>
        ) : (
          <button type="button" onClick={() => setShowMissing(true)}>
            {t('fallbackButton')}
          </button>
        )}
        <p className="hint">{t('fallbackNote')}</p>
      </div>
    </div>
  )
}
