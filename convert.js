const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
const toGeoJSON = require('@tmcw/togeojson');

function convertKml(inputFile, outputFile) {
    const kmlText = fs.readFileSync(inputFile, 'utf8');
    const kmlDoc = new DOMParser().parseFromString(kmlText, 'text/xml');
    const geojson = toGeoJSON.kml(kmlDoc);
    fs.writeFileSync(outputFile, JSON.stringify(geojson, null, 2));
    console.log(`Converted ${inputFile} to ${outputFile}`);
}

try {
    convertKml('KOORD/STA_1-4_label_only.kml', 'public/sta_labels.geojson');
    convertKml('KOORD/output_kml_updated_2.kml', 'public/road_line.geojson');
} catch (e) {
    console.error(e);
}
