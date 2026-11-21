// 第 33 课页面 · i18n 国际化
//
// 本文件教什么：
//   1. 页面骨架文案也全部走 t()——"切换语言整页变化"不是菜单卡片的新鲜事，而是从
//      <h1> 到按钮文字每一处文本都经过同一层查表；只要有一处字符串漏网（硬编码），
//      切换时它就成了页面上"钉死"的那块补丁，一眼假；
//   2. 编排页老规矩（第 22/25/30 课）：页面只管摆顺序——头部（标题 + 语言切换器）、
//      菜单演示、选型卡，翻译演示住进组件，页面不碰任何订单 state；
//   3. import '../components/lesson33/i18n.js' 是"副作用导入"：初始化必须在任何 t() 调用之前完成。
//      组件文件各自也 import 了同一个模块（拿到同一个实例），模块只会执行一次——
//      ES Module 的单例语义替我们挡住了"init 两次"的事故；
//   4. 选型卡把第 6 课的手写 Context 字典和 i18next 摆上天平：手写赢在零依赖，
//      库赢在复数/插值/fallback/命名空间这些"文案活起来之后"的工程问题。
import { useTranslation } from 'react-i18next'
import '../components/lesson33/i18n.js' // 副作用导入：先 init，后渲染（组件里 import 的是同一份模块单例）
import LanguageSwitcher from '../components/lesson33/LanguageSwitcher.jsx'
import TranslatedMenu from '../components/lesson33/TranslatedMenu.jsx'
import './lesson33.css'

// 选型卡数据：手写 vs 上库。数据和 JSX 分离（第 20 课老原则）——以后补充判断条目只动这张表。
// key 与资源字典 common 命名空间里的 handwrittenTitle/hw1..3、libraryTitle/lib1..3 对应。
const DECISION = {
  handwritten: { title: 'handwrittenTitle', items: ['hw1', 'hw2', 'hw3'] },
  library: { title: 'libraryTitle', items: ['lib1', 'lib2', 'lib3'] },
}

export default function Lesson33() {
  const { t } = useTranslation('common')

  return (
    <div className="page">
      <header>
        <h1>{t('appTitle')}</h1>
        {/* 切换器不能塞进 <p> 里：div 在 p 内是无效 HTML（浏览器会拆开 p，React 开发期报错）——
            包一层 flex 行让"简介 + 切换器"并排，语义和布局都对 */}
        <div className="l33-head-row">
          <p>{t('intro')}</p>
          <LanguageSwitcher />
        </div>
      </header>

      {/* 菜单演示：t(key) / t(key, 插值) / t(key, { count }) / fallback 四种用法全在里面 */}
      <TranslatedMenu />

      {/* 选型卡：什么时候手写就够，什么时候上库 */}
      <section className="card">
        <h2>{t('decisionTitle')}</h2>
        <p>{t('decisionIntro')}</p>
        <div className="l33-decision-grid">
          {['handwritten', 'library'].map((side) => (
            <div key={side} className={`l33-decision-col l33-decision-${side}`}>
              <h3>{t(DECISION[side].title)}</h3>
              <ul>
                {DECISION[side].items.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
