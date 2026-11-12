/**
 * 秦漢（前221–183）逐月軸。
 *
 * 原則（見 docs/PLAN.md「秦漢整段逐月」）：只有《史記》《漢書》《後漢書》
 * 《資治通鑑》寫到月份的事才落在某個月，其餘月份一律「本月無專條」，
 * 色塊沿用該年（或更早一年）的快照，不捏造「三月失某郡」。
 *
 * 歲首：秦及漢初行顓頊曆，以十月為歲首，《資治通鑑》沿用秦漢曆紀年，
 * 所以「高帝元年」的月份順序是冬十月→十一月→十二月→春正月→……→九月。
 * 前104年（元封二年）改太初曆，重新以正月為歲首。月份一律照歷書原稱，
 * 不換算成西曆月。
 */

/** 整個秦漢專題都進入逐月。 */
export const QINHAN_MONTH_ZOOM = { from: -221, to: 183 }

/** 太初曆改以正月為歲首。之前的一年從十月起算。 */
export const TAICHU_CALENDAR = -103

const MONTH_NAMES = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
]

export interface QinHanLeapMonth {
  /** 閏的哪一個月 */
  after: number
  /** 史書上的稱法。秦漢曆稱「後九月」，不寫「閏九月」。 */
  label: string
  source: string
}

/** 有出處可據的閏月。沒有列出的年份不假設閏月，見陳垣《二十史朔閏表》待補。 */
export const QINHAN_LEAP_MONTHS: Record<number, QinHanLeapMonth> = {
  [-205]: {
    after: 9,
    label: '後九月',
    source: '《資治通鑑》卷九·漢紀一：韓信破代兵於閼與書「後九月」',
  },
}

