// 第 8 课页面：自定义 Hook——逻辑复用
//
// 本课主线：
//   自定义 Hook = 名字以 use 开头、内部调用其他 Hook 的普通函数；
//   组件管 UI，Hook 管可复用逻辑；
//   两条规则（只在顶层调用、只在 React 函数里调用）对官方 Hook 和自定义 Hook 一视同仁。
//
// 页面只有一个实战组件 NotesSearch，但它背后组合了两个自定义 Hook：
//   useDebounce（防抖）+ useLocalStorage（持久化）——这正是“逻辑复用”的样子。
import NotesSearch from '../components/lesson8/NotesSearch.jsx'
import './lesson8.css'

function Lesson8() {
  return (
    <div className="page">
      <header>
        <h1>第 8 课：自定义 Hook——逻辑复用</h1>
        <p>
          自定义 Hook 不是新 API，而是“把 useState / useEffect 组合起来起个名字”。
          组件管 UI，Hook 管可复用的逻辑。
        </p>
      </header>
      <main>
        <section className="card">
          <h2>两条铁律（官方 Hook 和自定义 Hook 同样生效）</h2>
          <ol>
            <li>
              <strong>只在最顶层调用</strong>
              ：不要在循环、条件、嵌套函数里调用 Hook。React 靠“调用顺序”识别每次渲染的
              Hook，顺序一乱，状态就会张冠李戴。
            </li>
            <li>
              <strong>只在 React 函数里调用</strong>
              ：组件或另一个自定义 Hook 里可以；普通 JS 函数里不行。这就是自定义 Hook 必须
              use 开头的原因——让检查器认出“它有资格调用 Hook”。
            </li>
          </ol>
          <p className="hint">
            本课两个 Hook 的源码只有二十来行，建议对照着读：
            src/components/lesson8/useLocalStorage.js、src/components/lesson8/useDebounce.js。
          </p>
        </section>

        <NotesSearch />
      </main>
    </div>
  )
}

export default Lesson8
