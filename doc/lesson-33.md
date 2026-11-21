# 第 33 课 · i18n 国际化

第一句 `console.log('Hello, world!')` 写完的那天，"国际化"还离你十万八千里；等你做出第一个真正有人用的页面，就会发现问题来了：文案散落在几百个 JSX 角落里，产品说"加个英文版"。本课学 i18next + react-i18next：把所有文案收进资源字典，用 `t()` 查表渲染，语言切换变成一次 `changeLanguage()`——整页文本实时换词，复数、插值、fallback、命名空间全部交给库。打开 http://localhost:5173/lesson/33 ，点右上角「中文 / English」，观察每一处文本（标题、菜单、按钮、选型卡）同时变化；再点一次「调用 t("oops.notHere")」，看控制台的 missingKey 警告。

## 学习目标

完成本课后，你应该能够：

1. 说清 i18next 初始化五件套：`resources`（字典）、`lng`（初始语言）、`fallbackLng`（兜底）、`ns/defaultNS`（命名空间）、`interpolation`（插值，React 下关 escapeValue）；
2. 实现语言检测顺序 localStorage > navigator > 默认 zh，并把"选择时写入、初始化时读取"的持久化分工讲清楚；
3. 解释 `changeLanguage()` 触发重渲染的完整链路：emit `languageChanged` → 所有 `useTranslation` 订阅组件各自 setState 重渲染——同一套观察者思想（第 28 课），i18next 就是组件外的 store；
4. 会用 `t()` 的三种形态：`t(key)` 纯查表、`t(key, { 插值 })` 占位替换（插值原料可以是另一个 `t()` 的结果）、`t(key, { count })` 自动复数；
5. 能做出选型判断：什么时候手写 Context 字典就够（第 6 课），什么时候该上 i18next。

本课对应的示例代码：

- `src/components/lesson33/i18n.js` —— i18next 实例：zh/en 双语言 × common/menu 双命名空间资源、检测顺序、init 配置
- `src/components/lesson33/LanguageSwitcher.jsx` —— 语言切换按钮组：aria-pressed 高亮、持久化、同步 `<html lang>`
- `src/components/lesson33/TranslatedMenu.jsx` —— 咖啡菜单：三种 `t()` 用法 + fallback 演示
- `src/pages/Lesson33.jsx` —— 页面编排：全翻译的骨架文案 + 菜单 + 选型卡
- `src/pages/lesson33.css` —— 全部 `l33-` 前缀样式

## 核心概念

### key 组织策略：按功能命名空间，不按语言散养

资源字典是三层结构：**语言 → 命名空间 → key**（`resources.zh.menu.cups_other`）。真正要做设计决策的是后两层：

- **按"功能"拆命名空间**：本课拆 `common`（页面骨架、切换器、选型卡）和 `menu`（咖啡菜单）。真实项目接 `i18next-http-backend` 时，ns 就是**懒加载的下载单位**——进菜单页再拉 `menu` 翻译包，首屏不用背全站文案。按"页面"拆也可以，但功能拆出的包能被多个页面复用（订单页和菜单页共用 menu 里的条目），粒度更合理；
- **key 命名**：camelCase + 层级（`espresso.name`），一眼看出归属。两条铁律：**永远不要拿中文当 key**（改文案 = 全局改代码，翻译人员也无法定位），**key 描述"这是什么"而不是"显示成什么"**（`menuTitle` 好，`menuTitle2` 坏）；
- **插值占位** `{{name}}` 在各语言的句子里可以换位置（语序不同），翻译时按目标语序安排占位符即可；
- 组件里用 `useTranslation(['menu', 'common'])` 登记用到的 ns，`t()` 默认查第一个，跨 ns 用显式前缀 `t('common:menuTitle')`——**显式前缀是推荐写法**：key 归属一眼可见，搬组件不会因 defaultNS 变化而断。

### 复数后缀规律：i18next JSON v4 格式

`t(key, { count })` 里 `count` 是魔法参数：它一出现，i18next 就用 **`Intl.PluralRules(当前语言)`** 给 key 拼复数后缀再查表。所以字典里的 key 不是写死的，是"key + 语言专属后缀"：

| 语言 | Intl.PluralRules 类别 | 字典需要的后缀 |
|---|---|---|
| en | one / other（还有 few/many 等，英语用不到） | `cups_one`、`cups_other` |
| zh | 永远 other | 只写 `cups_other` |

