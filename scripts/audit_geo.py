"""疆域幾何校正檢核（Phase 0 護欄）。

三件事：
  1. 校正：把已知海岸／內陸錨點經 china_px 投到底圖，分類海陸，檢查是否如預期。
  2. 圖幅範圍：反解底圖四角的經緯度，印出「這張底圖能畫到哪裡」。
  3. 環體檢：ERA_RINGS 每一條環的**面積形心**（shoelace，不是頂點平均）必須靠近陸地。
     底圖的海陸遮罩是顏色啟發式（B−R>15），湖、河與海同為「水」，所以形心落水時
     要看「離最近陸地多遠」：湖內無所謂，離陸太遠才是真的畫到海上。另外檢查環內
     陸地比例，比例過低＝多邊形大半畫在海裡（真正的畫錯模式）。

座標系：ERA_RINGS 與底圖同為 1968x1567 像素（見 src/geo/eraRegions.ts 檔頭）。
"""

import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "public/maps/china_edcp_relief_display.jpg"
RINGS_TS = ROOT / "src/geo/eraRegions.ts"
PI = math.pi

SEA_MIN_B_MINUS_R = 15


def china_px(lat: float, lon: float, w: int, h: int) -> tuple[float, float]:
    x = 50 + 116.80932603407057 * (
        (1.9996655301850468 - (lat * PI / 180))
        * math.sin(0.5867115434267053 * (lon - 104) * PI / 180)
    )
    y = (
        50
        + 1.256383 * 116.80932603407057 * 0.02641006622571962
        - 1.256383
        * 116.80932603407057
        * (
            1.3713469994670882
            - (1.9996655301850468 - (lat * PI / 180))
            * math.cos(0.5867115434267053 * (lon - 104) * PI / 180)
        )
    )
    return x / 100 * w, y / 100 * h


ANCHORS = [
    ("黃海中央", 124.0, 36.0, "sea"),
    ("東海中央", 125.5, 30.0, "sea"),
    ("南海中央", 116.0, 18.0, "sea"),
    ("渤海中央", 119.8, 39.0, "sea"),
    ("台灣海峽", 119.0, 23.5, "sea"),
    ("北部灣", 107.8, 20.0, "sea"),
    ("朝鮮海峽", 128.0, 34.5, "sea"),
    ("中原（鄭州）", 113.6, 34.7, "land"),
    ("四川盆地", 105.5, 30.6, "land"),
    ("泰山", 117.1, 36.25, "land"),
    ("汾河谷地", 111.8, 36.0, "land"),
    ("漢水中游", 112.2, 32.0, "land"),
    ("珠江三角洲（廣州北郊）", 113.3, 23.3, "land"),
    ("遼東半島", 122.2, 39.8, "land"),
    ("山東半島北岸（龍口以西）", 120.5, 37.5, "land"),
    ("朝鮮半島", 126.5, 39.0, "land"),
    ("台灣中央山脈", 120.9, 23.8, "land"),
    ("海南島", 109.8, 19.2, "land"),
    ("河套", 108.5, 40.5, "land"),
    ("河西走廊", 100.0, 38.8, "land"),
]


def load_sea_mask(w: int, h: int) -> np.ndarray:
    a = np.asarray(Image.open(IMG).convert("RGB"), dtype=np.int16)
    return (a[:, :, 2] - a[:, :, 0]) > SEA_MIN_B_MINUS_R


def classify(sea: np.ndarray, x: float, y: float) -> str:
    xi, yi = int(round(x)), int(round(y))
    patch = sea[max(0, yi - 2) : yi + 3, max(0, xi - 2) : xi + 3]
    if patch.size == 0:
        return "oob"
    return "sea" if patch.mean() > 0.5 else "land"


def china_ll(x: float, y: float, w: int, h: int) -> tuple[float, float]:
    """china_px 的解析反函數：像素 -> (lon, lat)。"""
    xp = x / w * 100.0
    yp = y / h * 100.0
    A = 116.80932603407057
    n = 0.5867115434267053
    X = (xp - 50) / A
    Yp = (yp - 50 - 1.256383 * A * 0.02641006622571962) / (-1.256383 * A)
    rc = 1.3713469994670882 - Yp
    R = math.hypot(X, rc)
    lat = (1.9996655301850468 - R) * 180 / PI
    theta = math.atan2(X, rc)
    lon = 104 + theta * 180 / (PI * n)
    return lon, lat


