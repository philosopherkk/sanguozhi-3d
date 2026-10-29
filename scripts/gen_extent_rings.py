#!/usr/bin/env python3
"""Project schematic outer realms onto the 1968×1567 China relief and clip to land.

Does not rewrite province rings. Output is TypeScript constants.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import tighten_land_borders as tlb  # noqa: E402

W, H = 1968, 1567
JP_W, JP_H = 1482, 1477


def poly_mask(lonlat: list[tuple[float, float]]) -> np.ndarray:
    pts = [tlb.china_px(lat, lon, W, H) for lon, lat in lonlat]
    return tlb.raster_polygon(W, H, pts)


def rings_from(mask: np.ndarray, min_area: int = 700, eps: float = 4.0, keep: int = 4):
    found = []
    for ring in tlb.contours(mask):
        if abs(tlb.ring_area(ring)) < min_area:
            continue
        simp = tlb.simplify(ring, eps)
        if len(simp) < 4:
            continue
        found.append([[round(x, 1), round(y, 1)] for x, y in simp])
    found.sort(key=lambda r: -abs(tlb.ring_area(r)))
    return found[:keep]


def emit(name: str, rings) -> str:
    body = json.dumps(rings, ensure_ascii=False)
    return f"export const {name}: OuterRing[] = {body}\n"


def main():
    china = Image.open(ROOT / "public/maps/china_edcp_relief.jpg").convert("RGB")
    china = china.resize((W, H), Image.Resampling.BOX)
    land = tlb.land_mask(china, "china")
    data = json.loads((ROOT / "src/data/basemapProvinceRings.json").read_text())
    prov = np.zeros((H, W), dtype=bool)
    for rings in data["provinces"].values():
        for ring in rings:
            prov |= tlb.raster_polygon(W, H, ring)

    specs = {
        "TANG_ANBEI": [
            (96, 45),
            (96, 50),
            (100, 52),
            (105, 53.2),
            (110, 53),
            (116, 50.5),
            (119, 47),
            (116, 43.5),
            (108, 42.8),
            (100, 43.2),
            (96, 44.2),
        ],
        "TANG_BEITING": [
            (80, 43.6),
            (80, 47.8),
            (86, 48.2),
            (94.5, 47.2),
            (95.5, 44),
            (90, 43),
            (84, 43),
        ],
        "TANG_ANXI": [
            (74.2, 43.4),
            (78, 44.2),
            (86, 43.6),
            (93.5, 42.2),
            (94.5, 39.5),
            (90, 36.2),
            (82, 35.8),
            (76, 37.2),
            (74, 40),
            (73.8, 42.6),
        ],
        "TANG_YALU": [
            (119.2, 39.6),
            (121.2, 42.8),
            (124.2, 43.4),
            (126.4, 41.8),
            (125.8, 40),
            (123.2, 38.8),
            (120.4, 38.8),
        ],
        "TANG_SILLA": [
            (128.1, 35.1),
            (129.6, 35.3),
            (129.7, 36.9),
            (128.2, 36.7),
        ],
        "TANG_PLATEAU_EDGE": [
            (98.5, 37.2),
            (102.8, 37.4),
            (103.2, 35.2),
            (100.2, 34.6),
            (98.2, 35.8),
        ],
        "TANG_ANNAN": [
            (104.2, 22.4),
            (107.8, 22.4),
            (108.2, 20.6),
            (105.2, 20.4),
            (103.8, 21.2),
        ],
        "LIAO_WEST": [
            (88, 45.5),
            (88, 49.5),
            (94, 51.5),
            (102, 51.5),
            (110, 49),
            (108, 44),
            (100, 42.8),
            (92, 43.5),
            (88, 44.8),
        ],
    }
    outside = {}
    for name, poly in specs.items():
        raw = poly_mask(poly) & land & ~prov
        outside[name] = rings_from(raw)

    yanan = poly_mask(
        [
            (108.7, 36.1),
            (109.2, 37.1),
            (110.2, 37.0),
            (110.4, 36.2),
            (109.6, 35.8),
            (108.8, 35.9),
        ]
    )
    outside["YANAN"] = rings_from(yanan & land, min_area=200, eps=2.5, keep=2)

    lines = [
        "/** 唐高宗、天可汗前後（約660–700）州格以外的示意。",
        " * 像素對齊 china_edcp_relief 1968×1567，已減海同十八州格。",
        " * 北到貝加爾湖南岸一帶（安北），準噶爾（北庭），蔥嶺東、碎葉（安西），",
        " * 東北到鴨綠江，新羅只作朝貢、不作郡縣。青藏高原內部不畫。",
        " * 大勢據《舊唐書·地理志》都護府條與譚其驤《中國歷史地圖集》隋唐幅。不是郡界。",
        " */",
        "import type { OuterRing } from './outerRings'",
        "",
    ]
    for name in (
        "TANG_ANBEI",
        "TANG_BEITING",
        "TANG_ANXI",
        "TANG_YALU",
        "TANG_SILLA",
        "TANG_PLATEAU_EDGE",
        "TANG_ANNAN",
    ):
        lines.append(emit(name, outside[name]))
        print(name, [len(r) for r in outside[name]])
    (ROOT / "src/imperial/data/tangRings.ts").write_text("\n".join(lines) + "\n")

    liao = [
        "/** 遼聖宗前後漠北西段，接到阿爾泰山東側。只給遼的快照用，不改元的草原環。",
        " * 據《遼史·地理志》上京道屬部與譚其驤《中國歷史地圖集》遼幅。不是部落界。",
        " */",
        "import type { OuterRing } from './outerRings'",
        "",
        emit("LIAO_WEST", outside["LIAO_WEST"]),
    ]
    (ROOT / "src/imperial/data/liaoWest.ts").write_text("\n".join(liao) + "\n")
    print("LIAO_WEST", [len(r) for r in outside["LIAO_WEST"]])

    yanan_ts = [
        "/** 1937年陝甘寧邊區，只圈延安一帶，不把關中或并州整格塗成共產黨。",
        " * 據近代史通說。州格大於邊區，所以用一小塊，不改省界。",
        " */",
        "import type { OuterRing } from './outerRings'",
        "",
        emit("YANAN_BASE", outside["YANAN"]),
    ]
    (ROOT / "src/imperial/data/yananRing.ts").write_text("\n".join(yanan_ts) + "\n")
    print("YANAN", outside["YANAN"])

    preview = china.copy()
    draw = ImageDraw.Draw(preview, "RGBA")
    colors = {
        "TANG_ANBEI": (201, 162, 39, 90),
        "TANG_BEITING": (180, 140, 40, 90),
        "TANG_ANXI": (160, 120, 30, 90),
        "TANG_YALU": (201, 162, 39, 110),
        "TANG_SILLA": (120, 140, 180, 120),
        "TANG_PLATEAU_EDGE": (80, 120, 90, 120),
        "TANG_ANNAN": (201, 162, 39, 120),
        "LIAO_WEST": (40, 80, 140, 100),
    }
    for name, rgba in colors.items():
        for ring in outside[name]:
            draw.polygon([tuple(p) for p in ring], fill=rgba)
    preview.resize((984, 784), Image.Resampling.BOX).save(ROOT / "scripts/out/extent_preview.jpg", quality=80)

    cities = {
        "guangzhou": (113.26, 23.13),
        "hanoi": (105.85, 21.03),
        "suyab": (75.3, 42.84),
        "baikal": (108.0, 53.0),
        "anyang": (114.35, 36.1),
        "xian": (108.94, 34.27),
        "gyeongju": (129.22, 35.86),
    }
    for label, (lon, lat) in cities.items():
        x, y = tlb.china_px(lat, lon, W, H)
        inside = 0 <= x < W and 0 <= y < H and bool(land[int(y), int(x)])
        print(f"city {label} {x:.0f},{y:.0f} land={inside}")

    # Which province contains Guangzhou?
    gx, gy = tlb.china_px(23.13, 113.26, W, H)
    for pid, rings in data["provinces"].items():
        for ring in rings:
            m = tlb.raster_polygon(W, H, ring)
            if 0 <= gx < W and 0 <= gy < H and m[int(gy), int(gx)]:
                print("guangzhou in", pid)

    def jp(lat, lon):
        x, y = tlb.japan_px(lat, lon, JP_W, JP_H)
        return round(x, 1), round(y, 1)

    print("hakodate", jp(41.77, 140.73))
    print("matsumae", jp(41.43, 140.12))
    print("oshima", [jp(lat, lon) for lon, lat in [
        (139.7, 41.4), (139.8, 42.1), (140.6, 42.2), (140.7, 41.5), (140.2, 41.3)
    ]])
    print("naha", jp(26.21, 127.68))
    print("okinawa", [jp(lat, lon) for lon, lat in [
        (127.6, 26.8), (128.3, 26.8), (128.4, 26.1), (127.6, 26.0)
    ]])


if __name__ == "__main__":
    main()
