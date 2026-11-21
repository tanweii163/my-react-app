// 第 31 课 · app/LikeButton.tsx —— 'use client'：水合边界上的交互岛
//
// 本文件教什么：
//   1. 文件顶部的 'use client' 是一条【边界声明】，必须放在最顶部：
//      它告诉打包器"从本文件起，进入客户端世界"——useState/事件处理器只有
//      客户端组件能用；没有这行，page.tsx 里写 onClick 会直接构建报错；
//   2. RSC 默认不可交互：服务端组件渲染完 HTML 就结束了，浏览器里没有它
//      的 JS 在运行——不是"写错了不生效"，而是那部分代码根本没被发到浏览器；
//   3. 水合（hydration）：首次访问时按钮 HTML 已经在页面上（服务端吐的），
//      但点了没反应；等这份组件的 JS 下载并执行完，React "接管" DOM，
//      按钮才开始响应——这个从"死 HTML"到"活页面"的过程就是水合。
"use client";

import { useState } from "react";

interface LikeButtonProps {
  initialLabel: string;
}

export default function LikeButton({ initialLabel }: LikeButtonProps) {
  const [likes, setLikes] = useState(0); // state 只存在于客户端组件

  return (
    <button onClick={() => setLikes((n) => n + 1)}>
      {initialLabel} · 点赞 {likes}
    </button>
  );
}
