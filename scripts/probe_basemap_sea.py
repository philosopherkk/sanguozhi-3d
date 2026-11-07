"""探索底圖的海陸分色，為 scripts/audit_geo.py 的校正檢定做準備。

用 china_px（與 gen_era_regions.py 同一個圓錐投影）把已知海岸點投到底圖像素，
再看該點的顏色，確認「海」與「陸」可以被穩定分類。
"""

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "public/maps/china_edcp_relief_display.jpg"
PI = math.pi


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


# (名稱, lon, lat, 預期)  預期 'sea' 或 'land'
ANCHORS = [
    ("黃海中央", 124.0, 36.0, "sea"),
    ("東海中央", 125.5, 30.0, "sea"),
    ("南海中央", 116.0, 18.0, "sea"),
    ("渤海中央", 119.8, 39.0, "sea"),
    ("台灣海峽", 119.0, 23.5, "sea"),
    ("北部灣", 107.8, 20.0, "sea"),
    ("中原（鄭州）", 113.6, 34.7, "land"),
    ("四川盆地", 105.5, 30.6, "land"),
    ("泰山", 117.1, 36.25, "land"),
    ("太湖", 120.2, 31.2, "land"),
    ("漢口", 114.3, 30.6, "land"),
    ("珠江三角洲", 113.3, 23.0, "land"),
    ("遼東半島", 122.2, 39.8, "land"),
    ("山東半島東端", 122.5, 37.4, "land"),
    ("朝鮮半島", 126.5, 39.0, "land"),
    ("台灣中央山脈", 120.9, 23.8, "land"),
    ("海南島", 109.8, 19.2, "land"),
    ("日本本州（關東）", 139.5, 36.0, "land"),
]


def main() -> None:
    im = Image.open(IMG).convert("RGB")
    w, h = im.size
    print(f"image {w}x{h}")
    px = im.load()
    print("corners:", px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3])
    oob = 0
    for name, lon, lat, want in ANCHORS:
        x, y = china_px(lat, lon, w, h)
        inside = 0 <= x < w and 0 <= y < h
        if not inside:
            oob += 1
            print(f"{name:18s} ({lon:6.2f},{lat:5.2f}) -> ({x:7.1f},{y:7.1f}) OUT OF FRAME")
            continue
        r, g, b = px[int(x), int(y)]
        print(
            f"{name:18s} ({lon:6.2f},{lat:5.2f}) -> ({x:7.1f},{y:7.1f}) "
            f"want={want:4s} rgb=({r:3d},{g:3d},{b:3d}) b-r={b - r:+4d}"
        )
    print("out of frame:", oob)


if __name__ == "__main__":
    main()
