#!/usr/bin/env python3
"""Clip China/Japan territory rings to the relief coastline.

Inland edges follow the Yellow River, Yangtze, Qinling, Daba, Taihang and
Nanling in the basemap projection. Coasts are the land mask of the relief,
not the coarse boxes. Uncertainty stays in the map credit, not in labels.
"""

from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CHINA_IMG = ROOT / "public/maps/china_edcp_relief.jpg"
JAPAN_IMG = ROOT / "public/maps/japan_relief.jpg"
OUT = ROOT / "scripts/out"
PI = math.pi

# Wikimedia Module:Location map/data/China (percent of image).
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


# File:Japan relief location map.jpg — equirectangular.
JP_N, JP_S, JP_W, JP_E = 47.56, 22.95, 121.96, 151.58


def japan_px(lat: float, lon: float, w: int, h: int) -> tuple[float, float]:
    return (lon - JP_W) / (JP_E - JP_W) * w, (JP_N - lat) / (JP_N - JP_S) * h


def project_ring(ring, proj, w, h):
    return [proj(lat, lon, w, h) for lon, lat in ring]


def dedup(pts, eps=1e-4):
    out = []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) > eps or abs(p[1] - out[-1][1]) > eps:
            out.append(p)
    if (
        len(out) > 2
        and abs(out[0][0] - out[-1][0]) < eps
        and abs(out[0][1] - out[-1][1]) < eps
    ):
        out.pop()
    return out


def chain(*parts):
    pts = []
    for part in parts:
        pts.extend(part)
    return dedup(pts)


def rev(pts):
    return list(reversed(pts))


