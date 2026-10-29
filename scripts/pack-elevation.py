"""Archive only public IGN terrain elevations for the sampled OSM network."""
import json,pathlib,gzip,hashlib
root=pathlib.Path('data/routing');data=json.loads(pathlib.Path('.osm-cache/elevation.json').read_text());points=json.loads(pathlib.Path('.osm-cache/elevation-points.json').read_text())
assert data['sourceHash']==points['sourceHash'] and set(data['values'])==set(points['points'])
blob=gzip.compress(json.dumps(data,separators=(',',':'),ensure_ascii=False).encode(),mtime=0)
parts=[]
for i,offset in enumerate(range(0,len(blob),65536)):
 path=root/f'elevation-{i:03d}.bin';path.write_bytes(blob[offset:offset+65536]);parts.append(str(path))
manifest={'schemaVersion':1,'sha256':hashlib.sha256(blob).hexdigest(),'sourceHash':data['sourceHash'],'source':data['source'],'retrievedAt':data['retrievedAt'],'parts':parts,'points':len(data['values']),'missingPoints':sum(v is None for v in data['values'].values()),'sampleSpacingMeters':25,'documentation':'https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/'}
(root/'elevation-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n');print(len(blob),'bytes',len(parts),'parts')
