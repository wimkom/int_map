const fs = require('fs');

const staData = JSON.parse(fs.readFileSync('./public/sta_labels.geojson', 'utf8'));
const roadData = JSON.parse(fs.readFileSync('./public/road_line.geojson', 'utf8'));

// Extract base road coordinates from sta_labels
const baseCoords = [];
const staPoints = staData.features.filter(f => f.geometry.type === 'Point');

// Sort by the STA name assuming it's sequential like "0.1", "0.2"
// Actually they are already ordered in the file.
for (const pt of staPoints) {
    baseCoords.push(pt.geometry.coordinates);
}

// Save base road
const baseRoadFeature = {
    type: "Feature",
    properties: { name: "Base Road" },
    geometry: {
        type: "LineString",
        coordinates: baseCoords
    }
};
fs.writeFileSync('./public/base_road.geojson', JSON.stringify({
    type: "FeatureCollection",
    features: [baseRoadFeature]
}));

// Function to find closest index in baseCoords
function findClosestIndex(targetCoord) {
    let minD = Infinity;
    let minIdx = -1;
    for (let i = 0; i < baseCoords.length; i++) {
        const c = baseCoords[i];
        const dx = c[0] - targetCoord[0];
        const dy = c[1] - targetCoord[1];
        const d = dx*dx + dy*dy;
        if (d < minD) {
            minD = d;
            minIdx = i;
        }
    }
    return minIdx;
}

// Fix handling lines
const fixedFeatures = [];
for (const feat of roadData.features) {
    if (feat.geometry.type === 'LineString' && feat.geometry.coordinates.length === 2) {
        const startCoord = feat.geometry.coordinates[0];
        const endCoord = feat.geometry.coordinates[1];
        
        const idx1 = findClosestIndex(startCoord);
        const idx2 = findClosestIndex(endCoord);
        
        const startIdx = Math.min(idx1, idx2);
        const endIdx = Math.max(idx1, idx2);
        
        const newCoords = baseCoords.slice(startIdx, endIdx + 1);
        
        fixedFeatures.push({
            ...feat,
            geometry: {
                type: 'LineString',
                coordinates: newCoords.length >= 2 ? newCoords : feat.geometry.coordinates
            }
        });
    } else {
        fixedFeatures.push(feat);
    }
}

fs.writeFileSync('./public/fixed_road_line.geojson', JSON.stringify({
    type: "FeatureCollection",
    features: fixedFeatures
}));

console.log("Processed successfully!");
