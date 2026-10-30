/**
 * Rich timeline drill-down copy (zh-Hant).
 * Structure: causes → course → key figures → outcome.
 * Classical quotes prefer 《後漢書》／《三國志》／《資治通鑑》／《晉書》.
 * External links: Chinese Wikipedia + optional museum/university pages. No Grokipedia.
 */

export interface TimelineFigure {
  name: string
  role: string
}

export interface TimelineFurtherReading {
  label: string
  url: string
}

export interface TimelineDetail {
  /** 起因 */
  causes: string
  /** 經過 */
  course: string
  /** 關鍵人物 */
  keyFigures: TimelineFigure[]
  /** 結果與影響 */
  outcome: string
  classicQuote: string
  classicSource: string
  /** 本卡敘事之正史出典（AGENTS.md） */
  source: string
  disputed?: boolean
  note?: string
  modernParaphrase: string
  zhwikiUrl: string
  furtherReading?: TimelineFurtherReading[]
}

export const TIMELINE_DETAILS: Record<string, TimelineDetail> = {
  '184-huangjin': {
    causes:
      '靈帝朝政腐敗、賦役與災疫交迫；鉅鹿張角以太平道傳教十餘年，徒眾數十萬，置三十六方，約期甲子起事。',
    course:
      '中平元年（184）春，事泄提前起兵，皆著黃巾。旬月之間州郡響應，京師震動。朝廷以何進為大將軍，遣皇甫嵩、朱儁、盧植等分討；張角病卒，弟梁、寶等相繼敗死。主力雖平，青、徐、兗、豫餘部此後多年仍起落不定。',
    keyFigures: [
      { name: '張角', role: '太平道首領，稱大賢良師' },
      { name: '張梁／張寶', role: '角弟，黃巾方面主將' },
      { name: '皇甫嵩', role: '漢軍主將，破黃巾主力' },
      { name: '朱儁、盧植', role: '分路進討' },
    ],
    outcome:
      '中央權威大損，州郡始得擁兵自重；董卓、曹操、孫堅、劉備等日後勢力，多由此亂中起家或壯大。東漢政權崩解之先聲。',
    classicQuote:
      '鉅鹿張角自稱「大賢良師」，奉事黃老道……十余年間，眾徒數十萬，連結郡國，自青、徐、幽、冀、荊、揚、兗、豫八州之人，莫不畢應。遂置三十六方。……訛言「蒼天已死，黃天當立，歲在甲子，天下大吉」。',
    classicSource: '《後漢書·皇甫嵩傳》；參《資治通鑑》卷五十八',
    source: '《後漢書·皇甫嵩傳》',
    modernParaphrase:
      '鉅鹿張角自稱「大賢良師」，奉黃老道……十多年間信徒數十萬，串連郡國；八州幾乎都有人響應。他設立三十六「方」，又傳布「蒼天已死，黃天當立」的謠言。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/黃巾之亂',
    furtherReading: [
      {
        label: '維基文庫：《後漢書·皇甫嵩傳》',
        url: 'https://zh.wikisource.org/wiki/後漢書/卷71',
      },
    ],
  },
  '189-dongzhuo': {
    causes:
      '靈帝崩，何太后臨朝；大將軍何進謀盡誅宦官，私召邊將董卓等入京。事機不密，宦官先殺何進，袁紹等盡誅宦寺，京師大亂。',
    course:
      '董卓兵至洛陽，廢少帝劉辯為弘農王，立陳留王劉協（獻帝），自為相國，入朝不趨、劍履上殿，威震朝廷。關東州郡由此離心。',
    keyFigures: [
      { name: '董卓', role: '涼州邊將，入京擅廢立' },
      { name: '何進', role: '大將軍，謀誅宦官而敗死' },
      { name: '袁紹', role: '盡誅宦官，後為關東盟主' },
      { name: '漢獻帝劉協', role: '被立為帝，受卓挾持' },
    ],
    outcome:
      '漢室名器淪為權臣工具；關東州牧郡守相繼起兵，開啟軍閥混戰時代。',
    classicQuote:
      '董卓……廢少帝為弘農王而立陳留王，是為獻帝。……卓遷太尉……尋進相國，入朝不趨，劍履上殿。',
    classicSource: '《後漢書·董卓傳》；《資治通鑑》卷五十九',
    source: '《後漢書·董卓傳》',
    modernParaphrase:
      '董卓廢少帝為弘農王，改立陳留王為獻帝；升太尉再進相國，入朝不必小步快走，可帶劍穿鞋上殿。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/董卓',
    furtherReading: [
      {
        label: '維基文庫：《後漢書·董卓傳》',
        url: 'https://zh.wikisource.org/wiki/後漢書/卷72',
      },
    ],
  },
  '190-guandong': {
    causes:
      '董卓擅廢立、暴虐京師，關東州郡不能忍受；袁紹等以討卓為名結盟，實亦各懷領土野心。',
    course:
      '初平元年春，推袁紹為盟主，曹操、孫堅等各有所部。卓懼，挾獻帝遷長安，盡燒洛陽宮廟民居。聯軍屯酸棗等地，不能協力西進，旋即潰散。',
    keyFigures: [
      { name: '袁紹', role: '盟主' },
      { name: '曹操', role: '參加聯軍，後獨力西進不利' },
      { name: '孫堅', role: '破卓軍，得傳國璽（記載有異）' },
      { name: '董卓', role: '遷都長安、焚洛陽' },
    ],
    outcome:
      '討卓無功，州牧各自專兵；漢室號令不行於關東，群雄割據正式展開。',
    classicQuote:
      '初平元年春正月……袁紹等同時俱起兵，眾各數萬……推紹為盟主。……董卓聞之，甚懼……乃徙天子都長安。……悉燒宮廟、官府、居家，二百里內無復孑遺。',
    classicSource: '《資治通鑑》卷五十九；參《後漢書·董卓傳》',
    source: '《資治通鑑》卷五十九',
    modernParaphrase:
      '初平元年正月，袁紹等人同時起兵，共推袁紹為盟主。董卓害怕，強迫天子遷長安，把洛陽宮殿官署民宅燒光，二百里內幾乎沒有倖存住家。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/董卓討伐戰',
    furtherReading: [
      {
        label: '維基文庫：《資治通鑑》卷五十九',
        url: 'https://zh.wikisource.org/wiki/資治通鑑/卷059',
      },
    ],
  },
  '192-dongzhuo-killed': {
    causes:
      '董卓遷長安後暴虐益甚；司徒王允陰結卓親信呂布，謀誅國賊。',
    course:
      '初平三年，呂布於未央殿刺卓，長安士民稱慶。然卓部曲李傕、郭汜等無所依，用賈詡策反攻長安，殺王允、敗呂布，關中再陷混戰。',
    keyFigures: [
      { name: '王允', role: '司徒，主謀誅卓，後為李傕等所殺' },
      { name: '呂布', role: '親手刺卓，旋敗走關東' },
      { name: '李傕、郭汜', role: '卓部曲，攻陷長安' },
      { name: '賈詡', role: '勸李傕等反攻' },
    ],
    outcome:
      '卓雖死，關中益亂，獻帝播遷；關東州郡更不相統，曹操迎帝之機漸熟。',
    classicQuote:
      '（王）允與呂布及僕射士孫瑞謀誅卓。……（布）刺之，趣兵斬之。……長安士女賣其珠玉裝具與軍人為歡飲者，填滿街肆。',
    classicSource: '《後漢書·董卓傳》；《資治通鑑》卷六十',
    source: '《後漢書·董卓傳》',
    modernParaphrase:
      '王允與呂布合謀除卓；呂布刺殺後催兵斬首。長安士女拿出珠玉與軍人歡飲，街市擠滿。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/董卓',
  },
  '196-xudu': {
    causes:
      '李傕、郭汜混戰後，洛陽殘破，獻帝東歸無依；曹操用荀彧等議，欲挾天子以號令天下。',
    course:
      '建安元年，操迎帝至洛陽，旋遷都許，自為司空、行車騎將軍，錄尚書事；同年始興屯田，以足軍食。',
    keyFigures: [
      { name: '曹操', role: '迎帝都許，總攬朝政' },
      { name: '荀彧', role: '定策迎天子' },
      { name: '漢獻帝', role: '政治名分所在' },
      { name: '棗祗、韓浩', role: '建議屯田' },
    ],
    outcome:
      '「挾天子而令諸侯」之局始定；操得政治名分與河南屯田之資，為官渡、赤壁前北方整合奠基。',
    classicQuote:
      '太祖將迎天子……遂至洛陽，衛京都。……（帝）假太祖節鉞，錄尚書事。……是歲……始興屯田。……遷都許。',
    classicSource: '《資治通鑑》卷六十二；參《三國志·魏書·武帝紀》',
    source: '《資治通鑑》卷六十二',
    modernParaphrase:
      '曹操迎天子到洛陽保衛京師，獲節鉞、錄尚書事；同年開始屯田，並遷都許縣。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/曹操',
  },
  '200-guandu': {
    causes:
      '袁紹據河北四州，與據河南、挾天子之曹操爭天下；紹軍盛，欲一舉南下滅操。',
    course:
      '建安五年相持於官渡。紹軍內部不一；許攸來奔，告烏巢屯糧可襲。操自將奇兵燒烏巢，紹軍崩潰，河北精銳喪盡。',
    keyFigures: [
      { name: '曹操', role: '以少勝多，襲烏巢' },
      { name: '袁紹', role: '河北盟主，官渡大敗' },
      { name: '許攸', role: '叛紹投操，獻烏巢之計' },
      { name: '沮授、田豐', role: '勸紹持重，不見用' },
    ],
    outcome:
      '北方大勢歸曹；其後操陸續平冀、青、幽、并，為南征荊州創造條件。',
    classicQuote:
      '（許）攸曰：「……今袁氏輜重有萬餘乘，在故市、烏巢……若輕兵襲之，燔其積聚，不過三日，袁氏自敗也。」……夜從間道出……既至，圍屯大放火，營中驚亂。',
    classicSource: '《資治通鑑》卷六十三；參《三國志·魏書·武帝紀》',
    source: '《資治通鑑》卷六十三',
    modernParaphrase:
      '許攸建議夜襲烏巢燒掉袁軍糧秣；曹操依計輕兵奇襲，烏巢大火，袁軍自潰。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/官渡之戰',
  },
  '207-wuhuan': {
    causes:
      '袁尚、袁熙敗奔烏桓；蹋頓等與袁氏餘黨連結，威脅幽州北邊，操欲除後顧之憂再南顧。',
    course:
      '建安十二年鑿山填谷出盧龍塞，登白狼山，大破蹋頓。遼東公孫康斬尚、熙首級送來。',
    keyFigures: [
      { name: '曹操', role: '北征主帥' },
      { name: '蹋頓', role: '烏桓首領，戰死' },
      { name: '袁尚、袁熙', role: '袁氏餘黨，為公孫康所殺' },
      { name: '公孫康', role: '遼東太守，獻尚、熙首' },
    ],
    outcome:
      '塞北威脅暫息，操始得專意南顧荊州；遼東公孫氏仍半獨立。',
    classicQuote:
      '夏五月，至無終。……引軍出盧龍塞……登白狼山，卒與虜遇……縱兵擊之，虜眾大崩，斬蹋頓及名王已下。',
    classicSource: '《資治通鑑》卷六十五；參《三國志·魏書·武帝紀》',
    source: '《資治通鑑》卷六十五',
    modernParaphrase:
      '五月出盧龍塞，登白狼山與烏桓骤遇，縱兵大破之，斬蹋頓等首領。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/白狼山之戰',
  },
  '208-chibi': {
    causes:
      '官渡後操統一北方，建安十三年南下荊州；劉琮降，劉備走夏口，遣諸葛亮結孫權共拒曹。',
    course:
      '周瑜、程普為左右督，與備並力，遇於赤壁。操軍疾疫、船艦相連；黃蓋請火攻，操軍燒潰，退保北方。',
    keyFigures: [
      { name: '周瑜', role: '吳軍大都督，主導火攻' },
      { name: '黃蓋', role: '詐降火攻' },
      { name: '諸葛亮', role: '聯吳使者' },
      { name: '曹操', role: '南征主帥，赤壁退軍' },
    ],
    outcome:
      '江東保全，劉備略有荊南；南北對峙、三分雛形自此漸明。',
    classicQuote:
      '時操軍眾已有疾疫……瑜部將黃蓋曰：「……操軍方連船艦，首尾相接，可燒而走也。」……蓋放諸船，同時發火。……煙炎張天，人馬燒溺死者甚眾。',
    classicSource: '《資治通鑑》卷六十五；參《三國志·吳書·周瑜傳》',
    source: '《資治通鑑》卷六十五',
    modernParaphrase:
      '曹軍已有疫病；黃蓋建議火攻相連船艦，火船齊發，岸營延燒，曹軍燒溺甚眾。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/赤壁之戰',
  },
  '211-tongguan': {
    causes:
      '曹操征漢中張魯，關西馬超、韓遂等疑操圖己，聯兵屯潼關拒守。',
    course:
      '建安十六年夾關相持；操潛渡河、結營渭南，又用賈詡計離間超、遂，聯軍自疑，渭南大敗。',
    keyFigures: [
      { name: '曹操', role: '渡河、離間、擊破關西軍' },
      { name: '馬超', role: '關西聯軍主力' },
      { name: '韓遂', role: '與超交惡，為操所間' },
      { name: '賈詡', role: '獻離間計' },
    ],
    outcome:
      '關中郡縣多入操手；馬超南依張魯，後歸劉備。',
    classicQuote:
      '（操）乃間行從蒲阪渡……潛以舟載兵入渭……夜分兵結營於渭南。',
    classicSource: '《資治通鑑》卷六十六；參《三國志·魏書·武帝紀》',
    source: '《資治通鑑》卷六十六',
    modernParaphrase:
      '曹操從蒲阪悄悄渡河，用船運兵入渭，夜裡在渭南分兵紮營，扭轉態勢。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/渭南之戰',
  },
  '214-yizhou': {
    causes:
      '劉璋弱而懼張魯、曹操；聽法正、張松議迎劉備入蜀禦外，雙方旋因權勢衝突決裂。',
    course:
      '建安十六年至十九年，備自葭萌還攻，進圍成都。城中尚有兵穀，璋不忍苦民，開城出降；備領益州牧。',
    keyFigures: [
      { name: '劉備', role: '取益州，奠蜀漢根基' },
      { name: '劉璋', role: '益州牧，出降' },
      { name: '法正', role: '迎備入蜀，後為謀主' },
      { name: '諸葛亮、張飛、趙雲', role: '分路入蜀略地' },
    ],
    outcome:
      '備得益州殷富之地，始有爭天下之資；蜀漢政權基礎奠定。',
    classicQuote:
      '璋言：「父子在州二十餘年，無恩德以加百姓。百姓攻戰三年，肌膏草野者，以璋故也，何心能安！」遂開城出降。',
    classicSource: '《資治通鑑》卷六十七；參《三國志·蜀書·先主傳》',
    source: '《資治通鑑》卷六十七',
    modernParaphrase:
      '劉璋不忍百姓再為他死戰，開城投降。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/劉備入蜀',
  },
  '215-xiaoyaotin': {
    causes:
      '孫權欲取合肥以固淮南；張遼、李典、樂進等奉操命堅守。',
    course:
      '建安二十年，權攻合肥。遼選敢死士衝陣，大破吳軍於逍遙津，權乘駿馬驰渡津橋得免。',
    keyFigures: [
      { name: '張遼', role: '以少擊眾，衝權麾下' },
      { name: '李典、樂進', role: '協守合肥' },
      { name: '孫權', role: '吳軍主帥，幾被俘' },
    ],
    outcome:
      '合肥長期為魏東南重鎮；遼威震江東，吳短期內難北進。',
    classicQuote:
      '遼被甲持戟，先登陷陳，殺數十人，斬二將，大呼自名，衝壘入至權麾下。……遼率諸軍追擊，幾復獲權。',
    classicSource: '《資治通鑑》卷六十七；參《三國志·魏書·張遼傳》',
    source: '《資治通鑑》卷六十七',
    modernParaphrase:
      '張遼率先陷陣，直衝孫權旗下；追擊時差一點捉住孫權。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/逍遙津之戰',
  },
  '219-hanzhong': {
    causes:
      '漢中為益州門戶；劉備取蜀後與曹操爭此戰略要地。',
    course:
      '建安二十二年至二十四年相持。黃忠斬夏侯淵於定軍山；操親自南征，終以糧運艱難棄漢中。備稱漢中王。',
    keyFigures: [
      { name: '劉備', role: '取漢中，稱漢中王' },
      { name: '黃忠', role: '定軍山斬夏侯淵' },
      { name: '夏侯淵', role: '魏漢中主將，戰死' },
      { name: '曹操', role: '親征後棄漢中' },
    ],
    outcome:
      '蜀漢北進門戶一時穩固；關羽督荊州，形成東西並進之勢（旋因襄樊之敗瓦解）。',
    classicQuote:
      '夏侯淵與劉備戰於陽平，為備所殺。……太祖遂棄漢中，還長安。……（備）遂有漢中。',
    classicSource: '《資治通鑑》卷六十八；參《三國志·魏書·武帝紀》',
    source: '《資治通鑑》卷六十八',
    modernParaphrase:
      '夏侯淵戰死，曹操放棄漢中；劉備據有漢中。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/漢中之戰',
  },
  '219-xiangfan': {
    causes:
      '關羽欲配合漢中之勝北爭中原；孫權久覬荊州，呂蒙獻襲取江陵之策。',
    course:
      '羽攻樊，漢水暴溢，水淹于禁七軍，威震華夏。權納蒙策，襲江陵、公安；羽腹背受敵，走麥城，被擒殺。',
    keyFigures: [
      { name: '關羽', role: '攻樊，後敗亡' },
      { name: '于禁', role: '七軍被淹，降羽' },
      { name: '呂蒙', role: '獻策襲荊州' },
      { name: '孫權', role: '背盟取荊州' },
    ],
    outcome:
      '荊州入吳，蜀失東聯北進之勢；夷陵之戰與吳蜀長期猜忌伏線於此。',
    classicQuote:
      '羽……圍曹仁。……會漢水暴溢，于禁七軍皆沒。……（孫）權已據江陵……羽軍遂散。……遂斬羽及子平于臨沮。',
    classicSource: '《資治通鑑》卷六十八；參《三國志·蜀書·關羽傳》',
    source: '《資治通鑑》卷六十八',
    modernParaphrase:
      '關羽水淹于禁七軍；孫權襲據江陵，羽軍潰散，羽父子被斬於臨沮。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/樊城之戰',
  },
  '220-caopi': {
    causes:
      '曹操卒，曹丕嗣魏王、丞相；漢室僅餘名號，禪代條件成熟。',
    course:
      '建安二十五年（延康元年）冬，獻帝「禪讓」，丕即皇帝位，改元黃初，國號魏，東漢亡。',
    keyFigures: [
      { name: '曹丕', role: '受禪稱帝' },
      { name: '漢獻帝', role: '禪位，降為山陽公' },
      { name: '曹操', role: '奠基者，是年春卒' },
    ],
    outcome:
      '形式上完成以魏代漢；蜀、吳稍後亦稱帝，三國政治名分齊備。',
    classicQuote:
      '冬十月乙卯，漢帝使御史大夫張音持節奉璽綬禪位……（丕）乃為壇於繁陽……升壇即阼，改元黃初。',
    classicSource: '《資治通鑑》卷六十九；參《三國志·魏書·文帝紀》',
    source: '《資治通鑑》卷六十九',
    modernParaphrase:
      '漢帝奉璽禪位；曹丕在繁陽築壇即位，改元黃初。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/曹丕',
  },
  '221-liubei-emperor': {
    causes:
      '曹丕篡漢，備君臣以漢統未絕自任；兼為伐吳報關羽預作名分。',
    course:
      '章武元年四月，備即皇帝位於成都武擔之南，改元章武，以諸葛亮為丞相。',
    keyFigures: [
      { name: '劉備', role: '稱帝，史稱昭烈皇帝' },
      { name: '諸葛亮', role: '丞相' },
      { name: '許靖', role: '司徒' },
    ],
    outcome:
      '蜀漢政權名號確立；同年秋即大舉伐吳，通向夷陵。',
    classicQuote:
      '夏四月丙午，先主即皇帝位於武擔之南……改元章武。……以諸葛亮為丞相。',
    classicSource: '《資治通鑑》卷六十九；參《三國志·蜀書·先主傳》',
    source: '《資治通鑑》卷六十九',
    modernParaphrase:
      '先主在武擔山南即皇帝位，改元章武，任諸葛亮為丞相。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/劉備',
  },
  '222-yiling': {
    causes:
      '關羽敗亡、荊州入吳；劉備執意東征報仇，孫權以陸遜拒之。',
    course:
      '章武元年備親征，吳堅守不戰。次年蜀軍疲敝、連營林木，陸遜於猇亭火攻大破之；備退入白帝。五溪蠻曾響應備，沙摩柯等戰死。',
    keyFigures: [
      { name: '陸遜', role: '吳大都督，火攻破蜀' },
      { name: '劉備', role: '親征大敗' },
      { name: '馬良', role: '撫五溪蠻，戰死' },
      { name: '沙摩柯', role: '五溪蠻王，助蜀戰死' },
    ],
    outcome:
      '蜀漢元氣大傷，無力大舉東進；吳蜀旋又媾和，共抗曹魏。',
    classicQuote:
      '（陸遜）乃敕各持一把茅，以火攻拔之……破其四十餘營。……先主升馬鞍山……土崩瓦解，死者萬數。',
    classicSource: '《資治通鑑》卷六十九；參《三國志·吳書·陸遜傳》',
    source: '《資治通鑑》卷六十九',
    modernParaphrase:
      '陸遜令軍士以茅草火攻，破四十餘營；先主退上馬鞍山，蜀軍土崩，死者上萬。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/夷陵之戰',
  },
  '223-liubei-death': {
    causes:
      '夷陵大敗後先主憂憤病篤於永安，須安排後事與嗣君。',
    course:
      '章武三年託孤於諸葛亮、李嚴；四月崩，諡昭烈。五月太子禪即位，改元建興，政事一委亮。',
    keyFigures: [
      { name: '劉備', role: '託孤而崩' },
      { name: '諸葛亮', role: '受遺詔輔政' },
      { name: '李嚴', role: '託孤副手' },
      { name: '劉禪', role: '即位為後主' },
    ],
    outcome:
      '蜀漢進入諸葛亮執政時期；吳蜀修好，專力抗魏。',
    classicQuote:
      '先主病篤，託孤於丞相亮……謂亮曰：「君才十倍曹丕……若嗣子可輔，輔之；如其不才，君可自取。」',
    classicSource: '《資治通鑑》卷七十；參《三國志·蜀書·諸葛亮傳》',
    source: '《資治通鑑》卷七十',
    modernParaphrase:
      '先主託孤於諸葛亮，稱其才十倍曹丕；太子可輔則輔，不才則可自取。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/劉備',
  },
  '225-nanzhong': {
    causes:
      '先主死後南中雍闓、孟獲等叛，威脅蜀漢後方與賦役來源。',
    course:
      '建興三年亮率眾南征，五月渡瀘，秋平四郡。用馬謖「攻心為上」之策，赦孟獲等。',
    keyFigures: [
      { name: '諸葛亮', role: '南征主帥' },
      { name: '馬謖', role: '獻攻心策' },
      { name: '孟獲', role: '南中渠帥，降服' },
      { name: '雍闓', role: '首倡叛亂（此前已死於內部）' },
    ],
    outcome:
      '南中安定，軍資兵源得濟；「南人不復反」為北伐準備後方（記載見注引，學術上對「七擒」細節有討論）。',
    classicQuote:
      '夫用兵之道，攻心為上，攻城為下……（亮）七縱七擒……獲止不去，曰：「公，天威也，南人不復反矣。」',
    classicSource: '《資治通鑑》卷七十；《三國志·蜀書·諸葛亮傳》注引《漢晉春秋》',
    source:
      '《三國志·蜀書·諸葛亮傳》注引《漢晉春秋》；《資治通鑑》卷七十',
    disputed: true,
    note:
      '「七縱七擒」細節僅見裴注引《漢晉春秋》及通鑑綜述，陳壽正文不載。',
    modernParaphrase:
      '注引《漢晉春秋》及《資治通鑑》載七縱七擒孟獲；陳壽《諸葛亮傳》正文不載細節。南征平四郡，後方得濟。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/諸葛亮南征',
  },
  '228-beifa-start': {
    causes:
      '南中既平、吳蜀同盟，亮上《出師表》以興復漢室為任，首出祁山。',
    course:
      '建興六年揚聲斜谷，趙雲為疑兵，亮攻祁山；南安、天水、安定應亮。馬謖街亭違節度，為張郃所破；亮拔西縣千餘家還漢中。〈諸葛亮傳〉載戮謖，〈馬謖傳〉載下獄物故。',
    keyFigures: [
      { name: '諸葛亮', role: '第一次北伐主帥' },
      { name: '馬謖', role: '街亭失利，死因兩說' },
      { name: '張郃', role: '魏軍破街亭' },
      { name: '趙雲', role: '疑兵出斜谷' },
    ],
    outcome:
      '首役不利，然開魏蜀西北長期交兵；其後亮屢出祁山、陳倉、斜谷。',
    classicQuote:
      '亮身率諸軍攻祁山……（馬）謖違亮節度……大為（張）郃所破。……戮謖以謝眾。',
    classicSource: '《資治通鑑》卷七十一；參《三國志·蜀書·諸葛亮傳》',
    source: '《三國志·蜀書·諸葛亮傳》；《三國志·蜀書·馬謖傳》',
    disputed: true,
    note: '《諸葛亮傳》作「戮謖」，《馬謖傳》作「下獄物故」，兩說並存。',
    modernParaphrase:
      '亮攻祁山；馬謖違節度敗於張郃。〈諸葛亮傳〉載戮謖，〈馬謖傳〉載下獄物故，兩說並存。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/諸葛亮北伐',
  },
  '229-sunquan-emperor': {
    causes:
      '魏、蜀已稱帝；孫權久有江東，臣下勸進以正名號，並與蜀約盟中分天下。',
    course:
      '黃龍元年稱帝於武昌，改元黃龍，旋遷都建業；吳蜀遣使約盟。',
    keyFigures: [
      { name: '孫權', role: '稱帝，國號吳' },
      { name: '諸葛亮', role: '遣使賀權稱尊，鞏固同盟' },
    ],
    outcome:
      '魏、蜀、吳三方皆具皇帝名號，三國政治格局完全成形。',
    classicQuote:
      '夏四月，孫權即皇帝位，大赦，改元黃龍。……秋九月，權遷都建業。',
    classicSource: '《資治通鑑》卷七十一；參《三國志·吳書·吳主傳》',
    source: '《資治通鑑》卷七十一',
    modernParaphrase:
      '四月孫權即位改元黃龍；九月遷都建業。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/孫權',
  },
  '234-wuzhangyuan': {
    causes:
      '亮數度北伐未竟；建興十二年復出斜谷，欲與司馬懿決於關中。',
    course:
      '屯五丈原，與懿相持渭南百餘日，分兵屯田。八月亮病卒於軍，楊儀整軍退；懿追而嘆為奇才。',
    keyFigures: [
      { name: '諸葛亮', role: '病卒於五丈原' },
      { name: '司馬懿', role: '魏軍對峙主帥' },
      { name: '楊儀', role: '整軍退還' },
      { name: '姜維', role: '亮拔為繼任軍事人才' },
    ],
    outcome:
      '蜀漢失去主政二十年之中樞，國策轉守；蔣琬、費禕相繼執政。',
    classicQuote:
      '相持百餘日。……其年八月，亮疾病，卒于軍……（懿）案行其營壘處所，曰：「天下奇才也！」',
    classicSource: '《資治通鑑》卷七十二；參《三國志·蜀書·諸葛亮傳》《晉書·宣帝紀》',
    source: '《資治通鑑》卷七十二',
    modernParaphrase:
      '對峙百餘日後亮卒於軍；司馬懿巡視營壘，嘆為天下奇才。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/諸葛亮',
  },
  '238-gongsun': {
    causes:
      '遼東公孫淵自立為燕王、改元紹漢，背叛魏廷。',
    course:
      '景初二年司馬懿為太尉往討，圍襄平，城潰斬淵父子，傳首洛陽。',
    keyFigures: [
      { name: '司馬懿', role: '征遼東主帥' },
      { name: '公孫淵', role: '自立燕王，敗死' },
    ],
    outcome:
      '東北威脅消除；司馬氏軍功與威望再增，為日後高平陵之變蓄積資本。',
    classicQuote:
      '公孫淵自立為燕王……帝以司馬懿為太尉，往討之。……襄平城潰，斬淵父子，傳首洛陽。',
    classicSource: '《資治通鑑》卷七十四；參《三國志·魏書·公孫度傳》',
    source: '《資治通鑑》卷七十四',
    modernParaphrase:
      '公孫淵稱燕王；司馬懿攻破襄平，斬淵父子。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/公孫淵',
  },
  '249-gaopingling': {
    causes:
      '曹爽執政排斥司馬懿；懿稱病韜晦，伺機奪權。',
    course:
      '正始十年帝謁高平陵，爽兄弟皆從。懿閉洛陽城門，奏太后廢爽，誘其罷兵，旋夷三族及黨羽。',
    keyFigures: [
      { name: '司馬懿', role: '政變主導者' },
      { name: '曹爽', role: '大將軍，被夷族' },
      { name: '曹芳', role: '魏帝，為懿所制' },
      { name: '司馬師、司馬昭', role: '助父奪權，後專魏政' },
    ],
    outcome:
      '魏國軍政實歸司馬氏；「高平陵之變」為西晉代魏關鍵轉折。',
    classicQuote:
      '帝謁高平陵，大將軍爽與弟……皆從。……（司馬懿）閉諸城門……遂免爽……俱夷三族。',
    classicSource: '《資治通鑑》卷七十五；參《晉書·宣帝紀》《三國志·魏書·曹爽傳》',
    source: '《資治通鑑》卷七十五',
    modernParaphrase:
      '帝謁陵時司馬懿閉城門罷免曹爽兄弟，後夷其三族。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/高平陵之變',
  },
  '252-sunquan-death': {
    causes:
      '權年高病篤，須定儲君與輔政大臣。',
    course:
      '太元二年立少子亮為太子，諸葛恪為太傅；秋權崩，亮即位。其後恪被殺，孫峻、孫綝相繼專權。',
    keyFigures: [
      { name: '孫權', role: '吳大帝，崩' },
      { name: '孫亮', role: '即位' },
      { name: '諸葛恪', role: '太傅輔政，旋敗死' },
    ],
    outcome:
      '吳廷政爭迭起，國力內耗，為晉平吳埋下遠因。',
    classicQuote:
      '夏四月，權薨……太子亮即皇帝位……（諡）曰大皇帝。',
    classicSource: '《資治通鑑》卷七十五；參《三國志·吳書·吳主傳》',
    source: '《資治通鑑》卷七十五',
    modernParaphrase:
      '四月孫權去世，太子亮即位，諡大皇帝。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/孫權',
  },
  '263-fall-of-shu': {
    causes:
      '蜀漢國小民疲、姜維連年北伐；魏司馬昭決策滅蜀以立威。',
    course:
      '景元四年鍾會出斜谷，鄧艾自陰平小路趨江油、綿竹；諸葛瞻戰死，後主用譙周議降成都。',
    keyFigures: [
      { name: '鄧艾', role: '陰平偷渡，逼降成都' },
      { name: '鍾會', role: '主攻漢中、劍閣' },
      { name: '劉禪', role: '後主，出降' },
      { name: '諸葛瞻', role: '綿竹戰死' },
      { name: '譙周', role: '勸降' },
    ],
    outcome:
      '蜀漢亡；三國缺一角，晉統一只餘平吳。',
    classicQuote:
      '（鄧）艾自陰平道行無人之地七百餘里……進破諸葛瞻於綿竹……後主……面縛輿�……進破諸葛瞻於綿竹……後主……面縛輿櫬，詣軍門降。',
    classicSource: '《資治通鑑》卷七十八；參《三國志·魏書·鄧艾傳》《蜀書·後主傳》',
    source: '《資治通鑑》卷七十八',
    modernParaphrase:
      '鄧艾陰平小路七百里至綿竹破瞻；後主綁手上軍門投降。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/魏滅蜀之戰',
  },
  '265-western-jin': {
    causes:
      '司馬氏三代專魏；昭卒後子炎嗣相國、晉王，受禪條件具備。',
    course:
      '咸熙二年冬魏元帝禪位，炎即皇帝位，國號晉，改元泰始。',
    keyFigures: [
      { name: '司馬炎', role: '晉武帝，受禪' },
      { name: '司馬昭', role: '生前為晉王，是年卒' },
      { name: '魏元帝曹奐', role: '禪位' },
    ],
    outcome:
      '曹魏亡；晉承魏土與吳對峙。十餘年後滅吳，接收的是郡縣，不是把山谷與塞外都收為編戶。',
    classicQuote:
      '十二月……魏帝禪位于晉……（炎）即皇帝位，改元泰始。大赦。',
    classicSource: '《資治通鑑》卷七十九；《晉書·武帝紀》',
    source: '《資治通鑑》卷七十九',
    modernParaphrase:
      '十二月魏帝禪晉；司馬炎即位，改元泰始。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/晉武帝',
  },
  '280-fall-of-wu': {
    causes:
      '孫皓暴虐、吳政腐敗；晉武帝決策水陸大舉伐吳。',
    course:
      '咸寧五年至太康元年，王濬樓船下益州，杜預、王渾等分道並進；濬先入建業，孫皓降。',
    keyFigures: [
      { name: '王濬', role: '樓船先入石頭城' },
      { name: '杜預', role: '荊州方向主將' },
      { name: '孫皓', role: '吳末帝，出降' },
      { name: '司馬炎', role: '決策滅吳' },
    ],
    outcome:
      '吳亡，三個朝廷結束，晉接收孫吳郡縣。這不是把五溪蠻、僚、俚、爨、山越，以及塞外鮮卑、高句麗、并州南匈奴都收為編戶。見本年「未入編戶」條。不久八王之亂，連郡縣上的統一也未能長久。',
    classicQuote:
      '（王濬）戎卒八萬，方舟百里……入於石頭。……（孫）皓面縛輿櫬，詣軍門降。',
    classicSource: '《資治通鑑》卷八十一；《晉書·武帝紀》',
    source: '《資治通鑑》卷八十一',
    modernParaphrase:
      '王濬八萬水軍入石頭；孫皓綁手上軍門投降。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/晉滅吳之戰',
  },
  '280-feihan': {
    causes:
      '太康元年王濬入石頭，孫皓降，晉接收孫吳的郡守與戶籍上的郡縣。郡縣官守換了人，不等於山谷、嶺南、南中和塞外都變成編戶。',
    course:
      '五溪蠻在沅水上游雄、樠、酉、潕、辰五溪。《後漢書·南蠻傳》稱武陵蠻，以賨布羈縻；《宋書·夷蠻傳》仍稱五溪蠻，戶口不可知。孫吳只控制沿岸郡縣，曹魏從未領武陵。滅吳只換郡守；東晉陶侃仍派張誕討五溪夷。南朝左郡、左縣由渠帥羈縻。僚在巴蜀山谷，蜀漢與西晉都未收為編戶；成漢李壽、李勢之世才大量出山，《晉書·李勢載記》記十餘萬落不可禁制，《華陽國志》亦記僚從山出，《魏書·僚傳》明說深山者仍不為編戶。俚在交、廣、合浦、高涼，《南齊書·州郡志》仍說樓居山險、不肯賓服。爨氏自漢末就是建寧大姓；泰始年間已分寧州，280 年仍未按戶直領。山越經諸葛恪討丹陽、得甲士四萬後，大股武裝減弱，山地未登記人口未消失。鮮卑慕容、拓跋與高句麗本來不在三國郡縣，晉亦未收為內郡。南匈奴是并州附塞五部，以「落」計；304 年劉淵起事後才成獨立政權。',
    keyFigures: [
      { name: '相單程', role: '武陵精夫，據險，非編戶' },
      { name: '張誕', role: '陶侃所遣，討五溪夷' },
      { name: '諸葛恪', role: '討丹陽山越，得甲士四萬' },
      { name: '爨習', role: '建寧大姓，地方豪族' },
      { name: '慕容廆', role: '鮮卑慕容部，受晉名號而部眾不入內郡' },
      { name: '劉淵', role: '南匈奴，304 年離石起事' },
    ],
    outcome:
      '280 年的晉色表示郡縣官守，不是全國編戶。五溪蠻不併入西晉，也不把荊州整片塗成蠻。南匈奴、鮮卑、西羌、武都氐、高句麗、山越、僚、俚、爨在「塞外部族」用示意色標活動帶，不是郡界，也不是獨立王國。',
    classicQuote:
      '蠻民順附者，一戶輸穀數斛，其餘無雜調……種類稍多，戶口不可知也。……居武陵者有雄谿、樠谿、辰谿、酉谿、舞谿，謂之五谿蠻。',
    classicSource:
      '《宋書·夷蠻傳》。並參《魏書·僚傳》「在深山者仍不為編戶」；《後漢書·南蠻傳》',
    source: '《後漢書·南蠻傳》；《晉書·武帝紀》',
    note:
      '《宋書·夷蠻傳》等為後代史回溯，本卡主述以後漢書／晉書為準。',
    modernParaphrase:
      '歸附的蠻，一戶只交幾斛穀，沒有其他雜稅。人口有多少，州郡其實不知道。住在武陵的，稱為五溪蠻。',
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/五溪蠻',
    furtherReading: [
      {
        label: '維基文庫：《後漢書·南蠻傳》',
        url: 'https://zh.wikisource.org/wiki/後漢書/卷86',
      },
      {
        label: '維基文庫：《宋書·夷蠻傳》',
        url: 'https://zh.wikisource.org/wiki/宋書/卷97',
      },
      {
        label: '維基文庫：《晉書·武帝紀》',
        url: 'https://zh.wikisource.org/wiki/晉書/卷003',
      },
    ],
  },
}

export function timelineDetailFor(id: string): TimelineDetail | undefined {
  return TIMELINE_DETAILS[id]
}
