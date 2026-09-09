const fs = require('fs');
const geojson = JSON.parse(fs.readFileSync('public/sta_labels.geojson', 'utf8'));

// Get features that are points
const features = geojson.features.filter(f => f.geometry && f.geometry.type === 'Point');

const types = ["Rekonstruksi", "Patching", "Overlay", "Jembatan"];
const statuses = ["Belum Mulai", "Sedang Berjalan", "Selesai"];
const contractors = ["PT. Maju Bersama", "Swakelola", "PT. Lintas Sumatra", "PT. Bangun Negeri"];

const mockProjects = [];

// Pick 5 random features to be our mock projects
const numProjects = 8;
for (let i = 0; i < numProjects; i++) {
    const idx = Math.floor(features.length / numProjects) * i + Math.floor(Math.random() * 10);
    if (idx < features.length) {
        const feat = features[idx];
        const lng = feat.geometry.coordinates[0];
        const lat = feat.geometry.coordinates[1];
        
        mockProjects.push({
            id: `P${i+1}`,
            lat: lat,
            lng: lng,
            sta: feat.properties.name || `KM ${120 + i*10}`,
            type: types[i % types.length],
            progress: statuses[i % statuses.length] === 'Selesai' ? 100 : (statuses[i % statuses.length] === 'Belum Mulai' ? 0 : Math.floor(Math.random() * 80) + 10),
            contractor: contractors[i % contractors.length],
            status: statuses[i % statuses.length]
        });
    }
}

const tsContent = `export interface ProjectPoint {
  id: string;
  lat: number;
  lng: number;
  sta: string;
  type: "Rekonstruksi" | "Patching" | "Overlay" | "Jembatan";
  progress: number;
  contractor: string;
  status: "Belum Mulai" | "Sedang Berjalan" | "Selesai";
}

export const MOCK_PROJECTS: ProjectPoint[] = ${JSON.stringify(mockProjects, null, 2)};
`;

fs.writeFileSync('src/data/mockData.ts', tsContent);
console.log('Updated mockData.ts with actual STA coordinates');
