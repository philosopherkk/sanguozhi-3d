/**
 * Sengoku timeline drill-down (zh-Hant). Chinese Wikipedia + classic Japanese history
 * summaries as cited; no Grokipedia.
 */

export interface SengokuTimelineDetail {
  causes: string
  course: string
  keyFigures: { name: string; role: string }[]
  outcome: string
  /** 通說提要，非逐字引文 */
  brief: string
  zhwikiUrl: string
  furtherReading?: { label: string; url: string }[]
}

export const SENGOKU_TIMELINE_DETAILS: Record<string, SengokuTimelineDetail> = {
  '1467-onin': {
    causes:
      '將軍足利義政繼承人問題（弟義視與子義尚）引發細川勝元、山名宗全兩大守護派系對立，京都政爭失控。',
    course:
      '應仁元年（1467）兩軍於京都交戰，戰火延燒十餘年，諸國守護大名捲入，京中化為焦土。',
    keyFigures: [
      { name: '足利義政', role: '室町將軍，統治無力' },
      { name: '細川勝元', role: '東軍領袖' },
      { name: '山名宗全', role: '西軍領袖' },
    ],
    outcome:
      '幕府權威崩壞，地方大名各自為政；史家多以此為日本戰國時代開端之一。',
    brief:
      '應仁、文明年間京都戰亂長達十餘年，公家、寺院、町眾同受其害。守護在京，領國則由守護代與國人掌控，下剋上由此加速。開端年份亦有以明應政變（1493）為說者。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/應仁之亂',
  },
  '1543-teppo': {
    causes: '大航海時代歐洲人東來；葡萄牙船漂流至種子島。',
    course: '島主種子島時堯購入火繩槍並令工匠仿造，技術傳入畿內與諸國。',
    keyFigures: [
      { name: '種子島時堯', role: '引入並仿造鐵砲' },
    ],
    outcome:
      '鐵砲改變野戰與攻城；長篠等戰役可見其戰術影響。',
    brief:
      '火繩槍由種子島仿造後，經堺、國友等地工匠擴散。大名既用於野戰齊射，亦用於攻城；築城由山城漸向平城、水堀與石垣發展。傳入年份通作天文十二年（1543），細節仍有異說。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/鐵砲傳來',
  },
  '1560-okinawaga': {
    causes:
      '今川義元率大軍上洛，途經尾張；織田信長兵力遠遜，採奇襲。',
    course:
      '永祿三年五月，信長襲擊義元本陣於桶狹間，義元戰死，今川軍潰散。',
    keyFigures: [
      { name: '織田信長', role: '奇襲取勝' },
      { name: '今川義元', role: '駿河今川家督，戰死' },
    ],
    outcome:
      '今川氏衰退，信長打開上洛之路；德川家康（松平元康）亦趁機自立。',
    brief:
      '義元號稱數萬上洛，信長以寡兵襲本陣。戰後今川領國分裂，松平元康（家康）脫離今川，與信長結盟。此戰常被視為信長霸業起點，兵力數字軍記多有誇張。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/桶狹間之戰',
  },
  '1573-muromachi-end': {
    causes: '將軍足利義昭與信長決裂，密謀聯合反織田勢力。',
    course: '天正元年信長攻義昭，將軍被放逐出京，室町幕府名實俱亡。',
    keyFigures: [
      { name: '織田信長', role: '放逐將軍' },
      { name: '足利義昭', role: '末代室町將軍' },
    ],
    outcome: '中央再無足利權威；信長以「天下人」姿態推進統一。',
    brief:
      '義昭出京後仍以將軍名義聯絡反織田勢力，但已無京都政權。室町幕府自足利尊氏以來約二百四十年，至此名實俱亡。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/室町幕府',
  },
  '1575-nagashino': {
    causes: '武田勝賴包圍長篠城；織田・德川聯軍來救。',
    course:
      '天正三年，聯軍於設樂原以柵欄與鐵砲隊抗騎兵突擊，武田軍大敗。',
    keyFigures: [
      { name: '織田信長', role: '聯軍主帥' },
      { name: '德川家康', role: '聯軍' },
      { name: '武田勝賴', role: '武田家督，敗退' },
    ],
    outcome: '武田騎兵神話破滅，甲斐武田走向滅亡（1582）。',
    brief:
      '設樂原之戰，織田、德川以馬防柵與分段射擊對付武田騎兵突擊。山縣昌景、馬場信春等宿將戰死。七年後武田氏滅。鐵砲數量與「三段擊」細節，軍記與研究仍有出入。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/長篠之戰',
  },
  '1582-honnoji': {
    causes:
      '明智光秀與信長君臣矛盾激化（原因史有多說：怨恨、野心、將軍陰謀等）。',
    course:
      '天正十年六月，光秀突然襲擊本能寺，信長自刃（或燒死）；同時襲二條御所，信忠自刃。',
    keyFigures: [
      { name: '明智光秀', role: '發動政變' },
      { name: '織田信長', role: '橫死' },
      { name: '織田信忠', role: '信長嫡子，同日死' },
    ],
    outcome: '織田統一中斷；秀吉自中國大撤退並討伐光秀，奪取主導權。',
    brief:
      '光秀動機有怨恨、野心、足利義昭陰謀等說，尚無定論。信長死訊傳出後，柴田、秀吉、家康各自行動；最先回師討光秀者為秀吉，故能奪取主導。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/本能寺之變',
  },
  '1582-yamazaki': {
    causes: '秀吉聞本能寺之變，與毛利議和後急行軍返京討賊。',
    course: '山崎（天王山）一戰擊破光秀，光秀敗走中被殺。',
    keyFigures: [
      { name: '羽柴秀吉', role: '討伐光秀' },
      { name: '明智光秀', role: '敗死' },
    ],
    outcome: '秀吉取得信長死後最大話語權，經清洲會議擴張領地。',
    brief:
      '秀吉自備中急行，約十日抵攝津，於天王山麓破光秀。光秀敗走小栗栖被土民所殺之說見於通說。其後清洲會議以三法師為名義繼承人，實權漸歸秀吉。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/山崎之戰',
  },
  '1590-odawara': {
    causes: '後北條氏割據關東，拒不服從秀吉號令。',
    course: '天正十八年秀吉大軍包圍小田原，北條氏政開城投降，後被賜死。',
    keyFigures: [
      { name: '豐臣秀吉', role: '總帥' },
      { name: '北條氏政', role: '後北條家督，亡' },
      { name: '德川家康', role: '參戰，事後轉封關東' },
    ],
    outcome:
      '秀吉名義上統一日本；家康移封關東，埋下日後霸權基礎。',
    brief:
      '北條氏政開城後被賜死，氏直流放。秀吉將家康由東海轉封關東，自己掌控上方；東北伊達等亦入其號令。蝦夷地仍在和人政權邊緣。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/小田原征伐',
  },
  '1592-bunroku': {
    causes: '秀吉欲征服朝鮮乃至明朝，動員諸大名渡海。',
    course:
      '文祿元年出兵，初連戰皆捷；朝鮮乞援於明，戰線膠著，後有講和談判，再爆發慶長之役。',
    keyFigures: [
      { name: '豐臣秀吉', role: '決策出兵' },
      { name: '小西行長、加藤清正', role: '渡海大將' },
    ],
    outcome:
      '消耗國力與大名財力；秀吉死後撤軍。朝鮮稱「壬辰倭亂」，明稱「萬曆朝鮮之役」。',
    brief:
      '初戰日軍長驅至漢城、平壤，明軍入援後戰線膠著。文祿講和破裂，慶長再征。秀吉卒後五大老決定撤兵。此役重創朝鮮，亦削弱豐臣體制對諸大名的控制。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/萬曆朝鮮之役',
  },
  '1598-hideyoshi-death': {
    causes: '秀吉年邁病重，朝鮮戰事未了。',
    course: '慶長三年八月卒於伏見；遺命五大老、五奉行輔佐秀賴。',
    keyFigures: [
      { name: '豐臣秀吉', role: '去世' },
      { name: '豐臣秀賴', role: '幼主' },
      { name: '德川家康', role: '五大老之首，權勢最盛' },
    ],
    outcome: '豐臣體制失去核心，家康與反德川派矛盾走向關原。',
    brief:
      '秀吉遺命以五大老、五奉行共輔秀賴。家康居大老之首，擅自婚姻與處分大名，石田三成等奉行派與之決裂，兩年後決戰關原。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/豐臣秀吉',
  },
  '1600-sekigahara': {
    causes:
      '家康處分會津上杉、與石田三成等對立；西國大名組成西軍討伐家康。',
    course:
      '慶長五年九月十五日於關原決戰，小早川秀秋陣前倒戈，西軍崩潰，三成等被斬。',
    keyFigures: [
      { name: '德川家康', role: '東軍主帥' },
      { name: '石田三成', role: '西軍核心，敗死' },
      { name: '小早川秀秋', role: '倒戈關鍵' },
    ],
    outcome: '家康掌握全國分封權，三年後開幕府。',
    brief:
      '關原當日西軍人數不弱，但小早川秀秋倒戈，宇喜多、小西等崩潰，三成、安國寺惠瓊、小西行長被斬。家康其後大幅改易封地，豐臣家僅保有攝津大坂一帶。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/關原之戰',
  },
  '1603-edo-bakufu': {
    causes: '關原大勝後家康取得朝廷任命之政治條件。',
    course: '慶長八年任征夷大將軍，開府江戶，建立德川幕府。',
    keyFigures: [{ name: '德川家康', role: '初代將軍' }],
    outcome: '進入江戶時代；戰國動亂基本結束，然豐臣仍據大坂。',
    brief:
      '家康受朝廷任命為征夷大將軍，幕府設於江戶。兩年後讓位予秀忠，自為大御所，實權仍在。豐臣秀賴尚在，至元和元年方滅。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/江戶幕府',
  },
  '1615-osaka': {
    causes: '幕府忌豐臣殘餘；方廣寺鐘銘事件成為開戰口實。',
    course:
      '慶長十九年冬之陣後再有元和元年夏之陣，大坂城陷，秀賴自刃，豐臣滅亡。',
    keyFigures: [
      { name: '德川家康／秀忠', role: '幕府方' },
      { name: '豐臣秀賴', role: '城陷自刃' },
      { name: '真田信繁', role: '豐臣方名將' },
    ],
    outcome: '豐臣氏絕；常被視為戰國時代終點，幕藩體制確立。',
    brief:
      '冬之陣以和議挖填外堀告終；夏之陣大坂城陷，秀賴與淀殿自刃，豐臣宗家斷絕。其後幕府頒佈一國一城令、武家諸法度，幕藩體制穩定下來。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/大坂之陣',
  },
}

export function sengokuTimelineDetailFor(id: string) {
  return SENGOKU_TIMELINE_DETAILS[id]
}
