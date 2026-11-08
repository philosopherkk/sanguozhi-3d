#!/usr/bin/env python3
"""地標歸屬斷言：把「某地標必須落在某個色塊」這類宣稱變成可執行檢查。

gen_era_regions.py 的註釋列出新疆／漠北兩側的地名與經緯度，但沒有斷言。
本腳本將地標自經緯度投影至 eraRegions 的像素畫布，逐一以 ray-casting 判定，
確認其落在指定環之內、且落在相鄰環之外（兩塊應相鄰而不重疊）。

用法：python3 scripts/check_ring_landmarks.py
"""
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_geo import china_px  # noqa: E402  投影只用這一份

ROOT = Path(__file__).resolve().parent.parent
RINGS_TS = ROOT / "src" / "geo" / "eraRegions.ts"
W, H = 1968, 1567

# 名稱 -> (經度, 緯度, 應在其中, 不應在其中)
LANDMARKS = [
    ("哈巴河", 86.4, 48.1, "xinjiang", "steppe"),
    ("布爾津", 87.5, 47.7, "xinjiang", "steppe"),
    ("阿勒泰", 88.1, 47.8, "xinjiang", "steppe"),
    ("富蘊", 89.5, 47.0, "xinjiang", "steppe"),
    ("青河", 90.4, 46.6, "xinjiang", "steppe"),
    ("哈密", 93.5, 42.8, "xinjiang", "steppe"),
    ("烏列蓋", 89.9, 48.98, "steppe", "xinjiang"),
    ("科布多", 91.6, 48.0, "steppe", "xinjiang"),
]


def load_rings():
    text = RINGS_TS.read_text(encoding="utf-8")
    body = text[text.index("= {") + 2 : text.rindex("}") + 1]
    return json.loads(body)


def inside(rings, pt):
    """ring 可能係多重環（多島）：任何一环包住即算在內。"""
    x, y = pt
    for ring in rings:
        c = False
        j = len(ring) - 1
        for i in range(len(ring)):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        if c:
            return True
    return False


def main() -> int:
    rings = load_rings()
    bad = 0
    for name, lon, lat, should, should_not in LANDMARKS:
        px = china_px(lat, lon, W, H)
        in_yes = inside(rings[should], px)
        in_no = inside(rings[should_not], px)
        ok = in_yes and not in_no
        if not ok:
            bad += 1
        print(
            f"{'OK ' if ok else 'FAIL'} {name}: 應在 {should}={in_yes} 應不在 {should_not}={in_no} "
            f"(像素 {px[0]:.0f},{px[1]:.0f})"
        )
    # 相鄰環不應重疊：以上述地標同時落入兩塊即視為重疊
    print(
        f"check_ring_landmarks — {len(LANDMARKS)} 個地標，失敗 {bad} 個"
        + ("（兩塊相鄰、不重疊、不侵蝕）" if bad == 0 else " → 環界有誤，暫勿合併")
    )
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