三条最容易踩的规律，全部写在 `i18n.js` 的字典注释里：

1. **`_one` 只属于 1**。英语里 0 cups、2 cups 都走 `_other`——"复数"不是 `if (count > 1)`，是查语言学的类别表。这也是为什么手写 `count === 1 ? '杯' : '杯es'` 式字典撑不住：类别划分是每个语言自己的事（俄语 one/few/many/other 四类，阿拉伯语六类）；
2. **zh 永远命中 `_other`**：中文量词名词不随数变形（1 杯 / 2 杯），字典只需要一套文案。但 key 上仍要挂 `_other` 后缀——JSON v4 格式里，带 `count` 查询且没有对应后缀 key 时会查不到；
3. **后缀由 count 的语言决定，不由字典决定**：切到 en 自动开始查 `_one/_other`，切回 zh 自动只查 `_other`。同一行 JSX（`t('cups', { count: total })`）一个字符不改，两种语言都对。

### changeLanguage 的重渲染机制：又是观察者

整页文本"实时变化"的机关，把链路展开只有四步：

```
i18n.changeLanguage('en')
  → 换掉实例内存里的语言字典，emit('languageChanged')
    → react-i18next 给每个 useTranslation 组件挂的订阅器被叫醒（bindI18n 默认值 'languageChanged'）
      → 各组件 setState 重渲染，t() 下一次调用从 en 字典取词
```

没有全局刷新，没有 `location.reload()`——和第 28 课的外部 store 是同一套观察者思想：**i18next 就是活在组件外的 store，react-i18next 就是那层订阅胶水**（`useTranslation` 挂载时订阅、卸载时退订，第 2 课 cleanup 的又一兑现）。这也解释了两个现象：没经过 `useTranslation` 的字符串切换后纹丝不动（它没订阅）；`changeLanguage` 返回 Promise（真实项目从后端拉翻译包要走网络），但订阅机制保证包一到，所有组件立刻跟上。

### 检测顺序与持久化：谁读、谁写

没有 `i18next-browser-languagedetector` 插件时，检测就是手写三行的优先级链：

```
localStorage 里用户显式选过的（最优先，尊重人的意志）
  → navigator.language 浏览器偏好（zh-CN / zh-TW 归并成 zh，en-* 归并成 en）
    → 默认 'zh'（项目面向中文读者，兜底而不是报错）
```

持久化的分工必须分清：**写在使用时**（`LanguageSwitcher` 点击时 `setItem`），**读在初始化时**（`detectLanguage()` 只在 `init` 时跑一次）。i18next 本身不持久化语言——`changeLanguage` 换完内存就结束，刷新后回到检测链，localStorage 就是那个"上一次的选择"。另外 localStorage 可能被手改/残留成任意字符串，读出来要过白名单校验，垃圾值直接当语言传给 `init` 不报错，但整页 `t()` 全部落空走 fallback。

### 硬编码字符串是技术债

"国际化欠债"最典型的形态：第一版全页硬编码中文，某天要做英文版——此时文案已经散在几百个 JSX 角落，和逻辑缠在一起，抽字典的改动量等于重写一遍页面。所以本课的铁律是**从第一行 JSX 开始，界面文案就不准硬编码**：所有文本一律过 `t()`，哪怕字典里暂时只有一种语言。判断"这个字符串该不该进字典"只有一条标准：它是不是"要跟着界面语言变"的文案——语言名自己（「中文 / English」按钮）反而是例外，行业惯例是用目标语言标注自己，不翻译。技术债的可怕之处在于它免费膨胀：今天少抽一个字符串没成本，一年后就是"加英文版"这个需求从两周变成两个月的差额。

### 选型：手写 Context 字典 vs i18next

第 6 课的方案（一个 Context 存 `{ zh: {...}, en: {...} }`，切语言就是换对象）并没有过时，分水岭在文案"活"起来之后：

