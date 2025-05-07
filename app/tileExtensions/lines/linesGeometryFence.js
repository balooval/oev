import {
    BufferAttribute,
    BufferGeometry,
} from 'three';
import * as GeoBuilder from './linesGeometryBuilder.js';

export function buildGeometry(_line, _tile) {

    const elevationsDatas = GeoBuilder.getElevationsDatas(_line.border);

    const fullCoords = GeoBuilder.packCoordsWithElevation(_line.border, elevationsDatas);
    const verticesNb = fullCoords.length * 2;
    const bufferGeometry = new BufferGeometry();
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
    bufferGeometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
    bufferGeometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}