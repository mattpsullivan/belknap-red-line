#!/bin/bash
# OSM Way Mapper Tool
# Maps BRATTS trails to OSM way segments

cd "$(dirname "$0")/.."

echo "Starting OSM Way Mapper..."
echo "Open: http://localhost:3333/tools/osm-way-mapper.html"
echo "Press Ctrl+C to stop"
echo ""

npx serve . -p 3333
