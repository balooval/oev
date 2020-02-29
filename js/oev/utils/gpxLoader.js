import Renderer from '../renderer.js';
import GLOBE from '../globe.js';

function load(_url) {
    fetch(_url)
    .then(res => res.text())
    .then(text => onGpxLoaded(text));
}

function onGpxLoaded(_gpx) {
    var gpx = new gpxParser();
    gpx.parse(_gpx);
    const pathCoords = getPathPoints(gpx.tracks[0].points);
    const geometry = new THREE.BufferGeometry().setFromPoints(pathCoords);
    var material = new THREE.LineBasicMaterial({color: 0x0000ff});
    const line = new THREE.Line(geometry, material);
    // console.log(pathCoords);
    Renderer.scene.add(line);
    // return line;
}

function getPathPoints(_points) {
    return _points.map(point => GLOBE.coordToXYZ(point.lon, point.lat, point.ele));
}

export {load} 