import { mkdir, writeFile } from 'node:fs/promises';
const source = 'https://data.gov.ro/dataset/69392a50-5750-4a54-90c1-d461de44da6d/resource/280d52b6-4c5e-489d-9b48-3dd8961f56e0/download/101_claudia.teodorescu_2025-10-08-14_26_03.055.xlsx';
const directory = new URL('../server/data-sources/schools/', import.meta.url);
await mkdir(directory, { recursive: true });
const response = await fetch(source);
if (!response.ok) throw new Error(`Official network unavailable: HTTP ${response.status}`);
await writeFile(new URL('network-2025-2026.xlsx', directory), Buffer.from(await response.arrayBuffer()));
console.log('Downloaded official 2025–2026 school network.');
