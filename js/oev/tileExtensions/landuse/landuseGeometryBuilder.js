import GLOBE from '../../globe.js';

function addVerticesToBuffer(_buffer, _positions, _offset, _elevationsDatas, _elevationOffset) {
    for (let p = 0; p < _positions.length; p ++) {
        const point = _positions[p];
        const vertPos = GLOBE.coordToXYZ(
            point[0], 
            point[1], 
            _elevationOffset + _elevationsDatas[p]
        );
        _buffer[_offset + 0] = vertPos.x;
        _buffer[_offset + 1] = vertPos.y;
        _buffer[_offset + 2] = vertPos.z;
        _offset += 3;
    }
    return _offset;
}

function addUvToBuffer(_buffer, _positions, _offset, _uvFactor, _tile) {
    for (let p = 0; p < _positions.length; p ++) {
        const point = _positions[p];
        let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
        let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
        _buffer[_offset + 0] = uvX * _uvFactor;
        _buffer[_offset + 1] = uvY * _uvFactor;
        _offset += 3;
    }
    return _offset;
}

export function createLanduseGeometry(_landuse, _layerInfos, _elevationsDatas, _facesIndex, _tile) {
    let lastMaterialLayer = 0;
    let layersBuffers = [];
    let curLayerBuffersGeos = [];

    for (let layer = 0; layer < _layerInfos.nbLayers; layer ++) {
        const layerGroundElevation = _layerInfos.groundOffset + (layer * _layerInfos.meterBetweenLayers);
        
        let verticesNb = _landuse.border.length + _landuse.holes.length + _landuse.fillPoints.length;
        const bufferVertices = new Float32Array(verticesNb * 3);
        const bufferUvs = new Float32Array(verticesNb * 2);
        let facesNb = _facesIndex.length;
        const bufferFaces = new Uint32Array(facesNb * 3);

        let verticeId = 0;
        verticeId = addVerticesToBuffer(bufferVertices, _landuse.border, verticeId, _elevationsDatas.border, layerGroundElevation);
        verticeId = addVerticesToBuffer(bufferVertices, _landuse.fillPoints, verticeId, _elevationsDatas.fill, layerGroundElevation);
        _landuse.holes.forEach((hole, h) => {
            verticeId = addVerticesToBuffer(bufferVertices, hole, verticeId, _elevationsDatas.holes[h], layerGroundElevation);
        });
        
        let uvId = 0;
        uvId = addUvToBuffer(bufferUvs, _landuse.border, uvId, _layerInfos.uvFactor, _tile);
        uvId = addUvToBuffer(bufferUvs, _landuse.fillPoints, uvId, _layerInfos.uvFactor, _tile);
        _landuse.holes.forEach((hole, h) => {
            uvId = addUvToBuffer(bufferUvs, hole, uvId, _layerInfos.uvFactor, _tile);
        });

        let faceId = 0;
        _facesIndex.forEach(t => {
            const points = t.getPoints();
            bufferFaces[faceId + 0] = points[0].id;
            bufferFaces[faceId + 1] = points[1].id;
            bufferFaces[faceId + 2] = points[2].id;
            faceId += 3;
        });

        const geoBuffer = new THREE.BufferGeometry();
        geoBuffer.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        geoBuffer.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		geoBuffer.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
        geoBuffer.computeFaceNormals();
        geoBuffer.computeVertexNormals();

        const curLayerMap = Math.floor(layer / _layerInfos.layersByMap);
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
            layersBuffers.push(mergedLayersBuffer);
            curLayerBuffersGeos = [];
        }
        curLayerBuffersGeos.push(geoBuffer);
    }
    const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
    layersBuffers.push(mergedLayersBuffer);
    return layersBuffers;
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}