"""Prepare an independent routing snapshot, never replace the scoring snapshot.
Usage: python3 scripts/extract-routing-pbf.py input.osm.pbf output.json.gz
Requires pyosmium (python3 -m pip install osmium). Output is atomic: truncated
PBFs, missing administrative boundaries and bad node locations are rejected.
"""
import sys, json, gzip, hashlib, os
import osmium

class ExtractRouting(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.boundary = None
        self.ways = []
        self.nodes = {}
        self.relations = []
        self.factory = osmium.geom.GeoJSONFactory()

    def area(self, area):
        if area.tags.get('ref:INSEE') == '69123' and area.tags.get('boundary') == 'administrative':
            self.boundary = json.loads(self.factory.create_multipolygon(area))

    def node(self, node):
        tags = dict(node.tags)
        if any(k in ('barrier', 'locked', 'opening_hours', 'seasonal') or k.startswith(('foot', 'access')) for k in tags):
            self.nodes[str(node.id)] = tags

    def way(self, way):
        if way.tags.get('highway') not in ('residential', 'living_street', 'pedestrian', 'unclassified', 'tertiary', 'secondary', 'primary', 'service', 'footway', 'path', 'steps', 'cycleway', 'track'):
            return
        if len(way.nodes) < 2:
            return
        if not all(n.location.valid() for n in way.nodes):
            raise ValueError('Missing OSM node locations; routing snapshot rejected')
        self.ways.append({'id': str(way.id), 'tags': dict(way.tags), 'nodes': [str(n.ref) for n in way.nodes], 'coordinates': [[round(n.lon, 7), round(n.lat, 7)] for n in way.nodes]})

    def relation(self, relation):
        if relation.tags.get('type', '').startswith('restriction'):
            kinds = {'n': 'node', 'w': 'way', 'r': 'relation'}
            self.relations.append({'id': str(relation.id), 'tags': dict(relation.tags), 'members': [{'type': kinds[m.type], 'ref': str(m.ref), 'role': m.role} for m in relation.members]})


def main(path, target):
    reader = osmium.io.Reader(path)
    date = reader.header().get('osmosis_replication_timestamp')
    reader.close()
    if not date:
        raise ValueError('OSM source timestamp missing')
    h = ExtractRouting()
    h.apply_file(path, locations=True, idx='flex_mem')
    if not h.boundary or not h.ways:
        raise ValueError('Lyon boundary or routing ways missing')
    with open(path, 'rb') as f:
        pbf_hash = hashlib.file_digest(f, 'sha256').hexdigest()
    raw = {'source': 'OpenStreetMap / BBBike Lyon — https://download.bbbike.org/osm/bbbike/Lyon/', 'sourceDate': date, 'pbfSha256': pbf_hash, 'boundary': h.boundary, 'ways': h.ways, 'nodeTags': h.nodes, 'relations': h.relations}
    os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
    with gzip.open(target + '.tmp', 'wt', encoding='utf-8') as f:
        json.dump(raw, f, separators=(',', ':'))
    os.replace(target + '.tmp', target)
    print(json.dumps({'sourceDate': date, 'ways': len(h.ways), 'taggedNodes': len(h.nodes), 'relations': len(h.relations), 'pbfSha256': pbf_hash}))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