def frame_extent(w: int, h: int) -> tuple[float, float, float, float]:
    """反解四角：以網格搜尋找最接近該角的 (lon, lat)。"""
    corners = [
        china_ll(1, 1, w, h),
        china_ll(w - 2, 1, w, h),
        china_ll(1, h - 2, w, h),
        china_ll(w - 2, h - 2, w, h),
    ]
    lons = [c[0] for c in corners]
    lats = [c[1] for c in corners]
    return min(lons), max(lons), min(lats), max(lats)


def load_rings() -> dict:
    src = RINGS_TS.read_text(encoding="utf8")
    m = re.search(r"ERA_RINGS[^=]*=\s*(\{.*\})\s*\n", src, re.S)
    if not m:
        raise SystemExit("找不到 ERA_RINGS")
    return json.loads(m.group(1))


CENTROID_MAX_WATER_DIST = 20  # px；約 0.6 經度（≈65km）。實測環形心落水的四條都在湖/河，最遠 9px（太湖口）；
                              # 真正的海上環離陸 >=60px（距離圖上限）。青海湖半寬約 15px，故門檻取 20。
MIN_POLYGON_LAND_FRACTION = 0.40


def clean_sea_mask(sea: np.ndarray, k: int = 5) -> np.ndarray:
    """顏色啟發式會在海中產生孤立「陸」雜訊、在陸上產生孤立「海」雜訊。
    先做 k×k 多數決，否則「離最近陸地」在深洋也會是 1px，規則失效。"""
    pad = k // 2
    padded = np.pad(sea, pad, mode="edge")
    win = np.lib.stride_tricks.sliding_window_view(padded, (k, k))
    return win.mean(axis=(2, 3)) >= 0.5


def land_distance_map(sea: np.ndarray, cap: int = 60) -> np.ndarray:
    """每個像素到最近陸地的步數（陸地為 0，超過 cap 記 cap）。
    從陸地向外擴散；只給尚未編號的像素編號。"""
    dist = np.full(sea.shape, cap, dtype=np.int16)
    dist[~sea] = 0
    frontier = ~sea
    for step in range(1, cap + 1):
        nxt = np.zeros_like(frontier)
        nxt[1:, :] |= frontier[:-1, :]
        nxt[:-1, :] |= frontier[1:, :]
        nxt[:, 1:] |= frontier[:, :-1]
        nxt[:, :-1] |= frontier[:, 1:]
        nxt &= dist >= cap
        if not nxt.any():
            break
        dist[nxt] = step
        frontier = nxt
    return dist


def area_centroid(pts: np.ndarray) -> tuple[float, float] | None:
    """多邊形面積形心（shoelace）。頂點平均會被海岸線上的密集頂點拉出海，不可用。"""
    x, y = pts[:, 0], pts[:, 1]
    cross = x * np.roll(y, -1) - np.roll(x, -1) * y
    a = 0.5 * float(np.sum(cross))
    if abs(a) < 1e-9:
        return None
    cx = float(np.sum((x + np.roll(x, -1)) * cross) / (6 * a))
    cy = float(np.sum((y + np.roll(y, -1)) * cross) / (6 * a))
    return cx, cy


def polygon_land_fraction(sea: np.ndarray, pts, w: int, h: int) -> float | None:
    """環覆蓋的像素裡有多少是陸地。環太小回傳 None。"""
    mask = Image.new("1", (w, h), 0)
    ImageDraw.Draw(mask).polygon([(float(px), float(py)) for px, py in pts], fill=1)
    m = np.asarray(mask, dtype=bool)
    tot = int(m.sum())
    if tot < 16:
        return None
    return float((m & ~sea).sum()) / tot


def ring_flags(pts, sea, ldist, w, h) -> list[str]:
    """單條環的問題清單；空代表沒問題。"""
    flags: list[str] = []
    ac = area_centroid(pts)
    if ac is None:
        return ["degenerate-ring"]
    cx, cy = ac
    if not (0 <= cx < w and 0 <= cy < h):
        return ["out-of-frame"]
    xi, yi = int(round(cx)), int(round(cy))
    if sea[yi, xi]:
        d = int(ldist[yi, xi])
        if d > CENTROID_MAX_WATER_DIST:
            lon, lat = china_ll(cx, cy, w, h)
            flags.append(f"centroid-in-sea(離陸{d}px @{lon:.2f}E,{lat:.2f}N)")
    frac = polygon_land_fraction(sea, pts, w, h)
    if frac is not None and frac < MIN_POLYGON_LAND_FRACTION:
        flags.append(f"mostly-water({frac * 100:.0f}% land)")
    return flags


