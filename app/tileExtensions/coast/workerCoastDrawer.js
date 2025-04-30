import * as MATH from '../../core/math.js';

const canvasSize = 256;
const canvasFinal = new OffscreenCanvas(canvasSize, canvasSize);
const contextFinal = canvasFinal.getContext('2d');
const canvasMask = new OffscreenCanvas(canvasSize, canvasSize);
const contextMask = canvasMask.getContext('2d');
const canvasDiffuse = new OffscreenCanvas(canvasSize, canvasSize);
const contextDiffuse = canvasDiffuse.getContext('2d');
const canvasFoam = new OffscreenCanvas(canvasSize, canvasSize);
const contextFoam = canvasFoam.getContext('2d');

onmessage = function(_msg) {
    const key = _msg.data.tileKey;
    const imageDatas = drawTexture(_msg.data.polygons, _msg.data.bbox, _msg.data.scale);
	postMessage({
        tileKey : key, 
        pixelsDatas : imageDatas.data, 
	});
}

function drawTexture(_polygons, _bbox, _scale) {
    contextFinal.clearRect(0, 0, canvasSize, canvasSize);
    contextMask.clearRect(0, 0, canvasSize, canvasSize);
    contextDiffuse.clearRect(0, 0, canvasSize, canvasSize);
    contextFoam.clearRect(0, 0, canvasSize, canvasSize);
    const canvasPositions = [];
    convertCoordToCanvasPositions(_polygons, canvasPositions, _bbox);
    drawTextureDiffuse(canvasPositions, _scale);
    drawTextureMask(canvasPositions);
    contextFinal.drawImage(canvasMask, 0, 0);
    contextFinal.globalCompositeOperation = 'source-out';
    contextFinal.drawImage(canvasDiffuse, 0, 0);
    return contextFinal.getImageData(0, 0, canvasSize, canvasSize);
}

function drawTextureDiffuse(_polygons, _scale) {
    contextDiffuse.fillStyle = '#02587d';
    contextDiffuse.fillRect(0, 0, canvasSize, canvasSize);
    contextDiffuse.filter = 'blur(' + (2 * _scale) + 'px)';
    for (let i = 0; i < _polygons.length; i ++) {
        strokePolygon(contextDiffuse, _polygons[i], '#0c719c', 16 * _scale);
    }
    contextDiffuse.filter = 'none';
    contextFoam.filter = 'blur(' + (1 * _scale) + 'px)';
    for (let i = 0; i < _polygons.length; i ++) {
        strokePolygon(contextFoam, _polygons[i], '#9cedff', 2 * _scale);
    } 
    contextFoam.filter = 'none';
    // contextFoam.globalCompositeOperation = 'destination-out';
    // const waterNoise = NET_TEXTURES.texture('waterNoise').image;
    // contextFoam.drawImage(waterNoise, 0, 0, 256, 256, 0, 0, canvasSize * _scale, canvasSize * _scale);
    contextDiffuse.drawImage(canvasFoam, 0, 0);
}

function drawTextureMask(_polygons) {
    contextMask.fillStyle = 'rgba(0,0,0,0)';
    contextMask.fillRect(0, 0, canvasSize, canvasSize);
    for (let i = 0; i < _polygons.length; i ++) {
        tracePolygon(contextMask, _polygons[i], 'rgba(0,0,0,1)')
    }
}

function strokePolygon(_context, _coordinates, _color = 'rgba(0,0,0,0)', _width = 1) {
    canvasPath(_context, _coordinates);
    _context.lineJoin = 'round';
    _context.lineWidth = _width;
    _context.strokeStyle = _color;
    _context.stroke();
}

function tracePolygon(_context, _coordinates, _fillColor = 'rgba(0,0,0,0)') {
    canvasPath(_context, _coordinates);
    _context.fillStyle = _fillColor;
    _context.fill();
}

function canvasPath(_context, _coordinates) {
    const start = _coordinates[0];
    _context.beginPath();
    _context.moveTo(start[0], start[1]);
    for (let i = 1; i < _coordinates.length; i ++) {
        const coord = _coordinates[i];
        _context.lineTo(coord[0], coord[1]);
    }
    _context.closePath();
}

function convertCoordToCanvasPositions(_coords, _res, _tileBox) {
    for (let s = 0; s < _coords.length; s ++) {
        const positions = coordToCanvas(_tileBox, canvasSize, _coords[s]);
        _res.push(positions);
    }
}

function coordToCanvas(_box, _canvasSize, _coords) {
    const points = new Array(_coords.length);
    for (let i = 0; i < _coords.length; i ++) {
        const coord = _coords[i];
        const point = [
            MATH.mapValue(coord[0], _box[0], _box[1]) * _canvasSize, 
            _canvasSize - MATH.mapValue(coord[1], _box[2], _box[3]) * _canvasSize, 
        ];
        points[i] = point;
    }
    return points;
}
