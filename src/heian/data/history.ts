import type { EraDetail, EraEvent, EraPerson, EraReading } from '../../japanEras/types'

const SRC_EARLY = '日本中世史通說。《吾妻鏡》未載保元、平治本年'
const SRC_GENPEI = '《吾妻鏡》系；日本中世史通說'

export const HEIAN_EVENTS: EraEvent[] = [
  {
    id: '1156-hogen',
    year: 1156,
    title: '保元之亂',
    desc: '京都宮廷分裂。平清盛與源義朝都站在後白河一邊，打敗崇德一方。這還不是源平對打。',
    factions: ['平氏', '源氏', '朝廷'],
    location: '京都',
    type: 'war',
    source: SRC_EARLY,
    note: '清盛、義朝此役是盟友。兩家對立要到平治之亂。',
  },
  {
    id: '1159-heiji',
    year: 1159,
    title: '平治之亂',
    desc: '源義朝在京都起事，平清盛回軍平定。義朝東走後被殺，平氏從此獨掌朝廷的軍事。',
    factions: ['平氏', '源氏'],
    location: '京都',
    type: 'war',
    source: SRC_EARLY,
  },
  {
    id: '1180-ishibashi',
    year: 1180,
    title: '石橋山',
    desc: '以仁王令旨之後，源賴朝在伊豆起兵，石橋山戰敗，退走安房，再站穩關東。',
    factions: ['源氏', '平氏'],
    location: '伊豆・相模，敗走安房',
    type: 'war',
    source: SRC_GENPEI,
    note: '史實有相模灣舟行。地圖沿灣岸畫陸地，渡海只留給壇之浦。',
  },
  {
    id: '1180-fuji',
    year: 1180,
    title: '富士川',
    desc: '平維盛率軍沿東海道東進，夜聞水鳥驚飛，軍心崩潰，未接戰即退。',
    factions: ['平氏', '源氏'],
    location: '駿河富士川',
    type: 'war',
    source: SRC_GENPEI,
    note: '水鳥驚軍出自軍記，通說只取「未戰而退」。',
    disputed: true,
  },
  {
    id: '1183-kurikara',
    year: 1183,
    title: '俱利伽羅',
    desc: '源義仲自信濃越北陸，在俱利伽羅峠破平氏，隨後進入京都。平氏帶著安德天皇西走。',
    factions: ['源氏', '平氏'],
    location: '北陸・京都',
    type: 'war',
    source: SRC_GENPEI,
  },
  {
    id: '1184-uji',
    year: 1184,
    title: '宇治川',
    desc: '源義經、源範賴奉賴朝之命攻義仲。義仲敗死。源氏內部的京都爭奪告一段落。',
    factions: ['源氏'],
    location: '京都南、宇治',
    type: 'war',
    source: SRC_GENPEI,
  },
  {
    id: '1184-ichinotani',
    year: 1184,
    title: '一之谷',
    desc: '源義經襲擊平氏在攝津一之谷的陣地。平氏再退向西國。',
    factions: ['源氏', '平氏'],
    location: '攝津一之谷',
    type: 'war',
    source: SRC_GENPEI,
  },
  {
    id: '1185-yashima',
    year: 1185,
    title: '屋島',
    desc: '平氏退到讚岐屋島。源義經自對岸來攻，平氏放棄屋島，繼續西走。',
    factions: ['源氏', '平氏'],
    location: '讚岐屋島',
    type: 'war',
    source: SRC_GENPEI,
    note: '渡海來攻是史實，圖上只畫讚岐岸上的戰線，避免把瀨戶內海畫成行軍路。',
  },
  {
    id: '1185-dannoura',
    year: 1185,
    title: '壇之浦',
    desc: '源氏水軍與平氏在長門壇之浦決戰。安德天皇入水，平氏滅亡。',
    factions: ['源氏', '平氏', '朝廷'],
    location: '長門壇之浦',
    type: 'war',
    source: SRC_GENPEI,
    note: '入水的情節軍記寫得很細，通說採用的是天皇與平氏主力俱沒於海峽。',
  },
]

