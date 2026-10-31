#!/usr/bin/env python3
"""Dissolve vendored 村→藩 GeoJSON and emit Bakumatsu han paint meshes (CC BY-SA)."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, shape

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "src/data/territory/japan_bakumatsu_1867/vendor"
VILLAGES = VENDOR / "villages"
STAGED = VENDOR / "staged_han.json"
OUT_MESH = ROOT / "src/bakumatsu/data/bakumatsuHanMeshes.ts"
OUT_COLLECTION = ROOT / "src/data/territory/japan_bakumatsu_1867/collection.geojson"

HAN_SOURCE_PLATE = (
    "CODH／Geoshape『幕末期近世村領域データセット』· doi:10.5638/thagis.34.1.1 · "
    "https://geoshape.ex.nii.ac.jp/av/ · CC BY-SA 4.0"
)
HAN_NOTE_ZH = (
    "示意・非地籍級藩界；村領域來自現代農業集落境界之空間接合（本田／CODH）。旧国≠藩界。"
)
MIN_PRIMARY_VERTICES = 8


def load_kokugun_build():
    path = ROOT / "scripts/build_japan_kokugun_rings.py"
    spec = importlib.util.spec_from_file_location("build_japan_kokugun_rings", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def adaptive_exterior_ring(kg, ext_coords: list, pre_count: int, base_eps: float = 2.2) -> list[list[float]]:
    """K71-style: retry lower RDP eps when large exteriors collapse to triangles."""
    open_pts = [[x, y] for x, y in ext_coords]
    eps_steps = [base_eps]
    if pre_count > 500:
        eps_steps.extend([1.4, 1.0, 0.6, 0.5, 0.35, 0.25])
    elif pre_count > 120:
        eps_steps.extend([1.4, 1.0, 0.6, 0.5, 0.35, 0.25, 0.15])
    elif pre_count > 40:
        eps_steps.extend([1.4, 1.0, 0.6, 0.35, 0.25, 0.15, 0.1])
    else:
        eps_steps.extend([1.4, 1.0, 0.6, 0.35, 0.25, 0.15, 0.1, 0.08])

    best: list[list[float]] = []
    for eps in eps_steps:
        ring = kg.simplify(open_pts, eps)
        ring = [[round(x, 1), round(y, 1)] for x, y in ring]
        if len(ring) < 3:
            continue
        if not best or len(ring) > len(best):
            best = ring
        if len(ring) >= 24:
            break
        if pre_count > 120 and len(ring) >= 16:
            break

    if len(best) < MIN_PRIMARY_VERTICES:
        for eps in (0.15, 0.1, 0.08, 0.05):
            if eps in eps_steps:
                continue
            ring = kg.simplify(open_pts, eps)
            ring = [[round(x, 1), round(y, 1)] for x, y in ring]
            if len(ring) < 3:
                continue
            if len(ring) > len(best):
                best = ring
            if len(best) >= MIN_PRIMARY_VERTICES:
                break

    return best


def pixel_rings_for_han(kg, geoms: list[dict]) -> list[list[list[float]]]:
    """Exterior rings only for primary selection; densest outline first; adaptive simplify."""
    from shapely.ops import unary_union

    parts: list[Polygon] = []
    for geom in geoms:
        parts.extend(kg.geo_to_pixel_shapes(geom))
    if not parts:
        return []

    merged = unary_union(parts)
    if merged.is_empty:
        return []

    polys = list(merged.geoms) if isinstance(merged, MultiPolygon) else [merged]
    exteriors: list[tuple[float, int, list]] = []
    hole_coords: list[list] = []

    for poly in polys:
        if poly.is_empty:
            continue
        ext = list(poly.exterior.coords)
        exteriors.append((poly.area, len(ext), ext))
        for interior in poly.interiors:
            hole_coords.append(list(interior.coords))

    exteriors.sort(key=lambda item: (item[1], item[0]), reverse=True)

    rings_out: list[list[list[float]]] = []
    for _area, pre_count, ext in exteriors:
        ring = adaptive_exterior_ring(kg, ext, pre_count)
        if len(ring) >= 3:
            rings_out.append(ring)

    for hole in hole_coords:
        simplified = kg.simplify([[x, y] for x, y in hole], 2.2)
        ring = [[round(x, 1), round(y, 1)] for x, y in simplified]
        if len(ring) >= 3:
            rings_out.append(ring)

    return rings_out


def load_village_geoms(hid: str) -> list[dict]:
    path = VILLAGES / f"{hid}.geojson"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [f["geometry"] for f in data.get("features") or [] if f.get("geometry")]


def centroid_lonlat(geoms: list[dict]) -> tuple[float, float]:
    lons: list[float] = []
    lats: list[float] = []
    for geom in geoms:
        g = shape(geom)
        if g.is_empty:
            continue
        c = g.centroid
        lons.append(c.x)
        lats.append(c.y)
    if not lons:
        return 0.0, 0.0
    return sum(lons) / len(lons), sum(lats) / len(lats)


def emit_ts(meshes: list[dict]) -> None:
    header = """/** 由 scripts/build_bakumatsu_han_rings.py 自 CODH 村→藩 dissolve 生成。勿手改。CC BY-SA 4.0。 */
