# 兩條工作線內容合併報告（逐條豐富度取捨）

- base：`.`
- other：`/Users/ka-kinpoon/.cline/worktrees/2abcf/sanguozhi-3d`
- 模式：已寫入

## 摘要
- 兩邊完全相同嘅資料檔：28
- 逐條取 other（較豐富）：0
- 逐條保留 base：266
- 硬閘拒絕（簡體字／演義出處）：1
- base 缺、未自動插入嘅 id：13
- 只在 other 出現嘅新檔：0

## 檔案層面
- 僅 base：`src/bakumatsu/data/bakumatsuHanMeshes.ts`（保留）
- 僅 base：`src/bakumatsu/data/bakumatsuHanPaint.ts`（保留）
- 僅 base：`src/bakumatsu/data/hanDisplayNames.ts`（保留）
- 僅 base：`src/data/chinaPlacesProvenance.ts`（保留）
- 僅 base：`src/data/territory/index.ts`（保留）
- 僅 base：`src/data/territory/provenance.ts`（保留）
- 僅 base：`src/data/territory/ringProvenance.ts`（保留）
- 僅 base：`src/data/territory/types.ts`（保留）
- 僅 base：`src/imperial/data/civilWarPack.ts`（保留）
- 僅 base：`src/imperial/data/depthNarrative.ts`（保留）
- 僅 base：`src/japanHistory/data/edoMapData.ts`（保留）
- 僅 base：`src/japanHistory/data/edoTerritory.ts`（保留）
- 僅 base：`src/japanHistory/data/modernEmpire.ts`（保留）
- 僅 base：`src/japanHistory/data/warDetails.ts`（保留）
- 僅 base：`src/qinhan/data/monthAxis.ts`（保留）
- 僅 base：`src/sengoku/data/codhKokugunMeshes.ts`（保留）
- 僅 base：`src/sengoku/data/japanKokugunPaint.ts`（保留）

## 逐檔取捨
### `src/imperial/data/minguoPack.ts`（換入 11 條）
保留 mg-1912：base 829 ≥ other 256
保留 mg-1916：base 820 ≥ other 238
保留 mg-1922：base 753 ≥ other 224
插入 base 缺嘅 id `mg-1927`（score 289）
插入 base 缺嘅 id `mg-1934`（score 335）
插入 base 缺嘅 id `mg-1936`（score 255）
保留 mg-1928：base 813 ≥ other 246
保留 mg-1937：base 873 ≥ other 241
插入 base 缺嘅 id `mg-1941`（score 283）
保留 mg-1945：base 846 ≥ other 292
插入 base 缺嘅 id `mg-1945-talks`（score 303）
插入 base 缺嘅 id `mg-1946`（score 303）
插入 base 缺嘅 id `mg-1948-liaoshen`（score 275）
插入 base 缺嘅 id `mg-1948-huaihai`（score 285）
插入 base 缺嘅 id `mg-1949-pingjin`（score 228）
插入 base 缺嘅 id `mg-1949-crossing`（score 246）
插入 base 缺嘅 id `mg-1949-taiwan`（score 292）

### `src/imperial/data/nanbeiPack.ts`（換入 0 條）
拒絕 taixue-399：簡體字×1（学）
保留 sixue-438：base 794 ≥ other 378
保留 wujing-505：base 758 ≥ other 370
保留 feishui-383：base 253 ≥ other 253

### `src/sengoku/data/marchRoutes.ts`（換入 2 條）
保留 kawagoe：base 91 ≥ other 70
保留 itsukushima：base 85 ≥ other 68
保留 okinawajima：base 102 ≥ other 102
保留 kawanakajima：base 122 ≥ other 89
保留 joraku：base 68 ≥ other 68
保留 anegawa：base 117 ≥ other 82
保留 mikatagahara：base 110 ≥ other 69
保留 nagashino：base 107 ≥ other 66
保留 chugoku：base 112 ≥ other 79
保留 chugoku-gaeshi：base 108 ≥ other 81
保留 shizugatake：base 127 ≥ other 99
保留 komaki：base 100 ≥ other 75
保留 kyushu：base 113 ≥ other 80
保留 odawara：base 112 ≥ other 75
保留 oshu：base 99 ≥ other 68
保留 korea：base 115 ≥ other 92
插入 base 缺嘅 id `korea-1597`（score 173）
插入 base 缺嘅 id `korea-1598`（score 138）
保留 sekigahara：base 109 ≥ other 68
保留 osaka-march：base 115 ≥ other 76
