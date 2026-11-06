# 三國志 · 正史疆域（3D）

以陳壽《三國志》（裴松之注）、《後漢書》、《資治通鑑》、《晉書》為據的互動立體網站。**不用《三國演義》。**

## 開發

```bash
npm install
npm run dev
```

## 引文稽核

每條引文都要對得上正史原文。工具：

```bash
npm run audit:quotes              # 摘要：缺出處、出處無書名、disputed 冇 note、簡體字、演義引用
npm run audit:quotes -- --todo    # 待辦清單，附查證指令
npm run audit:quotes -- --mark <key> --page <書名/卷N>   # 查證完記低（scripts/quote-audit-ledger.json）

python3 scripts/qsrc.py 後漢書/卷71 '大賢良師'            # 對 Wikisource 原文查證
python3 scripts/qsrc.py --loose 三國志/卷01 '以白土書京城寺門'   # 容忍標點／異文空隙
python3 scripts/qsrc.py --cite '《三國志·魏書·武帝紀》' '黃巾'  # 由出處字串解析頁名
python3 scripts/qsrc.py --toc 左傳                       # 睇一本書嘅子頁清單
```

- `qsrc.py` 攞 `?action=raw`（MediaWiki API 喺本機環境會 429），快取喺 `/tmp/qsrc-cache`，出處對照表喺 `/tmp/qsrc-map.json`。
- 卷號自動試變體：`卷58`／`卷058`／`卷001`／`卷第五十八`；書名别名（左傳 → 春秋左氏傳）同 `#REDIRECT` 都會跟。
- 查證紀錄存 hash：引文改咗，`--todo` 會標「引文已改，需重查」。
- 索引冇紀傳名時（司馬遷《史記》嗰類），加 `--scan` 逐卷掃 `section` 標頭，一次過，之後用快取。

## 技術

- Vite + React + TypeScript
- three.js（`@react-three/fiber` / `@react-three/drei`）
- 部署目標：GitHub Pages

日本旧国著色 mesh 使用 CODH『旧国・旧郡境界データセット』（[CC BY-NC 4.0](src/data/territory/ATTRIBUTION-CODH-BY-NC.md)）；詳見 `src/data/territory/japan_kokugun/`。

## 階段

見 [`docs/PLAN.md`](docs/PLAN.md)。目前完成**階段一：專案骨架**。
