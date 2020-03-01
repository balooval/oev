import * as THREE from '../../vendor/three.module.js';
import * as Perlin from '../../vendor/perlin.module.js';
import * as BufferGeometryUtils from '../../vendor/BufferGeometryUtils.module.js';
import GLOBE from '../../core/globe.js';
import * as CacheGeometry from '../../utils/cacheGeometry.js';

export function buildLanduseGeometry(_landuse, _layerInfos, _facesIndex, _elevationsDatas, _tile) {
    let lastMaterialLayer = 0;
    let layersBuffers = [];
    let curLayerBuffersGeos = [];

    let bufferColor = null;

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
            // bufferFaces[facesId + 0] = t[0];
            // bufferFaces[facesId + 1] = t[1];
            // bufferFaces[facesId + 2] = t[2];
            const points = t.getPoints();
            bufferFaces[facesId + 0] = points[0].id;
            bufferFaces[facesId + 1] = points[1].id;
            bufferFaces[facesId + 2] = points[2].id;
            facesId += 3;
        }
        if (_layerInfos.vertexColor) {
            if (!bufferColor) {
                bufferColor = new Uint8Array(verticesNb * 3);
                Perlin.seed(Math.random());
                for (let i = 0; i < bufferVertices.length; i += 3) {
                    const value = perlinValue(bufferVertices[i + 0], bufferVertices[i + 1], bufferVertices[i + 2]);

                    if (_landuse.type == 'forest') {
                        bufferColor[i + 0] = Math.min(255, 50 + value * 150);
                        bufferColor[i + 1] = Math.min(255, 100 + value * 150);
                        bufferColor[i + 2] = 10 + value * 70;
                    } else {
                        bufferColor[i + 0] = Math.min(255, 100 + value * 120);
                        bufferColor[i + 1] = Math.min(255, 80 + value * 120);
                        bufferColor[i + 2] = 10 + value * 70;
                    }

                    // bufferColor[i + 0] = 255;
                    // bufferColor[i + 1] = 255;
                    // bufferColor[i + 2] = 255;
                }
            }
            bufferGeometry.setAttribute('color', new THREE.BufferAttribute(bufferColor, 3, true));
        }
        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();

        let curLayerMap = Math.floor(layer / _layerInfos.layersByMap);
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            const mergedLayersBuffer = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
            layersBuffers.push(mergedLayersBuffer);
            CacheGeometry.storeGeometries(curLayerBuffersGeos);
            curLayerBuffersGeos = [];
        }
        curLayerBuffersGeos.push(bufferGeometry);
    }
    const mergedLayersBuffer = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
    CacheGeometry.storeGeometries(curLayerBuffersGeos);
    curLayerBuffersGeos = [];
    layersBuffers.push(mergedLayersBuffer);
    return layersBuffers;
}

function perlinValue(_x, _y, _z) {
    let res = 0;
    let scale = 0.05;
    let factor = 1;
    for (let i = 0; i < 5; i ++) {
        const value = Perlin.simplex3(_x * scale, _y * scale, _z * scale);
        res += (value * factor);
        factor *= 0.6;
        scale *= 2;
    }
    return Math.max(0, Math.min(1, (res + 1) / 2));
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