def open_sea(im: Image.Image, kind: str) -> np.ndarray:
    """Largest blue-water body, including bays the relief grid had split off.

    A one-pixel latitude/longitude line can separate a bay from the ocean.
    Closing that gap keeps Hangzhou Bay, Liaodong Bay and the Seto Inland Sea
    as water. Lakes that still do not touch the sea stay land.
    """
    arr = np.asarray(im.convert("RGB"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    if kind == "china":
        raw = (b > 150) & (b > r + 16) & (b > g + 4)
    else:
        raw = (b > 145) & (b > r + 22) & (b > g + 8)
    closed = cv2.morphologyEx(raw.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(closed, connectivity=4)
    if count <= 1:
        return np.zeros(raw.shape, dtype=bool)
    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    sea = labels == main
    if kind != "china":
        return sea
    # Liaodong Bay is turquoise: green is higher than blue, so the test above misses it.
    shallow = (
        (b > 185)
        & (g > 190)
        & (r > 155)
        & (r < 235)
        & ((b + g) > (2 * r + 20))
        & (np.abs(b - g) < 45)
    )
    both = (sea | shallow).astype(np.uint8)
    count2, labels2, _, _ = cv2.connectedComponentsWithStats(both, connectivity=8)
    filled = np.zeros(sea.shape, dtype=bool)
    for i in range(1, count2):
        comp = labels2 == i
        if np.any(comp & sea):
            filled |= comp
    return filled


def land_mask(im: Image.Image, kind: str) -> np.ndarray:
    return ~open_sea(im, kind)


def raster_polygon(w, h, pts) -> np.ndarray:
    im = Image.new("L", (w, h), 0)
    if len(pts) >= 3:
        ImageDraw.Draw(im).polygon(pts, fill=1)
    return np.array(im) > 0


def dilate_labels(labels: np.ndarray, land: np.ndarray, steps: int) -> np.ndarray:
    lab = labels.copy()
    h, w = lab.shape
    for _ in range(steps):
        padded = np.pad(lab, 1, constant_values=0)
        shifts = (
            padded[:-2, 1:-1],
            padded[2:, 1:-1],
            padded[1:-1, :-2],
            padded[1:-1, 2:],
        )
        fill = np.zeros((h, w), dtype=bool)
        acc = np.zeros((h, w), dtype=lab.dtype)
        for shifted in shifts:
            can = (lab == 0) & land & (shifted != 0) & ~fill
            acc[can] = shifted[can]
            fill |= can
        if not fill.any():
            break
        lab[fill] = acc[fill]
    return lab


def _cell_segs(idx, n, e, s, w):
    table = {
        1: [(w, s)],
        2: [(s, e)],
        3: [(w, e)],
        4: [(e, n)],
        5: [(w, n), (s, e)],
        6: [(s, n)],
        7: [(w, n)],
        8: [(n, w)],
        9: [(n, s)],
        10: [(n, e), (w, s)],
        11: [(n, e)],
        12: [(e, w)],
        13: [(e, s)],
        14: [(s, w)],
    }
    return table.get(idx, [])


def contours(mask: np.ndarray):
    cnts, _ = cv2.findContours(
        mask.astype(np.uint8) * 255,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_NONE,
    )
    rings = []
    for cnt in cnts:
        pts = [(float(p[0][0]), float(p[0][1])) for p in cnt]
        if len(pts) >= 3:
            rings.append(pts)
    return rings


def _contours_unused(mask: np.ndarray):
    m = np.pad(mask.astype(np.uint8), 1, constant_values=0)
    tl = m[:-1, :-1]
    tr = m[:-1, 1:]
    bl = m[1:, :-1]
    br = m[1:, 1:]
    idx = (tl << 3) | (tr << 2) | (br << 1) | bl
    ys, xs = np.where((idx != 0) & (idx != 15))
    segs = []
    for y, x in zip(ys.tolist(), xs.tolist()):
        n = (x + 0.5, float(y))
        e = (float(x + 1), y + 0.5)
        s = (x + 0.5, float(y + 1))
        wpt = (float(x), y + 0.5)
        for a, b in _cell_segs(int(idx[y, x]), n, e, s, wpt):
            segs.append((a, b))

    def key(p):
        return (round(p[0], 3), round(p[1], 3))

    nxt = defaultdict(list)
    for a, b in segs:
        nxt[key(a)].append(b)
    used = set()
    rings = []
    for a, b in segs:
        if (key(a), key(b)) in used:
            continue
        ring = [a]
        cur = b
        start = key(a)
        used.add((key(a), key(b)))
        guard = 0
        while key(cur) != start and guard < 200000:
            ring.append(cur)
            found = None
            for cand in nxt[key(cur)]:
                edge = (key(cur), key(cand))
                if edge not in used:
                    found = cand
                    used.add(edge)
                    break
            if found is None:
                break
            cur = found
            guard += 1
        if len(ring) >= 3:
            rings.append([(p[0] - 1, p[1] - 1) for p in ring])
    return rings


def ring_area(ring) -> float:
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def rdp_open(pts, eps):
    if len(pts) < 3:
        return pts
    start, end = pts[0], pts[-1]
    idx, dmax = 0, 0.0
    x1, y1 = start
    x2, y2 = end
    dx, dy = x2 - x1, y2 - y1
    den = dx * dx + dy * dy
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        if den == 0:
            d = math.hypot(x - x1, y - y1)
        else:
            t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / den))
            d = math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
        if d > dmax:
            idx, dmax = i, d
    if dmax > eps:
        left = rdp_open(pts[: idx + 1], eps)
        right = rdp_open(pts[idx:], eps)
        return left[:-1] + right
    return [start, end]


def simplify(ring, eps):
    if len(ring) < 6:
        return ring
    open_pts = ring[:-1] if ring[0] == ring[-1] else list(ring)
    if len(open_pts) < 4:
        return open_pts
    # Start at the farthest vertex so the closing edge is not special.
    cx = sum(p[0] for p in open_pts) / len(open_pts)
    cy = sum(p[1] for p in open_pts) / len(open_pts)
    k = max(range(len(open_pts)), key=lambda i: (open_pts[i][0] - cx) ** 2 + (open_pts[i][1] - cy) ** 2)
    rot = open_pts[k:] + open_pts[:k]
    simp = rdp_open(rot + [rot[0]], eps)
    if simp and simp[0] == simp[-1]:
        simp = simp[:-1]
    return simp


def keep_outers(rings, mask, min_area):
    kept = []
    h, w = mask.shape
    for ring in rings:
        if ring_area(ring) < min_area:
            continue
        im = Image.new("L", (w, h), 0)
        ImageDraw.Draw(im).polygon(ring, fill=1)
        interior = np.array(im) > 0
        area = int(interior.sum())
        if area < min_area:
            continue
        if int(np.logical_and(interior, mask).sum()) > 0.45 * area:
            kept.append(ring)
    kept.sort(key=ring_area, reverse=True)
    return kept


def trace_labels(labels, ids, eps, min_area):
    out = {}
    for i in ids:
        mask = labels == i
        if int(mask.sum()) < min_area:
            out[i] = []
            continue
        raw = contours(mask)
        rings = []
        for ring in raw:
            simp = simplify(ring, eps)
            if len(simp) >= 3:
                rings.append(simp)
        out[i] = keep_outers(rings, mask, min_area)
    return out


def self_test():
    m = np.zeros((40, 60), dtype=bool)
    m[10:30, 8:40] = True
    rings = keep_outers(contours(m), m, 20)
    assert rings, "rectangle produced no contour"
    area = ring_area(rings[0])
    assert 500 < area < 800, area


def china_provinces():
    """Lon/lat rings. Shared edges are identical point lists. Coasts run offshore."""
    taihang = [
        (113.42, 36.02),
        (113.55, 37.15),
        (113.72, 38.25),
        (113.88, 39.20),
    ]
    yan = [
        (113.88, 39.20),
        (114.20, 40.20),
        (113.90, 40.85),
    ]
    yinshan = [
        (113.90, 40.85),
        (111.30, 41.05),
        (108.40, 41.15),
        (106.45, 40.75),
    ]
    ordos_w = [
        (106.45, 40.75),
        (106.75, 39.30),
        (107.05, 37.65),
    ]
    ordos_s = [
        (107.05, 37.65),
        (108.60, 37.30),
        (110.30, 37.10),
    ]
    bing_river = [
        (110.30, 37.10),
        (110.48, 36.35),
        (110.58, 36.12),
    ]
    bing_sili = [
        (110.58, 36.12),
        (112.15, 36.06),
    ]
    bing_ji = [
        (112.15, 36.06),
        (113.42, 36.02),
    ]
    qinling = [
        (106.15, 33.98),
        (107.35, 33.82),
        (108.55, 33.70),
        (109.75, 33.86),
        (110.42, 34.00),
    ]
    daba = [
        (105.55, 32.42),
        (106.85, 32.28),
        (108.10, 32.12),
        (109.25, 32.22),
        (110.15, 32.48),
    ]
    yalu_side = [
        (121.15, 40.90),
        (121.40, 42.20),
        (124.35, 42.55),
        (124.55, 41.15),
        (123.40, 39.55),
        (122.15, 38.85),
        (121.00, 39.35),
        (120.85, 40.15),
    ]
    you_south = [
        (113.88, 39.22),
        (115.50, 39.30),
        (117.30, 39.18),
        (118.80, 39.08),
    ]
    you = chain(
        you_south,
        [(119.90, 39.40), (120.55, 40.25), (119.20, 40.80), (116.40, 40.85), (114.25, 40.35), (113.95, 39.70)],
    )
    ji = chain(
        rev(taihang),
        [
            (114.50, 35.82),
            (115.30, 36.02),
            (116.30, 36.50),
            (117.10, 36.90),
            (117.90, 37.40),
            (118.60, 37.65),
            (119.40, 38.10),
            (119.70, 38.80),
        ],
        rev(you_south),
    )
    bing = chain(taihang, yan[1:], yinshan[1:], ordos_w[1:], ordos_s[1:], bing_river[1:], bing_sili[1:], bing_ji[1:])
    qing = [
        (116.80, 37.10),
        (116.75, 36.30),
        (118.40, 35.48),
        (120.40, 35.35),
        (122.70, 36.55),
        (122.85, 37.85),
        (120.40, 38.35),
        (118.90, 38.20),
        (117.50, 37.45),
    ]
    xu = [
        (116.55, 35.35),
        (116.45, 33.15),
        (118.20, 32.85),
        (120.40, 32.35),
        (122.15, 32.55),
        (122.20, 34.35),
        (120.60, 35.25),
        (118.40, 35.45),
    ]
    yan_zhou = [
        (114.45, 36.15),
        (116.65, 36.25),
        (116.80, 35.40),
        (116.55, 34.25),
        (114.55, 34.35),
    ]
    yu = [
        (112.70, 34.35),
        (113.85, 34.55),
        (116.45, 34.25),
        (116.55, 33.15),
        (116.20, 32.15),
        (114.10, 32.05),
        (112.70, 32.35),
        (112.55, 33.45),
    ]
    sili = chain(
        [(110.42, 34.55), (110.55, 35.55)],
        bing_sili,
        [(113.15, 35.35), (113.85, 34.75), (113.70, 33.85), (112.20, 33.50), (110.85, 33.65), (110.42, 34.05)],
    )
    guanzhong = chain(
        [(106.15, 35.40), (108.70, 35.50), (110.15, 35.15), (110.42, 34.55)],
        [(110.42, 34.00)],
        rev(qinling),
        [(106.15, 34.70)],
    )
    liang = [
        (106.15, 35.40),
        (106.20, 34.45),
        (105.40, 34.55),
        (103.70, 35.85),
        (101.80, 37.55),
        (99.40, 38.55),
        (97.20, 39.35),
        (94.70, 39.75),
        (93.60, 40.45),
        (95.80, 41.35),
        (99.20, 41.45),
        (102.40, 40.15),
        (104.80, 38.35),
        (106.40, 37.20),
        (106.15, 35.40),
    ]
    hanzhong = chain(qinling, [(110.20, 32.55)], rev(daba), [(105.70, 33.15)])
    yizhou = chain(
        daba,
        [
            (109.70, 30.70),
            (109.15, 29.10),
            (108.55, 27.40),
            (107.40, 25.80),
            (105.80, 24.60),
            (103.60, 23.70),
            (101.70, 23.90),
            (100.90, 25.40),
            (101.15, 28.20),
            (102.40, 30.60),
            (104.20, 32.10),
        ],
    )
    jingbei = [
        (110.45, 33.05),
        (112.30, 33.25),
        (113.90, 33.10),
        (114.70, 32.20),
        (114.85, 31.05),
        (114.25, 30.55),
        (112.40, 30.45),
        (111.15, 30.75),
        (110.45, 31.35),
        (110.30, 32.40),
    ]
    wuling = [
        (108.85, 28.15),
        (109.35, 29.15),
        (110.45, 29.05),
        (110.85, 28.15),
        (110.35, 27.35),
        (109.25, 27.45),
        (108.75, 27.70),
    ]
    jingnan = [
        (109.20, 30.85),
        (110.45, 31.20),
        (111.20, 30.70),
        (114.25, 30.50),
        (115.55, 29.40),
        (115.70, 26.60),
        (113.40, 25.45),
        (111.00, 25.35),
        (109.40, 26.15),
        (109.05, 28.00),
        (109.20, 29.55),
    ]
    yang = [
        (115.45, 33.05),
        (116.55, 33.10),
        (118.40, 32.70),
        (120.80, 32.15),
        (122.55, 31.40),
        (122.70, 27.80),
        (121.40, 25.20),
        (118.60, 23.90),
        (116.20, 24.70),
        (115.55, 26.55),
        (115.40, 29.70),
    ]
    jiao = [
        (105.40, 25.15),
        (108.20, 24.90),
        (111.10, 25.35),
        (113.50, 25.30),
        (116.10, 24.55),
        (116.80, 22.90),
        (114.80, 21.15),
        (111.20, 20.15),
        (109.20, 20.55),
        (107.40, 21.35),
        (105.30, 21.15),
        (104.70, 22.80),
        (105.20, 24.20),
    ]
    liaodong = yalu_side
    return {
        "遼東": liaodong,
        "幽州": you,
        "冀州": ji,
        "并州": bing,
        "青州": qing,
        "徐州": xu,
        "兗州": yan_zhou,
        "豫州": yu,
        "司隸": sili,
        "關中": guanzhong,
        "涼州": liang,
        "漢中": hanzhong,
        "益州": yizhou,
        "荊州北": jingbei,
        "荊州南": jingnan,
        "揚州": yang,
        "交州": jiao,
        "武陵": wuling,
    }


CHINA_CITIES = {
    "洛陽": (34.62, 112.45, "司隸"),
    "西安": (34.26, 108.94, "關中"),
    "太原": (37.87, 112.55, "并州"),
    "北京": (39.90, 116.40, "幽州"),
    "成都": (30.67, 104.06, "益州"),
    "南陽": (32.99, 112.53, "荊州北"),
    "長沙": (28.23, 112.94, "荊州南"),
    "建業": (32.06, 118.78, "揚州"),
    "廣州": (23.13, 113.26, "交州"),
    "河內": (21.03, 105.85, "交州"),
    "敦煌": (40.14, 94.66, "涼州"),
    "濟南": (36.65, 117.12, "青州"),
    "天津": (39.08, 117.20, "冀州"),
    "保定": (38.85, 115.48, "冀州"),
    "杭州": (30.25, 120.17, "揚州"),
    "常德": (29.03, 111.70, "荊州南"),
    "懷化": (27.55, 109.98, "武陵"),
    "漢中市": (33.07, 107.02, "漢中"),
}


def build_china(land, w, h):
    specs = china_provinces()
    order = list(specs)
    # Later shapes win overlaps: 青州 covers 濟南; 武陵 stays a fringe.
    order = [k for k in order if k not in ("青州", "武陵")] + ["青州", "武陵"]
    lab = np.zeros((h, w), np.uint8)
    id_of = {}
    for n, name in enumerate(order, start=1):
        id_of[name] = n
        pts = project_ring(specs[name], china_px, w, h)
        mask = raster_polygon(w, h, pts)
        lab[mask] = n
    exclude = np.zeros((h, w), dtype=bool)
    blocks = [
        [(120.05, 25.35), (122.10, 25.35), (122.10, 21.85), (120.05, 21.85)],
        [(108.55, 20.08), (111.20, 20.08), (111.20, 18.10), (108.55, 18.10)],
        [(125.20, 43.20), (131.50, 43.20), (131.50, 34.00), (125.20, 34.00)],
    ]
    for block in blocks:
        exclude |= raster_polygon(w, h, project_ring(block, china_px, w, h))
    lab[~land] = 0
    lab[exclude] = 0
    land2 = land & ~exclude
    lab = dilate_labels(lab, land2, 12)
    traced = trace_labels(lab, list(range(1, len(order) + 1)), 1.6, 80)
    rings = {}
    for name, i in id_of.items():
        rings[name] = traced.get(i, [])
    problems = []
    for name, (lat, lon, expect) in CHINA_CITIES.items():
        x, y = china_px(lat, lon, w, h)
        xi, yi = int(round(x)), int(round(y))
        if not (0 <= xi < w and 0 <= yi < h) or not land[yi, xi]:
            problems.append(f"{name} off land {x:.1f},{y:.1f}")
            continue
        got = None
        for prov, i in id_of.items():
            if lab[yi, xi] == i:
                got = prov
                break
        if got != expect:
            problems.append(f"{name} -> {got} want {expect}")
    return rings, lab, id_of, problems


def parse_domains(text: str):
    domains = []
    for m in re.finditer(r"\{ id: '([^']+)', name: '([^']+)', zone: '([^']+)', clan: '([^']+)', ring:", text):
        i = m.end()
        while text[i].isspace():
            i += 1
        raw, j = grab(text, i)
        ring = json.loads(re.sub(r",(\s*[\]}])", r"\1", raw))
        extra = None
        rest = text[j : j + 40]
        k = text.find("extraRings:", j, j + 30)
        if k != -1:
            p = text.find("[", k)
            raw_e, _ = grab(text, p)
            extra = json.loads(re.sub(r",(\s*[\]}])", r"\1", raw_e))
        domains.append(
            {
                "id": m.group(1),
                "name": m.group(2),
                "zone": m.group(3),
                "clan": m.group(4),
                "ring": ring,
                "extraRings": extra,
            }
        )
    return domains


def grab(text, i):
    assert text[i] == "["
    depth = 0
    j = i
    while j < len(text):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                return text[i : j + 1], j + 1
        j += 1
    raise RuntimeError("unclosed")


def build_japan(land, domains, w, h):
    areas = []
    for d in domains:
        areas.append((ring_area(d["ring"]), d["id"]))
    order = [i for _, i in sorted(areas, reverse=True)]
    rank = {i: n for n, i in enumerate(order)}
    lab = np.zeros((h, w), np.int16)
    id_to_n = {d["id"]: n for n, d in enumerate(domains, start=1)}
    # Draw large first so smaller domains keep overlaps.
    for d in sorted(domains, key=lambda item: rank[item["id"]]):
        n = id_to_n[d["id"]]
        rings = [d["ring"]] + (d["extraRings"] or [])
        for ring in rings:
            lab[raster_polygon(w, h, ring)] = n
    exclude = np.zeros((h, w), dtype=bool)
    hokkaido = [(139.0, 41.55), (146.2, 41.55), (146.2, 47.4), (139.0, 47.4)]
    ryukyu = [(122.2, 30.25), (131.8, 30.25), (131.8, 23.1), (122.2, 23.1)]
    for block in (hokkaido, ryukyu):
        # japan_px expects (lat, lon) via project_ring which passes lon, lat from (lon, lat) pairs.
        # These blocks are (lon, lat). project_ring does proj(lat, lon) from (lon, lat). Good.
        exclude |= raster_polygon(w, h, project_ring(block, japan_px, w, h))
    lab[~land] = 0
    lab[exclude] = 0
    lab = dilate_labels(lab, land & ~exclude, 18)
    traced = trace_labels(lab, list(id_to_n.values()), 1.45, 40)
    out = {}
    for d in domains:
        n = id_to_n[d["id"]]
        rings = traced.get(n, [])
        if not rings:
            out[d["id"]] = d
            d["kept_old"] = True
        else:
            out[d["id"]] = {
                **d,
                "ring": [[round(x, 1), round(y, 1)] for x, y in rings[0]],
                "extraRings": [
                    [[round(x, 1), round(y, 1)] for x, y in ring] for ring in rings[1:]
                ]
                or None,
                "kept_old": False,
            }
    return out, lab, id_to_n


def fmt_ring(ring, indent):
    lines = [f"{' ' * indent}["]
    for x, y in ring:
        lines.append(f"{' ' * (indent + 2)}[{x:.1f}, {y:.1f}],")
    lines.append(f"{' ' * indent}]")
    return "\n".join(lines)


def write_domains(path: Path, domains, new_by_id):
    header = """/** 勢力塊貼在現代列島地勢上。海岸沿底圖陸地收回；內陸界為示意（非學術地圖矢量化）。 */
import type { SengokuFactionId, SengokuRegionId } from '../types'
import {
  JAPAN_VORONOI_DOMAINS,
  type TerritoryGeometryProvenance,
} from '../../data/territory/provenance'

export interface TracedDomain {
  id: string
  name: string
  zone: SengokuRegionId
  clan: SengokuFactionId
  ring: [number, number][]
  /** 同一勢力在離島上的另外幾塊 */
  extraRings?: [number, number][][]
}

export const TRACED_DOMAINS: TracedDomain[] = [
"""
    footer = """
]

export const TRACED_DOMAINS_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  JAPAN_VORONOI_DOMAINS
"""
    chunks = []
    for d in domains:
        cur = new_by_id[d["id"]]
        ring = cur["ring"]
        extra = cur.get("extraRings")
        body = [
            "  {",
            f"    id: '{d['id']}',",
            f"    name: '{d['name']}',",
            f"    zone: '{d['zone']}',",
            f"    clan: '{d['clan']}',",
            "    ring: [",
        ]
        for x, y in ring:
            body.append(f"      [{float(x):.1f}, {float(y):.1f}],")
        if extra:
            body.append("    ],")
            body.append("    extraRings: [")
            for er in extra:
                body.append("      [")
                for x, y in er:
                    body.append(f"        [{float(x):.1f}, {float(y):.1f}],")
                body.append("      ],")
            body.append("    ],")
            body.append("  }")
        else:
            body.append("    ],")
            body.append("  }")
        chunks.append("\n".join(body))
    path.write_text(header + ",\n".join(chunks) + ",\n" + footer, encoding="utf-8")


def replace_ring_after_id(text: str, zone_id: str, ring):
    m = re.search(rf"id: '{re.escape(zone_id)}'", text)
    if not m:
        return text, False
    k = text.find("ring:", m.end())
    if k == -1 or k - m.end() > 800:
        return text, False
    p = text.find("[", k)
    _raw, end = grab(text, p)
    formatted = fmt_ring([[float(x), float(y)] for x, y in ring], 4)
    text = text[:p] + formatted.strip() + text[end:]
    cx = sum(float(pt[0]) for pt in ring) / len(ring)
    cy = sum(float(pt[1]) for pt in ring) / len(ring)
    zone_end = text.find("\n  {", m.start())
    # m.start() is the id; the next zone starts after this ring.
    nxt = text.find("\n  {", m.end())
    if nxt == -1:
        nxt = len(text)
    segment = text[m.start() : nxt]
    replaced, n = re.subn(
        r"labelAt:\s*\[[^\]]+\]",
        f"labelAt: [{cx:.1f}, {cy:.1f}]",
        segment,
        count=1,
    )
    if n:
        text = text[: m.start()] + replaced + text[nxt:]
    return text, True


def frontier_replacements(proj, w, h, land):
    """Small non-Han fringes. Not whole provinces."""
    specs = {
        "liao": [(102.7, 28.7), (104.2, 29.3), (105.4, 28.3), (104.8, 27.15), (103.0, 27.0)],
        "li": [(109.7, 22.45), (111.6, 22.55), (112.0, 21.45), (110.3, 21.15), (109.5, 21.55)],
        "cuan": [(102.0, 25.7), (103.9, 25.85), (104.1, 24.15), (102.15, 23.85)],
        "shanyue": [(118.15, 30.65), (119.75, 30.15), (119.9, 28.95), (118.35, 28.75), (117.55, 29.55)],
        "goguryeo": [(125.15, 41.9), (126.9, 42.45), (127.05, 40.95), (125.55, 40.15), (124.95, 40.55)],
        "qiang": [(101.9, 35.35), (103.8, 35.95), (104.7, 34.55), (103.2, 34.15), (102.0, 34.45)],
        "rongdi": [(103.4, 36.15), (105.6, 36.55), (106.3, 35.15), (104.6, 34.85), (102.8, 35.15)],
        "saiwai-hexi": [(98.6, 40.15), (102.2, 39.55), (103.4, 38.15), (100.4, 38.35), (97.6, 39.25)],
        "saiwai-north": [
            (108.8, 41.35),
            (112.4, 41.55),
            (116.2, 41.85),
            (119.4, 41.55),
            (118.6, 40.95),
            (114.8, 40.85),
            (111.2, 40.95),
            (108.2, 41.05),
        ],
    }
    out = {}
    for key, ring in specs.items():
        pts = project_ring(ring, proj, w, h)
        mask = raster_polygon(w, h, pts) & land
        traced = keep_outers(
            [simplify(r, 1.7) for r in contours(mask) if len(simplify(r, 1.7)) >= 3],
            mask,
            60,
        )
        if traced:
            out[key] = [[round(x, 1), round(y, 1)] for x, y in traced[0]]
    return out


def snap_routes(path: Path, land, radius=14):
    text = path.read_text(encoding="utf-8")
    h, w = land.shape
    moved = []

    def nearest(x, y):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < w and 0 <= yi < h and land[yi, xi]:
            return None
        best = None
        for r in range(1, radius + 1):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if max(abs(dx), abs(dy)) != r:
                        continue
                    xx, yy = xi + dx, yi + dy
                    if 0 <= xx < w and 0 <= yy < h and land[yy, xx]:
                        dist = math.hypot(xx - x, yy - y)
                        if best is None or dist < best[0]:
                            best = (dist, xx, yy)
            if best:
                return best
        return None

    def repl(m):
        body = m.group(1)
        pairs = re.findall(r"\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]", body)
        changed = False
        new_body = body
        for xs, ys in pairs:
            x, y = float(xs), float(ys)
            hit = nearest(x, y)
            if not hit:
                continue
            _dist, xx, yy = hit
            old = f"[{xs}, {ys}]"
            neu = f"[{xx:.1f}, {yy:.1f}]"
            if old not in new_body:
                old = f"[{xs},{ys}]"
            if old in new_body and old != neu:
                new_body = new_body.replace(old, neu, 1)
                moved.append((path.name, old, neu))
                changed = True
        return "points: [" + (new_body if changed else body) + "]"

    new = re.sub(r"points:\s*\[(.*?)\]", repl, text, flags=re.S)
    if moved:
        path.write_text(new, encoding="utf-8")
    return moved


def preview(im, labels, id_of, path):
    base = np.asarray(im.convert("RGB")).copy()
    rng = np.random.default_rng(3)
    tint = np.zeros_like(base)
    for name, i in id_of.items():
        color = rng.integers(40, 230, size=3)
        tint[labels == i] = color
    mask = labels > 0
    base[mask] = (base[mask] * 0.45 + tint[mask] * 0.55).astype(np.uint8)
    small = Image.fromarray(base).resize((base.shape[1] // 2, base.shape[0] // 2))
    path.parent.mkdir(parents=True, exist_ok=True)
    small.save(path, quality=75)


def japan_domain_meta():
    rows = [
        ("d0", "蘆名", "奧羽", "其他", 37.49, 139.93),
        ("d1", "武田", "甲信", "武田", 35.75, 138.35),
        ("d2", "三好", "近畿", "其他", 34.68, 135.52),
        ("d3", "島津", "九州", "島津", 31.60, 130.45),
        ("d4", "南部", "奧羽", "其他", 40.60, 141.30),
        ("d5", "伊達", "奧羽", "其他", 38.30, 140.75),
        ("d6", "毛利", "中國", "毛利", 34.40, 132.15),
        ("d7", "北條・佐竹", "關東", "北條", 35.80, 139.55),
        ("d8", "大友", "九州", "其他", 33.25, 131.55),
        ("d9", "淺井", "近畿", "其他", 35.40, 136.28),
        ("d10", "德川", "東海", "德川", 34.90, 137.45),
        ("d11", "上杉", "越後", "上杉", 37.50, 139.05),
        ("d12", "尼子", "中國", "其他", 35.35, 133.05),
        ("d13", "長宗我部", "四國", "其他", 33.50, 133.45),
        ("d14", "織田", "尾張三河", "織田", 35.40, 136.80),
        ("d15", "最上", "奧羽", "其他", 38.50, 140.25),
        ("d16", "朝倉", "近畿", "其他", 35.95, 136.25),
        ("d17", "龍造寺", "九州", "其他", 33.25, 130.20),
        ("d18", "安東・大崎・葛西・相馬", "奧羽", "其他", 39.40, 141.45),
        ("d19", "畠山・本願寺・三木", "甲信", "武田", 36.80, 136.90),
        ("d20", "宇都宮・那須・岩城", "關東", "其他", 36.85, 140.10),
        ("d21", "山名・宇喜多・別所・波多野", "中國", "其他", 34.90, 134.40),
        ("d22", "大村", "九州", "其他", 32.95, 129.90),
        ("d23", "河野・香川", "四國", "其他", 33.95, 133.40),
        ("d24", "伊東・阿蘇・相良", "九州", "其他", 32.30, 131.15),
        ("d25", "畠山", "四國", "其他", 33.90, 135.45),
        ("d26", "里見", "關東", "其他", 35.20, 140.10),
        ("d27", "肝付", "九州", "其他", 31.35, 130.90),
    ]
    return [
        {"id": i, "name": n, "zone": z, "clan": c, "lat": lat, "lon": lon}
        for i, n, z, c, lat, lon in rows
    ]


def build_japan_from_seeds(land, domains, w, h):
    exclude = np.zeros((h, w), dtype=bool)
    blocks = [
        # Hokkaido, Sakhalin, and the northern margin. Honshu ends near 41.5N.
        [(121.9, 41.58), (151.5, 41.58), (151.5, 47.6), (121.9, 47.6)],
        # Ryukyu
        [(122.0, 30.35), (145.0, 30.35), (145.0, 22.9), (122.0, 22.9)],
        # Korea and the western margin. Kyushu stays east of about 129.7E.
        [(121.9, 47.6), (129.65, 47.6), (129.65, 22.9), (121.9, 22.9)],
    ]
    for block in blocks:
        exclude |= raster_polygon(w, h, project_ring(block, japan_px, w, h))
    usable = land & ~exclude
    seeds = []
    for d in domains:
        x, y = japan_px(d["lat"], d["lon"], w, h)
        xi, yi = int(round(x)), int(round(y))
        if not (0 <= xi < w and 0 <= yi < h and usable[yi, xi]):
            # Snap a sea seed onto the nearest usable land.
            best = None
            for r in range(1, 50):
                for dy in range(-r, r + 1):
                    for dx in range(-r, r + 1):
                        if max(abs(dx), abs(dy)) != r:
                            continue
                        xx, yy = xi + dx, yi + dy
                        if 0 <= xx < w and 0 <= yy < h and usable[yy, xx]:
                            dist = dx * dx + dy * dy
                            if best is None or dist < best[0]:
                                best = (dist, xx, yy)
                if best:
                    break
            if best:
                x, y = best[1], best[2]
        seeds.append((x, y))
        print(f"  seed {d['id']} {d['name']} {x:.0f},{y:.0f}")
    seed_arr = np.array(seeds, dtype=np.float32)
    ys, xs = np.nonzero(usable)
    lab = np.zeros((h, w), np.int16)
    assign = np.empty(len(xs), np.int16)
    pts_x = xs.astype(np.float32)
    pts_y = ys.astype(np.float32)
    for start in range(0, len(xs), 60000):
        end = min(len(xs), start + 60000)
        dx = pts_x[start:end, None] - seed_arr[None, :, 0]
        dy = pts_y[start:end, None] - seed_arr[None, :, 1]
        assign[start:end] = (dx * dx + dy * dy).argmin(1).astype(np.int16) + 1
    lab[ys, xs] = assign
    ids = list(range(1, len(domains) + 1))
    traced = trace_labels(lab, ids, 1.45, 40)
    out = {}
    for n, d in enumerate(domains, start=1):
        rings = traced.get(n, [])
        if not rings:
            raise SystemExit(f"no ring for {d['id']}")
        out[d["id"]] = {
            **d,
            "ring": [[round(x, 1), round(y, 1)] for x, y in rings[0]],
            "extraRings": [
                [[round(x, 1), round(y, 1)] for x, y in ring] for ring in rings[1:]
            ]
            or None,
            "kept_old": False,
        }
    return out, lab, {d["id"]: n for n, d in enumerate(domains, start=1)}


def main():
    self_test()
    print("contour self-test ok")
    china = Image.open(CHINA_IMG).convert("RGB")
    w, h = china.size
    land = land_mask(china, "china")
    print(f"china land {int(land.sum())} px")
    rings, lab, id_of, problems = build_china(land, w, h)
    preview(china, lab, id_of, OUT / "china_preview.jpg")
    for name, parts in rings.items():
        pts = sum(len(p) for p in parts)
        print(f"  {name}: {len(parts)} rings, {pts} pts")
    if problems:
        print("CITY PROBLEMS")
        for p in problems:
            print(" ", p)
        raise SystemExit(1)
    payload = {
        "approx": True,
        "source": "手繪經緯示意框，scripts/tighten_land_borders.py 裁至現代東亞地勢；非譚其驤《中國歷史地圖集》第三冊圖幅矢量化",
        "width": w,
        "height": h,
        "provinces": {name: [[[round(x, 1), round(y, 1)] for x, y in ring] for ring in parts] for name, parts in rings.items()},
    }
    (ROOT / "src/data/basemapProvinceRings.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    fr = frontier_replacements(china_px, w, h, land)
    for fname, ids in (
        (ROOT / "src/data/marchRoutes.ts", ["liao", "li", "cuan", "shanyue", "goguryeo", "qiang"]),
        (ROOT / "src/zhou/data/frontier.ts", ["rongdi"]),
        (ROOT / "src/qinhan/data/frontier.ts", ["saiwai-north", "saiwai-hexi"]),
    ):
        text = fname.read_text(encoding="utf-8")
        for zone_id in ids:
            if zone_id not in fr:
                print("missing fringe", zone_id)
                continue
            text, ok = replace_ring_after_id(text, zone_id, fr[zone_id])
            print(("updated" if ok else "FAILED"), fname.name, zone_id, len(fr[zone_id]))
        fname.write_text(text, encoding="utf-8")

    japan = Image.open(JAPAN_IMG).convert("RGB")
    jw, jh = japan.size
    jland = land_mask(japan, "japan")
    print(f"japan land {int(jland.sum())} px")
    dom_path = ROOT / "src/sengoku/data/tracedDomains.ts"
    domains = japan_domain_meta()
    new_by_id, jlab, id_to_n = build_japan_from_seeds(jland, domains, jw, jh)
    preview(japan, jlab, {d["id"]: id_to_n[d["id"]] for d in domains}, OUT / "japan_preview.jpg")
    kept = [d["id"] for d in domains if new_by_id[d["id"]].get("kept_old")]
    print("kept old", kept)
    write_domains(dom_path, domains, new_by_id)

    moves = []
    for rel in (
        "src/data/marchRoutes.ts",
        "src/zhou/data/marchRoutes.ts",
        "src/qinhan/data/marchRoutes.ts",
    ):
        moves.extend(snap_routes(ROOT / rel, land))
    for rel in (
        "src/sengoku/data/marchRoutes.ts",
        "src/heian/data/marchRoutes.ts",
        "src/bakumatsu/data/marchRoutes.ts",
    ):
        moves.extend(snap_routes(ROOT / rel, jland))
    print("route snaps", len(moves))
    for row in moves[:40]:
        print(" ", row)


if __name__ == "__main__":
    main()
