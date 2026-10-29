/**
 * Inline encyclopedia text.
 * - Grokipedia: fetched via Vite dev proxy `/api/grok` (avoids browser CORS).
 *   Production static hosts have no proxy — we try direct fetch, then fall back.
 * - Wikipedia REST summary: CORS-friendly fallback for readable inline text.
 */

export type ArticleSource = 'grokipedia' | 'wikipedia' | 'local'

export interface InlineArticle {
  title: string
  extract: string
  source: ArticleSource
  sourceLabel: string
  url: string
  note?: string
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, nav, footer, noscript').forEach((n) => n.remove())
  const main =
    doc.querySelector('article') ??
    doc.querySelector('main') ??
    doc.querySelector('[role="main"]') ??
    doc.body
  const text = (main?.textContent ?? '').replace(/\s+/g, ' ').trim()
  return text.slice(0, 2800)
}

async function fetchGrokipedia(slug: string): Promise<InlineArticle | null> {
  const path = `/page/${encodeURIComponent(slug)}`
  const candidates = [
    `/api/grok${path}`, // vite proxy (dev)
    `https://grokipedia.com${path}`,
  ]

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Accept: 'text/html' } })
      if (!res.ok) continue
      const html = await res.text()
      const extract = stripHtml(html)
      if (extract.length < 80) continue
      return {
        title: slug.replace(/_/g, ' '),
        extract,
        source: 'grokipedia',
        sourceLabel: 'Grokipedia（頁內摘錄）',
        url: `https://grokipedia.com/page/${slug}`,
      }
    } catch {
      // try next
    }
  }
  return null
}

async function fetchWikipediaSummary(
  title: string,
  lang: 'zh' | 'en' = 'zh',
): Promise<InlineArticle | null> {
  const host = lang === 'zh' ? 'zh.wikipedia.org' : 'en.wikipedia.org'
  const api = `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  try {
    const res = await fetch(api, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
    }
    if (!data.extract) return null
    return {
      title: data.title ?? title,
      extract: data.extract,
      source: 'wikipedia',
      sourceLabel: lang === 'zh' ? '維基百科摘要（繁中 API）' : 'Wikipedia summary',
      url: data.content_urls?.desktop?.page ?? `https://${host}/wiki/${encodeURIComponent(title)}`,
      note: 'Grokipedia 無法在此環境直接嵌入時，改以維基摘要供頁內閱讀。',
    }
  } catch {
    return null
  }
}

export async function loadFactionInlineArticle(opts: {
  grokipediaSlug: string
  zhwikiTitle: string
  fallbackTitle: string
  fallbackBlurb: string
}): Promise<InlineArticle> {
  const grok = await fetchGrokipedia(opts.grokipediaSlug)
  if (grok) return { ...grok, title: opts.fallbackTitle }

  const wiki = await fetchWikipediaSummary(opts.zhwikiTitle, 'zh')
  if (wiki) return wiki

  return {
    title: opts.fallbackTitle,
    extract: opts.fallbackBlurb,
    source: 'local',
    sourceLabel: '本站說明',
    url: `https://grokipedia.com/page/${opts.grokipediaSlug}`,
    note: '未能擷取遠端條目；請用下方連結開啟 Grokipedia／維基。',
  }
}

export async function loadPersonInlineArticle(opts: {
  name: string
  grokipediaUrl?: string
  zhwikiUrl: string
  localNote?: string
}): Promise<InlineArticle> {
  let slug: string | undefined
  if (opts.grokipediaUrl) {
    const m = opts.grokipediaUrl.match(/\/page\/([^?#]+)/)
    slug = m ? decodeURIComponent(m[1]) : undefined
  }

  if (slug) {
    const grok = await fetchGrokipedia(slug)
    if (grok) return { ...grok, title: opts.name }
  }

  // Derive wiki title from zh URL path
  let wikiTitle = opts.name
  try {
    const u = new URL(opts.zhwikiUrl)
    const parts = u.pathname.split('/')
    const last = parts[parts.length - 1]
    if (last) wikiTitle = decodeURIComponent(last)
  } catch {
    // keep name
  }

  const wiki = await fetchWikipediaSummary(wikiTitle, 'zh')
  if (wiki) return { ...wiki, title: opts.name }

  return {
    title: opts.name,
    extract: opts.localNote ?? `${opts.name}——詳見正史紀傳與下方百科連結。`,
    source: 'local',
    sourceLabel: '本站說明',
    url: opts.grokipediaUrl ?? opts.zhwikiUrl,
    note: '未能擷取遠端條目；請用下方連結開啟。',
  }
}
