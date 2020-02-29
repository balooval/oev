import * as Jsts from '../../../libs/jsts-module.js';
import Earcut from '../../../libs/Earcut-module.js';
import * as THREE from '../../../libs/three.module.js';
import GLOBE from '../../globe.js';
import MATH from '../../utils/math.js';
import * as GeoBuilder from './linesGeometryBuilder.js';

export function buildGeometry(_line, _tile, _id) {
    if (_line.border.length < 2) console.log('ATTENTION', _line.border.length);
    const distance = (GLOBE.meter * 0.001) * (_line.props.width * 2);
    let offsetCoords = inflate(_line.border, distance);
    if (offsetCoords.length > 2) {
        console.warn('Wall', _id, 'had 3 borders');
        return null;
    }
    const wallGeometries = [];
    for (let margin = 0; margin < offsetCoords.length; margin ++) {
        offsetCoords[margin] = MATH.fixPolygonDirection(offsetCoords[margin], margin > 0);
        const elevationsDatas = GeoBuilder.getElevationsDatas(offsetCoords[margin]);
        const fullCoords = GeoBuilder.packCoordsWithElevation(offsetCoords[margin], elevationsDatas);
        const verticesNb = fullCoords.length * 2;
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
        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
        bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
        bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
        wallGeometries.push(bufferGeometry);
    }
    wallGeometries.push(buildRoof(offsetCoords, _line.props));
    return THREE.BufferGeometryUtils.mergeBufferGeometries(wallGeometries);
}

function buildRoof(_offsetCoords, _props) {
    const holesIndex = [];
    _offsetCoords = _offsetCoords.filter(coords => coords.length);
    for (let margin = 0; margin < _offsetCoords.length - 1; margin ++) {
        holesIndex.push(_offsetCoords[margin].length);
    }
    const earsCoords = _offsetCoords.flat();
    if (earsCoords.length == holesIndex[0]) {
        console.log('ATTENTION earsCoords');
        console.log('_offsetCoords', _offsetCoords);
        console.log('earsCoords', earsCoords);
        console.log('holesIndex', holesIndex);
    }
    const facesIndex = Earcut(earsCoords.flat(), holesIndex);
    const bufferFaces = Uint32Array.from(facesIndex);
    const fullCoords = [];
    for (let margin = 0; margin < _offsetCoords.length; margin ++) {
        const elevationsDatas = GeoBuilder.getElevationsDatas(_offsetCoords[margin]);
        fullCoords.push(...GeoBuilder.packCoordsWithElevation(_offsetCoords[margin], elevationsDatas));
    }
    const bufferVertices = new Float32Array(fullCoords.length * 3);
    let verticeId = 0;
    verticeId = GeoBuilder.addVerticesToBuffer(verticeId, bufferVertices, fullCoords,  + _props.height);
    const bufferGeometry = new THREE.BufferGeometry();
    const bufferUvs = new Float32Array(fullCoords.length * 2);
    bufferUvs.fill(0);
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
    bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}

function inflate(_coords, _distance) {
    const res = [];
    const geoInput = [];
    for (let i = 0; i < _coords.length; i ++) {
        geoInput.push(new Jsts.geom.Coordinate(_coords[i][0], _coords[i][1]));
    }
    const geometryFactory = new Jsts.geom.GeometryFactory();
    const isClosed = MATH.isClosedPath(_coords);
    let shell;
    if (isClosed) {
        shell = geometryFactory.createPolygon(geoInput);
    } else {
        shell = geometryFactory.createLineString(geoInput);
    }
    let polygon = shell.buffer(_distance, Jsts.operation.buffer.BufferParameters.CAP_FLAT);
    let oCoordinates = polygon.shell.points.coordinates;
    let oCoords = [];
    for (let i = 0; i < oCoordinates.length; i ++) {
        oCoords.push([
            oCoordinates[i].x, 
            oCoordinates[i].y, 
        ]);
    }
    res.push(oCoords);
    if (isClosed) {
        let polygon = shell.buffer(_distance * -1, Jsts.operation.buffer.BufferParameters.CAP_FLAT);
        if (polygon.shell) {
            oCoordinates = polygon.shell.points.coordinates;
            oCoords = [];
            for (let i = 0; i < oCoordinates.length; i ++) {
                oCoords.push([
                    oCoordinates[i].x, 
                    oCoordinates[i].y, 
                ]);
            }
            res.push(oCoords);
        }
    }
    return res;
}