export const HEIAN_DETAILS: Record<string, EraDetail> = {
  '1156-hogen': {
    causes: '鳥羽法皇死後，崇德上皇與後白河天皇爭朝政，雙方都召武士入京。',
    course: '保元元年在京都交戰。平清盛、源義朝屬後白河；義朝之父為義、清盛之叔忠正屬崇德。一日而決。',
    keyFigures: [
      { name: '後白河天皇', role: '勝利一方' },
      { name: '崇德上皇', role: '失敗一方' },
      { name: '平清盛', role: '後白河方' },
      { name: '源義朝', role: '後白河方' },
    ],
    outcome: '崇德一方失敗。武士開始直接決定皇位之爭，但源平尚未成為兩個敵國。',
    brief: '保元之亂是宮廷內戰，清盛與義朝站在同一邊。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/保元之亂',
  },
  '1159-heiji': {
    causes: '保元之後論功不均。源義朝聯合藤原信賴，趁平清盛離京時控制後白河。',
    course: '平治元年，清盛自熊野方面回軍，在京都擊敗義朝。義朝逃向東海，途中被殺。',
    keyFigures: [
      { name: '平清盛', role: '平定義朝' },
      { name: '源義朝', role: '起事失敗被殺' },
      { name: '源賴朝', role: '義朝之子，其後被流放到伊豆' },
    ],
    outcome: '平氏獨佔朝廷的軍事職位，為後來的專權鋪路。',
    brief: '平治之亂之後，源氏棟梁一系崩潰，平氏上升。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/平治之亂',
  },
  '1180-ishibashi': {
    causes: '以仁王討伐平氏的令旨傳到諸國。流放在伊豆的源賴朝起兵。',
    course: '治承四年八月，賴朝在石橋山被大庭景親擊敗，退入箱根山，再走到安房，得到千葉、上總等武士，回到鎌倉。',
    keyFigures: [
      { name: '源賴朝', role: '起兵，戰敗後站穩關東' },
      { name: '北條時政', role: '伊豆在地武士，支持賴朝' },
      { name: '大庭景親', role: '平氏方，石橋山取勝' },
    ],
    outcome: '賴朝沒有在第一仗勝利，但關東反平氏的武士集中到他手下。',
    brief: '石橋山是敗仗。源平合戰的關東據點，是敗走安房之後才建立的。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/石橋山之戰',
  },
  '1180-fuji': {
    causes: '平氏要在賴朝坐大之前把他壓回伊豆。平維盛率軍東下。',
    course: '軍沿東海道到富士川。夜間陣中驚擾，通說與軍記都說平氏未正式交戰即退。賴朝沒有遠追。',
    keyFigures: [
      { name: '平維盛', role: '平氏大將，退兵' },
      { name: '源賴朝', role: '隔岸的關東軍' },
    ],
    outcome: '平氏失去一次把關東起兵撲滅的機會。東海道的東段轉到源氏一方。',
    brief: '富士川之退，比任何一場殲滅戰都更清楚地顯示平氏東征失敗。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/富士川之戰',
  },
  '1183-kurikara': {
    causes: '源義仲在信濃擴大，平氏派軍越北陸來攻。',
    course: '壽永二年，義仲在俱利伽羅峠破平氏，再經越前入京。平氏帶安德天皇與三神器西走。',
    keyFigures: [
      { name: '源義仲', role: '北陸軍，入京' },
      { name: '平宗盛', role: '平氏棟梁，棄京西走' },
    ],
    outcome: '京都不再由平氏獨佔。義仲與留在關東的賴朝隨即對立。',
    brief: '俱利伽羅把戰線從東國拉到京都，也開始了源氏內部的分裂。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/俱利伽羅峠之戰',
  },
  '1184-uji': {
    causes: '義仲入京後與後白河及賴朝都不和，賴朝派弟義經、範賴西上。',
    course: '元曆元年正月，兩軍在宇治川交戰。義仲敗走，死於近江粟津。',
    keyFigures: [
      { name: '源義經', role: '賴朝方' },
      { name: '源範賴', role: '賴朝方' },
      { name: '源義仲', role: '敗死' },
    ],
    outcome: '京都的軍事命令轉到賴朝系。義仲沒有成為另一個武家政權。',
    brief: '宇治川說明源平合戰同時是源氏內部的繼承戰爭。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/宇治川之戰',
  },
  '1184-ichinotani': {
    causes: '平氏退出京都後，仍在攝津海岸結陣，阻擋源氏西進。',
    course: '義經自一之谷後方的險坡攻入平氏本陣。平氏退向海路。',
    keyFigures: [
      { name: '源義經', role: '奇襲一之谷' },
      { name: '平忠度', role: '平氏將，戰死' },
      { name: '平宗盛', role: '平氏棟梁，退走' },
    ],
    outcome: '攝津海岸失守。平氏的根據地縮到四國、九州與山陽西端。',
    brief: '一之谷是京都以西的決戰，不是關東的延長。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/一之谷之戰',
  },
  '1185-yashima': {
    causes: '平氏以屋島為水軍基地，控制瀨戶內海東口。',
    course: '文治元年二月，義經渡海到讚岐，襲屋島。平氏放棄陣地，向西退入海峽。',
    keyFigures: [
      { name: '源義經', role: '攻屋島' },
      { name: '平宗盛', role: '再退' },
    ],
    outcome: '平氏失去讚岐。下一場就是壇之浦。',
    brief: '屋島決定平氏不能再以四國北岸為基地。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/屋島之戰',
  },
  '1185-dannoura': {
    causes: '平氏水軍與源氏水軍在長門、豐前之間的海峽相遇，已無陸地可退。',
    course: '元曆二年三月，壇之浦海戰。平氏敗。安德天皇入水。平氏棟梁與主力滅亡。',
    keyFigures: [
      { name: '源義經', role: '源氏水軍' },
      { name: '平宗盛', role: '被俘' },
      { name: '安德天皇', role: '入水' },
      { name: '源賴朝', role: '人在鎌倉，不在海戰現場' },
    ],
    outcome: '平氏作為朝廷軍事主宰的地位結束。此後的政局轉入賴朝與朝廷的安排，直到鎌倉幕府。',
    brief: '壇之浦是源平合戰的終點，不是賴朝本人的陣前決戰。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/壇之浦之戰',
  },
}