/** 該年的月份順序（含閏月），按歲首排。 */
export function qinHanMonthOrder(year: number): number[] {
  const months =
    year < TAICHU_CALENDAR
      ? [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const leap = QINHAN_LEAP_MONTHS[year]
  if (!leap) return months
  const at = months.indexOf(leap.after)
  // 閏月緊接在被閏的月份之後，順序照該年歲首排
  const withLeap = [...months]
  withLeap.splice(at + 1, 0, -(leap.after + 100))
  return withLeap
}

/** 負數編到 -109 表示該年的後九月（閏九月），避免與九月同鍵。 */
export function isLeapSlot(month: number): boolean {
  return month <= -100
}

export function leapSlotAfter(month: number): number {
  return -(month + 100)
}

export function formatQinHanMonth(year: number, month: number): string {
  if (isLeapSlot(month)) {
    return QINHAN_LEAP_MONTHS[year]?.label ?? `後${MONTH_NAMES[leapSlotAfter(month) - 1]}`
  }
  return MONTH_NAMES[month - 1] ?? `第${month}月`
}

/**
 * 逐月記載。`territoryFrom` 表示從這個月起改畫哪一年的快照幾何
 * （只能引用 territoryControl.ts 已有出處的快照，不新畫邊界）。
 */
export interface QinHanMonthRecord {
  year: number
  month: number
  title: string
  note: string
  source: string
  /** 從本月起改用該年快照的幾何 */
  territoryFrom?: number
  /** 月份或年份有異說 */
  disputedDate?: boolean
}


/**
 * 有月份的條目。全部對得回原典的月字：
 * 《資治通鑑》卷九至卷五十六逐月書寫的部分照錄，《史記》《漢書》《後漢書》
 * 帝紀、傳裡有月的地方照錄。沒有月的著名事件（巨鹿之戰、井陘之戰、
 * 巫蠱以外諸獄、外戚專政的整體過程等）留在年級，不補月份。
 *
 * 前195年以後的條目是這一輪補的：七國之亂（《漢書·景帝紀》三年冬十月）、
 * 昆陽（《後漢書·光武帝紀》六月）、光武即位（六月己未）、公孫述亡（十一月）等，
 * 都有月可查；垓下依《通鑑》卷十高帝五年十二月。
 */
export const QINHAN_MONTH_RECORDS: QinHanMonthRecord[] = [
  {
    year: -209,
    month: 7,
    title: '陳勝起蘄',
    note: '《史記·項羽本紀》「秦二世元年七月，陳涉等起大澤中」。本月只有起事，郡國界線沒有因此重畫。',
    source: '《史記·項羽本紀》；《史記·陳涉世家》',
  },
  {
    year: -209,
    month: 9,
    title: '項梁取會稽',
    note: '「其九月」項梁、項羽殺會稽守通，舉吳中兵八千。江東此時仍是秦會稽郡，色塊不改。',
    source: '《史記·項羽本紀》',
  },
  {
    year: -206,
    month: 10,
    title: '沛公至霸上，子嬰降',
    note: '《通鑑》「冬，十月」。秦以十月為歲首，這是漢元年的年初。秦亡，但二月才分封諸侯，所以本月仍畫前214年「略取嶺南」的秦郡縣形勢，不是本年年中後的十八諸侯。',
    source: '《資治通鑑》卷九·漢紀一；《史記·高祖本紀》',
    territoryFrom: -214,
  },
  {
    year: -206,
    month: 11,
    title: '約法三章',
    note: '「十一月」沛公召諸縣父老，約法三章，吏民案堵如故。這是政令，不是疆界變動。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -206,
    month: 12,
    title: '鴻門之宴',
    note: '「十二月」項羽進至戲，次日鴻門。項羽兵四十萬在新豐鴻門，沛公十萬在霸上。本月沒有劃界。',
    source: '《資治通鑑》卷九·漢紀一；《史記·項羽本紀》',
  },
  {
    year: -206,
    month: 1,
    title: '尊懷王為義帝，徙郴',
    note: '「春，正月」陽尊懷王為義帝，徙於江南，都郴。名分變動，楚地色塊不改。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -206,
    month: 2,
    title: '項羽分天下王諸將',
    note: '「二月」立沛公為漢王，王巴、蜀、漢中，都南鄭；三分關中與章邯、司馬欣、董翳。地圖從本月起改用前206年快照：西楚、漢、三秦與十八諸侯的形勢由此開始。',
    source: '《資治通鑑》卷九·漢紀一；《史記·項羽本紀》',
    territoryFrom: -206,
  },
  {
    year: -205,
    month: 10,
    title: '項王密使三王殺義帝',
    note: '「冬，十月」項王密使九江、衡山、臨江王擊義帝，殺之江中。次年漢王以此發喪東出。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 11,
    title: '立韓信為韓王',
    note: '「十一月」漢王立信為韓王，常將韓兵從漢王。韓地自此附漢。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 1,
    title: '項王破齊於城陽',
    note: '「春，正月」項王北至城陽，齊王田榮敗走平原被殺。齊地入楚的勢力範圍，但色塊仍按前206年十八諸侯的形勢。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 3,
    title: '漢王渡臨晉，虜殷王卬',
    note: '「三月」漢王自臨晉渡河，下河內，虜殷王卬，置河內郡。漢的邊界本月向河內推，快照沒有細到郡，不改色。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 4,
    title: '彭城之戰',
    note: '「夏，四月」漢王率諸侯兵五十六萬入彭城；項王晨擊，日中大破漢軍，死者十餘萬。諸侯皆背漢，塞王欣、翟王翳亡降楚。',
    source: '《資治通鑑》卷九·漢紀一；《史記·項羽本紀》',
  },
  {
    year: -205,
    month: 5,
    title: '漢王至滎陽',
    note: '「五月」漢王至滎陽，諸敗軍皆會，蕭何發關中老弱未傅者詣滎陽，漢軍復振，築甬道取敖倉粟。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 6,
    title: '章邯自殺，盡定雍地',
    note: '「六月」漢兵引水灌廢丘，廢丘降，章邯自殺，盡定雍地，以為中地、北地、隴西郡。同年立子盈為太子。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 8,
    title: '蕭何守關中',
    note: '「秋，八月」漢王如滎陽，命蕭何守關中，侍太子，立宗廟、社稷、宮室、縣邑，計關中戶口轉漕給軍。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: 9,
    title: '韓信虜魏王豹，定魏地',
    note: '「九月」韓信擊虜魏王豹，悉定魏地，置河東、上黨、太原郡。魏地入漢，但快照只到國級，不改色。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -205,
    month: -109,
    title: '韓信破代（後九月）',
    note: '「後九月」韓信破代兵，禽夏說於閼與。秦漢曆稱閏九月為後九月，這一年有這個月份，是逐月軸保留閏月的依據。',
    source: '《資治通鑑》卷九·漢紀一',
  },
  {
    year: -202,
    month: 2,
    title: '漢王即皇帝位',
    note: '《史記》作「二月甲子，漢王即皇帝位於氾水之陽」。漢初以十月為歲首，本月在垓下之後；月份有異說，故標 disputed。',
    source: '《史記·高祖本紀》；《資治通鑑》漢紀二',
    disputedDate: true,
  },
  {
    year: -202,
    month: 10,
    title: '燕王臧荼反',
    note: '「十月」燕王臧荼反，攻下代地；高祖自將擊之，立盧綰為燕王。漢初以十月為歲首，本條在《史記》排在即位之後，月次與《資治通鑑》有異，故標 disputed。',
    source: '《史記·高祖本紀》',
    disputedDate: true,
  },
  {
    year: -201,
    month: 12,
    title: '偽遊雲夢，執韓信',
    note: '「十二月」人有上變告楚王信謀反，上用陳平計，偽遊雲夢，會諸侯於陳，執韓信，即日大赦。後十餘日封為淮陰侯。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -200,
    month: 2,
    title: '長樂宮成，徙治長安',
    note: '「二月」高祖自平城過趙、雒陽，至長安；長樂宮成，丞相已下徙治長安。都邑變動，郡國界線不改。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -197,
    month: 7,
    title: '太上皇崩櫟陽宮',
    note: '「七月」太上皇崩櫟陽宮，楚王、梁王皆來送葬，赦櫟陽囚，更命酈邑曰新豐。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -197,
    month: 8,
    title: '陳豨反代地',
    note: '「八月」趙相國陳豨反代地；「九月」上自東往擊之，至邯鄲。代地叛亂，色塊仍按漢郡國。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -196,
    month: 7,
    title: '黥布反',
    note: '「秋七月」淮南王黥布反，東并荊王劉賈地，北渡淮，楚王交走入薛；高祖自往擊之，立子長為淮南王。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -195,
    month: 2,
    title: '擊燕王盧綰',
    note: '「二月」使樊噲、周勃將兵擊燕王綰，赦燕吏民與反者，立皇子建為燕王。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -195,
    month: 4,
    title: '高祖崩長樂宮',
    note: '「四月甲辰」高祖崩長樂宮；丁未發喪，大赦。五月太子襲號為皇帝（孝惠）。',
    source: '《史記·高祖本紀》',
  },
  {
    year: -202,
    month: 12,
    title: '垓下之戰，項羽死',
    note: '《通鑑》卷十高帝五年十二月書垓下之戰：項羽夜圍、歌下、潰圍東走，至烏江而死。高帝五年十二月已是西曆前202年1月。本月起改畫前202年快照，那是有出處的年份，不是新畫邊界。',
    source: '《資治通鑑》卷十·漢紀二；《史記·項羽本紀》《高祖本紀》',
    territoryFrom: -202,
  },
  {
    year: -180,
    month: 8,
    title: '誅諸呂',
    note: '《漢書·高后紀》高后八年八月，太尉周勃奪北軍，盡誅諸呂；大臣乃謀立代王。長安一時的兵變不改郡國界線。',
    source: '《漢書·高后紀》；《資治通鑑》卷十三·漢紀五',
  },
  {
    year: -180,
    month: 11,
    title: '代王即皇帝位（文帝）',
    note: '《漢書·文帝紀》十一月乙亥，代王即皇帝位。本月只是帝位易與，色塊仍沿用此前的快照。',
    source: '《漢書·文帝紀》；《資治通鑑》卷十三·漢紀五',
  },
  {
    year: -154,
    month: 10,
    title: '吳楚七國舉兵西向',
    note: '《漢書·景帝紀》三年冬十月，吳王濞與楚、趙、膠西、濟南、淄川、膠東七國舉兵西向，以誅御史大夫晁錯為名。七國是叛亂的諸侯國，不是七塊新測定的疆界。',
    source: '《漢書·景帝紀》；《資治通鑑》卷十六·漢紀八',
  },
  {
    year: -154,
    month: 3,
    title: '太尉周亞夫破吳楚',
    note: '《漢書·景帝紀》三年三月，太尉周亞夫破吳楚，吳王濞亡走丹陽，七國相繼平。《通鑑》卷十六的月次與《漢書》小異，故標異說；平叛不重畫郡界。',
    source: '《漢書·景帝紀》；《史記·絳侯周勃世家》；《資治通鑑》卷十六·漢紀八',
    disputedDate: true,
  },
  {
    year: -119,
    month: 4,
    title: '衛青、霍去病分道出塞',
    note: '《漢書·武帝紀》元狩四年春四月，大將軍青出定襄、驃騎將軍去病出代郡擊匈奴。塞外之戰不畫成漢的郡縣，色塊仍沿用既有快照。',
    source: '《漢書·武帝紀》元狩四年；《史記·衛將軍驃騎列傳》',
  },
  {
    year: -91,
    month: 7,
    title: '巫蠱獄起，太子據敗',
    note: '《漢書·武帝紀》征和二年江充治巫蠱，太子據起兵敗走；《通鑑》卷二十二系於七月。京師的獄案與宮變不改州郡界線。',
    source: '《漢書·武帝紀》；《漢書·武五子傳》；《資治通鑑》卷二十二·漢紀十四',
    disputedDate: true,
  },
  {
    year: -87,
    month: 2,
    title: '武帝崩五柞宮，昭帝立',
    note: '《漢書·武帝紀》后元二年二月，帝崩于五柞宮；大將軍霍光等受遺詔立少子弗陵，是為昭帝。',
    source: '《漢書·武帝紀》；《漢書·霍光傳》；《資治通鑑》卷二十六·漢紀十七',
  },
  {
    year: -74,
    month: 6,
    title: '廢昌邑王',
    note: '《漢書·霍光傳》昌邑王即位二十七日，霍光與群臣奏皇太后廢之；《通鑑》卷二十五系於六月。廢立在長安，不改郡國。',
    source: '《漢書·霍光傳》；《資治通鑑》卷二十五·漢紀十六',
  },
  {
    year: -74,
    month: 7,
    title: '病已即皇帝位（宣帝）',
    note: '《漢書·宣帝紀》七月即皇帝位。本月只換皇帝，色塊沿用。',
    source: '《漢書·宣帝紀》；《資治通鑑》卷二十五·漢紀十六',
  },
  {
    year: -33,
    month: 1,
    title: '呼韓邪單于來朝，賜王牆',
    note: '《漢書·元帝紀》竟寧元年正月，匈奴呼韓邪單于來朝願保塞，賜待詔掖庭王牆為閼氏。單于請居邊塞下不許；塞外不是漢郡縣。',
    source: '《漢書·元帝紀》；《漢書·匈奴傳下》',
  },
  {
    year: -8,
    month: 6,
    title: '哀帝崩，王莽復輔政',
    note: '《漢書·哀帝紀》元壽元年六月帝崩；《王莽傳》太后召莽拜大司馬，與孔光共領尚書事。外戚易手不改郡國界線。',
    source: '《漢書·哀帝紀》；《漢書·王莽傳上》；《資治通鑑》卷三十五·漢紀二十七',
  },
  {
    year: 8,
    month: 1,
    title: '王莽即真，改元始建國',
    note: '《漢書·王莽傳》始建國元年正月朔，莽即真天子，改元。本月起改畫9年快照：那是有出處的新莽年份，不是新畫邊界。',
    source: '《漢書·王莽傳中》；《資治通鑑》卷三十六·漢紀二十八',
    territoryFrom: 9,
  },
  {
    year: 23,
    month: 6,
    title: '昆陽之戰',
    note: '《後漢書·光武帝紀》更始元年六月，王邑、王尋圍昆陽，劉秀等以步騎千餘出陣，王邑軍潰；《通鑑》卷三十九同。新莽的百萬之眾是出征敘事，不是戶籍總數。',
    source: '《後漢書·光武帝紀》；《資治通鑑》卷三十九·漢紀三十',
  },
  {
    year: 23,
    month: 10,
    title: '長安破，王莽死',
    note: '《漢書·王莽傳》地皇四年更始諸將入長安，莽被殺；《通鑑》卷三十九系於十月，月次與諸書小異，故標異說。長安一破不等於三輔已有新政權的戶籍。',
    source: '《漢書·王莽傳下》；《資治通鑑》卷三十九·漢紀三十',
    disputedDate: true,
  },
  {
    year: 25,
    month: 6,
    title: '光武即位于鄗，改元建武',
    note: '《後漢書·光武帝紀》建武元年六月己未，即皇帝位于鄗，改元。本月起改畫25年快照（有出處的東漢年份）。',
    source: '《後漢書·光武帝紀》；《資治通鑑》卷四十·漢紀三十二',
    territoryFrom: 25,
  },
  {
    year: 27,
    month: 1,
    title: '赤眉降于宜陽',
    note: '《後漢書·光武帝紀》建武三年正月，赤眉樊崇等降于宜陽；其後復叛，兩年後方平。降附是軍事事件，不是把關東畫成已安定。',
    source: '《後漢書·光武帝紀》；《後漢書·劉盆子傳》',
  },
  {
    year: 36,
    month: 11,
    title: '吳漢拔成都，公孫述死',
    note: '《後漢書·光武帝紀》建武十二年十一月，吳漢拔成都，公孫述戰死，蜀地自此入東漢。本月起改畫36年快照。',
    source: '《後漢書·光武帝紀》；《後漢書·公孫述傳》',
    territoryFrom: 36,
  },
  {
    year: 57,
    month: 2,
    title: '光武帝崩于南宮前殿',
    note: '《後漢書·光武帝紀》建武中元二年二月帝崩；太子莊即位，是為明帝。',
    source: '《後漢書·光武帝紀》；《資治通鑑》卷四十三·漢紀三十五',
  },
  {
    year: 73,
    month: 2,
    title: '竇固出敦煌擊伊吾，班超行西域',
    note: '《後漢書·明帝紀》永平十六年二月，奉車中郎將竇固出敦煌擊伊吾破之；假司馬班超使鄯善、于闐。伊吾與西域諸國不是郡縣，色塊不因此改。',
    source: '《後漢書·明帝紀》；《後漢書·班超傳》',
  },
  {
    year: 121,
    month: 3,
    title: '鄧太后崩',
    note: '《後漢書·安帝紀》建光元年三月，皇太后鄧氏崩；安帝親政，鄧氏子弟隨之被黜。宮廷權力更替不改州郡。',
    source: '《後漢書·安帝紀》；《後漢書·和熹鄧皇后紀》',
  },
  {
    year: 125,
    month: 3,
    title: '安帝崩于葉',
    note: '《後漢書·安帝紀》延光四年三月帝崩于葉；閻太后立北鄉侯，其後順帝立。帝位之爭在洛陽，不改州郡界線。',
    source: '《後漢書·安帝紀》；《後漢書·順帝紀》',
  },
  {
    year: 159,
    month: 8,
    title: '誅大將軍梁冀',
    note: '《後漢書·梁冀傳》延熹二年八月，桓帝與單超等共誅大將軍梁冀，冀兄弟自殺，家財沒入。外戚一倒不表示州郡重劃。',
    source: '《後漢書·梁冀傳》；《後漢書·桓帝紀》；《資治通鑑》卷五十四·漢紀四十六',
  },
  {
    year: 168,
    month: 10,
    title: '竇武、陳蕃敗死',
    note: '《後漢書·竇武傳》《陳蕃傳》建寧元年十月，竇武、陳蕃謀誅宦官不果，兵敗皆死，其後黨錮獄起。洛陽一役不改州郡，但黨錮之後州郡的控制力不能從地圖上讀出。',
    source: '《後漢書·竇武傳》《陳蕃傳》；《資治通鑑》卷五十六·漢紀四十八',
  },
]

function monthKey(year: number, month: number): string {
  return `${year}:${month}`
}

const RECORD_BY_KEY = new Map<string, QinHanMonthRecord>(
  QINHAN_MONTH_RECORDS.map((r) => [monthKey(r.year, r.month), r]),
)

/** 該年在歷書上的月份序（歲首十月時，十月是第1個月）。 */
export function monthOrdinal(year: number, month: number): number {
  const order = qinHanMonthOrder(year)
  const at = order.indexOf(month)
  return at < 0 ? order.length : at
}

function compareSlot(
  a: { year: number; month: number },
  b: { year: number; month: number },
): number {
  if (a.year !== b.year) return a.year - b.year
  return monthOrdinal(a.year, a.month) - monthOrdinal(b.year, b.month)
}

export function qinHanMonthRecord(
  year: number,
  month: number,
): QinHanMonthRecord | null {
  return RECORD_BY_KEY.get(monthKey(year, month)) ?? null
}

export function qinHanMonthRecordsIn(year: number): QinHanMonthRecord[] {
  return QINHAN_MONTH_RECORDS.filter((r) => r.year === year).sort((a, b) =>
    compareSlot(a, b),
  )
}

/** 本月沒有專條時要顯示的文字。 */
export const QINHAN_NO_ENTRY = '本月無專條'

export function qinHanMonthNote(year: number, month: number): string {
  return qinHanMonthRecord(year, month)?.note ?? QINHAN_NO_ENTRY
}

/**
 * 從本月起該用哪一年的快照幾何。只引用 territoryControl.ts 已有出處的快照，
 * 沒有月份級邊界可據時傳回 null，由調用方沿用該年（或更早一年）的快照。
 */
export function qinHanTerritoryFromMonth(
  year: number,
  month: number,
): number | null {
  let picked: number | null = null
  for (const record of QINHAN_MONTH_RECORDS) {
    if (record.territoryFrom == null) continue
    if (compareSlot(record, { year, month }) <= 0) picked = record.territoryFrom
  }
  return picked
}

export function qinHanMonthBounds(year: number): {
  first: number
  last: number
} {
  const order = qinHanMonthOrder(year)
  return { first: order[0], last: order[order.length - 1] }
}

/** 上一月／下一月；出界時交回 null 讓調用方換年。 */
export function stepQinHanMonth(args: {
  year: number
  month: number
  dir: -1 | 1
}): { year: number; month: number } | null {
  const { year, month, dir } = args
  const order = qinHanMonthOrder(year)
  const at = order.indexOf(month)
  const next = at + dir
  if (at >= 0 && next >= 0 && next < order.length) {
    return { year, month: order[next] }
  }
  return null
}
