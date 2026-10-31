# 日本旧国（CODH CB-02a）

## 來源

- CODH『旧国・旧郡境界データセット』https://geoshape.ex.nii.ac.jp/kg/
- DOI: 10.20676/00000454
- 授權: **CC BY-NC 4.0** — 見 [`../ATTRIBUTION-CODH-BY-NC.md`](../ATTRIBUTION-CODH-BY-NC.md)

## 目錄

| 路徑 | 說明 |
|------|------|
| `vendor/Kxx.geojson` | 原樣 vendored（K01–K85） |
| `index.geojson` | K01–K73 索引（WGS84，含 `domainId` 對照 d0–d27） |

## 重建著色 mesh

```bash
python3 scripts/vendor_codh_kokugun.py      # 首次下載
python3 scripts/build_japan_kokugun_rings.py # → codhKokugunMeshes.ts + japanEraRings.ts
```

## 應用內著色 hook

1. **`CODH_KOKUGUN_MESHES`**（`src/sengoku/data/codhKokugunMeshes.ts`）— 旧国多邊形（像素環）。
2. **`shadesFromDomainControl` / `shadesFromZoneControl`**（`src/sengoku/data/japanKokugunPaint.ts`）— 將 mesh 配上勢力色。
3. **戰國** `SengokuMap.tsx` → `shadesFromZoneControl(control)`。
4. **幕末／平安／Deep Dive** → `shadesFromDomainControl(control, …)`；幕末 **1869+** 另加 `bakumatsuFringeShades`（K75–K85 北海道）。
5. **日本通史總覽** `JapanEraMap.tsx` → `JP_ERA_RINGS`（松前／北海道／琉球時間窗）。

`approx: true`：mesh 為幕末明治旧国界，與各時代實際藩界或王國邊界未必重合；歸屬色仍示意。
