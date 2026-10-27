"""Optional OSM PBF fallback. Install with: python3 -m pip install osmium.
Uses the OSM administrative relation itself, never a substitute bounding box.
"""
import sys, json, gzip, datetime
import osmium
class Extract(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.boundary = None
        self.ways = []
        self.districts = []
        self.factory = osmium.geom.GeoJSONFactory()
    def area(self, area):
        if area.tags.get('ref:INSEE') == '69123' and area.tags.get('boundary') == 'administrative':
            self.boundary = json.loads(self.factory.create_multipolygon(area))
        code = area.tags.get('ref:INSEE', '')
        if code in [str(i) for i in range(69381,69390)] and area.tags.get('boundary') == 'administrative':
            self.districts.append({'id': int(code)-69380, 'name': area.tags.get('name', code), 'boundary': json.loads(self.factory.create_multipolygon(area))})
    def way(self, way):
        if way.tags.get('highway') not in ('residential','living_street','pedestrian','unclassified','tertiary','secondary','primary','service','footway','path','steps','cycleway','track'):
            return
        if not way.nodes or not all(n.location.valid() for n in way.nodes): return
        self.ways.append({'id': str(way.id), 'tags': dict(way.tags), 'nodes': [str(n.ref) for n in way.nodes], 'coordinates': [[round(n.lon,7),round(n.lat,7)] for n in way.nodes]})
h = Extract()
h.apply_file(sys.argv[1], locations=True, idx='flex_mem')
if not h.boundary:
    raise SystemExit('La relation administrative OSM de Lyon est absente de cet extrait. Aucun réseau généré.')
with gzip.open(sys.argv[2], 'wt', encoding='utf-8') as f:
    json.dump({'boundary': h.boundary, 'districts': h.districts, 'ways': h.ways, 'source': 'OpenStreetMap / BBBike Lyon — https://download.bbbike.org/osm/bbbike/Lyon/', 'sourceDate': sys.argv[3] if len(sys.argv)>3 else datetime.datetime.now(datetime.timezone.utc).isoformat()}, f, separators=(',',':'))
print(f'{len(h.ways)} voies OSM extraites avec la frontière administrative de Lyon.')
