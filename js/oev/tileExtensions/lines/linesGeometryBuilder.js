import GLOBE from '../../globe.js';
import * as FenceBuilder from './linesGeometryFence.js';
import * as WallBuilder from './linesGeometryWall.js';

export function buildGeometry(_line, _elevationsDatas, _tile) {
    if (_line.type == 'fence') {
        return FenceBuilder.buildGeometry(_line, _elevationsDatas, _tile);
    } else if (_line.type == 'wall') {
        return WallBuilder.buildGeometry(_line, _tile, _line.id);
    }
}

export function addVerticesToBuffer(_offset, _buffer, _coords, _elevationOffset) {
    for (let i = 0; i < _coords.length; i ++) {
        const coord = _coords[i];
        const vertPos = GLOBE.coordToXYZ(
            coord[0], 
            coord[1], 
            coord[2] + _elevationOffset, 
        );
        _buffer[_offset + 0] = vertPos.x;
        _buffer[_offset + 1] = vertPos.y;
        _buffer[_offset + 2] = vertPos.z;
        _offset += 3;
    }
    return _offset;
}

export function addUvToBuffer(_offset, _buffer, _coords, _uvFactor, _tile, _offsetY) {
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

export function packCoordsWithElevation(_coords, _elevations) {
    const fullCoords = [];
    for (let i = 0; i < _coords.length; i ++) {
        const coord = _coords[i];
        fullCoords.push([
            coord[0], 
            coord[1], 
            _elevations[i], 
        ]);
    }
    return fullCoords;
}