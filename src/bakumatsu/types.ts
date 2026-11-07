export type BakumatsuFactionId = '幕府' | '薩長' | '奧羽'

export const BAKUMATSU_FACTIONS: {
  id: BakumatsuFactionId
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
  eraIntro: string
}[] = [
  {
    id: '幕府',
    name: '幕府',
    color: '#1E3A8A',
    activeFrom: 1853,
    activeTo: 1869,
    source: '日本近代史通說：德川幕府至1868年江戶開城失去領地，殘餘戰至1869年箱館',
    eraIntro:
      '幕末的德川幕府仍是征夷大將軍的武家政權，人在江戶。黑船以後，條約、將軍繼嗣和朝廷同時把這個政權拖入危機。1867年大政奉還只交出名號，1868年鳥羽伏見和江戶開城之後才失去領地。這不是家康在1600年的幕府，家康已在1616年去世。',
  },
  {
    id: '薩長',
    name: '薩長',
    color: '#B91C1C',
    activeFrom: 1866,
    activeTo: 1869,
    source: '日本近代史通說：薩摩、長州為倒幕主力。1868年起土佐等藩併入同色示意',
    eraIntro:
      '薩摩藩和長州藩在1866年結盟，是倒幕的軍事核心。1868年以後土佐等藩併入同色，只表示他們站在新政府一邊，不是說兩藩的領地在同一天合併。這個時代是幕末到戊辰，不是江戶初期的島津氏入侵琉球。',
  },
  {
    id: '奧羽',
    name: '奧羽',
    color: '#0F766E',
    activeFrom: 1868,
    activeTo: 1868,
    source: '日本近代史通說：奧羽越列藩同盟。1868年抵抗，1869年已不能再守本州',
    eraIntro:
      '1868年東北諸藩組成奧羽越列藩同盟，對抗新政府東征。同盟在當年瓦解，1869年已不能再守本州。箱館的殘餘是榎本武揚一軍，不是這個同盟的延續。色塊只覆蓋1868年的抵抗，不是整個江戶時代的奧羽。',
  },
]
