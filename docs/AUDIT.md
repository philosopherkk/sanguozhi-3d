# 三國志資料稽核報告

由 `npm run audit:data` 產生。範圍：`src/data/` 三國專題（184–280），另掃描 `SanguozhiApp` 與 `src/components/**` 簡體字。

**產生時間：** 2026-10-30T17:12:30.158Z

## 摘要

| 級別 | 數量 |
|------|------|
| fail | 0 |
| warn | 62 |

### fail 按 code

_（無）_

### warn 按 code

- `simplified-han`: 27
- `simplified-ui`: 1
- `source-allowlist`: 30
- `yanyi-trope`: 3
- `year-range`: 1

## 規則

1. 每筆含 `source` 的資料列須非空，且含《書名·卷／篇》。
2. `disputed: true` 須有 `note`。
3. 事件／戰役／行軍 `year` 須在 184–280（人口對照年等例外為 warn）。
4. 主 `source` 允許：三國志、裴注、後漢書、資治通鑑、晉書；**宋書** 僅可出現在 `note` 並標「後代史回溯」。
5. 演義專屬情節（草船借箭、空城計、桃園結義、溫酒斬華雄、連環計）→ warn（三顧茅廬不在此列）；反駁演義之 note 可在同行或上一行加 `// lint-allow:yanyi`。
6. 簡體專用字（curated S-set）→ warn。

## fail 明細

_（無）_


## warn 明細

- **source-allowlist** · `src/data/timeline.json[17]` — source 含非主允許書名《漢晉春秋》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/population.json[0]` — source 含非主允許書名《帝王世紀》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **year-range** · `src/data/population.json[0]` — year 157 不在 184–280
- **source-allowlist** · `src/data/population.json[1]` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/population.json[2]` — source 含非主允許書名《續漢書·郡國志》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/population.json[2]` — source 含非主允許書名《帝王世紀》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/population.json[2]` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/population.json[3]` — source 含非主允許書名《晉陽秋》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[8] (wuhuan)` — source 含非主允許書名《田疇傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[11] (yizhou)` — source 含非主允許書名《劉二牧傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[17] (nanzhong)` — source 含非主允許書名《華陽國志·南中志》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[18] (nanzhong-west)` — source 含非主允許書名《華陽國志·南中志》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[19] (nanzhong-east)` — source 含非主允許書名《華陽國志·南中志》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[26] (xiapi)` — source 含非主允許書名《呂布傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:FRONTIER_ZONES[5] (di)` — source 含非主允許書名《魏略·西戎傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/marchRoutes.ts:FRONTIER_ZONES[6] (liao)` — source 含非主允許書名《魏書·僚傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/personProfiles.ts.zhao-yun` — source 含非主允許書名《雲別傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.東漢.population` — source 含非主允許書名《帝王世紀》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.劉璋.population` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.曹魏.population` — source 含非主允許書名《通典·食貨典》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.曹魏.politics` — source 含非主允許書名《文帝紀》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.曹魏.years.263.politics` — source 含非主允許書名《通典·食貨典》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.蜀漢.population` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.蜀漢.military` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.蜀漢.politics` — source 含非主允許書名《後主傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.蜀漢.years.263.politics` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.蜀漢.years.263.economy` — source 含非主允許書名《蜀記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/factionSituation.ts.孫吳.population` — source 含非主允許書名《晉陽秋》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/unregisteredHouseholds.ts[0]` — source 含非主允許書名《陶侃傳》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/unregisteredHouseholds.ts[6]` — source 含非主允許書名《劉元海載記》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **source-allowlist** · `src/data/timelineDetails.ts:225-nanzhong` — source 含非主允許書名《漢晉春秋》（允許：三國志、裴注、後漢書、資治通鑑、晉書）
- **yanyi-trope** · `src/data/battles.json:30` — 可能為演義情節用語：「連環計」
- **yanyi-trope** · `src/data/readingLayers.ts:92` — 可能為演義情節用語：「連環計」
- **yanyi-trope** · `src/data/readingLayers.ts:94` — 可能為演義情節用語：「連環計」
- **simplified-han** · `src/data/battles.json[2].result` — 疑似簡體字：西
- **simplified-han** · `src/data/battles.json[11].attacker` — 疑似簡體字：西
- **simplified-han** · `src/data/timeline.json[8].desc` — 疑似簡體字：西
- **simplified-han** · `src/data/timeline.json[25].title` — 疑似簡體字：西
- **simplified-han** · `src/data/timeline.json[25].factions[0]` — 疑似簡體字：西
- **simplified-han** · `src/data/timeline.json[26].factions[0]` — 疑似簡體字：西
- **simplified-han** · `src/data/timeline.json[27].factions[0]` — 疑似簡體字：西
- **simplified-han** · `src/data/people.json[5].faction_by_year[1].faction` — 疑似簡體字：西
- **simplified-han** · `src/data/people.json[61].faction_by_year[1].faction` — 疑似簡體字：西
- **simplified-han** · `src/data/people.json[62].faction_by_year[0].faction` — 疑似簡體字：西
- **simplified-han** · `src/data/people.json[63].faction_by_year[0].faction` — 疑似簡體字：西
- **simplified-han** · `src/data/people.json[63].zhwiki_url` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.189-dongzhuo.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.190-guandong.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.211-tongguan.layers.secondary` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.211-tongguan.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.215-xiaoyaotin.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.219-xiangfan.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.221-liubei-emperor.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.228-beifa-start.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/readingLayers.ts.280-feihan.layers.university` — 疑似簡體字：西
- **simplified-han** · `src/data/factionSituation.ts.東漢.military.text` — 疑似簡體字：西
- **simplified-han** · `src/data/factionSituation.ts.馬超韓遂.population.text` — 疑似簡體字：西
- **simplified-han** · `src/data/factionSituation.ts.曹魏.grain.text` — 疑似簡體字：西
- **simplified-han** · `src/data/unregisteredHouseholds.ts[1].text` — 疑似簡體字：西
- **simplified-han** · `src/data/unregisteredHouseholds.ts[3].text` — 疑似簡體字：西
- **simplified-han** · `unregisteredHouseholds.wuxiLegendNote.text` — 疑似簡體字：西
- **simplified-ui** · `src/components/YearScrubber.tsx` — UI 檔疑似簡體字：西


---

稽核腳本：`scripts/audit-data.ts`（`node --experimental-strip-types`）。CI 見 `.github/workflows/audit.yml`。
