// 第 33 课 · i18n 国际化 —— i18next 实例与翻译资源字典
//
// 本文件教什么：
//   1. i18next 初始化五件套：resources（翻译字典）、lng（初始语言）、fallbackLng（兜底语言）、
//      ns/defaultNS（命名空间）、interpolation（插值配置）；
//   2. 语言检测顺序：localStorage（用户显式选过，最优先）> navigator（浏览器偏好）> 默认 zh；
//      i18next 自带探测要靠 i18next-browser-languagedetector 插件，这里手写三行就是插件的全部原理；
//   3. 复数规则的语言差异：en 按 Intl.PluralRules 把 count 分成 one/other 两类，
//      所以 en 字典要备 _one/_other 两套后缀；zh 永远命中 _other（中文量词名词不随数变形）——
//      同一个 key，后缀表按语言走，这正是手写 if-else 字典最先崩掉的地方；
//   4. 为什么 createInstance() 而不是直接用 i18next 默认单例：默认实例是全局共享的，
//      微前端/多应用同页运行时会互相覆盖 init 配置；自己的实例自己管，谁 import 谁负责。
//
// 持久化的分工：读在本文件（init 时的 detectLanguage），写在使用时（LanguageSwitcher 点击时
// setItem）。i18next 本身不持久化语言——没有探测器插件时，changeLanguage 换完内存里的语言就结束了，
// 刷新后回到 detectLanguage() 的判定，localStorage 就是那个"上一次的选择"。

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// localStorage 的 key 用"应用名:用途"格式：应用里可能有很多持久化键，撞 key 是常见事故
export const LANG_KEY = 'my-react-app:lang'

// —— 语言检测：优先级从高到低，命中即返回 ——
// 都没命中才落到默认 'zh'。只认白名单里的值：localStorage 可能被手改/残留成任意字符串，
// 不校验就会把垃圾值当语言传给 init（易错点：init 不报错，但整页 t() 全部落空走 fallback）。
function detectLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    // 隐私模式/禁用 storage 时 getItem 会抛错——检测失败就继续往下走，绝不能让 init 跟着崩
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  if (nav.startsWith('zh')) return 'zh' // 浏览器偏好 zh-CN / zh-TW 都归并成 zh
  if (nav.startsWith('en')) return 'en'
  return 'zh' // 三重兜底：项目面向中文读者，默认中文而不是报错
}

