/**
 * Longer zh-Hant backgrounds for the Sengoku people panel.
 * Tone: 日本史通說。不採演義／遊戲劇情。
 */

export const SENGOKU_PERSON_PROFILES: Record<string, string> = {
  'oda-nobunaga':
    '尾張織田家出身。桶狹間破今川義元後上洛，放逐足利義昭，長篠破武田。統一未竟，天正十年死於本能寺之變。',
  'toyotomi-hideyoshi':
    '出身低微，仕信長。山崎討光秀後經清洲會議擴張，小田原征伐後大致統一日本；文祿、慶長兩度出兵朝鮮，慶長三年卒於伏見。賜姓豐臣前通稱羽柴秀吉。',
  'tokugawa-ieyasu':
    '三河出身，早年人質於今川。桶狹間後自立，與信長、秀吉周旋。關原勝後任征夷大將軍，開江戶幕府；大坂之陣後豐臣氏絕。',
  'takeda-shingen':
    '甲斐武田家督，善用騎兵，與上杉謙信屢戰川中島。西上途中病卒，家業由勝賴繼承，長篠後由盛轉衰。',
  'uesugi-kenshin':
    '越後守護代長尾氏出身，後襲上杉名。與信玄對峙多年，自稱毘沙門天化身之說屬後世傳說，戰績則見於中世軍記與文書。',
  'imagawa-yoshimoto':
    '駿河今川家督，文化與領國經營一時稱盛。永祿三年率軍上洛，本陣於桶狹間遭信長奇襲，戰死，今川氏自此衰退。',
  'mori-motonari':
    '安藝毛利氏，以謀略擴張至中國地方，擊破大內、尼子等。晚年家督交後人，毛利成為西國一大勢力。',
  'akechi-mitsuhide':
    '織田重臣。天正十年六月襲本能寺，信長、信忠死。未幾山崎敗於秀吉，敗走中被殺。政變動機史有多說。',
  'ishida-mitsunari':
    '近江出身，秀吉近臣，任奉行。秀吉死後與家康對立，關原西軍核心，戰敗被斬。',
  'shimazu-yoshihiro':
    '薩摩島津氏。九州統一戰爭中重要將領；關原屬西軍，敗後率部突圍撤回薩摩，島津氏仍保有領地。',
  'date-masamune':
    '陸奧伊達氏，稱霸奧羽。秀吉、家康時代先後臣服，江戶初期仍為外樣大名。',
  'hojo-ujiyasu':
    '後北條氏第三代，擴張關東，與武田、上杉、今川合縱連橫。氏康死後家勢仍盛，至氏政時為秀吉所滅。',
}

export function sengokuPersonSummary(id: string): string | undefined {
  return SENGOKU_PERSON_PROFILES[id]
}
