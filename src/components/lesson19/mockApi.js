// 第 19 课 · mock 异步接口：likePost() 与 postComment()
//
// 本文件教什么：
// React 19 的两大新特性（useActionState、useOptimistic）都围绕"异步提交"展开。
// 为了在浏览器里真实感受 pending / 成功 / 失败三条路径，我们用两个 mock 函数
// 把"服务器"仿真出来。形状铁律和第 11 课一样：
//   - 返回 Promise，几百毫秒延迟让 pending 态肉眼可见；
//   - fail=true 时 reject 普通 Error，模拟 HTTP 500，用来演示回滚与错误提示。
// 组件层写法以后接真接口一行不用改——这正是 mock 存在的意义。

// 延迟 800ms：足够长，才能看清"乐观更新先变、确认后再落定"的两段过程
const NETWORK_DELAY = 800

// 延迟一小段并决定成败的公共骨架：resolve 返回数据，fail 时 reject 普通错误。
// 注意失败抛的是普通 Error（不带 AbortError 之类的特殊标记）——
// 本课不关心取消，只关心"成功 vs 失败"两条路。
function delay(ms, fail, message) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject(new Error(message))
      } else {
        resolve()
      }
    }, ms)
  })
}

// 点赞接口。fail 由页面上"模拟失败"开关传入——主动验证失败路径，
// 而不是祈祷服务器永远不挂（第 11 课建立的测试习惯，这里继续用）。
export function likePost(fail = false) {
  return delay(NETWORK_DELAY, fail, '点赞失败：服务器开小差了（HTTP 500）')
}

// 发评论接口。fail 同样由开关控制；成功返回服务器盖章后的评论对象
// （真实场景里 id、createdAt 通常由服务器生成，所以由"接口"返回而不是前端造）。
export async function postComment(text, fail = false) {
  await delay(NETWORK_DELAY, fail, '评论失败：服务器开小差了（HTTP 500）')
  return {
    id: Date.now(), // mock：用时间戳充当服务器生成的唯一 id
    text,
    createdAt: new Date().toLocaleTimeString(),
  }
}