| 场景 | 手写字典（第 6 课） | i18next（本课） |
|---|---|---|
| 只有两三个静态词（页脚版权、一两个按钮） | ✅ 零依赖，杀鸡不必用牛刀 | 装一整套库是过度设计 |
| 需要复数规则 | ❌ 每种语言类别不同，if-else 大山 | ✅ `Intl.PluralRules` 按语言自动选后缀 |
| 需要插值/嵌套/fallback 链 | ❌ 全要手搓，写错 key 渲染出 `undefined` | ✅ 返回键名 + 控制台警告，宁响勿静 |
| 文案量大、要懒加载 | ❌ 全量打进 bundle | ✅ ns 就是下载单位，按需拉包 |
| 有翻译协作流程（导出/导入/审校） | ❌ 没有生态 | ✅ Crowdin/Lokalise 等工具链现成 |

一句话：**手写赢在零依赖，库赢在"文案活起来之后"的工程问题**。

## 代码导读

### `src/components/lesson33/i18n.js` —— 实例与字典

用 `i18next.createInstance()` 而不是默认单例：默认实例全局共享，微前端/多应用同页时会互相覆盖 init 配置。`.use(initReactI18next)` 把实例接进 react-i18next 的注入通道，之后任何 `useTranslation()` 找到的都是这同一个实例。两个 init 选项值得停下来读：`interpolation: { escapeValue: false }`（React 对 `{}` 文本已做 XSS 转义，第 27 课，i18next 不必重复转义）和 `react: { useSuspense: false }`（内联资源同步就绪，关掉 Suspense 免掉初始化竞态；真实项目接后端翻译包时要么配 `<Suspense>` 要么读 `ready` 标志）。

### `src/components/lesson33/LanguageSwitcher.jsx` —— 切换器

当前语言高亮用 `aria-pressed`（第 26 课 toggle button 语义），不用 `disabled`（会把能选的选项踢出 Tab 序）。两个副作用都在点击/语言变化时做：写 localStorage（持久化）、同步 `<html lang>`（读屏器按 lang 选发音词典——语言换了，页面语义也要换；放 effect 里因为改 document 是渲染外的世界）。

### `src/components/lesson33/TranslatedMenu.jsx` —— 菜单

三种 `t()` 集中在一份 JSX 里：`t('add')` 纯查表；`t('welcome', { name })` 插值（插值原料还可以是另一个 `t()` 的结果——`{{origin}}` 填 `t('espresso.origin')`，嵌套翻译是真实项目每天都在用的组合拳）；`t('cups', { count: total })` 复数。库存行 `t('stock', { count: STOCK - order[id], ... })` 是最好的复数观察点：en 下把浓缩咖啡点到剩 1，文案从 servings 变 serving——**复数在数量变化和语言切换时都会实时重算**。fallback 演示按钮调 `t('oops.notHere')`：返回键名本身、控制台出 missingKey 日志。一个版本细节：**i18next v27 起 missingKey 走 `logger.log`，而 log/warn 两级是 debugOnly——不开 `debug: true` 就完全静默**（本课 init 已开，生产项目靠 `missingKeyHandler` 上报而不是开 debug）。

### `src/pages/Lesson33.jsx` —— 编排页

页面自身零 state，骨架文案（标题、简介、选型卡）全部走 `t()`——切换语言时连 `<h1>` 都换词，这就是"整页变化"和"卡片内变化"的区别。选型卡数据抽成模块常量 `DECISION`，key 与字典一一对应。

## 动手试一试

1. **加第三种语言**：在 `resources` 里加 `ja`（日语）命名空间（可以先只翻译 common），`LANGS` 数组加 `{ code: 'ja', label: '日本語' }`，再给 `detectLanguage` 的 `navigator` 判断加 `startsWith('ja')`。做完检查：切到 ja 时缺的 menu 条目是不是落到了 `fallbackLng`？这正是 fallback 链存在的意义。
2. **用 `returnObjects` 渲染数组**：给 common 加一条 `rules: ['列一', '列二', '列三']`（注意资源值改成数组），组件里 `const rules = t('rules', { returnObjects: true })` 再 `map` 渲染。踩一遍坑：`returnObjects` 拿到的要当**外部数据**校验（不是数组时兜底空数组），否则换语言/换 key 时容易渲染崩。
3. **手写一次探测插件**：把 `detectLanguage` + localStorage 写入封装成 `{ lookup, cache }` 两个函数对象，用 `.use()` 挂给一个新建的 i18next 实例——你会发现这就是 `i18next-browser-languagedetector` 插件的全部原理（顺序、白名单、缓存），插件不是魔法，是约定接口。

## 易错点

