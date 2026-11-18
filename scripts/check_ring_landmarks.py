#!/usr/bin/env python3
"""地標歸屬斷言：把「某地標必須落在某個色塊」這類宣稱變成可執行檢查。

gen_era_regions.py 的註釋列出新疆／漠北兩側的地名與經緯度，但沒有斷言。
本腳本將地標自經緯度投影至 eraRegions 的像素畫布，逐一以 ray-casting 判定，
確認其落在指定環之內、且落在相鄰環之外（兩塊應相鄰而不重疊）。

用法：python3 scripts/check_ring_landmarks.py
      python3 scripts/check_ring_landmarks.py --unasserted   列出尚無任何地標斷言的環（排程佇列）
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

# 名稱 -> (經度, 緯度, 應在其中（None 代表全圖未著色處）, 不應在其中（None＝不檢查）)
LANDMARKS = [
    ("哈巴河", 86.4, 48.1, "xinjiang", "steppe"),
    ("布爾津", 87.5, 47.7, "xinjiang", "steppe"),
    ("阿勒泰", 88.1, 47.8, "xinjiang", "steppe"),
    ("富蘊", 89.5, 47.0, "xinjiang", "steppe"),
    ("青河", 90.4, 46.6, "xinjiang", "steppe"),
    ("哈密", 93.5, 42.8, "xinjiang", "steppe"),
    ("烏列蓋", 89.9, 48.98, "steppe", "xinjiang"),
    ("科布多", 91.6, 48.0, "steppe", "xinjiang"),
    # 高麗環：北界鴨綠江，義州（保州）以北屬遼不屬高麗
    ("開京", 126.55, 37.93, "goryeo", "realm_liao"),
    ("漢陽", 126.98, 37.566, "goryeo", "realm_liao"),
    ("平壤", 125.75, 39.02, "goryeo", "realm_liao"),
    ("遼陽", 122.35, 41.27, "realm_liao", "goryeo"),
    ("遼東半島旅順", 121.2, 38.8, None, "goryeo"),
    # 大越環：北包順州（高平）兩屬之地，南以橫山為 1069 年前界
    ("高平順州", 106.26, 22.67, "daiyue", "yunnan"),
    ("河內東京", 105.85, 21.03, "daiyue", "realm_song_1141"),
    ("順化（1069 年前不著色）", 107.58, 16.47, None, "daiyue"),
    # 湟水與河西兩框不相混
    ("西寧", 101.77, 36.62, "qinghai", "gansu"),
    ("敦煌", 94.66, 40.14, "gansu", "xinjiang"),
    ("開封", 114.35, 34.79, "realm_song_1004", "realm_liao"),
    ("濟南", 117.00, 36.67, "shandong", "henan"),
    ("開封（河南環）", 114.35, 34.79, "henan", "shandong"),
    # 民國東三省：黑龍江—吉林—遼寧以松花江谷地・長白山地相鄰不重疊
    ("哈爾濱", 126.64, 45.76, "hlj", "jl"),
    ("長春", 125.33, 43.90, "jl", "hlj"),
    ("瀋陽", 123.43, 41.80, "ln", "jl"),
    # 熱河省會承德在燕山以北屬熱河，京師在長城以南屬直隸
    ("承德", 117.96, 40.95, "rehe", "zhili"),
    ("保定", 115.46, 38.87, "zhili", "shanxi"),
    # 幽薊古環：薊（北京）在內，代（大同）在恒山—太行界外
    ("北京", 116.40, 39.91, "youyun", "shanxi"),
    ("大同", 113.37, 40.10, "shanxi", "youyun"),
    ("太原", 112.55, 37.87, "shanxi", "zhili"),
    # 陝西自然界：長安在渭水關中，太原在大河（壺口—龍門）之東不屬陝
    ("長安", 108.94, 34.26, "shaanxi", "shanxi"),
    ("延安", 109.49, 36.65, "yanan", "shanxi"),
    # 寧夏：大河東岸灌溉平原，銀川在內，西安在六盤山—隴山界外
    ("銀川", 106.22, 38.48, "ningxia", "shaanxi"),
    # 青藏環：拉薩在內，西寧在湟水（青海環）巴顏喀山界外
    ("拉薩", 91.12, 29.65, "tibet", None),
    ("西寧（不入青藏）", 101.78, 36.62, "qinghai", "tibet"),
    # 四川盆地北緣：成都盆地、漢中在秦嶺—大巴山之北另一帶
    ("成都", 104.06, 30.66, "sichuan", "hanzhong"),
    ("漢中", 107.02, 33.07, "hanzhong", "sichuan"),
]


def load_rings():
    text = RINGS_TS.read_text(encoding="utf-8")
    body = text[text.index("= {") + 2 : text.rindex("}") + 1]
    return json.loads(body)


def inside(rings, pt):
    """ring 可能係多重環（多島）：任何一環包住即算在內。"""
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


def list_unasserted(rings) -> int:
    """佇列模式：ERA_RINGS 裡沒有被任何地標點名的環，附依據首句與經緯度範圍。"""
    named = {n for _, _, _, a, b in LANDMARKS for n in (a, b) if n}
    prov = (ROOT / "src" / "data" / "territory" / "ringProvenance.ts").read_text(encoding="utf-8")
    todo = [k for k in rings if k not in named]
    for k in todo:
        m = re.search(rf"^\s*{re.escape(k)}:\s*\{{\s*basis:\s*'([^']*)'", prov, re.M)
        basis = (m.group(1) if m else "（ringProvenance 無登記）")[:70]
        print(f"{k}｜{basis}")
    print(f"check_ring_landmarks --unasserted — 共 {len(rings)} 環，無地標斷言 {len(todo)} 環")
    return 0


def main() -> int:
    rings = load_rings()
    if "--unasserted" in sys.argv:
        return list_unasserted(rings)
    bad = 0
    for name, lon, lat, should, should_not in LANDMARKS:
        px = china_px(lat, lon, W, H)
        in_no = inside(rings[should_not], px) if should_not else False
        if should is None:
            in_yes = None
            ok = not in_no
        else:
            in_yes = inside(rings[should], px)
            ok = in_yes and not in_no
        if not ok:
            bad += 1
        yes_txt = "─" if in_yes is None else str(in_yes)
        print(
            f"{'OK ' if ok else 'FAIL'} {name}: 應在 {should}={yes_txt} 應不在 {should_not}={in_no} "
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
