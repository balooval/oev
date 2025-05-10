import {
    BufferAttribute,
    BufferGeometry,
} from 'three';
import {GLOBE} from '../../core/globe.js';

export function buildLanduseGeometry(_landuse, _facesIndex, _elevationsDatas, _tile) {
    const bufferGeometry = new BufferGeometry();

    const uvFactor = 2;

    const layerGroundElevation = 10;
    let verticesNb = _landuse.border.length + _landuse.fillPoints.length;
    _landuse.holes.forEach(hole => verticesNb += hole.length);
    
    const bufferVertices = new Float32Array(verticesNb * 3);
    let verticeOffset = 0;
    verticeOffset = addVerticesToBuffer(verticeOffset, bufferVertices, _landuse.border, _elevationsDatas.border, layerGroundElevation);
    
    const bufferUvs = new Float32Array(verticesNb * 2);
    let uvOffset = 0;
    uvOffset = addUvToBuffer(uvOffset, bufferUvs, _landuse.border, uvFactor, _tile);

    for (let h = 0; h < _landuse.holes.length; h ++) {
        verticeOffset = addVerticesToBuffer(verticeOffset, bufferVertices, _landuse.holes[h], _elevationsDatas.holes[h], layerGroundElevation);
        uvOffset = addUvToBuffer(uvOffset, bufferUvs, _landuse.holes[h], uvFactor, _tile);
    }

    verticeOffset = addVerticesToBuffer(verticeOffset, bufferVertices, _landuse.fillPoints, _elevationsDatas.fill, layerGroundElevation);
    uvOffset = addUvToBuffer(uvOffset, bufferUvs, _landuse.fillPoints, uvFactor, _tile);


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

    bufferGeometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
    bufferGeometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeVertexNormals();
    
    return bufferGeometry;
}

function addVerticesToBuffer(_offset, _buffer, _positions, _elevationsDatas, _elevationOffset) {
    for (let i = 0; i < _positions.length; i ++) {
        const point = _positions[i];
        const vertPos = GLOBE.coordToXYZ(
            point[0], 
            point[1], 
            _elevationOffset + _elevationsDatas[i]
        );
        _buffer[_offset + 0] = vertPos[0];
        _buffer[_offset + 1] = vertPos[1];
        _buffer[_offset + 2] = vertPos[2];
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