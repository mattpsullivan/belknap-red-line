#!/usr/bin/env python3
"""
Map Overlay / Trail-Geometry Check

Projects the trail geometry in src/data/trails.json onto the authoritative
Bosworth reference map (data/reference/belknap-range-trails-map-bosworth-2018.jpg)
so the drawn trails can be compared against our GPS-derived polylines.

The reference photo has a lettered/numbered grid but no lat/lng graticule, so it
cannot yield coordinates. Instead we georeference it from a handful of named
summits whose pixel positions were read by hand and whose lng/lat come from
trails.json. Only summits that are mutually self-consistent (~19,900 px/deg of
longitude) are used as anchors; summits that disagree are reported by --check as
suspect coordinates rather than trusted as anchors.

Usage:
    # Render every trail (or a subset) onto the map -> tmp/trail-overlay.jpg
    python scripts/map-overlay.py
    python scripts/map-overlay.py --trails mack-ridge-trail,mt-rowe-trail

    # Run the systematic geometry check (duplicates, off-map, suspect anchors)
    python scripts/map-overlay.py --check

Requirements:
    pip install pillow numpy
"""

import argparse
import colorsys
import json
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Missing deps: pip install pillow numpy")

REPO = Path(__file__).resolve().parent.parent
TRAILS_JSON = REPO / "src/data/trails.json"
REF_MAP = REPO / "data/reference/belknap-range-trails-map-bosworth-2018.jpg"
DEFAULT_OUT = REPO / "tmp/trail-overlay.jpg"

# Hand-read summit pixels on REF_MAP paired with the trails.json summit coord.
# `trust` marks the self-consistent set used to fit the transform; the rest are
# checked against that fit (large error => suspect coordinate in trails.json).
ANCHORS = {
    # name          px    py     lng         lat        trust
    "Rowe":         (1370, 300, -71.37956, 43.54134, True),
    "Mack":         (2200, 1340, -71.33719, 43.50194, True),
    "Major":        (3210, 850, -71.28728, 43.51370, True),
    "Whiteface":    (1225, 1720, -71.38680, 43.48880, True),
    "Klem":         (2190, 1195, -71.31750, 43.50480, False),
    "Anna":         (2510, 1395, -71.29999, 43.50639, False),
    "Straightback": (2830, 1290, -71.30009, 43.50635, False),
}


def fit_affine():
    """Least-squares affine (lng,lat)->(px,py) from the trusted anchors."""
    trusted = {k: v for k, v in ANCHORS.items() if v[4]}
    M = np.array([[v[2], v[3], 1] for v in trusted.values()])
    px = np.array([v[0] for v in trusted.values()], float)
    py = np.array([v[1] for v in trusted.values()], float)
    cx = np.linalg.lstsq(M, px, rcond=None)[0]
    cy = np.linalg.lstsq(M, py, rcond=None)[0]

    def project(lng, lat):
        return (float(cx @ [lng, lat, 1]), float(cy @ [lng, lat, 1]))

    return project


def load_trails():
    return json.loads(TRAILS_JSON.read_text())


def palette(n):
    return [
        tuple(int(255 * c) for c in colorsys.hsv_to_rgb(i / max(n, 1), 0.9, 1.0))
        for i in range(n)
    ]


def render(trail_ids, out_path):
    project = fit_affine()
    trails = load_trails()
    by_id = {t["id"]: t for t in trails}
    ids = trail_ids or [t["id"] for t in trails]
    im = Image.open(REF_MAP).convert("RGB")
    d = ImageDraw.Draw(im)
    W, H = im.size
    cols = palette(len(ids))
    for tid, col in zip(ids, cols):
        t = by_id.get(tid)
        if not t:
            print(f"  ! unknown trail id: {tid}")
            continue
        pts = [project(c["lng"], c["lat"]) for c in t["coordinates"]]
        d.line(pts, fill=col, width=4)
    # mark the anchors used for the fit
    for name, (x, y, *_rest, trust) in ANCHORS.items():
        if trust:
            d.ellipse([x - 8, y - 8, x + 8, y + 8], outline=(0, 0, 0), width=3)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(out_path, quality=92)
    print(f"Rendered {len(ids)} trail(s) -> {out_path}")


def check():
    """Systematic geometry pass: report data-quality anomalies."""
    project = fit_affine()
    trails = load_trails()
    im = Image.open(REF_MAP)
    W, H = im.size
    margin = 60  # px tolerance outside the printed frame

    print("== anchor consistency (suspect trails.json summit coords) ==")
    for name, (x, y, lng, lat, trust) in ANCHORS.items():
        if trust:
            continue
        px, py = project(lng, lat)
        err = ((px - x) ** 2 + (py - y) ** 2) ** 0.5
        print(f"  {name:13} reproj err {err:6.0f}px  (coord maps far from the "
              f"labeled peak on the map)")

    print("\n== duplicate / near-identical geometry ==")
    seen = {}
    for t in trails:
        key = (
            round(t["coordinates"][0]["lat"], 5),
            round(t["coordinates"][0]["lng"], 5),
            round(t["coordinates"][-1]["lat"], 5),
            round(t["coordinates"][-1]["lng"], 5),
            len(t["coordinates"]),
        )
        seen.setdefault(key, []).append(t["id"])
    dupes = [ids for ids in seen.values() if len(ids) > 1]
    if dupes:
        for ids in dupes:
            print(f"  identical endpoints+length: {', '.join(ids)}")
    else:
        print("  none")

    print("\n== trails projecting off the printed map (likely bad coords) ==")
    any_off = False
    for t in trails:
        offs = 0
        for c in t["coordinates"]:
            px, py = project(c["lng"], c["lat"])
            if px < -margin or px > W + margin or py < -margin or py > H + margin:
                offs += 1
        if offs:
            any_off = True
            print(f"  {t['id']:44} {offs}/{len(t['coordinates'])} points off-map")
    if not any_off:
        print("  none")

    print("\n== large gaps between consecutive points (>250m) ==")
    any_gap = False
    for t in trails:
        cs = t["coordinates"]
        for i in range(1, len(cs)):
            d = haversine_m(cs[i - 1], cs[i])
            if d > 250:
                any_gap = True
                print(f"  {t['id']:44} gap {d:6.0f}m at point {i}")
                break
    if not any_gap:
        print("  none")


def haversine_m(a, b):
    R = 6371000
    p1, p2 = np.radians(a["lat"]), np.radians(b["lat"])
    dphi = np.radians(b["lat"] - a["lat"])
    dl = np.radians(b["lng"] - a["lng"])
    h = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return float(2 * R * np.arcsin(np.sqrt(h)))


def main():
    ap = argparse.ArgumentParser(description="Overlay/check trail geometry on the Bosworth map")
    ap.add_argument("--check", action="store_true", help="run the geometry-anomaly report")
    ap.add_argument("--trails", help="comma-separated trail ids to render (default: all)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="overlay output path")
    args = ap.parse_args()
    if not REF_MAP.exists():
        sys.exit(f"Reference map not found: {REF_MAP}")
    if args.check:
        check()
    else:
        ids = args.trails.split(",") if args.trails else None
        render(ids, args.out)


if __name__ == "__main__":
    main()
