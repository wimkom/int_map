const fs = require('fs');
const staData = JSON.parse(fs.readFileSync('./public/sta_labels.geojson', 'utf8'));
const roadData = JSON.parse(fs.readFileSync('./public/road_line.geojson', 'utf8'));

const sta0 = roadData.features.find(f => f.geometry.type === 'Point' && f.properties.name === '00+000');
if (sta0) {
    staData.features.unshift({
        type: 'Feature',
        properties: { name: 'STA 00+000 (Awal Ruas)' },
        geometry: sta0.geometry
    });
}
fs.writeFileSync('./public/sta_labels_full.geojson', JSON.stringify(staData));
console.log("Updated STA labels");
