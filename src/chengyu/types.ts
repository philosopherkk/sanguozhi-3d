export type ChengyuSourceClass =
  | '經典'
  | '史籍'
  | '和歌'
  | '軍記'
  | '近代定型'
  | '民俗'

export type ChengyuLocale = 'zh' | 'jp' | 'shared'

export type ChengyuEraLink = {
  kind: 'event' | 'person' | 'year'
  id?: string
  year?: number
}

export type ChengyuEntry = {
  id: string
  lemma: string
  reading: string
  meaningZhHant: string
  eraLink: ChengyuEraLink
  source: {
    class: ChengyuSourceClass
    cite: string
  }
  disputed?: boolean
  note?: string
  locale: ChengyuLocale
}
