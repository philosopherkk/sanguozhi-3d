import type { FactionProfile } from '../../lib/factionYearView'
import type { HeianFactionId } from '../types'

function fact(text: string, source: string, disputed?: boolean) {
  return disputed ? { text, source, disputed: true as const } : { text, source }
}

/** 平安末無石高總冊。人口、兵、糧寫通說能支持的概況。 */
export const HEIAN_SITUATION: Record<HeianFactionId, FactionProfile> = {
  平氏: {
    population: fact(
      '平氏知行與莊園人口沒有全國總冊。',
      '日本中世史通說',
    ),
    military: fact(
      '保元、平治後掌握朝廷軍權。出陣人數隨役而異，軍記數字不宜當兵籍。',
      '《吾妻鏡》系；日本中世史通說',
      true,
    ),
    grain: fact('西國莊園年貢支撐在京活動。斛數不載。', '日本中世史通說'),
    politics: fact('清盛以後專權；1185年壇之浦滅亡。', '日本中世史通說'),
    economy: fact('日宋貿易與西國莊園是重要財源。', '日本中世史通說'),
  },
  源氏: {
    population: fact('河內源氏與關東御家人沒有合併口數。', '日本中世史通說'),
    military: fact(
      '賴朝自1180年組關東軍。壇之浦時主力在西海，人數記載不一。',
      '《吾妻鏡》系',
      true,
    ),
    grain: fact('關東年貢。斛數不載。', '日本中世史通說'),
    politics: fact('石橋山後據鎌倉，1185年滅平氏。', '日本中世史通說'),
    economy: fact('東國武士領是財政基礎。', '日本中世史通說'),
  },
  朝廷: {
    population: fact('京都人口不詳。', '日本中世史通說'),
    military: fact('院與天皇本身兵力有限，常依平氏或源氏。', '日本中世史通說'),
    grain: fact('公家庄园。斛數不載。', '日本中世史通說'),
    politics: fact('名義中心在京都；軍權多在武家。', '日本中世史通說'),
    economy: fact('京中商業與庄园。', '日本中世史通說'),
  },
}