// —— 资源字典：语言 → 命名空间 → key 三层组织 ——
// key 组织策略（详见 doc/lesson-33.md）：
//   · 命名空间按"功能"拆：common = 页面骨架/切换器/选型卡，menu = 咖啡菜单。
//     真实项目接后端翻译包时，ns 就是懒加载的下载单位——进菜单页再拉 menu 包，不背全站文案；
//   · key 用 camelCase + 层级（espresso.name），一眼看出归属；永远不要用"拿中文当 key"
//     （key 改文案就要全局改代码，翻译也无法定位）；
//   · 插值占位一律 {{name}} 形状，en/zh 的占位符在各自句子里可以换位置（语序不同）；
//   · 复数 key 是 JSON v4 格式后缀：en 备 _one/_other，zh 只需 _other。
const resources = {
  zh: {
    common: {
      appTitle: '第 33 课：i18n 国际化',
      // menuTitle 放 common（页面骨架/卡片标题属于页面级文案）；菜单自己的内容文案在 menu 里。
      // 跨命名空间取词要显式前缀 t('common:menuTitle')——key 归属一眼可见
      menuTitle: '☕ 咖啡店菜单：t() 的三种用法',
      intro:
        '这一页从标题到按钮没有一处硬编码文案：全部文本都经过 t() 查表。' +
        '点右上角的语言按钮，看整页文本同时换词——没有刷新，只是每个订阅了语言事件的组件各自重渲染。' +
        '讲义见 doc/lesson-33.md。',
      langLabel: '界面语言',
      langZh: '中文',
      langEn: 'English',
      decisionTitle: '🧭 选型卡：i18next 还是手写 Context 字典？',
      decisionIntro:
        '第 6 课写过手写 Context 字典：一个 Provider 存 { zh: {...}, en: {...} }，切语言就是换对象——' +
        '字典本身谁都能写。真正的分水岭是文案"活"起来之后：复数、插值、fallback、按功能拆包，手写版的维护成本会指数上升。',
      handwrittenTitle: '手写就够（第 6 课方案）',
      hw1: '页面只有两三个静态词（页脚版权、一两个按钮）——为它们装一整套 i18next 是杀鸡用牛刀',
      hw2: '文案永远不需要复数和插值——一旦 en 要区分 1 cup / 2 cups，手写字典立刻变成 if-else 大山',
      hw3: '没有翻译协作流程（导出/导入/审校），一种语言副本自己维护就够',
      libraryTitle: '该上 i18next 了（本课方案）',
      lib1: '需要复数规则：后缀类别是语言学的活，i18next 底层调 Intl.PluralRules 按 count 自动选 _one/_other',
      lib2: '需要插值、嵌套、fallback 链：key 写错了返回键名并打控制台警告，而不是把 undefined 渲染到页面上',
      lib3: '文案多了要按命名空间拆分、懒加载：common 常驻，menu 按需拉——本课的 ns 分组就是预演',
    },
    menu: {
      welcome: '欢迎光临，{{name}}！',
      namePlaceholder: '顾客名字',
      espresso: { name: '浓缩咖啡', origin: '埃塞俄比亚', desc: '用 {{origin}} 豆现磨，30 秒萃取' },
      latte: { name: '拿铁', origin: '哥伦比亚', desc: '{{origin}} 豆 + 顺滑蒸奶' },
      mocha: { name: '摩卡', origin: '危地马拉', desc: '{{origin}} 豆 + 黑巧克力' },
      price: '￥{{price}}',
      add: '加一杯',
      orderTitle: '你的订单',
      empty: '还没有点单',
      // 复数 key：zh 永远命中 _other（中文"杯"不随数变形），所以只写一套
      cups_other: '你点了 {{count}} 杯',
      // 插值原料里也能塞另一个 t() 的结果（{{name}} 传的是 t('espresso.name')）
      stock_other: '{{name}} 只剩 {{count}} 份',
      clear: '清空订单',
      fallbackTitle: '🐛 Fallback 演示：调用一个不存在的 key',
      fallbackButton: '调用 t("oops.notHere")',
      fallbackResult: 't() 返回值',
      fallbackNote:
        'key 查不到时，i18next 原样返回键名，并在控制台记录 missingKey 日志（i18next::translator: missingKey）——' +
        'v27 起这类日志要开 debug 才显示（本课已开），宁可响也别静默，警告就是排错路标。',
    },
  },
  en: {
    common: {
      appTitle: 'Lesson 33: i18n (Internationalization)',
      // menuTitle lives in common (page-chrome/card titles are page-level copy); the menu's own
      // content copy lives in menu. Cross-namespace lookup needs the explicit t('common:menuTitle') prefix
      menuTitle: '☕ Coffee shop menu: three ways to call t()',
      intro:
        'Not a single string on this page is hardcoded: every piece of text goes through t(). ' +
        'Click the language buttons on the top right and watch the whole page switch at once — no reload, ' +
        'just every component subscribed to the language event re-rendering on its own. ' +
        'See doc/lesson-33.md for the full notes.',
      langLabel: 'UI language',
      langZh: '中文',
      langEn: 'English',
      decisionTitle: '🧭 Decision card: i18next or a hand-rolled Context dictionary?',
      decisionIntro:
        'Lesson 6 hand-rolled a Context dictionary: a Provider holding { zh: {...}, en: {...} }, ' +
        'switching language just swaps the object — anyone can write a dictionary. ' +
        'The real watershed is when copy comes alive: plurals, interpolation, fallbacks, per-feature bundles. ' +
        'That is where hand-written maintenance cost explodes.',
      handwrittenTitle: 'Hand-roll it (the Lesson 6 way)',
      hw1: 'Only two or three static strings on the page (a footer, a button) — wiring up full i18next for them is overkill',
      hw2: 'No plurals or interpolation ever needed — the moment en must tell "1 cup" from "2 cups", the dictionary turns into an if-else mountain',
      hw3: 'No translation workflow (export/import/review) to integrate with; one language copy, self-maintained',
      libraryTitle: 'Bring in i18next (this lesson)',
      lib1: 'Plural rules needed: suffix categories are linguistics; i18next calls Intl.PluralRules under the hood to pick _one/_other by count',
      lib2: 'Interpolation, nesting, fallback chains needed: a wrong key returns the key name plus a console warning instead of rendering undefined',
      lib3: 'Enough copy to split into namespaces and lazy-load: common stays resident, menu loads on demand — this lesson\'s ns split is the rehearsal',
    },
    menu: {
      welcome: 'Welcome, {{name}}!',
      namePlaceholder: 'Customer name',
      espresso: { name: 'Espresso', origin: 'Ethiopian', desc: 'Freshly ground {{origin}} beans, 30s extraction' },
      latte: { name: 'Latte', origin: 'Colombian', desc: '{{origin}} beans + silky steamed milk' },
      mocha: { name: 'Mocha', origin: 'Guatemalan', desc: '{{origin}} beans + dark chocolate' },
      price: '${{price}}',
      add: 'Add one',
      orderTitle: 'Your order',
      empty: 'Nothing ordered yet',
      // 复数 key：en 按 Intl.PluralRules('en') 分 one/other——注意 0 落在 other（"0 cups"），
      // _one 只属于 1。这就是"复数不是 if(count>1)"的原因。
      cups_one: 'You ordered {{count}} cup',
      cups_other: 'You ordered {{count}} cups',
      stock_one: 'Only {{count}} serving of {{name}} left',
      stock_other: 'Only {{count}} servings of {{name}} left',
      clear: 'Clear order',
      fallbackTitle: '🐛 Fallback demo: calling a key that does not exist',
      fallbackButton: 'Call t("oops.notHere")',
      fallbackResult: 't() returned',
      fallbackNote:
        'When a key is missing, i18next returns the key name verbatim and logs missingKey to the console ' +
        '(i18next::translator: missingKey) — since v27 those logs are debug-gated (this lesson enables debug). ' +
        'Loud beats silent; the warning is your debugging trail.',
    },
  },
}

