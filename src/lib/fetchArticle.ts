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
        sourceLabel: 'Grok 百科（頁內摘錄）',
        url: `https://grokipedia.com/page/${slug}`,
      }
    } catch {
      // try next
    }
  }
  return null
}

const HANS_MARKS =
  '国东门马为这来时个对发会过还开关军战书学义与万无产历体从众两汉刘张赵杨陈华实现经统权术号称举击杀师将备贝见说话语记议论许诸请让谁谢谋败胜贼骑鱼鸟龙齐广庆应庄'
const HANT_MARKS =
  '國東門馬為這來時個對發會過還開關軍戰書學義與萬無產歷體從眾兩漢劉張趙楊陳華實現經統權術號稱舉擊殺師將備貝見說話語記議論許諸請讓誰謝謀敗勝賊騎魚鳥龍齊廣慶應莊'

type ZhScript = 'hant' | 'hans' | 'mixed' | 'unknown'

function hasMark(text: string, marks: string): boolean {
  for (const ch of marks) {
    if (text.includes(ch)) return true
  }
  return false
}

function zhScript(text: string): ZhScript {
  const hans = hasMark(text, HANS_MARKS)
  const hant = hasMark(text, HANT_MARKS)
  if (hans && hant) return 'mixed'
  if (hans) return 'hans'
  if (hant) return 'hant'
  return 'unknown'
}

function wikipediaSourceLabel(lang: 'zh' | 'en', extract: string): string {
  if (lang === 'en') return '維基百科摘要（英文）'
  const script = zhScript(extract)
  switch (script) {
    case 'hant':
      return '維基百科摘要（繁體）'
    case 'hans':
      return '維基百科摘要（簡體原文）'
    case 'mixed':
      return '維基百科摘要（語體不一）'
    case 'unknown':
      return '維基百科摘要'
    default: {
      const _exhaustive: never = script
      return _exhaustive
    }
  }
}

interface WikiHit {
  title: string
  extract: string
  url: string
}

function toWikiArticle(hit: WikiHit, lang: 'zh' | 'en'): InlineArticle {
  return {
    title: hit.title,
    extract: hit.extract,
    source: 'wikipedia',
    sourceLabel: wikipediaSourceLabel(lang, hit.extract),
    url: hit.url,
    note: 'Grok 百科無法在此環境直接嵌入時，改以維基摘要供頁內閱讀。',
  }
}

async function fetchRestSummary(
  title: string,
  lang: 'zh' | 'en',
): Promise<WikiHit | null> {
  const host = lang === 'zh' ? 'zh.wikipedia.org' : 'en.wikipedia.org'
  const api = `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (lang === 'zh') headers['Accept-Language'] = 'zh-TW, zh-Hant;q=0.9'
  try {
    const res = await fetch(api, { headers })
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
      url:
        data.content_urls?.desktop?.page ??
        `https://${host}/wiki/${encodeURIComponent(title)}`,
    }
  } catch {
    return null
  }
}

async function fetchZhTwVariant(title: string): Promise<WikiHit | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    variant: 'zh-tw',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    titles: title,
    origin: '*',
  })
  try {
    const res = await fetch(`https://zh.wikipedia.org/w/api.php?${params}`)
    if (!res.ok) return null
    const data = (await res.json()) as {
      query?: { pages?: Array<{ title?: string; extract?: string; missing?: boolean }> }
    }
    const page = data.query?.pages?.[0]
    if (!page || page.missing || !page.extract) return null
    const pageTitle = page.title ?? title
    return {
      title: pageTitle,
      extract: page.extract,
      url: `https://zh.wikipedia.org/zh-tw/${encodeURIComponent(pageTitle)}`,
    }
  } catch {
    return null
  }
}

async function fetchWikipediaSummary(
  title: string,
  lang: 'zh' | 'en' = 'zh',
): Promise<InlineArticle | null> {
  const rest = await fetchRestSummary(title, lang)
  if (!rest) return null
  if (lang === 'zh' && zhScript(rest.extract) !== 'hant') {
    const variant = await fetchZhTwVariant(title)
    if (variant && zhScript(variant.extract) === 'hant') {
      return toWikiArticle({ ...variant, url: rest.url }, lang)
    }
  }
  return toWikiArticle(rest, lang)
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
    note: '未能擷取遠端條目；請用下方連結開啟 Grok 百科或維基百科。',
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
