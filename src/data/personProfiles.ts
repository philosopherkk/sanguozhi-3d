/**
 * Ranking + longer 正史背景 for UI. Higher rank = show first.
 * Leaders of major factions for a given era should outrank peripherals.
 */

export interface PersonProfile {
  /** Higher = more important for that era’s UI */
  rank: number
  /** Longer Traditional Chinese background (正史 tone) */
  summary: string
}

export const PERSON_PROFILES: Record<string, PersonProfile> = {
  'cao-cao': {
    rank: 100,
    summary:
      '沛國譙人。黃巾後起兵，迎獻帝都許，破袁紹於官渡，北定烏桓，南征荊州而不利於赤壁。執政二十餘年，奠曹魏基業。事詳《三國志·魏書·武帝紀》。',
  },
  'liu-bei': {
    rank: 100,
    summary:
      '涿郡人，漢景帝子中山靖王之後。早歲流離，得諸葛亮，聯孫權拒曹操於赤壁；後得益州、漢中，稱帝於成都，國號漢。事詳《先主傳》。',
  },
  'sun-quan': {
    rank: 100,
    summary:
      '孫堅次子，承兄策據江東。赤壁與周瑜破曹，後取荊州、稱帝建業，國號吳。在位久，江東制度漸備。事詳《吳主傳》。',
  },
  'zhuge-liang': {
    rank: 95,
    summary:
      '琅邪陽都人。隱居隆中，劉備三顧而出；佐定益州，託孤後主，南定南中，五次北伐，卒於五丈原。事詳《諸葛亮傳》。',
  },
  'sima-yi': {
    rank: 95,
    summary:
      '河內溫人。事曹操父子，拒諸葛亮於關中；高平陵之變誅曹爽，魏政歸司馬氏，為西晉開基。事詳《晉書·宣帝紀》。',
  },
  'dong-zhuo': {
    rank: 98,
    summary:
      '隴西臨洮人。何進召邊將入京，卓擁兵廢少帝、立獻帝，遷都長安，殘暴專權，後為王允、呂布所殺。事詳《董卓傳》。',
  },
  'yuan-shao': {
    rank: 96,
    summary:
      '汝南汝陽人。盟主討董後據冀州，兼幽、并、青，官渡敗於曹操，二子爭立，河北終入操手。事詳《袁紹傳》。',
  },
  'guan-yu': {
    rank: 88,
    summary:
      '河東解人。從劉備起兵，曾降曹操而後歸；鎮荊州，攻樊城水淹于禁，呂蒙襲南郡，敗走麥城被殺。事詳《關羽傳》。',
  },
  'zhou-yu': {
    rank: 90,
    summary:
      '廬江舒人。與孫策友善，赤壁為大都督，火攻破曹操水軍，尋卒。事詳《周瑜傳》。',
  },
  'lu-bu': {
    rank: 85,
    summary:
      '五原郡九原人。先事丁原、董卓，誅卓後輾轉袁術、袁紹間，據徐州，為曹操所滅於下邳。事詳《呂布傳》。',
  },
  'liu-biao': {
    rank: 86,
    summary:
      '山陽高平人。任荊州牧，保境安民十餘年；卒後子琮降曹操，荊州大勢一變。事詳《劉表傳》。',
  },
  'liu-zhang': {
    rank: 84,
    summary:
      '江夏竟陵人，劉焉子。領益州牧，迎劉備入蜀禦張魯，反為備所圖，降，遷荊州。事詳《劉二牧傳》。',
  },
  'sun-ce': {
    rank: 92,
    summary:
      '孫堅長子。得袁術兵馬渡江，掃平江東，奠孫氏基業，遇刺卒，弟權繼立。事詳《孫破虜討逆傳》。',
  },
  'sun-jian': {
    rank: 80,
    summary:
      '吳郡富春人。討黃巾、擊董卓，於襄陽戰死；子孫策、權繼其業。事詳《孫破虜討逆傳》。',
  },
  'zhang-liao': {
    rank: 82,
    summary:
      '雁門馬邑人。先屬呂布，降曹操後守合肥，逍遙津大破孫權，威震江東。事詳《張遼傳》。',
  },
  'fa-zheng': {
    rank: 78,
    summary:
      '扶風郿人。初事劉璋，迎劉備；謀取漢中，為備之謀主，卒後備深痛惜。事詳《法正傳》。',
  },
  'lu-xun': {
    rank: 88,
    summary:
      '吳郡吳人。夷陵火攻破劉備，後為丞相，抗魏於淮南。事詳《陸遜傳》。',
  },
  'lu-meng': {
    rank: 86,
    summary:
      '汝南富陂人。白衣渡江襲取江陵，關羽敗亡，荊州歸吳；旋病卒。事詳《呂蒙傳》。',
  },
  'cao-pi': {
    rank: 90,
    summary:
      '曹操次子。代漢稱帝，國號魏，定九品官人法，與吳、蜀鼎峙。事詳《文帝紀》。',
  },
  'liu-shan': {
    rank: 70,
    summary:
      '劉備子。繼位後諸葛亮、蔣琬、費禕相繼輔政；炎興元年鄧艾至成都，出降，蜀亡。事詳《後主傳》。',
  },
  'jiang-wei': {
    rank: 75,
    summary:
      '天水冀人。原魏將，歸蜀，亮卒後屢伐魏；鍾會入漢中，維偽降謀復國不成被殺。事詳《姜維傳》。',
  },
  'deng-ai': {
    rank: 80,
    summary:
      '義陽棘陽人。偷渡陰平滅蜀，後與鍾會齟齬，被誣殺。事詳《鄧艾傳》。',
  },
  'sima-yan': {
    rank: 92,
    summary:
      '司馬昭子。受魏禪建晉。太康元年滅吳，收孫吳郡縣；五溪蠻等未入編戶。事詳《晉書·武帝紀》。',
  },
  'emperor-xian': {
    rank: 72,
    summary:
      '靈帝子。董卓立之，遷徙流離，都許後政歸曹操；禪位於曹丕，東漢亡。事詳《後漢書·孝獻帝紀》。',
  },
  'huangfu-song': {
    rank: 70,
    summary:
      '安定朝那人。與朱儁等討平黃巾主力，為漢末名將。事詳《後漢書·皇甫嵩傳》。',
  },
  'yuan-shu': {
    rank: 74,
    summary:
      '袁紹從弟。據壽春稱帝號仲家，兵敗資盡，病死。事詳《袁術傳》。',
  },
  'gongsun-yuan': {
    rank: 68,
    summary:
      '遼東公孫氏後。自立燕王，為司馬懿所滅，遼東入魏。事詳《公孫度傳》。',
  },
  'ma-chao': {
    rank: 76,
    summary:
      '扶風茂陵人。與韓遂拒曹操於潼關，敗後歸張魯，終投劉備。事詳《馬超傳》。',
  },
  'zhao-yun': {
    rank: 80,
    summary:
      '常山真定人。從劉備，長坂救阿斗，後備漢中、南征北伐皆與其役。事詳《趙雲傳》。',
  },
  'xun-yu': {
    rank: 77,
    summary:
      '潁川潁陰人。為曹操謀主，定迎天子、深根固本之策；後以勸操勿進爵鬱鬱卒。事詳《荀彧傳》。',
  },
  'guo-jia': {
    rank: 76,
    summary:
      '潁川陽翟人。多算破袁紹、烏桓之策，早卒，操深惜之。事詳《郭嘉傳》。',
  },
}

/** Default rank if not listed — peripherals sink */
export function personRank(id: string): number {
  return PERSON_PROFILES[id]?.rank ?? 20
}

export function personSummary(id: string, fallbackSource: string): string {
  return (
    PERSON_PROFILES[id]?.summary ??
    `正史有傳／紀。出典：${fallbackSource}。點選可載入百科詳文。`
  )
}