const layers = (
  elementary: string,
  secondary: string,
  university: string,
): EraReading['layers'] => ({ elementary, secondary, university })

export const HEIAN_READING: Record<string, EraReading> = {
  '1156-hogen': {
    quote:
      '保元元年，崇德與後白河不協，各召武士入京。平清盛、源義朝皆屬後白河。戰於洛中，一日而決。此尚未是源氏與平氏分東西而國。',
    source: '據日本中世史通說意譯，非《吾妻鏡》原文',
    layers: layers(
      '京都有兩派皇室在打仗。平清盛和源義朝站在同一邊。他們還沒有分成兩個國家。',
      '保元之亂是皇位與院政的內戰。武士被召入京，戰後開始用軍功換職位。源平對立是四年後的平治之亂。',
      '保元的制度意義是：武力裁決從宮廷儀式裡走出來。清盛與義朝同屬勝方，所以不能把1156年畫成源平割據。',
    ),
  },
  '1159-heiji': {
    quote:
      '平治元年，源義朝趁清盛不在，起兵於京。清盛還，擊破之。義朝東走，死於途。賴朝年少，被流於伊豆。平氏自此專朝廷之兵。',
    source: '據日本中世史通說意譯，非逐字原典',
    layers: layers(
      '源義朝想在京都奪權，平清盛把他打敗。義朝被殺。他的兒子賴朝被送到伊豆。',
      '平治之亂後，平氏一家掌握了近衛與知行國一類軍事資源。源氏棟梁一系中斷，直到1180年。',
      '平治的後果是軍事職位的排他，不是版圖立刻改畫。流放伊豆的賴朝在1160年還沒有領地。',
    ),
  },
  '1180-ishibashi': {
    quote:
      '治承四年，以仁王令旨達於諸國。伊豆流人源賴朝起兵，石橋山為大庭景親所破，走安房。千葉、上總之兵來會，乃入鎌倉。',
    source: '據《吾妻鏡》治承四年條及日本中世史通說意譯',
    layers: layers(
      '賴朝在伊豆起兵，第一仗打輸了，逃到安房。後來很多關東武士加入他，他才在鎌倉站住。',
      '石橋山說明起兵不等於勝利。安房與房總的在地武士，比石橋山本身更決定關東能不能獨立於平氏。',
      '令旨提供名義，在地武士提供兵力。賴朝的「源氏棟梁」身分要等關東武士承認之後才變成政權。',
    ),
  },
  '1180-fuji': {
    quote:
      '平維盛率軍東下，次於富士川。夜中軍驚，未戰而退。賴朝亦不遠追。東海道之東段，平氏不能再進。',
    source: '據《吾妻鏡》系及日本中世史通說意譯。水鳥之說出自軍記，不逕作實錄',
    layers: layers(
      '平家的大軍走到富士川，還沒正式開打就退回去了。',
      '退兵的直接原因，軍記寫成水鳥振翅。通說只確認：維盛沒有把賴朝消滅，關東因此保住。',
      '富士川暴露的是遠征軍的命令與後勤，不是某一種鳥。東國武士看到平氏會退，加入賴朝的成本就下降了。',
    ),
  },
  '1183-kurikara': {
    quote:
      '壽永二年，源義仲自信濃出，越北陸。俱利伽羅之險，平氏軍潰。義仲入京。平氏奉安德天皇西走。',
    source: '據《吾妻鏡》系及日本中世史通說意譯',
    layers: layers(
      '源義仲從山上的路打進京都。平家帶著小天皇往西邊逃。',
      '俱利伽羅是峠口之戰，不是信濃到京都的直線。義仲入京後，和鎌倉的賴朝很快變成對手。',
      '北陸線讓義仲比賴朝更早進入京都。首都的佔領權和關東的軍事資源從此分開，所以次年有宇治川。',
    ),
  },
  '1184-uji': {
    quote:
      '義仲入京，與法皇、賴朝皆隙。賴朝遣義經、範賴攻之。宇治川一戰，義仲敗死於粟津。',
    source: '據《吾妻鏡》系及日本中世史通說意譯',
    layers: layers(
      '義仲占了京都，但是賴朝派弟弟來打他。義仲輸了，死了。',
      '宇治川是源氏打源氏。此後西征平氏的軍隊，名義上歸鎌倉的賴朝。',
      '合戰的政治結果是：入京者沒有獲得任免權，任免權留在能持續動員東國的人手上。',
    ),
  },
  '1184-ichinotani': {
    quote:
      '平氏退而陣於攝津一之谷。源義經自險坡突入其陣，平氏敗，收兵入海。',
    source: '據《吾妻鏡》系及日本中世史通說意譯',
    layers: layers(
      '平家在大阪附近的海邊紮營。源義經從陡坡攻下去，平家又退了。',
      '一之谷把平氏趕離畿內海岸。下一步他們只能靠水軍，所以戰場轉到屋島和壇之浦。',
      '奇襲能否從崖上下來，軍記有渲染。可以確定的是攝津岸的陣地沒有守住，平氏失去近畿。',
    ),
  },
  '1185-yashima': {
    quote:
      '平氏據讚岐屋島。義經襲之，平氏棄營，西走海峽。屋島之陣，不能再當瀨戶內之東口。',
    source: '據《吾妻鏡》系及日本中世史通說意譯',
    layers: layers(
      '平家退到四國的屋島。源義經來攻，平家再往西逃。',
      '屋島是讚岐北岸的海角，不是京都。平氏這時已經是水軍政權，陸地上的國幾乎丟光。',
      '內海渡海是這場戰的交通，不是另一條可以在陸地上省略的直線。圖只標岸上的戰線。',
    ),
  },
  '1185-dannoura': {
    quote:
      '元曆二年三月，源氏水軍與平氏遇於壇之浦。平氏敗。安德天皇入水。平氏之兵與棟梁俱盡。賴朝仍在鎌倉。',
    source: '據《吾妻鏡》元曆二年條及日本中世史通說意譯。入水細節不採軍記鋪陳',
    layers: layers(
      '兩邊的船在壇之浦打仗。平家輸了。小天皇掉進海裡。平家到此滅亡。',
      '壇之浦是海峽裡的水戰，所以地圖上這一段才標「渡海」。指揮海戰的是義經，賴朝人在鎌倉。',
      '1185年結束的是平氏對朝廷軍事的壟斷。鎌倉幕府的形式還要再過幾年才穩定。奧州藤原氏此時仍未服。',
    ),
  },
}

