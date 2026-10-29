import { useEffect, useState } from 'react'
import {
  loadPersonInlineArticle,
  type InlineArticle,
} from '../lib/fetchArticle'
import { personWikiRef } from '../lib/personWiki'

/** 撳開人物後立即載入維基摘要，並給出條目連結。 */
export function PersonWiki({
  name,
  localNote,
}: {
  name: string
  localNote?: string
}) {
  const ref = personWikiRef(name)
  const [article, setArticle] = useState<InlineArticle | null>(null)
  const [loading, setLoading] = useState(ref.matched)

  useEffect(() => {
    if (!ref.matched) return
    let cancelled = false
    setLoading(true)
    void loadPersonInlineArticle({
      name,
      zhwikiUrl: ref.url,
      localNote,
    }).then((loaded) => {
      if (!cancelled) setArticle(loaded)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [name, ref.matched, ref.url, localNote])

  if (!ref.matched) {
    return <p className="person-note">未對上百科條目。{ref.reason}</p>
  }

  return (
    <div className="person-wiki">
      {loading ? <p>正在載入百科摘要…</p> : null}
      {article ? <p>{article.extract}</p> : null}
      <p>
        <a href={article?.url || ref.url} target="_blank" rel="noreferrer">
          中文維基百科：{ref.title}
        </a>
      </p>
    </div>
  )
}
