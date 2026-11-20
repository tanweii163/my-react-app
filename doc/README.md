# React 学习课程 · 总目录

> 配套代码仓库：本项目本身。**每课的页面就是教材**——代码里逐行中文注释，
> 本目录的 markdown 是每课的讲解材料。边读 doc、边看代码、边开页面操作。

## 学习方式

1. 打开 http://localhost:5173/ （`npm run dev`），从首页进入课程页
2. 对照 `doc/lesson-N.md` 读讲义，再读对应源码文件的注释
3. 做「动手试一试」练习，「自测题」口答自检
4. 全部学完可回看每课页面，检验是否还能讲出每块代码为什么这么写

## 课程表

| 课 | 主题 | 讲义 | 页面路由 | 核心源码 |
|---|---|---|---|---|
| 1 | JSX、Props、State | [doc/lesson-1.md](lesson-1.md) | `/lesson/1` | `src/pages/Lesson1.jsx`、`src/components/Greeting.jsx`、`Counter.jsx`、`TodoList.jsx` |
| 2 | useEffect 与副作用 | [doc/lesson-2.md](lesson-2.md) | `/lesson/2` | `src/components/TimerDemo.jsx`、`UserList.jsx` |
| 3 | React Router 与多页面 SPA | [doc/lesson-3.md](lesson-3.md) | `/`（路由本身） | `src/main.jsx`、`src/App.jsx`、`src/pages/Home.jsx` |
| 4 | 状态提升与组件通信 | [doc/lesson-4.md](lesson-4.md) | `/lesson/4` | `src/components/lesson4/` |
| 5 | useRef 与 DOM 操作 | [doc/lesson-5.md](lesson-5.md) | `/lesson/5` | `src/components/lesson5/` |
| 6 | useContext 与跨层传值 | [doc/lesson-6.md](lesson-6.md) | `/lesson/6` | `src/components/lesson6/` |
| 7 | useReducer 与复杂状态 | [doc/lesson-7.md](lesson-7.md) | `/lesson/7` | `src/components/lesson7/` |
| 8 | 自定义 Hook | [doc/lesson-8.md](lesson-8.md) | `/lesson/8` | `src/components/lesson8/` |
| 9 | 渲染机制与性能优化 | [doc/lesson-9.md](lesson-9.md) | `/lesson/9` | `src/components/lesson9/` |
| 10 | 综合实战：学习笔记应用 | [doc/lesson-10.md](lesson-10.md) | `/lesson/10` | `src/components/lesson10/` |
| 11 | 数据获取进阶 | [doc/lesson-11.md](lesson-11.md) | `/lesson/11` | `src/components/lesson11/` |
| 12 | 代码分割与懒加载 | [doc/lesson-12.md](lesson-12.md) | `/lesson/12` | `src/components/lesson12/` |
| 13 | 错误边界 | [doc/lesson-13.md](lesson-13.md) | `/lesson/13` | `src/components/lesson13/` |
| 14 | 并发渲染 | [doc/lesson-14.md](lesson-14.md) | `/lesson/14` | `src/components/lesson14/` |
| 15 | 测试入门 | [doc/lesson-15.md](lesson-15.md) | `/lesson/15` | `src/components/lesson15/` |
| 16 | TanStack Query 数据请求 | [doc/lesson-16.md](lesson-16.md) | `/lesson/16` | `src/components/lesson16/` |
| 17 | react-hook-form + zod 表单 | [doc/lesson-17.md](lesson-17.md) | `/lesson/17` | `src/components/lesson17/` |
| 18 | Zustand 状态管理 | [doc/lesson-18.md](lesson-18.md) | `/lesson/18` | `src/components/lesson18/` |
| 19 | React 19 新特性 | [doc/lesson-19.md](lesson-19.md) | `/lesson/19` | `src/components/lesson19/` |
| 20 | 综合实战 II：课程进度看板 | [doc/lesson-20.md](lesson-20.md) | `/lesson/20` | `src/components/lesson20/` |

## 课程主线（一条致学习的暗线）

```
UI = f(state)                    ← 第 1 课：一切的开始
  + 副作用怎么办                 ← 第 2 课：useEffect
  + 多页面怎么组织               ← 第 3 课：Router
  + state 该放哪                 ← 第 4 课：状态提升
  + 不该进 state 的值放哪        ← 第 5 课：useRef
  + 跨层共享                     ← 第 6 课：Context
  + 复杂状态迁移收敛             ← 第 7 课：useReducer
  + 逻辑复用                     ← 第 8 课：自定义 Hook
  + 什么时候需要管性能           ← 第 9 课：memo/useMemo/useCallback
  = 独立完成一个真实小应用       ← 第 10 课：综合实战
  ──────────── 进阶篇 ────────────
  + 请求的工程化                 ← 第 11 课：useFetch/分页/重试
  + 按需加载                     ← 第 12 课：lazy/Suspense
  + 渲染出错的兜底               ← 第 13 课：ErrorBoundary
  + 大列表不卡输入               ← 第 14 课：useTransition/useDeferredValue
  + 给代码上保险                 ← 第 15 课：Vitest + Testing Library
  ──────────── 实战库篇 ────────────
  + 请求库                       ← 第 16 课：TanStack Query
  + 表单库                       ← 第 17 课：react-hook-form + zod
  + 状态库                       ← 第 18 课：Zustand
  + 最新语言特性                 ← 第 19 课：React 19 Actions
  + 生态整合                     ← 第 20 课：综合实战 II
```

## 项目结构约定

```
src/
  main.jsx        # 入口 + 路由表（加新课在这里加一行）
  App.jsx         # 布局外壳：顶部导航 + <Outlet/>
  pages/          # 每课一个页面组件（LessonN.jsx）
  components/     # 第 1–2 课组件（平铺）
    lessonN/      # 第 4 课起每课一个子目录，自包含
doc/              # 每课讲义 + 本目录
```

## 加新课的固定三步

1. 写 `src/pages/LessonN.jsx`（第 4 课起组件放 `src/components/lessonN/`）
2. `src/main.jsx` 路由表加一行
3. `src/pages/Home.jsx` 的 `lessons` 数组加一条，`doc/` 加讲义

## 开发命令

```bash
npm run dev     # 启动 http://localhost:5173/（热更新）
npm run lint    # 代码检查（oxlint）
npm run build   # 生产构建
```
