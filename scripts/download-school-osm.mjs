import { createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
const output = join(tmpdir(), 'myarad-romania-schools.osm.pbf');
try { if ((await stat(output)).size > 300000000) { console.log(output); process.exit(0); } } catch {}
const response = await fetch('https://download.geofabrik.de/europe/romania-latest.osm.pbf');
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
await pipeline(Readable.fromWeb(response.body), createWriteStream(output));
console.log(output);