export const HEIAN_PEOPLE: EraPerson[] = [
  {
    id: 'kiyomori',
    name: '平清盛',
    birth: 1118,
    death: 1181,
    faction: '平氏',
    role: '軍事',
    summary: '保元、平治後掌握朝廷軍權，任太政大臣。死於賴朝起兵的次年，未見平氏滅亡。',
    source: '日本中世史通說',
  },
  {
    id: 'yoshitomo',
    name: '源義朝',
    birth: 1123,
    death: 1160,
    faction: '源氏',
    role: '軍事',
    summary: '保元時與清盛同助後白河。平治起事失敗，東走被殺。',
    source: '日本中世史通說',
  },
  {
    id: 'yoritomo',
    name: '源賴朝',
    birth: 1147,
    death: 1199,
    faction: '源氏',
    role: '政治',
    summary: '1180年在伊豆起兵，石橋山戰敗後據鎌倉。壇之浦時人在關東，不在船上。',
    source: '《吾妻鏡》系；日本中世史通說',
  },
  {
    id: 'yoshinaka',
    name: '源義仲',
    aka: '木曾義仲',
    birth: 1154,
    death: 1184,
    faction: '源氏',
    role: '軍事',
    summary: '自信濃越北陸，1183年入京。次年在宇治川敗於義經，死於粟津。',
    source: '《吾妻鏡》系；日本中世史通說',
  },
  {
    id: 'yoshitsune',
    name: '源義經',
    birth: 1159,
    death: 1189,
    faction: '源氏',
    role: '軍事',
    summary: '一之谷、屋島、壇之浦的前線指揮。戰後與賴朝決裂。',
    source: '《吾妻鏡》系；日本中世史通說',
  },
  {
    id: 'koremori',
    name: '平維盛',
    birth: 1158,
    death: 1184,
    faction: '平氏',
    role: '軍事',
    summary: '富士川退兵的平氏大將。生卒年軍記與系譜不盡一致。',
    source: '日本中世史通說',
    disputed: true,
    note: '生年有異說，此處取通說約數。',
  },
  {
    id: 'antoku',
    name: '安德天皇',
    birth: 1178,
    death: 1185,
    faction: '朝廷',
    role: '政治',
    summary: '平氏所立的幼帝。壇之浦之戰時入水。',
    source: '《吾妻鏡》系；日本中世史通說',
    note: '入水是通說。軍記裡的對話不作實錄。',
  },
  {
    id: 'goshirakawa',
    name: '後白河法皇',
    birth: 1127,
    death: 1192,
    faction: '朝廷',
    role: '政治',
    summary: '保元的勝利者，其後以院廳周旋於平氏與源氏之間。',
    source: '日本中世史通說',
  },
]

export function heianDetailFor(id: string) {
  return HEIAN_DETAILS[id]
}

export function heianReadingFor(id: string) {
  return HEIAN_READING[id]
}
