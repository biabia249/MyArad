#!/usr/bin/env python3
"""Move only points outside their own mapped footprint; never geocode a road centre.
Inputs: Overpass `out geom` snapshots. Holes are excluded. Entrances are NOT inferred.
"""
import argparse,json,pathlib,math,re
parser=argparse.ArgumentParser();parser.add_argument('snapshots',nargs='+');parser.add_argument('--write',action='store_true');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];folder=root/'server/data-sources';places=json.loads((folder/'places.json').read_text())
def stitch(parts):
 result=[]
 while parts:
  ring=parts.pop(0)[:]
  while ring and ring[-1]!=ring[0]:
   found=False
   for i,p in enumerate(parts):
    if ring[-1]==p[0]:ring+=p[1:];parts.pop(i);found=True;break
    if ring[-1]==p[-1]:ring+=list(reversed(p))[1:];parts.pop(i);found=True;break
   if not found:break
  if len(ring)>=4 and ring[0]==ring[-1]:result.append(ring)
 return result
def rings(e,role='outer'):
 if e['type']=='way':return stitch([[(g['lat'],g['lon']) for g in e.get('geometry',[]) if 'lat' in g]]) if role=='outer' else []
 return stitch([[(g['lat'],g['lon']) for g in m.get('geometry',[]) if 'lat'in g] for m in e.get('members',[]) if m.get('role')==role and m.get('geometry')])
def inside(p,ring):
 y,x=p;hit=False
 for (a,b),(c,d) in zip(ring,ring[1:]):
  if (a>y)!=(c>y) and x<(d-b)*(y-a)/(c-a)+b:hit=not hit
 return hit
def valid(p,outer,holes):return inside(p,outer) and not any(inside(p,h) for h in holes)
def anchor(outer,holes):
 ys=sorted(set(p[0] for r in [outer]+holes for p in r));best=None
 for y in [(a+b)/2 for a,b in zip(ys,ys[1:]) if b-a>1e-9]:
  xs=sorted(b+(d-b)*(y-a)/(c-a) for ring in [outer]+holes for (a,b),(c,d) in zip(ring,ring[1:]) if (a>y)!=(c>y))
  for a,b in zip(xs,xs[1:]):
   p=(y,(a+b)/2)
   if valid(p,outer,holes) and (best is None or b-a>best[0]):best=(b-a,p)
 return best[1] if best else None
features={}
for f in args.snapshots:
 for e in json.loads(pathlib.Path(f).read_text())['elements']:
  if e['type'] in ['way','relation']:features[f"{e['type']}/{e['id']}"]=e
changes=[];verified=0
for place in places:
 candidates=[place['id']]+place.get('alias_ids',[])
 m=re.search(r'openstreetmap.org/(way|relation)/(\d+)',place.get('source',''))
 if m:candidates.append('/'.join(m.groups()))
 feature=next((features[k] for k in candidates if k in features),None)
 if not feature:continue
 outers=rings(feature);holes=rings(feature,'inner')
 if not outers:continue
 old=(place['lat'],place['lng'])
 outer=next((r for r in outers if inside(old,r)),max(outers,key=lambda r:abs(sum(a*d-c*b for (a,b),(c,d) in zip(r,r[1:])))))
 verified+=1
 source=f"https://www.openstreetmap.org/{feature['type']}/{feature['id']}"
 place['outline']=[list(p) for p in outer];place['geometry_source']=source
 if valid(old,outer,holes):continue
 point=anchor(outer,holes)
 if not point:continue
 metres=math.hypot((point[0]-old[0])*111000,(point[1]-old[1])*77000)
 if metres>1000:continue # An unexpectedly distant footprint needs human review.
 place['lat'],place['lng']=point;place['coordinate_status']='inside-source-footprint'
 changes.append({'id':place['id'],'name':place['name'],'from':list(old),'to':list(point),'metres':round(metres,1),'source':source})
report={'checkedFootprints':verified,'correctedOutsidePoints':len(changes),'changes':changes,'limitations':'OSM footprint checks, not survey/entrance verification. Points without an identifiable footprint remain unchanged. Campus boundaries may include open space.'}
if args.write:
 (folder/'places.json').write_text(json.dumps(places,ensure_ascii=False,indent=2)+'\n')
 catalogfile=folder/'schools/catalog.json'
 if catalogfile.exists():
  catalog=json.loads(catalogfile.read_text());index={p['id']:p for p in places}
  for school in catalog['schools']:
   p=index.get(school.get('mapped_place_id'))
   if p:school.update(lat=p['lat'],lng=p['lng'])
  catalogfile.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
 (folder/'coordinate-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
