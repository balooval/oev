import * as GeoBuilder from './linesGeometryBuilder.js';

export function buildGeometry(_line, _elevationsDatas, _tile) {
    const fullCoords = GeoBuilder.packCoordsWithElevation(_line.border, _elevationsDatas);
    const verticesNb = fullCoords.length * 2;
    const bufferGeometry = new THREE.BufferGeometry();
    const bufferVertices = new Float32Array(verticesNb * 3);
    let verticeId = 0;
    verticeId = GeoBuilder.addVerticesToBuffer(verticeId, bufferVertices, fullCoords, -1);
    verticeId = GeoBuilder.addVerticesToBuffer(verticeId, bufferVertices, fullCoords, _line.props.height);
    const bufferUvs = new Float32Array(verticesNb * 2);
    let uvId = 0;
    uvId = GeoBuilder.addUvToBuffer(uvId, bufferUvs, fullCoords, 200000, _tile, 0);
    uvId = GeoBuilder.addUvToBuffer(uvId, bufferUvs, fullCoords, 200000, _tile, 1);
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
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
    bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}