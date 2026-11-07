import { readFile, writeFile } from "node:fs/promises";

const DATA_URL =
  "https://raw.githubusercontent.com/baditaflorin/hack4arad-turism-arad/main/data/locations.json";
const OUTPUT = new URL("../server/data-sources/places.json", import.meta.url);

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function categoryFor(place) {
  const category = normalize(place.category);
  if (/restaurant|pizzerie|fast food|bistro/.test(category)) return "food";
  if (/cafenea|cofetarie/.test(category)) return "cafe";
  if (/pub|clubbing/.test(category)) return "nightlife";
  if (/muzee|cinema|teatru/.test(category)) return "culture";
  if (/natur|lac|strand|agrement|statiunea|bai/.test(category)) return "park";
  return "landmark";
}

const englishKind = {
  food: "food and hospitality venue",
  cafe: "café",
  nightlife: "leisure venue",
  culture: "cultural attraction",
  park: "outdoor and recreation destination",
  landmark: "visitor destination",
};

function convert(place) {
  const category = categoryFor(place);
  const descriptionRo =
    place.description?.trim() ||
    `${place.name} este un obiectiv din categoria „${place.category}”, situat în ${place.locality}, județul Arad. Adresa înregistrată este ${place.address}. Datele sunt furnizate de CNIPT Arad / visitarad.ro.`;
  const descriptionEn = `${place.name} is a ${englishKind[category]} in ${place.locality}, Arad County. It is listed at ${place.address}. The location data is provided by CNIPT Arad / visitarad.ro; consult the original listing for current visitor information.`;
  return {
    id: `cnipt/${place.id}`,
    name: place.name,
    name_en: place.name,
    lat: place.latitude,
    lng: place.longitude,
    category,
    address: place.address,
    phone: "",
    website: place.website || place.facebook || "",
    hours: "",
    tags: [place.type, place.category, place.locality].filter(Boolean),
    source: place.source_url,
    description: descriptionEn,
    description_ro: descriptionRo,
    description_en: descriptionEn,
    image: place.photos[0],
    image_source: place.source_url,
    image_credit: "CNIPT Arad / visitarad.ro",
    image_license: "Drepturile aparțin proprietarului imaginii",
    cnipt_source: place.source_url,
    cnipt_photos: place.photos,
    locality: place.locality,
    retrieved_at: place.retrieved_at,
  };
}

const response = await fetch(DATA_URL);
if (!response.ok) throw new Error(`CNIPT dataset request failed: ${response.status}`);
const incoming = await response.json();
const existing = JSON.parse(await readFile(OUTPUT, "utf8")).filter(
  (place) => !String(place.id).startsWith("cnipt/"),
);
const byName = new Map(existing.map((place, index) => [normalize(place.name), index]));
const claimedExisting = new Set();
let merged = 0;

for (const sourcePlace of incoming) {
  if (
    !sourcePlace.name ||
    !Number.isFinite(sourcePlace.latitude) ||
    !Number.isFinite(sourcePlace.longitude) ||
    !sourcePlace.source_url ||
    !sourcePlace.photos?.[0]
  )
    continue;
  const place = convert(sourcePlace);
  const index = byName.get(normalize(place.name));
  if (index === undefined || claimedExisting.has(index)) {
    existing.push(place);
  } else {
    const current = existing[index];
    existing[index] = {
      ...current,
      address: current.address || place.address,
      website: current.website || place.website,
      description_ro: place.description_ro,
      description_en: current.description_en || place.description_en,
      description: current.description || place.description,
      image: place.image,
      image_source: place.image_source,
      image_credit: place.image_credit,
      image_license: place.image_license,
      cnipt_source: place.cnipt_source,
      cnipt_photos: place.cnipt_photos,
      locality: place.locality,
      retrieved_at: place.retrieved_at,
    };
    claimedExisting.add(index);
    merged++;
  }
}

await writeFile(OUTPUT, `${JSON.stringify(existing, null, 2)}\n`);
console.log(
  `Imported ${incoming.length} CNIPT records: ${merged} merged, ${existing.length} total places.`,
);
