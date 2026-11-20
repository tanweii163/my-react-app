// 测试前置文件（vitest.config.js 里 setupFiles 指向它）：
// 每个测试文件运行之前，vitest 会先执行一遍本文件。
//
// 本文件只做一件事：把 @testing-library/jest-dom 的自定义匹配器
// （toBeInTheDocument、toHaveClass、toBeDisabled……）装到 expect 上。
// 装不装的区别：装了写 expect(el).toBeInTheDocument()，不装只能写
// expect(el).not.toBeNull()——前者报错信息是人话，后者是禅语。
//
// 本课真实踩过的坑（写在注释里防止你重蹈）：
// 必须用 '@testing-library/jest-dom/vitest' 这个入口，而不是常见文档里的
// '@testing-library/jest-dom'。原因：默认入口找的是 Jest 的【全局】expect；
// 我们的 vitest 配置没开 globals，全局根本没有 expect 这个变量，
// 默认入口一 import 就 ReferenceError。'/vitest' 入口明确从 vitest 包里
// 拿 expect 再扩展，两边严丝合缝。
import '@testing-library/jest-dom/vitest'

// 第二件事：每个用例结束后清空 document.body。
//
// 为什么必须手动做？RTL 平时在"检测到全局 afterEach"时自动挂 cleanup——
// 而我们的 vitest 配置 globals: false，它探测不到，上一个用例渲染的组件
// 会留在页面里，下一个用例 getByRole('button', { name: '3 星' })
// 直接报"Found multiple elements"。
// 手动注册后，每个用例都从一张白纸开始——测试之间互不污染是铁律。
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

