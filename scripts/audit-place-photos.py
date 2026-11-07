#!/usr/bin/env python3
"""Check source image URLs; HTTP success does not certify visual content or rights."""
import concurrent.futures,json,pathlib,urllib.request
root=pathlib.Path(__file__).resolve().parents[1];places=json.loads((root/'server/data-sources/places.json').read_text())
def check(url):
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'MyArad/1.0 place-photo-link-audit'},method='HEAD')
  with urllib.request.urlopen(req,timeout=8) as r:
   mime=r.headers.get('Content-Type','').split(';')[0]
   return {'url':url,'status':r.status,'imageResponse':mime.startswith('image/'),'contentType':mime}
 except Exception as e:return {'url':url,'error':str(e),'imageResponse':False}
urls=sorted(set(p['image'] for p in places if p.get('image')))
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:checks=list(pool.map(check,urls))
report={'places':len(places),'withPhoto':sum(bool(p.get('image')) for p in places),'missingPhoto':[{'id':p['id'],'name':p['name']} for p in places if not p.get('image')],'checks':checks,'note':'Source association only. HTTP failures may be temporary or hotlink protection. All photos have NOT been individually visually verified.'}
(root/'server/data-sources/photo-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'places':len(places),'withPhoto':report['withPhoto'],'withoutPhoto':len(report['missingPhoto']),'uniqueURLs':len(checks),'imageResponses':sum(c['imageResponse'] for c in checks)}))
