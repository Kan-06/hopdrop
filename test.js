const REGION_BOUNDS = { minLat: 12.80, maxLat: 13.35, minLon: 74.70, maxLon: 75.15 };
async function fetchSuggestions(query) {
    const bbox = `${REGION_BOUNDS.minLon},${REGION_BOUNDS.minLat},${REGION_BOUNDS.maxLon},${REGION_BOUNDS.maxLat}`;
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${bbox}&limit=10`;
    const res = await fetch(url);
    const rawData = await res.json();
    const data = rawData.features.map(f => {
        const p = f.properties;
        const parts = [p.name, p.street, p.city, p.county, p.state].filter(Boolean);
        return {
            display_name: Array.from(new Set(parts)).join(', '),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0]
        };
    });
    console.log(data);
}
fetchSuggestions('nitte karkala');
