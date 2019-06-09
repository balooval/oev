import GLOBE from '../../globe.js';
import * as CacheGeometry from '../../utils/cacheGeometry.js';

export function buildLanduseGeometry(_landuse, _layerInfos, _facesIndex, _elevationsDatas, _tile) {
    let lastMaterialLayer = 0;
    let layersBuffers = [];
    let curLayerBuffersGeos = [];

    for (let layer = 0; layer < _layerInfos.nbLayers; layer ++) {
        const layerGroundElevation = _layerInfos.groundOffset + (layer * _layerInfos.meterBetweenLayers);
        const bufferGeometry = CacheGeometry.getGeometry();
        let verticesNb = _landuse.border.length + _landuse.fillPoints.length;
        _landuse.holes.forEach(hole => verticesNb += hole.length);
        const bufferVertices = new Float32Array(verticesNb * 3);
        let verticeId = 0;
        verticeId = addVerticesToBuffer(verticeId, bufferVertices, _landuse.border, _elevationsDatas.border, layerGroundElevation);
        _landuse.holes.forEach((hole, h) => {
            verticeId = addVerticesToBuffer(verticeId, bufferVertices, hole, _elevationsDatas.holes[h], layerGroundElevation);
        });
        verticeId = addVerticesToBuffer(verticeId, bufferVertices, _landuse.fillPoints, _elevationsDatas.fill, layerGroundElevation);
        const bufferUvs = new Float32Array(verticesNb * 2);
        let uvId = 0;
        uvId = addUvToBuffer(uvId, bufferUvs, _landuse.border, _layerInfos.uvFactor, _tile);
        _landuse.holes.forEach(hole => {
            uvId = addUvToBuffer(uvId, bufferUvs, hole, _layerInfos.uvFactor, _tile);
        });
        uvId = addUvToBuffer(uvId, bufferUvs, _landuse.fillPoints, _layerInfos.uvFactor, _tile);
        const facesNb = _facesIndex.length;
        const bufferFaces = new Uint32Array(facesNb * 3);
        let facesId = 0;

        for (let i = 0; i < _facesIndex.length; i ++) {
            const t = _facesIndex[i];
            const points = t.getPoints();
            bufferFaces[facesId + 0] = points[0].id;
            bufferFaces[facesId + 1] = points[1].id;
            bufferFaces[facesId + 2] = points[2].id;
            facesId += 3;
        }
        bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
        const curLayerMap = Math.floor(layer / _layerInfos.layersByMap);
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
            layersBuffers.push(mergedLayersBuffer);
            CacheGeometry.storeGeometries(curLayerBuffersGeos);
            curLayerBuffersGeos = [];
        }
        curLayerBuffersGeos.push(bufferGeometry);
    }
    const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
    CacheGeometry.storeGeometries(curLayerBuffersGeos);
    curLayerBuffersGeos = [];
    layersBuffers.push(mergedLayersBuffer);
    return layersBuffers;
}

function addVerticesToBuffer(_offset, _buffer, _positions, _elevationsDatas, _elevationOffset) {
    for (let i = 0; i < _positions.length; i ++) {
        const point = _positions[i];
        const vertPos = GLOBE.coordToXYZ(
            point[0], 
            point[1], 
            _elevationOffset + _elevationsDatas[i]
        );
        _buffer[_offset + 0] = vertPos.x;
        _buffer[_offset + 1] = vertPos.y;
        _buffer[_offset + 2] = vertPos.z;
        _offset += 3;
    }
    return _offset;
}

function addUvToBuffer(_offset, _buffer, _positions, _uvFactor, _tile) {
    for (let i = 0; i < _positions.length; i ++) {
        const point = _positions[i];
        let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
        let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
        _buffer[_offset + 0] = uvX * _uvFactor;
        _buffer[_offset + 1] = uvY * _uvFactor;
        _offset += 2;
    }
    return _offset;
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}