// —— 初始化：模块加载时执行一次（import 即副作用）——
// .use(initReactI18next) 把实例塞进 react-i18next 的 Provider-less 注入通道：
// 之后任何组件里的 useTranslation() 都能找到这同一个实例。
i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(), // 检测顺序：localStorage > navigator > 默认 zh（见文件顶部）
    fallbackLng: 'zh', // 某语言字典缺 key 时退回 zh——两份字典永不完全同步，fallback 是保险丝
    defaultNS: 'common', // t('appTitle') 不带前缀时查的命名空间
    ns: ['common', 'menu'], // 声明两个命名空间；resources 内联时一次性同步加载（真实项目里 ns = 懒加载单位）
    interpolation: { escapeValue: false }, // React 对 {} 文本已做 XSS 转义（第 27 课），i18next 不必重复转义
    // v27 起 translator 的 missingKey 等日志走 logger.log/warn，而这两级是 debugOnly——
    // 不开 debug 就完全静默，fallback 演示只能看到返回的键名、看不到控制台提示。
    // 教学页打开它让警告现形；生产项目别开（每个解析事件都会刷屏），靠 missingKeyHandler 上报。
    debug: true,
    react: { useSuspense: false }, // 内联资源同步就绪，关掉 Suspense 免掉初始化竞态；
    // 另一面要知道：真实项目接后端翻译包（i18next-http-backend）时未加载完会 suspend，
    // 要么配 <Suspense> 要么读 useTranslation 的 ready 标志——本课两种都不触发，但坑要先认得。
  })

export default i18next
