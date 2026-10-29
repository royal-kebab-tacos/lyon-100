"""Developer-only IGN acquisition. Public OSM samples, resumable, <=2 requests/s.
Never called by install/build, never send activity or user-selected coordinates.
"""
import json,pathlib,urllib.request,time,datetime
points=json.loads(pathlib.Path('.osm-cache/elevation-points.json').read_text())
path=pathlib.Path('.osm-cache/elevation-values.json')
values=json.loads(path.read_text()) if path.exists() else {}
missing=[p for p in points['points'] if p not in values]
for offset in range(0,len(missing),1000):
 batch=missing[offset:offset+1000];coords=[p.split(',') for p in batch]
 payload={'lon':'|'.join(p[0] for p in coords),'lat':'|'.join(p[1] for p in coords),'resource':'ign_rge_alti_wld','delimiter':'|','zonly':'true','measures':'false','indent':'false'}
 for attempt in range(3):
  try:
   req=urllib.request.Request('https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Accept':'application/json'})
   with urllib.request.urlopen(req,timeout=45) as response: zs=json.load(response)['elevations']
   if len(zs)!=len(batch): raise ValueError('Wrong point count')
   for key,z in zip(batch,zs): values[key]=round(z,1) if isinstance(z,(int,float)) and -100<z<1000 else None
   path.write_text(json.dumps(values,separators=(',',':')))
   print(f'{offset+len(batch)}/{len(missing)}',flush=True);time.sleep(.5);break
  except Exception:
   if attempt==2: raise
   time.sleep(2*(attempt+1))
output={'schemaVersion':1,'sourceHash':points['sourceHash'],'source':'IGN RGE ALTI / Géoplateforme — Licence Ouverte 2.0','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'values':{p:values[p] for p in points['points']}}
pathlib.Path('.osm-cache/elevation.json').write_text(json.dumps(output,separators=(',',':')))
print('Complete',len(output['values']),flush=True)
