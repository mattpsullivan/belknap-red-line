# Trail Data Tools

## OSM Way Mapper

Interactive tool for mapping BRATTS trails to OpenStreetMap way segments.

### Run

```bash
./tools/run-mapper.sh
# Then open http://localhost:3333/tools/osm-way-mapper.html
```

### Features

- Fetches all paths/footways/tracks from OSM in the Belknap Range area
- **Splits ways at intersections** so each segment is independently selectable
- Click segments on the map to select them
- Assign segments to BRATTS trails (supports multiple segments per trail)
- Toggle named/unnamed segment visibility
- Auto-saves mappings to localStorage
- Exports mapping with full geometry for each trail

### Workflow

1. Select a BRATTS trail from the sidebar
2. Click OSM segments on the map that correspond to that trail
3. Click "Assign to Selected Trail" for each segment
4. Repeat until the trail is fully mapped
5. Click "Export Mapping" to get the JSON

### Export Format

```json
{
  "trail-id": {
    "wayIds": [123456, 789012],
    "segments": [
      {
        "wayId": 123456,
        "wayName": "Trail Name",
        "geometry": [{"lat": 43.51, "lng": -71.30}, ...]
      }
    ]
  }
}
```

### Notes

- Gray segments = unnamed OSM paths
- Blue segments = named OSM trails (unmapped)
- Green segments = mapped to a BRATTS trail
- Orange segment = currently selected
