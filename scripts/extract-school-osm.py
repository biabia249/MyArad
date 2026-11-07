"""Extract education POIs from a Geofabrik snapshot with bounded node memory."""
import json
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(tempfile.gettempdir()) / 'myarad-school-tools'))
import osmium

folder = Path(__file__).resolve().parents[1] / 'server/data-sources/schools'
pbf = Path(tempfile.gettempdir()) / 'myarad-romania-schools.osm.pbf'
boundary = json.loads((folder / 'arad-boundary.geojson').read_text(encoding='utf8'))['features'][0]['geometry']

def in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def in_county(lat, lng):
    polygons = boundary['coordinates'] if boundary['type'] == 'MultiPolygon' else [boundary['coordinates']]
    return any(in_ring(lng, lat, p[0]) and not any(in_ring(lng, lat, hole) for hole in p[1:]) for p in polygons)

def education(tags):
    return tags.get('amenity') in ['school', 'kindergarten', 'college', 'university'] or tags.get('building') in ['school', 'kindergarten', 'college', 'university']

class Ways(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.ways = []
        self.needed = set()
    def way(self, way):
        tags = dict(way.tags)
        if education(tags):
            refs = [n.ref for n in way.nodes]
            self.ways.append((way.id, tags, refs))
            self.needed.update(refs)

ways = Ways()
ways.apply_file(str(pbf))
print('Education ways:', len(ways.ways), flush=True)

class Nodes(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.points = {}
        self.features = []
        self.localities = []
    def node(self, node):
        lat, lng = node.location.lat, node.location.lon
        if node.id in ways.needed:
            self.points[node.id] = (lat, lng)
        if not (45.7 < lat < 46.8 and 20.5 < lng < 23.0):
            return
        tags = dict(node.tags)
        if education(tags) and in_county(lat, lng):
            self.features.append({'type': 'node', 'id': node.id, 'lat': lat, 'lon': lng, 'tags': tags})
        if tags.get('place') in ['city', 'town', 'village', 'hamlet'] and tags.get('name') and in_county(lat, lng):
            self.localities.append({'name': tags['name'], 'lat': lat, 'lng': lng})

nodes = Nodes()
nodes.apply_file(str(pbf))
for identifier, tags, refs in ways.ways:
    coords = [nodes.points[n] for n in refs if n in nodes.points]
    if not coords:
        continue
    lat = sum(p[0] for p in coords) / len(coords)
    lng = sum(p[1] for p in coords) / len(coords)
    if in_county(lat, lng):
        nodes.features.append({'type': 'way', 'id': identifier, 'center': {'lat': lat, 'lon': lng}, 'tags': tags})
(folder / 'osm-education.json').write_text(json.dumps({'source': 'https://download.geofabrik.de/europe/romania.html', 'elements': nodes.features}, ensure_ascii=False, indent=2), encoding='utf8')
(folder / 'locality-points.json').write_text(json.dumps(nodes.localities, ensure_ascii=False, indent=2), encoding='utf8')
print('Arad education map features:', len(nodes.features), 'localities:', len(nodes.localities), flush=True)
