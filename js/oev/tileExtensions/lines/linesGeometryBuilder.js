import GLOBE from '../../globe.js';
import ElevationStore from '../elevation/elevationStore.js';
import MATH from '../../utils/math.js';

export function buildGeometry(_line, _elevationsDatas, _tile) {
    const fullCoords = [];
    _line.border.forEach((coord, i) => {
        fullCoords.push([
            coord[0], 
            coord[1], 
            _elevationsDatas[i], 
        ]);
    });
    if (_line.type == 'fence') {
        return buildFence(fullCoords, _tile);
    } else if (_line.type == 'wall') {
        return buildWall(_line.border, _tile);
    }
}

function buildFence(_coords, _tile) {
    const verticesNb = _coords.length * 2;
    const bufferGeometry = new THREE.BufferGeometry();
    const bufferVertices = new Float32Array(verticesNb * 3);
    let verticeId = 0;
    verticeId = addVerticesToBuffer(verticeId, bufferVertices, _coords, -1);
    verticeId = addVerticesToBuffer(verticeId, bufferVertices, _coords, 2);
    const bufferUvs = new Float32Array(verticesNb * 2);
    let uvId = 0;
    uvId = addUvToBuffer(uvId, bufferUvs, _coords, 200000, _tile, 0);
    uvId = addUvToBuffer(uvId, bufferUvs, _coords, 200000, _tile, 1);
    const facesIndex = [];
    const layerOffset = _coords.length;
    for (let i = 0; i < _coords.length - 1; i ++) {
        facesIndex.push(i);
        facesIndex.push(i + 1);
        facesIndex.push(layerOffset + i);
        facesIndex.push(i + 1);
        facesIndex.push(layerOffset + i + 1);
        facesIndex.push(layerOffset + i);
    }
    const bufferFaces = Uint32Array.from(facesIndex);
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
    bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}


function buildWall(_coords, _tile) {
    const offset = new Offset();
    const distance = GLOBE.meter * 0.002;
    MATH.fixPolygonDirection(_coords);
    const offsetCoords = offset.data(_coords).offsetLine(distance);
    const wallGeometries = [];
    for (let margin = 0; margin < offsetCoords.length; margin ++) {
        const elevationsDatas = getElevationsDatas(offsetCoords[margin]);
        const fullCoords = [];
        offsetCoords[margin].forEach((coord, i) => {
            fullCoords.push([
                coord[0], 
                coord[1], 
                elevationsDatas[i], 
            ]);
        });
        const verticesNb = fullCoords.length * 2;
        const bufferVertices = new Float32Array(verticesNb * 3);
        let verticeId = 0;
        verticeId = addVerticesToBuffer(verticeId, bufferVertices, fullCoords, -1);
        verticeId = addVerticesToBuffer(verticeId, bufferVertices, fullCoords, 2);
        const bufferUvs = new Float32Array(verticesNb * 2);
        let uvId = 0;
        uvId = addUvToBuffer(uvId, bufferUvs, fullCoords, 200000, _tile, 0);
        uvId = addUvToBuffer(uvId, bufferUvs, fullCoords, 200000, _tile, 1);
        const facesIndex = [];
        const layerOffset = fullCoords.length;
        for (let i = 0; i < fullCoords.length - 1; i ++) {
            facesIndex.push(i);
            facesIndex.push(i + 1);
            facesIndex.push(layerOffset + i);
            facesIndex.push(i + 1);
            facesIndex.push(layerOffset + i + 1);
            facesIndex.push(layerOffset + i);
        }
        const bufferFaces = Uint32Array.from(facesIndex);
        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
        bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
        bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
        wallGeometries.push(bufferGeometry);
    }
    wallGeometries.push(buildWallRoof(offsetCoords));
    return THREE.BufferGeometryUtils.mergeBufferGeometries(wallGeometries);
}

function buildWallRoof(_offsetCoords) {
    const holesIndex = [];
    for (let margin = 0; margin < _offsetCoords.length - 1; margin ++) {
        holesIndex.push(_offsetCoords[margin].length);
    }
    const earsCoords = _offsetCoords.flat();
    const facesIndex = earcut(earsCoords.flat(), holesIndex);
    const bufferFaces = Uint32Array.from(facesIndex);
    const fullCoords = [];
    for (let margin = 0; margin < _offsetCoords.length; margin ++) {
        const elevationsDatas = getElevationsDatas(_offsetCoords[margin]);
        _offsetCoords[margin].forEach((coord, i) => {
            fullCoords.push([
                coord[0], 
                coord[1], 
                elevationsDatas[i], 
            ]);
        });
    }

    const bufferVertices = new Float32Array(fullCoords.length * 3);
    let verticeId = 0;
    verticeId = addVerticesToBuffer(verticeId, bufferVertices, fullCoords, 2);
    const bufferGeometry = new THREE.BufferGeometry();
    const bufferUvs = new Float32Array(fullCoords.length * 2);
    bufferUvs.fill(0);
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
    bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}

function addUvToBuffer(_offset, _buffer, _coords, _uvFactor, _tile, _offsetY) {
    const tileSize = Math.abs(_tile.startCoord.x, _tile.endCoord.x);
    _buffer[_offset + 0] = 0;
    _buffer[_offset + 1] = _offsetY;
    _offset += 2;
    let lastUv = 0;
    for (let i = 1; i < _coords.length; i ++) {
        const dist = Math.sqrt(Math.pow(_coords[i][0] - _coords[i - 1][0], 2) + Math.pow(_coords[i][1] - _coords[i - 1][1], 2));
        const curUv = (dist / tileSize) * _uvFactor;
        _buffer[_offset + 0] = lastUv + curUv;
        _buffer[_offset + 1] = _offsetY;
        lastUv += curUv;
        _offset += 2;
    }
    return _offset;
}

function addVerticesToBuffer(_offset, _buffer, _coords, _elevationOffset) {
    _coords.forEach(coord => {
        const vertPos = GLOBE.coordToXYZ(
            coord[0], 
            coord[1], 
            coord[2] + _elevationOffset, 
        );
        _buffer[_offset + 0] = vertPos.x;
        _buffer[_offset + 1] = vertPos.y;
        _buffer[_offset + 2] = vertPos.z;
        _offset += 3;
    });
    return _offset;
}

function getElevationsDatas(_coords) {
    return _coords.map(point => {
        return ElevationStore.get(point[0], point[1]);
    });
}