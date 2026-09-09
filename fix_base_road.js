const fs = require('fs');

const staData = JSON.parse(fs.readFileSync('./public/sta_labels.geojson', 'utf8'));
const roadData = JSON.parse(fs.readFileSync('./public/road_line.geojson', 'utf8'));

const baseCoords = [];
const staPoints = staData.features.filter(f => f.geometry.type === 'Point');

// Find STA 00+000 from roadData
const sta0 = roadData.features.find(f => f.geometry.type === 'Point' && f.properties.name === '00+000');
if (sta0) {
    baseCoords.push(sta0.geometry.coordinates);
}

// Add the rest
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

console.log("Updated base road with STA 0");