1. **拿中文当 key**：`t('欢迎光临')` 短期看着方便，一旦改文案（"欢迎光临"→"欢迎回来"）就要全局改代码，翻译人员拿到 key 列表也无法定位语境。解法：key 描述"这是什么"（`menu.welcome`），文案放字典值里——key 是地址，值才是内容。
2. **zh 字典忘写 `_other` 后缀**：给 `cups` 传了 `count`，zh 字典却写成 `cups: '你点了 {{count}} 杯'`（没后缀）——JSON v4 下带 count 查询会去找 `cups_other`，找不到就 fallback 甚至返回键名。解法：凡是会用 `count` 查的 key，**每种语言**都按 JSON v4 后缀写（zh 只需要 `_other` 一种）。
3. **`changeLanguage` 之后界面没变**：多数是那处文本没走 `useTranslation`/`t()`——比如把翻译结果存进了 `useState` 初始值（`useState(t('title'))`），state 只在首次渲染取值，语言事件叫不醒它。解法：文案必须"渲染时查表"（直接 `t('title')`），不许提前存 state；要存就存 key，渲染时再 `t(key)`。
4. **localStorage 残留脏值**：手改过 localStorage 或旧版本写入过别的值，`lng` 收到垃圾字符串，页面全部显示 fallback 还以为库坏了。解法：检测读值必须过白名单（本课 `detectLanguage` 只认 `'zh'/'en'`），不在白名单就继续走 navigator。
5. **忘了 `escapeValue: false`，页面出现 `&#x27;`**：i18next 默认对插值结果做 HTML 转义，React 场景下等于双重转义，名字里的引号变成实体字符。解法：React 项目显式关掉 i18next 的转义（React 已对 `{}` 文本转义，第 27 课的安全模型仍然成立）；但注意用 `Trans` 组件渲染富文本时另说。

## 自测题

1. 切换语言时，为什么没有写一行"刷新页面"的代码，整页文本却全部变了？如果某个字符串切换后纹丝不动，最可能的原因是什么？
2. `t('cups', { count: 0 })` 在 en 和 zh 下分别查哪个 key？这说明英语复数规则的什么特性？
3. 为什么 `common` 和 `menu` 拆成两个命名空间，而不是全放进一个 `translation` 大包？拆包在真实项目里换来什么能力？
4. 第 6 课的手写 Context 字典和 i18next 的本质差异是什么？给出两个"手写就够"和两个"必须上库"的判断依据。

### 参考答案

1. 机制是订阅：`changeLanguage` emit `languageChanged`，所有 `useTranslation` 组件的订阅器叫醒它们各自重渲染，`t()` 从新字典取词——和第 28 课外部 store 同一套观察者思想。纹丝不动的字符串几乎必然没走 `t()`（硬编码），或者把 `t()` 结果提前存进了 state（首次渲染取值后就与语言脱钩）。
2. en 查 `cups_other`（"0 cups"），zh 查 `cups_other`。说明 `_one` 只属于 1：英语复数类别不是"大于 1 就复数"，而是 `Intl.PluralRules` 查表——0 归 other，俄语还分 few/many。这也是手写 `count > 1` 判断撑不住多语言的原因。
3. ns 是资源的三层组织（语言 → ns → key）里的功能层：本课拆出页面骨架与菜单两个功能域，key 归属清晰、互不污染。真实项目里 ns 就是懒加载的下载单位——`common` 常驻首屏，`menu` 进菜单页再拉，首屏不用背全站文案；翻译协作（导出/审校）也按 ns 分发。
4. 本质差异：手写版只有"查表 + 换表"，库把**文案活了之后**的工程问题产品化了。手写就够：只有两三个静态词、永远没有复数/插值/翻译流程。必须上库：需要复数规则（类别是语言学的活）、需要 fallback 链和 missingKey 警告这类排错机制、文案大到要按 ns 懒加载。

## 下一课预告

第 34 课 · 原子化 CSS（Tailwind）：样式不再一节一节写 `.css` 文件，而是把 `display: flex` 这类声明压成 `className="flex"` 直接长在 JSX 上——样式即类名，类名即标记。会讲 Tailwind v4 的粒度导入（为什么教学项目必须绕开 preflight 全局重置）、原子类的组合心智，以及"什么时候原子类、什么时候还是老实写 CSS"。
