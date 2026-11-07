"""Read official XLSX without extra dependencies; preserve source identifiers."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

folder = Path(__file__).resolve().parents[1] / 'server/data-sources/schools'
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for year in ['2025-2026']:
    with zipfile.ZipFile(folder / f'network-{year}.xlsx') as archive:
        strings = [''.join(n.itertext()) for n in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', ns)]
        rows = []
        for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('m:sheetData/m:row', ns):
            record = {}
            for cell in row:
                value = cell.find('m:v', ns)
                text = value.text if value is not None else ''
                if cell.get('t') == 's':
                    text = strings[int(text)]
                record[re.sub(r'\d', '', cell.get('r'))] = text
            rows.append(record)
        selected = [r for r in rows if r.get('B') == 'AR']
        (folder / f'network-{year}.json').write_text(json.dumps({'headers': rows[1], 'records': selected}, ensure_ascii=False, indent=2), encoding='utf-8')
        print(year, 'Arad records:', len(selected), 'columns:', rows[1])
