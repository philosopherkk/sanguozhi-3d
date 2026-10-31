# 三國志 · 正史疆域（3D）

以陳壽《三國志》（裴松之注）、《後漢書》、《資治通鑑》、《晉書》為據的互動立體網站。**不用《三國演義》。**

## 開發

```bash
npm install
npm run dev
```

## 技術

- Vite + React + TypeScript
- three.js（`@react-three/fiber` / `@react-three/drei`）
- 部署目標：GitHub Pages

日本旧国著色 mesh 使用 CODH『旧国・旧郡境界データセット』（[CC BY-NC 4.0](src/data/territory/ATTRIBUTION-CODH-BY-NC.md)）；詳見 `src/data/territory/japan_kokugun/`。

## 階段

見 [`docs/PLAN.md`](docs/PLAN.md)。目前完成**階段一：專案骨架**。
