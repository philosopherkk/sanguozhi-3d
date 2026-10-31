#!/usr/bin/env python3
"""Project CODH 旧国 GeoJSON to basemap pixels and emit TypeScript paint meshes."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "src/data/territory/japan_kokugun/vendor"
OUT_MESH = ROOT / "src/sengoku/data/codhKokugunMeshes.ts"
OUT_ERA = ROOT / "src/geo/japanEraRings.ts"
OUT_INDEX = ROOT / "src/data/territory/japan_kokugun/index.geojson"
MAP_W, MAP_H = 1482, 1477
JP_N, JP_S, JP_W, JP_E = 47.56, 22.95, 121.96, 151.58

CODH_SOURCE_PLATE = (
    "CODH『旧国・旧郡境界データセット』doi:10.20676/00000454 · "
    "https://geoshape.ex.nii.ac.jp/kg/ · CC BY-NC 4.0"
)
CODH_ATLAS = "NIHU 幕末明治地勢地図境界データ（CODH GeoJSON）"

# 松前交易領：渡島國南部示意（非全島征服）。以緯度切分 K78。
MATSUMAE_MAX_LAT = 42.05

# 主外環最少頂點（著色／標籤品質）
MIN_PRIMARY_EXTERIOR_VERTS = 24
# 自適應 RDP：基準 eps 後若仍不足則依序降低
ADAPTIVE_EXTERIOR_EPS = (1.0, 0.6, 0.4, 0.3)

# 建置抽樣：主環須達 MIN_PRIMARY_EXTERIOR_VERTS
PRIMARY_QUALITY_KIDS = (
    "K08",
    "K48",
    "K56",
    "K58",
    "K63",
    "K71",
    "K72",
)


def japan_px(lat: float, lon: float, w: int, h: int) -> tuple[float, float]:
    return (lon - JP_W) / (JP_E - JP_W) * w, (JP_N - lat) / (JP_N - JP_S) * h


def rdp_open(pts: list, eps: float) -> list:
    if len(pts) <= 2:
        return pts
    start, end = pts[0], pts[-1]
    idx = None
    dist_max = 0.0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        x0, y0 = start
        x1, y1 = end
        dx, dy = x1 - x0, y1 - y0
        if dx == dy == 0:
            dist = math.hypot(x - x0, y - y0)
        else:
            t = max(0, min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
            dist = math.hypot(x - (x0 + t * dx), y - (y0 + t * dy))
        if dist > dist_max:
            idx = i
            dist_max = dist
    if dist_max <= eps:
        return [start, end]
    left = rdp_open(pts[: idx + 1], eps)
    right = rdp_open(pts[idx:], eps)
    return left[:-1] + right


def ring_shoelace_area(ring: list) -> float:
    if len(ring) < 3:
        return 0.0
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    area = 0.0
    for i, (x0, y0) in enumerate(pts):
        x1, y1 = pts[(i + 1) % len(pts)]
        area += x0 * y1 - x1 * y0
    return abs(area) * 0.5


def simplify(ring: list, eps: float) -> list:
    if len(ring) < 6:
        return ring
    open_pts = ring[:-1] if ring[0] == ring[-1] else list(ring)
    if len(open_pts) < 4:
        return open_pts
    cx = sum(p[0] for p in open_pts) / len(open_pts)
    cy = sum(p[1] for p in open_pts) / len(open_pts)
    k = max(
        range(len(open_pts)),
        key=lambda i: (open_pts[i][0] - cx) ** 2 + (open_pts[i][1] - cy) ** 2,
    )
    rot = open_pts[k:] + open_pts[:k]
    simp = rdp_open(rot + [rot[0]], eps)
    if simp and simp[0] == simp[-1]:
        simp = simp[:-1]
    return simp


def simplify_exterior(coords: list, eps: float = 2.2) -> list:
    """RDP 簡化；外環頂點不足 MIN_PRIMARY_EXTERIOR_VERTS 時自適應降低 eps。"""
    pts = [[x, y] for x, y in coords]
    ring = simplify(pts, eps)
    if len(ring) >= MIN_PRIMARY_EXTERIOR_VERTS:
        return ring
    for retry_eps in ADAPTIVE_EXTERIOR_EPS:
        if retry_eps >= eps:
            continue
        ring = simplify(pts, retry_eps)
        if len(ring) >= MIN_PRIMARY_EXTERIOR_VERTS:
            break
    return ring


def load_traced_domains() -> list[dict]:
    text = (ROOT / "src/sengoku/data/tracedDomains.ts").read_text(encoding="utf-8")
    blocks = re.findall(
        r"\{\s*id:\s*'(d\d+)',\s*name:\s*'([^']*)',\s*zone:\s*'([^']*)',[\s\S]*?ring:\s*\[([\s\S]*?)\]\s*,?\s*(?:extraRings:|clan:|\})",
        text,
    )
    domains: list[dict] = []
    for did, _name, zone, ring_body in blocks:
        nums = re.findall(r"\[(\d+\.?\d*),\s*(\d+\.?\d*)\]", ring_body)
        ring = [[float(a), float(b)] for a, b in nums]
        domains.append({"id": did, "zone": zone, "ring": ring})
    if len(domains) < 20:
        raise SystemExit(f"parse tracedDomains failed: {len(domains)} domains")
    return domains


def px_ring(lon_lat_ring: list[list[float]]) -> list[tuple[float, float]]:
    return [japan_px(lat, lon, MAP_W, MAP_H) for lon, lat in lon_lat_ring]


def lonlat_rings_from_geo(geom: dict) -> list[list[list[float]]]:
    gtype = geom["type"]
    coords = geom["coordinates"]
    if gtype == "Polygon":
        return [coords[0]]
    if gtype == "MultiPolygon":
        return [part[0] for part in coords]
    return []


def geo_to_pixel_shapes(geom: dict) -> list[Polygon]:
    polys: list[Polygon] = []
    for ring in lonlat_rings_from_geo(geom):
        px = px_ring(ring)
        if len(px) >= 3:
            polys.append(Polygon(px))
    return polys


def pixel_rings_from_geo(geom: dict, eps: float = 2.2) -> list[list[list[float]]]:
    parts = geo_to_pixel_shapes(geom)
    if not parts:
        return []
    merged = unary_union(parts)
    return rings_from_shapely(merged, eps)


def rings_from_shapely(geom, eps: float = 2.0) -> list[list[list[float]]]:
    if geom.is_empty:
        return []
    if isinstance(geom, MultiPolygon):
        polys = list(geom.geoms)
    else:
        polys = [geom]
    exteriors: list[tuple[float, list[list[float]]]] = []
    holes: list[list[list[float]]] = []
    for poly in polys:
        if poly.is_empty:
            continue
        ext = list(poly.exterior.coords)
        ring = simplify_exterior(ext, eps)
        if len(ring) >= 3:
            px_ring = [[round(x, 1), round(y, 1)] for x, y in ring]
            exteriors.append((ring_shoelace_area(px_ring), px_ring))
        for interior in poly.interiors:
            hole = simplify([[x, y] for x, y in interior.coords], eps)
            if len(hole) >= 3:
                holes.append([[round(x, 1), round(y, 1)] for x, y in hole])
    exteriors.sort(key=lambda item: item[0], reverse=True)
    return [ring for _, ring in exteriors] + holes


def assign_domain(
    lon: float, lat: float, domains: list[dict]
) -> str:
    pt = Point(*japan_px(lat, lon, MAP_W, MAP_H))
    best_id = domains[0]["id"]
    best_dist = math.inf
    for d in domains:
        ring = d["ring"]
        poly = Polygon(ring)
        if poly.contains(pt) or poly.boundary.distance(pt) < 2:
            return d["id"]
        dist = poly.centroid.distance(pt)
        if dist < best_dist:
            best_dist = dist
            best_id = d["id"]
    return best_id


def load_vendor_features(kid: str) -> list[dict]:
    path = VENDOR / f"{kid}.geojson"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return list(data.get("features") or [])


def load_all_geometries(kid: str) -> list[dict]:
    return [f["geometry"] for f in load_vendor_features(kid) if f.get("geometry")]


def kokugun_name(kid: str, feats: list[dict]) -> str:
    for feat in feats:
        props = feat.get("properties") or {}
        if props.get("id") == kid and props.get("name"):
            return str(props["name"])
    for feat in feats:
        props = feat.get("properties") or {}
        if props.get("name"):
            return str(props["name"])
    return kid


def geoms_wgs_union(geoms: list[dict]):
    parts = []
    for geom in geoms:
        for ring in lonlat_rings_from_geo(geom):
            if len(ring) >= 3:
                parts.append(Polygon(ring))
    if not parts:
        return None
    return unary_union(parts)


def centroid_lonlat(geoms: list[dict]) -> tuple[float, float]:
    lons: list[float] = []
    lats: list[float] = []
    for geom in geoms:
        for ring in lonlat_rings_from_geo(geom):
            for lon, lat in ring:
                lons.append(lon)
                lats.append(lat)
    if not lons:
        return 0.0, 0.0
    return sum(lons) / len(lons), sum(lats) / len(lats)


def pixel_rings_from_geometries(geoms: list[dict], eps: float = 2.2) -> list[list[list[float]]]:
    parts: list[Polygon] = []
    for geom in geoms:
        parts.extend(geo_to_pixel_shapes(geom))
    if not parts:
        return []
    return rings_from_shapely(unary_union(parts), eps)


def emit_ts_meshes(meshes: list[dict]) -> None:
    header = """/** 由 scripts/build_japan_kokugun_rings.py 自 CODH 旧国 GeoJSON 生成。勿手改。 */
