// 第 11 课 · mock 分页数据源：fetchUsers(page, size, fail, signal)
//
// 本文件教什么：
// 真实项目的数据来自"分页接口"：一次只给一页，附带总数和"有没有下一页"。
// 还没有后端时，我们用一个 mock 函数把分页接口的四个关键行为仿真出来，
// 让上层组件写得跟将来接真接口时一模一样——以后换实现，组件一行不用改：
//   1. 分页切片：第 page 页返回 (page-1)*size 到 page*size 这一段；
//   2. 网络延迟：setTimeout 模拟几百毫秒耗时，让 loading 态真实可见；
//   3. 可取消：接收 AbortSignal，abort 的瞬间就 reject AbortError（和真 fetch 一致）；
//   4. 可失败：fail 标志让请求 reject 一个普通 Error，用来演示错误与重试。
//
// 铁律：mock 的"形状"必须和真接口一致——返回 Promise、resolve 相同结构的数据、
// 以同样的方式 reject。形状对了，mock 换真接口才是无痛替换。

// 内置 30 条用户数据（要求 ≥25 条），字段贴近真实接口：id / name / role / city
const ALL_USERS = [
  { id: 1, name: '张伟', role: '前端工程师', city: '上海' },
  { id: 2, name: '李娜', role: 'UI 设计师', city: '北京' },
  { id: 3, name: '王强', role: '后端工程师', city: '深圳' },
  { id: 4, name: '刘婷', role: '产品经理', city: '杭州' },
  { id: 5, name: '陈杰', role: '测试工程师', city: '广州' },
  { id: 6, name: '杨帆', role: '运维工程师', city: '成都' },
  { id: 7, name: '赵敏', role: '数据分析师', city: '北京' },
  { id: 8, name: '黄浩', role: '移动端工程师', city: '上海' },
  { id: 9, name: '周雪', role: '前端工程师', city: '广州' },
  { id: 10, name: '吴磊', role: '后端工程师', city: '杭州' },
  { id: 11, name: '郑爽', role: 'UI 设计师', city: '深圳' },
  { id: 12, name: '冯超', role: '产品经理', city: '成都' },
  { id: 13, name: '许诺', role: '测试工程师', city: '上海' },
  { id: 14, name: '韩梅', role: '运维工程师', city: '北京' },
  { id: 15, name: '曹阳', role: '数据分析师', city: '广州' },
  { id: 16, name: '彭飞', role: '移动端工程师', city: '杭州' },
  { id: 17, name: '董洁', role: '前端工程师', city: '成都' },
  { id: 18, name: '袁明', role: '后端工程师', city: '上海' },
  { id: 19, name: '蒋琳', role: 'UI 设计师', city: '北京' },
  { id: 20, name: '杜鹏', role: '产品经理', city: '深圳' },
  { id: 21, name: '苏婷', role: '测试工程师', city: '广州' },
  { id: 22, name: '魏东', role: '运维工程师', city: '杭州' },
  { id: 23, name: '何丽', role: '数据分析师', city: '成都' },
  { id: 24, name: '高翔', role: '移动端工程师', city: '上海' },
  { id: 25, name: '林芳', role: '前端工程师', city: '北京' },
  { id: 26, name: '罗凯', role: '后端工程师', city: '广州' },
  { id: 27, name: '宋佳', role: 'UI 设计师', city: '深圳' },
  { id: 28, name: '唐睿', role: '产品经理', city: '杭州' },
  { id: 29, name: '孙悦', role: '测试工程师', city: '成都' },
  { id: 30, name: '马跃', role: '运维工程师', city: '上海' },
]

// 延迟毫秒数：太短 loading 一闪而过看不见，太长演示等得久，700ms 刚好
const NETWORK_DELAY = 700

// 构造一个和真 fetch 被取消时抛出的错误同名的错误对象。
// 上层靠 e.name === 'AbortError' 区分"主动取消"和"真失败"（第 2 课讲过的判断），
// 所以 mock 抛取消错误时 name 必须一模一样，否则上层的判断就失效了。
function makeAbortError() {
  const e = new Error('请求已取消')
  e.name = 'AbortError'
  return e
}

// 分页接口。参数用位置参数保持简单：
//   page  —— 第几页（从 1 开始）
//   size  —— 每页几条
//   fail  —— true 则模拟服务器 500（默认 false）
//   signal —— AbortSignal，由调用方（useFetch）传入，用于取消请求
export function fetchUsers(page = 1, size = 8, fail = false, signal) {
  // 参数先洗一遍：负数/小数页码会算出奇怪的切片，提前拦住
  const p = Math.max(1, Math.floor(page))
  const s = Math.max(1, Math.floor(size))

  return new Promise((resolve, reject) => {
    // setTimeout 模拟"网络耗时"。注意 timer 要存下来——abort 时要清掉它
    const timer = setTimeout(() => {
      // "响应到达"时刻：先看是否已被取消。真 fetch 对取消的请求不会返回数据，
      // mock 也要保持这个语义：取消 → reject AbortError，绝不 resolve
      if (signal?.aborted) {
        reject(makeAbortError())
        return
      }
      if (fail) {
        // 模拟服务器 500：reject 一个普通错误（name 不是 AbortError →
        // 上层的"取消不算错误"判断不会误伤它，会当真失败展示）
        reject(new Error(`模拟失败：第 ${p} 页请求返回 HTTP 500`))
        return
      }
      const start = (p - 1) * s
      const list = ALL_USERS.slice(start, start + s)
      resolve({
        list, // 本页数据（数组，可能比 size 短，最后一页常见）
        page: p, // 回显：本次请求的是第几页
        size: s, // 回显：每页条数
        total: ALL_USERS.length, // 总条数：分页统计"共 N 条"全靠它
        hasMore: start + s < ALL_USERS.length, // 还有下一页吗："加载更多"按钮藏不藏看它
      })
    }, NETWORK_DELAY)

    // 真 fetch 在收到 abort 信号的"瞬间"就 reject，不会傻等响应到达；
    // mock 用 abort 事件监听模拟同样的行为，并顺手清掉定时器
    // （第 2 课铁律：谁开的定时器，谁负责关）。
    // { once: true }：abort 只会发生一次，触发后自动移除监听，避免残留。
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(makeAbortError())
      },
      { once: true },
    )
  })
}
