# Three Kingdoms (三國志) Interactive 3D Website: Plan

Paste each phase into Cursor as its own task.

## Phases

1. **Scaffold** (done) — Vite + React + TS + r3f, zh-Hant font, folder structure, AGENTS.md
2. **Data** — Fill JSON from timeline 184–280, ~60–80 people, ~15 battles, all with sources
3. **Map** — Terrain mesh + GeoJSON borders for key years
4. **Timeline and animation** — Year slider, event markers, battle arrows
5. **Dashboard and people cards** — Charts + zh-tw Wikipedia links
6. **Accuracy check** — Recheck every entry; flag 演義 contamination
7. **Deploy** — GitHub Actions → Pages, README in Traditional Chinese

## Fixed census figures

- 157: ~1,067萬戶, 5,648萬口（《後漢書·郡國志》注 / 《晉書·地理志》）
- 263 蜀漢: 28萬戶, 94萬口, 帶甲10.2萬（《三國志》注引王隱《蜀記》）
- 263 曹魏: ~66萬戶, 443萬口（《通典》）
- 280 孫吳: 52.3萬戶, 230萬口, 兵23萬（《晉書·武帝紀》 / 《三國志》注引《晉陽秋》）

Note on site: sharp drop reflects 隱戶 / 部曲 / 屯田 as well as real deaths.