import type { SengokuRegionId } from '../../sengoku/types'

export interface BakumatsuHanMesh {
  id: string
  hanId: string
  name: string
  domainId: string
  zone: SengokuRegionId
  ring: [number, number][]
  extraRings?: [number, number][][]
  approx: true
  pointOnly?: true
}

export const BAKUMATSU_HAN_MESHES: BakumatsuHanMesh[] = """
    OUT_MESH.write_text(
        header + json.dumps(meshes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    kg = load_kokugun_build()
    if not VILLAGES.exists():
        raise SystemExit("run scripts/vendor_codh_bakumatsu_av.py first")

    cfg = json.loads(STAGED.read_text(encoding="utf-8"))
    han_ids: list[str] = cfg["hanIds"]
    exclude_poly: set[str] = set(cfg.get("excludePolygonHanIds") or [])
    meta = json.loads((VENDOR / "staged_han_meta.json").read_text(encoding="utf-8"))
    name_by_id = {m["hanId"]: m["name"] for m in meta}

    domains = kg.load_traced_domains()
    domain_zone = {d["id"]: d["zone"] for d in domains}

    meshes: list[dict] = []
    index_features: list[dict] = []

    for hid in han_ids:
        if hid in exclude_poly:
            continue
        geoms = load_village_geoms(hid)
        if not geoms:
            print("skip empty", hid)
            continue
        lon, lat = centroid_lonlat(geoms)
        domain_id = kg.assign_domain(lon, lat, domains)
        zone = domain_zone.get(domain_id, "奧羽")
        name = name_by_id.get(hid, hid)

        rings_px = pixel_rings_for_han(kg, geoms)
        if not rings_px:
            continue
        ring = rings_px[0]
        extra = rings_px[1:] if len(rings_px) > 1 else None
        if len(ring) < 3:
            raise SystemExit(f"{hid} ring too small")

        mesh = {
            "id": hid,
            "hanId": hid,
            "name": name,
            "domainId": domain_id,
            "zone": zone,
            "ring": ring,
            "approx": True,
            **({"extraRings": extra} if extra else {}),
        }
        meshes.append(mesh)
        index_features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": hid,
                    "hanId": hid,
                    "name": name,
                    "domainId": domain_id,
                    "villageCount": len(geoms),
                    "source_plate": HAN_SOURCE_PLATE,
                    "approx": True,
                    "note": HAN_NOTE_ZH,
                    "method": "unary_union(村領域) per 藩ID",
                    "year": 1867,
                    "crs": "EPSG:4326 → japan relief 1482×1477",
                },
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )

    if len(meshes) < 10:
        raise SystemExit(f"too few han meshes: {len(meshes)}")

    for check in ("H346", "H374"):
        hit = next(m for m in meshes if m["id"] == check)
        if len(hit["ring"]) < 16:
            raise SystemExit(f"{check} primary ring too thin: {len(hit['ring'])} pts")

    for m in meshes:
        if len(m["ring"]) < MIN_PRIMARY_VERTICES:
            villages = next(
                f["properties"]["villageCount"]
                for f in index_features
                if f["properties"]["id"] == m["id"]
            )
            raise SystemExit(
                f"{m['id']} primary ring {len(m['ring'])} pts (min {MIN_PRIMARY_VERTICES}, villages={villages})"
            )
        villages = next(
            f["properties"]["villageCount"]
            for f in index_features
            if f["properties"]["id"] == m["id"]
        )
        if villages >= 100 and len(m["ring"]) < 12:
            raise SystemExit(f"{m['id']} primary ring {len(m['ring'])} pts for {villages} villages")

    emit_ts(meshes)
    fc = {
        "type": "FeatureCollection",
        "name": "japan_bakumatsu_1867",
        "features": index_features,
    }
    OUT_COLLECTION.write_text(json.dumps(fc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"meshes={len(meshes)} collection={len(index_features)}")


if __name__ == "__main__":
    main()
