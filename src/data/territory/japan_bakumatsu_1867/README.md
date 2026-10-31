# japan_bakumatsu_1867（CB-02b 幕末藩 dissolve）

| 項目 | 內容 |
|------|------|
| 目標 `source_plate` | CODH 幕末期近世村領域 → 藩 dissolve（CC BY-SA 4.0） |
| v1 範圍 | `vendor/staged_han.json` 所列 major 藩（非全 408 藩） |
| 舊国 mesh | **不**以 K01–K73 充當藩界；戰國／平安仍用 BY-NC 旧国 |
| 外周 | 琉球 K74、松前、北海道 K75–K85 仍用 `JP_ERA_RINGS`（CB-02a） |

## 建置

```bash
python3 scripts/vendor_codh_bakumatsu_av.py   # 首次：下載村多邊形（CC BY-SA）
python3 scripts/build_bakumatsu_han_rings.py  # dissolve → bakumatsuHanMeshes.ts
```

授權見 `../ATTRIBUTION-CODH-HAN-BY-SA.md`。
