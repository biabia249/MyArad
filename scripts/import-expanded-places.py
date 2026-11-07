#!/usr/bin/env python3
"""Merge locally downloaded public-source snapshots; preserve existing stable IDs.
Inputs are JSON snapshots in --input-dir, normally /tmp during this import.
No generated photos, fabricated contacts, or copied long tourism descriptions.
"""
import argparse,collections,datetime,difflib,json,math,pathlib,unicodedata
p=argparse.ArgumentParser();p.add_argument('--input-dir',default='/tmp');args=p.parse_args();inputs=pathlib.Path(args.input_dir)
root=pathlib.Path(__file__).resolve().parents[1];target=root/'server/data-sources/places.json';places=json.loads(target.read_text());added=[];merged=[]
def normalize(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower().replace('din arad','').replace('arad','')) if c.isalnum())
def distance(a,b):return math.hypot((a['lat']-b['lat'])*111000,(a['lng']-b['lng'])*77000)
def merge(item):
 old=next((p for p in places if p['id']==item['id']),None)
 if not old:
  old=next((p for p in places if distance(p,item)<160 and (normalize(p['name'])==normalize(item['name']) or difflib.SequenceMatcher(None,normalize(p['name']),normalize(item['name'])).ratio()>.84)),None)
 if old:
  old['tags']=sorted(set(t for t in old.get('tags',[])+item.get('tags',[]) if isinstance(t,str) and t))
  old['sources']=sorted(set(old.get('sources',[old['source']])+[item['source']]))
  for k in ['address','phone','website','hours','image','photos','image_source','image_credit','source_label']:
   if item.get(k) and not old.get(k):old[k]=item[k]
  if item['category'] in ['sport','health','entertainment']:old['category']=item['category']
  merged.append(item['id']);return
 places.append(item);added.append(item['id'])
def base(id,name,lat,lng,category,source,tags,**extra):
 return dict(id=id,name=name,lat=float(lat),lng=float(lng),category=category,address='',description='',phone='',website='',hours='',image='',wikipedia='',source=source,tags=tags,**extra)
def classify(t):
 a=t.get('amenity','');l=t.get('leisure','');s=t.get('sport','');name=t.get('name','').lower()
 if a in ['university','college']:return 'education'
 if a in ['clinic','hospital','doctors','dentist']:return 'health'
 if a=='nightclub':return 'nightlife'
 if l=='park':return 'park'
 if l in ['escape_game','amusement_arcade','bowling_alley'] or any(x in s for x in ['bowling','billiards']):return 'entertainment'
 if s or l in ['fitness_centre','sports_centre','sports_hall','pitch','dance','swimming_pool'] or t.get('club') in ['sport','sports']:return 'sport'
 if a in ['theatre','cinema']:return 'culture'
 return None
sport_names={'soccer':'Teren de fotbal','basketball':'Teren de baschet','tennis':'Teren de tenis','volleyball':'Teren de volei','handball':'Teren de handbal','multi':'Teren multisport'}
f=inputs/'myarad-expanded-osm.json'
if f.exists():
 for e in json.loads(f.read_text()).get('elements',[]):
  t=e.get('tags',{});c=e.get('center',e);cat=classify(t);name=t.get('name','')
  if not cat or 'lat' not in c or 'lon' not in c:continue
  if not name:
   if t.get('leisure')!='pitch' or t.get('access')=='private':continue
   name=sport_names.get(t.get('sport'),'Teren de sport')
  if 'sexi club' in name.lower():continue
  item=base(e['type']+'/'+str(e['id']),name,c['lat'],c['lon'],cat,'https://www.openstreetmap.org/'+e['type']+'/'+str(e['id']),[str(t[k]) for k in ['sport','leisure','amenity','club','healthcare','healthcare:speciality','operator'] if t.get(k)],source_label='OpenStreetMap')
  item.update(address=' '.join(filter(None,[t.get('addr:street'),t.get('addr:housenumber')])),phone=t.get('contact:phone',t.get('phone','')),website=t.get('contact:website',t.get('website','')),hours=t.get('opening_hours',''),wikipedia=t.get('wikipedia',''),access=t.get('access','unknown'))
  if t.get('image','').startswith('https://'):item.update(image=t['image'],image_source=item['source'],image_credit='OpenStreetMap · fișa locației')
  merge(item)
for f in sorted(inputs.glob('myarad-expand-*.json')):
 for e in json.loads(f.read_text()):
  name=e.get('name','');t=e.get('extratags') or {};a=e.get('address') or {};kind=e.get('type','');tags={**t,'name':name,e.get('category',e.get('class','amenity')):kind};cat=classify(tags)
  if not name or not cat:continue
  item=base(e['osm_type']+'/'+str(e['osm_id']),name,e['lat'],e['lon'],cat,'https://www.openstreetmap.org/'+e['osm_type']+'/'+str(e['osm_id']),[kind]+[v for k,v in t.items() if k in ['sport','healthcare:speciality']],source_label='OpenStreetMap')
  item.update(address=' '.join(filter(None,[a.get('road'),a.get('house_number')])),phone=t.get('phone',t.get('contact:phone','')),website=t.get('website',t.get('contact:website','')),hours=t.get('opening_hours',''))
  merge(item)
categories={'Hoteluri':'stay','Pensiuni':'stay','Motel':'stay','Camping':'stay','Restaurant':'food','Pizzerie':'food','Fast food':'food','Bistro':'food','Cafenea':'cafe','Cofetărie':'cafe','Pub':'nightlife','Clubbing':'nightlife','Cinema':'entertainment','Teatru':'culture','Muzee și Case memoriale':'culture','Ștranduri':'sport','Agrement și relaxare':'entertainment','Lacul Ghioroc':'park','Parcul Natural Lunca Mureșului':'park','Formațiuni naturale':'park'}
f=inputs/'myarad-tourism-data.json'
if f.exists():
 for e in json.loads(f.read_text()):
  lat=e.get('latitude');lng=e.get('longitude')
  if not isinstance(lat,(int,float)) or not isinstance(lng,(int,float)) or not(45.8<lat<46.9 and 20.5<lng<23):continue
  cat=categories.get(e.get('category'),'landmark');photo=[u for u in e.get('photos',[]) if u.startswith('https://')]
  item=base('visitarad/'+str(e['id']),e['name'],lat,lng,cat,e['source_url'],[e.get('category',''),e.get('locality',''),e.get('area','')],source_label='VisitArad / CNIPT · Hack4Arad',locality=e.get('locality',''),source_retrieved_at=e.get('retrieved_at',''),photos=photo,coordinate_status='source-unverified')
  item.update(address=e.get('address') or '',website=e.get('website') or '',image=photo[0] if photo else '',image_source=e['source_url'],image_credit='VisitArad / CNIPT Arad · fișa locației')
  merge(item)
places.sort(key=lambda p:(p['category'],p['name'].casefold(),p['id']))
target.write_text(json.dumps(places,ensure_ascii=False,indent=2)+'\n')
report={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'total':len(places),'added':len(added),'merged':len(merged),'categories':dict(collections.Counter(p['category'] for p in places)),'photosAvailable':sum(bool(p['image']) for p in places),'photoChecks':'Pending HTTP and visual review; source association alone is not visual verification.','sources':['https://baditaflorin.github.io/hack4arad-turism-arad/','https://www.visitarad.ro/','https://www.openstreetmap.org/copyright'],'notes':['Metadata/photo links imported; long VisitArad descriptions are not copied.','Source photo rights are retained by their respective owners.','Geographic coordinates are source positions, not field-verified entrances.']}
(root/'server/data-sources/expansion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
