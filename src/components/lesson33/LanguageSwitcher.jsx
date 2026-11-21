// 第 33 课 · 语言切换按钮组
//
// 本文件教什么：
//   1. i18n.changeLanguage() 触发重渲染的完整链路（本课核心机制）：
//      initReactI18next 把 i18n 实例接进 react-i18next → useTranslation 内部给实例挂了
//      languageChanged 事件的订阅（bindI18n 默认值就是 'languageChanged'）→
//      changeLanguage() 换完语言字典后 emit('languageChanged') → 所有 useTranslation 的组件
//      各自 setState 重渲染 → t() 下一次调用从新语言字典里取词。
//      "整页文本实时变化"的全部机关就在这：没有全局刷新、没有 location.reload()，
//      只是每个订阅者各自重渲染——和第 28 课的外部 store 是同一套观察者思想，
//      i18next 就是那个"组件外的 store"，react-i18next 就是那层订阅胶水；
//   2. 切换按钮组的语义：当前语言用 aria-pressed 标记（第 26 课：toggle button 的正确表达），
//      不用 disabled（disabled 会把"能选的选项"从 Tab 序里踢出去）；
//   3. 两个顺手但要紧的副作用：写 localStorage（下一次 detectLanguage() 读它，持久化），
//      同步 <html lang>（读屏器按 lang 选发音词典和断字规则——语言换了页面语义也要换）。

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { LANG_KEY } from './i18n.js'

// 按钮组数据：code 是语言代码（和资源字典顶层 key、localStorage 的值三方对齐），label 是按钮文字。
// 注意 label 永远显示语言自己的名字（中文/English）——"用目标语言标注自己"是语言切换器的行业惯例：
// 用户可能正停在看不懂当前界面语言的状态里，用当前语言翻译选项名反而帮不了他。
const LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
]

export default function LanguageSwitcher() {
  // useTranslation 返回 t（查词函数）和 i18n（实例本体）。
  // 订阅机制就藏在 t 的背后：这个 hook 挂载时订阅 languageChanged，卸载时退订（第 2 课 cleanup）。
  const { t, i18n: i18nInstance } = useTranslation('common')

  // 语言一变就同步 <html lang="...">：读屏发音、连字符断行、拼写检查都读这个属性。
  // 放 effect 里因为改 document 是渲染外的副作用（第 2 课：渲染期不准碰 DOM 之外的世界）。
  useEffect(() => {
    document.documentElement.lang = i18nInstance.language // 'zh' / 'en'
  }, [i18nInstance.language])

  function switchTo(code) {
    // 先持久化再切换：detectLanguage() 只在下次 init 时跑一次，写晚了刷新就丢选择。
    // 真实项目这步通常由 languagedetector 插件的 caches 选项代劳——这里手写以看清原理。
    localStorage.setItem(LANG_KEY, code)
    // 返回 Promise（真实项目从后端拉翻译包要等网络），但内联资源是同步的，
    // emit('languageChanged') 一发，所有 useTranslation 组件立刻重渲染——这就是"实时"。
    i18n.changeLanguage(code)
  }

  return (
    <div className="l33-switcher" role="group" aria-label={t('langLabel')}>
      {/* 语言名不翻译（LANGS 里的 label 是字面量），其余文案全部走 t()——哪个字符串该进字典，
          判断标准只有一条：它是不是"要跟着界面语言变"的文案 */}
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={code === i18nInstance.language ? 'l33-lang-btn l33-lang-btn-active' : 'l33-lang-btn'}
          aria-pressed={code === i18nInstance.language}
          onClick={() => switchTo(code)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
