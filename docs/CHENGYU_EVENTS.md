# task_0020：成語→事件接駁（20 條 eraLink=year）

狀態：WIP。第一原則：「查唔到就唔好加」。本檔逐條記錄（成語→新事件 id→source）與跳過原因，
最終報告與此一致。

## 基線（開工前，origin/main = 6716da9）

| 閘門 | 基線值 |
|---|---|
| `audit:chengyu-coverage` noEventLink | 50（91 條中 45 條 kind=year） |
| `audit:event-depth` 缺口 | 255（起因 82／經過 121／結果 52），段落 791 |
| `audit:data` | fail 0｜warn 49 |
| `audit:chars` | 硬傷 0 |
| `audit:quotes` | 錯誤 2｜提醒 45 |
| `audit:chengyu` | fail 0｜warn 4 |
| `audit:detail-depth` | 詳情 44 條／缺口 0 |

## 20 條佇列與初判（kind=year，實測自 idioms.json）

| # | 成語 id | 詞語 | eraLink.year | 擬接事件（一手出處） | 初判 |
|---|---|---|---|---|---|
| 1 | cn-chengyu-duoxingbuyi | 多行不義必自斃 | -722 | 《左傳·隱公元年》鄭伯克段于鄢 | 可查證 |
| 2 | cn-chengyu-congshanruliu | 從善如流 | -583 | 《左傳·成公八年》 | 待核 |
| 3 | cn-chengyu-juangansiwei | 居安思危 | -562 | 《左傳·襄公十一年》 | 待核 |
| 4 | cn-chengyu-weidadiaobudiao | 尾大不掉 | -531 | 《左傳·昭公十一年》 | 待核 |
| 5 | cn-chengyu-danguanxiangqing | 彈冠相慶 | -48 | 《漢書·王吉傳》 | 待核 |
| 6 | cn-chengyu-qutuxixin | 曲突徙薪 | -67 | 《漢書·霍光傳》 | 待核 |
| 7 | cn-chengyu-zhongliujiyi | 中流擊楫 | 313 | 《晉書·祖逖傳》 | 待核 |
| 8 | cn-chengyu-huatingheli | 華亭鶴唳 | 303 | 《晉書·陸機傳》 | 待核 |
| 9 | cn-chengyu-yishiweijing | 以史為鏡 | 643 | 《貞觀政要》／《舊唐書·魏徵傳》 | 待核 |
| 10 | cn-chengyu-sanjiandingtianshan | 三箭定天山 | 662 | 《舊唐書·薛仁貴傳》 | 待核 |
| 11 | cn-chengyu-wanlichangcheng | 萬里長城 | 436 | 《宋書·檀道濟傳》 | 待核 |
| 12 | cn-chengyu-wudouzhewao | 不為五斗米折腰 | 405 | 《晉書·陶潛傳》 | 待核 |
| 13 | cn-chengyu-huanglongtongyin | 黃龍痛飲 | 1140 | 《宋史·岳飛傳》 | 待核 |
| 14 | cn-chengyu-huangpaojiashen | 黃袍加身 | 960 | 《宋史·太祖本紀》 | 待核 |
| 15 | cn-chengyu-huadijiaozi | 畫荻教子 | 1010 | 《歐陽修全集》附年譜／《宋史·歐陽修傳》 | 待核 |
| 16 | jp-chengyu-katashimoyohibitowosaku | 堅石も醉人を避く | 712 | 《日本書紀》 | 待核 |
| 17 | jp-chengyu-shiranugahotoke | 知らぬが仏 | 1638 | — | 待核 |
| 18 | jp-chengyu-momokurisannen | 桃栗三年柿八年 | 1674 | — | 待核 |
| 19 | jp-chengyu-ishibashi | 石橋を叩いて渡る | 1786 | — | 待核 |
| 20 | jp-chengyu-gadeninsui | 我田引水 | 1899 | — | 待核 |

初判只係分類，最終以能否喺 Wikisource 攞到可逐字比對嘅一手文字為準；攞唔到就寫明
「通說整理，非逐字引文」，完全搵唔到一手出處就跳過，保留 kind=year。