import type { SengokuRegionId } from '../types'

export interface CodhKokugunMesh {
  /** 繪製 id（K01…） */
  id: string
  kokugunId: string
  name: string
  domainId: string
  zone: SengokuRegionId
  ring: [number, number][]
  extraRings?: [number, number][][]
}

export const CODH_KOKUGUN_MESHES: CodhKokugunMesh[] = """
    OUT_MESH.write_text(
        header + json.dumps(meshes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def emit_era_rings(jp: dict[str, list]) -> None:
    header = f"""/** 北海道、松前、琉球。像素對齊日本地勢 {MAP_W}×{MAP_H}。
 * 琉球（K74）與北海道（K75–K85）來自 CODH 旧国 GeoJSON（{CODH_SOURCE_PLATE}）。
 * 松前為 K78 渡島國南部切分（1604 交易領示意，非全島）。
 * 內陸蝦夷／阿イヌ政治邊界不臆造。
 */
export type EraRing = [number, number][]

export const JP_ERA_RINGS: Record<string, EraRing[]> = """
    body = json.dumps(jp, ensure_ascii=False)
    OUT_ERA.write_text(header + body + "\n", encoding="utf-8")


def build_index(features: list[dict]) -> None:
    fc = {"type": "FeatureCollection", "features": features}
    OUT_INDEX.write_text(json.dumps(fc, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    if not VENDOR.exists():
        raise SystemExit("run vendor_codh_kokugun.py first")

    domains = load_traced_domains()
    domain_zone = {d["id"]: d["zone"] for d in domains}

    index_features: list[dict] = []
    meshes: list[dict] = []

    for n in range(1, 74):
        kid = f"K{n:02d}"
        feats = load_vendor_features(kid)
        geoms = load_all_geometries(kid)
        if not geoms:
            continue
        name = kokugun_name(kid, feats)
        lon, lat = centroid_lonlat(geoms)
        domain_id = assign_domain(lon, lat, domains)
        zone = domain_zone.get(domain_id, "奧羽")

        rings_px = pixel_rings_from_geometries(geoms, 2.2)
        if not rings_px:
            continue
        ring = rings_px[0]
        extra = rings_px[1:] if len(rings_px) > 1 else None

        meshes.append(
            {
                "id": kid,
                "kokugunId": kid,
                "name": name,
                "domainId": domain_id,
                "zone": zone,
                "ring": ring,
                **({"extraRings": extra} if extra else {}),
            }
        )
        index_features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": kid,
                    "name": name,
                    "domainId": domain_id,
                    "featureCount": len(geoms),
                    "source_plate": CODH_SOURCE_PLATE,
                    "approx": True,
                    "note": "幕末明治旧国界；著色仍依 d0–d27 勢力域對照，非藩界。",
                    "atlas": CODH_ATLAS,
                    "year": 1868,
                    "crs": "EPSG:4326 → japan relief 1482×1477",
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
            }
        )

    required = {f"K{n:02d}" for n in range(1, 74)}
    got = {m["id"] for m in meshes}
    missing = required - got
    if missing:
        raise SystemExit(f"missing kokugun meshes: {sorted(missing)}")
    feature_counts = {
        f["properties"]["id"]: f["properties"]["featureCount"] for f in index_features
    }

    def mesh_vertex_totals(mesh: dict) -> tuple[int, int]:
        primary = len(mesh["ring"])
        extras = mesh.get("extraRings") or []
        total = primary + sum(len(r) for r in extras)
        return primary, total

    for check in PRIMARY_QUALITY_KIDS:
        hit = next(m for m in meshes if m["id"] == check)
        primary, total = mesh_vertex_totals(hit)
        if primary < MIN_PRIMARY_EXTERIOR_VERTS:
            raise SystemExit(
                f"{check} mesh quality: primary={primary} (need ≥{MIN_PRIMARY_EXTERIOR_VERTS})"
            )

    for mesh in meshes:
        if len(mesh["ring"]) < MIN_PRIMARY_EXTERIOR_VERTS:
            raise SystemExit(
                f"{mesh['id']} primary ring too sparse: {len(mesh['ring'])} vertices"
            )

    k71 = next(m for m in meshes if m["id"] == "K71")
    k71_primary, k71_total = mesh_vertex_totals(k71)
    if k71_primary < MIN_PRIMARY_EXTERIOR_VERTS or k71_total < 40:
        raise SystemExit(
            f"K71 mesh quality: primary={k71_primary} total={k71_total} (need ≥24 / ≥40)"
        )
    if k71_primary < 50 or k71_total < 135:
        raise SystemExit(
            f"K71 regression: primary={k71_primary} total={k71_total} (expected ≥50 / ≥135)"
        )

    for mesh in meshes:
        if feature_counts.get(mesh["id"], 0) >= 10:
            primary, total = mesh_vertex_totals(mesh)
            if primary < MIN_PRIMARY_EXTERIOR_VERTS or total < 40:
                raise SystemExit(
                    f"{mesh['id']} (featureCount≥10) quality: primary={primary} total={total}"
                )

    emit_ts_meshes(meshes)

    # --- Era rings from K74, K75–K85, matsumae clip ---
    era: dict[str, list] = {"matsumae": [], "hokkaido": [], "okinawa": [], "ryukyu": []}

    k74_geoms = load_all_geometries("K74")
    if k74_geoms:
        era["ryukyu"] = pixel_rings_from_geometries(k74_geoms, 2.0)
        parts: list[Polygon] = []
        for geom in k74_geoms:
            parts.extend(geo_to_pixel_shapes(geom))
        if parts:
            oki = max(parts, key=lambda p: p.area)
            era["okinawa"] = rings_from_shapely(oki, 2.0)

    hokkaido_px: list[Polygon] = []
    for n in range(75, 86):
        for geom in load_all_geometries(f"K{n:02d}"):
            hokkaido_px.extend(geo_to_pixel_shapes(geom))
    if hokkaido_px:
        hokk = unary_union(hokkaido_px)
        era["hokkaido"] = rings_from_shapely(hokk, 2.5)

    k78_geoms = load_all_geometries("K78")
    if k78_geoms:
        south_rings: list[Polygon] = []
        for geom in k78_geoms:
            for ring in lonlat_rings_from_geo(geom):
                south = [(lon, lat) for lon, lat in ring if lat <= MATSUMAE_MAX_LAT]
                if len(south) >= 3:
                    px = px_ring(south)
                    if len(px) >= 3:
                        south_rings.append(Polygon(px))
        if south_rings:
            era["matsumae"] = rings_from_shapely(unary_union(south_rings), 2.0)

    emit_era_rings(era)
    build_index(index_features)
    print(
        f"meshes={len(meshes)} era hokkaido={len(era['hokkaido'])} "
        f"ryukyu={len(era['ryukyu'])} spot={','.join(PRIMARY_QUALITY_KIDS)}"
    )


if __name__ == "__main__":
    main()
