import GLOBE from '../../globe.js';

export function buildLanduseGeometry(_landuse, _layerInfos, _trianglesResult, _elevationsDatas, _tile) {
    let lastMaterialLayer = 0;
    let layersBuffers = [];
    let curLayerBuffersGeos = [];
    for (let layer = 0; layer < _layerInfos.nbLayers; layer ++) {
        const geometry = new THREE.Geometry();
        const uvDatas = [];
        const layerGroundElevation = _layerInfos.groundOffset + (layer * _layerInfos.meterBetweenLayers);
        geometry.faceVertexUvs[0] = [];
        addVerticesToGeometry(geometry, _landuse.border, _elevationsDatas.border, layerGroundElevation);
        addUvToGeometry(uvDatas, _landuse.border, _layerInfos.uvFactor, _tile);
        _landuse.holes.forEach((hole, h) => {
            addVerticesToGeometry(geometry, hole, _elevationsDatas.holes[h], layerGroundElevation);
            addUvToGeometry(uvDatas, hole, _layerInfos.uvFactor, _tile);
        });
        addVerticesToGeometry(geometry, _landuse.fillPoints, _elevationsDatas.fill, layerGroundElevation);
        addUvToGeometry(uvDatas, _landuse.fillPoints, _layerInfos.uvFactor, _tile);
        _trianglesResult.forEach(t => {
            const points = t.getPoints();
            geometry.faces.push(new THREE.Face3(points[0].id, points[1].id, points[2].id));
            geometry.faceVertexUvs[0].push([
                uvDatas[points[0].id], 
                uvDatas[points[1].id], 
                uvDatas[points[2].id], 
            ]);
        });
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        const curLayerMap = Math.floor(layer / _layerInfos.layersByMap);
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
            layersBuffers.push(mergedLayersBuffer);
            curLayerBuffersGeos = [];
        }
        const curBufferGeo = new THREE.BufferGeometry().fromGeometry(geometry);
        curLayerBuffersGeos.push(curBufferGeo);
    }
    const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
    layersBuffers.push(mergedLayersBuffer);
    return layersBuffers;
}

function addVerticesToGeometry(_geometry, _positions, _elevationsDatas, _elevationOffset) {
    _positions.forEach((point, i) => {
        const vertPos = GLOBE.coordToXYZ(
            point[0], 
            point[1], 
            _elevationOffset + _elevationsDatas[i]
        );
        _geometry.vertices.push(vertPos);
    });
}
    
function addUvToGeometry(uvDatas, _positions, _uvFactor, _tile) {
    _positions.forEach(point => {
        let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
        let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
        uvDatas.push(new THREE.Vector2(uvX * _uvFactor, uvY * _uvFactor));
    });
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}