def selftest(sea, ldist, w, h) -> bool:
    """驗證偵測器真的會抓到畫到海上的環（把方塊放在南海中央），且不會誤判內陸方塊。"""
    def box(lon, lat, half=2.0):
        pts = []
        for dlon, dlat in ((-half, -half), (half, -half), (half, half), (-half, half)):
            x, y = china_px(lat + dlat, lon + dlon, w, h)
            pts.append([x, y])
        return np.asarray(pts, float)

    bad = box(125.5, 18.0)      # 南海中央
    good = box(113.6, 34.7)     # 鄭州一帶
    big_lake = box(119.9, 33.2) # 洪澤湖（水，但四周是陸）
    f_bad, f_good, f_lake = ring_flags(bad, sea, ldist, w, h), ring_flags(good, sea, ldist, w, h), ring_flags(big_lake, sea, ldist, w, h)
    ok = bool(f_bad) and not f_good and not f_lake
    print(f"偵測器自我測試：海上方塊 {f_bad or '未抓到！'}；內陸方塊 {f_good or 'ok'}；湖中方塊 {f_lake or 'ok'}")
    return ok


def main() -> int:
    im = Image.open(IMG).convert("RGB")
    w, h = im.size
    sea = clean_sea_mask(load_sea_mask(w, h))
    print(f"底圖 {w}x{h}；海像素 {int(sea.sum())} ({sea.mean() * 100:.1f}%，已做 5×5 多數決去雜訊)")

    bad = 0
    for name, lon, lat, want in ANCHORS:
        x, y = china_px(lat, lon, w, h)
        got = classify(sea, x, y)
        flag = "ok" if got == want else "FAIL"
        if got != want:
            bad += 1
        print(f"  {flag:4s} {name:16s} 預期 {want:4s} 實測 {got:4s} @({x:7.1f},{y:7.1f})")
    print(f"校正錨點：{len(ANCHORS) - bad}/{len(ANCHORS)} 正確")

    lon_min, lon_max, lat_min, lat_max = frame_extent(w, h)
    print(
        f"底圖可畫範圍：經 {lon_min:.2f}–{lon_max:.2f}、緯 {lat_min:.2f}–{lat_max:.2f}"
        "（超出此範圍的環不可能正確對位）"
    )

    rings = load_rings()
    ldist = land_distance_map(sea)
    if not selftest(sea, ldist, w, h):
        print("audit:geo — 偵測器自我測試失敗（規則本身壞了，不是環的問題）")
        return 1
    offenders = []
    for rid, parts in rings.items():
        for i, ring in enumerate(parts):
            pts = np.asarray(ring, dtype=float)
            if len(pts) < 3:
                continue
            flags = ring_flags(pts, sea, ldist, w, h)
            if flags:
                ac = area_centroid(pts) or (0.0, 0.0)
                for why in flags:
                    offenders.append((rid, i, why, ac[0], ac[1]))
    total = sum(len(v) for v in rings.values())
    print(
        f"環體檢：{len(rings)} 個編號、{total} 條環，可疑 {len(offenders)} 條"
        f"（面積形心落水且離陸 >{CENTROID_MAX_WATER_DIST}px，或環內陸地 <{MIN_POLYGON_LAND_FRACTION * 100:.0f}%）"
    )
    for rid, i, why, cx, cy in offenders[:20]:
        print(f"  {why:46s} {rid}[{i}] @({cx:.0f},{cy:.0f})")

    # 觸及圖幅邊緣 = 該環被圖幅裁掉，幾何不完整
    edge = 0.5
    clipped = []
    for rid, parts in rings.items():
        for i, ring in enumerate(parts):
            pts = np.asarray(ring, dtype=float)
            if len(pts) < 3:
                continue
            lls = [china_ll(x, y, w, h) for x, y in pts]
            lon_lo = min(p[0] for p in lls)
            lon_hi = max(p[0] for p in lls)
            lat_lo = min(p[1] for p in lls)
            lat_hi = max(p[1] for p in lls)
            hit = (
                lon_lo <= lon_min + edge
                or lon_hi >= lon_max - edge
                or lat_lo <= lat_min + edge
                or lat_hi >= lat_max - edge
            )
            if hit:
                clipped.append((rid, i, lon_lo, lon_hi, lat_lo, lat_hi))
    print(f"觸及圖幅邊緣（被裁切）的環：{len(clipped)} 條")
    for rid, i, a, b, c, d in clipped[:12]:
        print(f"  {rid}[{i}] 經 {a:.2f}–{b:.2f} 緯 {c:.2f}–{d:.2f}")
    return 0 if bad == 0 and not offenders else 1


if __name__ == "__main__":
    sys.exit(main())
