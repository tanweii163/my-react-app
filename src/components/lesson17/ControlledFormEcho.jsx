// 第 17 课 · ControlledFormEcho —— 纯手写受控表单的最小对照版（第 1 课风格）
//
// 本文件教什么：
// 把第 1 课 TodoList 的表单写法原样放大到 4 个字段，一个库都不用，故意让你数样板：
//   4 个值 state + 4 个错误 state + 4 份 onChange（还得顺手清自己的旧错误）
//   + 一个 validate() 手写全部规则 + 提交时 preventDefault + 成功后 4 行手动清空。
// 规则、中文消息、展示位置三样东西散落在组件各处，全靠人肉对齐——
// 字段数翻倍，这份清单也跟着翻倍。
// 对照 ResourceForm.jsx：那边组件里只剩 2 个 useState + 4 个 {...register(字段)}，
// 规则与消息全部集中声明在 schema.js。
import { useState } from 'react'

// 手写版里连"URL 合法"都要自己造轮子；库版里这就是 z.url() 一行
function isParseableUrl(text) {
  try {
    new URL(text)
    return true
  } catch {
    return false
  }
}

function ControlledFormEcho() {
  // —— 值 state ×4：受控组件铁三角的第一角（value 由 state 驱动）——
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')

  // —— 错误 state ×4：和值一一配对，纯靠命名约定对齐（name ↔ nameError）——
  const [nameError, setNameError] = useState('')
  const [urlError, setUrlError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [noteError, setNoteError] = useState('')

  // 最近一次成功提交的 JSON：为了和 ResourceForm 展示同样的结果
  const [result, setResult] = useState('')

  // 手写校验：规则和消息写在一起，但和 JSX 里的展示位置隔着十万八千里。
  // 每个字段都要走三岔口：错 → 设消息；没错 → 清掉上一轮的旧错误
  const validate = () => {
    let ok = true
    const trimmedName = name.trim()

    if (!trimmedName) {
      setNameError('名称必填')
      ok = false
    } else if (trimmedName.length < 2 || trimmedName.length > 20) {
      setNameError('名称 2–20 个字符')
      ok = false
    } else {
      setNameError('')
    }

    if (!url.trim()) {
      setUrlError('URL 必填')
      ok = false
    } else if (!isParseableUrl(url.trim())) {
      setUrlError('请输入合法的 URL（记得带上 https://）')
      ok = false
    } else {
      setUrlError('')
    }

    if (!category) {
      setCategoryError('请选择一个分类')
      ok = false
    } else {
      setCategoryError('')
    }

    if (note.length > 50) {
      setNoteError('备注最多 50 字')
      ok = false
    } else {
      setNoteError('')
    }

    return ok
  }

  const onSubmit = (e) => {
    e.preventDefault() // 铁律：拦下浏览器默认提交（刷新整页）
    if (!validate()) return // 有错：错误已各自就位，原地不动

    setResult(JSON.stringify({ name: name.trim(), url: url.trim(), category, note }, null, 2))
    // 成功后清空：4 个字段 4 行——库版里这只是一句 reset()
    setName('')
    setUrl('')
    setCategory('')
    setNote('')
  }

  return (
    <section className="card">
      <h2>手写对照：第 1 课的受控表单（4 个字段全展开）</h2>

      <form className="lesson17-form" onSubmit={onSubmit}>
        <div className="lesson17-field">
          <label htmlFor="echo-name">资源名称</label>
          <input
            id="echo-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              // 边打字边清旧错误——每份 onChange 都多出来的第四样样板
              if (nameError) setNameError('')
            }}
            placeholder="如：React 官方文档"
          />
          {nameError && <p className="lesson17-error">{nameError}</p>}
        </div>

        <div className="lesson17-field">
          <label htmlFor="echo-url">URL</label>
          <input
            id="echo-url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (urlError) setUrlError('')
            }}
            placeholder="https://..."
          />
          {urlError && <p className="lesson17-error">{urlError}</p>}
        </div>

        <div className="lesson17-field">
          <label htmlFor="echo-category">分类</label>
          <select
            id="echo-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              if (categoryError) setCategoryError('')
            }}
          >
            <option value="">请选择…</option>
            <option value="高优先级">高优先级</option>
            <option value="工具">工具</option>
            <option value="教程">教程</option>
            <option value="文章">文章</option>
          </select>
          {categoryError && <p className="lesson17-error">{categoryError}</p>}
        </div>

        <div className="lesson17-field">
          <label htmlFor="echo-note">备注（可选）</label>
          <textarea
            id="echo-note"
            rows={2}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              if (noteError) setNoteError('')
            }}
            placeholder="最多 50 字，可留空"
          />
          {noteError && <p className="lesson17-error">{noteError}</p>}
        </div>

        <div className="row">
          <button type="submit">提交</button>
        </div>
      </form>

      {result && (
        <div className="lesson17-result">
          <p>提交成功，数据如下：</p>
          <pre>{result}</pre>
        </div>
      )}

      <p className="hint">
        数一数这个文件：9 个 useState、一个四段式 if/else 的 validate()、4 份 onChange
        里各塞了一句"顺手清错误"、成功后 4 行手动清空。同样的表单在 ResourceForm.jsx
        里：组件内 2 个 useState + 4 个 register，规则和中文消息都在 schema.js。
      </p>
    </section>
  )
}

export default ControlledFormEcho
