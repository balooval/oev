importScripts('/js/libs/perlin.js');

const canvasSize = 256;

const canvasFinal = new OffscreenCanvas(canvasSize, canvasSize);
const contextFinal = canvasFinal.getContext('2d');

const canvasCompose = new OffscreenCanvas(canvasSize, canvasSize);
const contextCompose = canvasCompose.getContext('2d');

const noiseTexture = makeNoiseTextures();


const canvasTexture = new OffscreenCanvas(16, 16);
let contextTexture = null;

function saveTexture(_buffer) {
    if (contextTexture) return;
    contextTexture = canvasTexture.getContext('2d');
    contextTexture.putImageData(new ImageData(_buffer, 16, 16), 0, 0);
}

onmessage = function(_msg) {
    saveTexture(_msg.data.textureBuffer);
    const key = _msg.data.tileKey;
    const localCoords = _msg.data.localCoords;
    const zoom = _msg.data.zoom;
    const sizeFactor = getSizeFactor(zoom);
    const imageDatas = draw(localCoords, sizeFactor);
	
	postMessage({
        tileKey : key, 
        pixelsDatas : imageDatas.data, 
	});
}


function draw(_ways, _sizeFactor) {
    contextFinal.clearRect(0, 0, canvasSize, canvasSize);
    
    // contextFinal.drawImage(canvasTexture, 0, 0);



    contextFinal.setLineDash([]);
    
    contextCompose.globalCompositeOperation = 'source-over';
    contextCompose.clearRect(0, 0, canvasSize, canvasSize);
    contextCompose.setLineDash([]);
    

    const tracks = [];
    const bigRoads = [];

    for (let w = 0; w < _ways.length; w ++) {
        const curWay = _ways[w];
        if (!curWay.positions.length) continue;
        
        if (curWay.props.width > 3) {
            // drawBigRoad(curWay, _sizeFactor);
            bigRoads.push(curWay);
        } else if (curWay.props.highway == 'track') {
            tracks.push(curWay);
        } else {
            drawNormalRoad(curWay, _sizeFactor);
        }
    }
     

    for (let i = 0; i < tracks.length; i ++) {
        drawPathLayer(tracks[i], 'rgba(101, 90, 44, 1)', _sizeFactor / 1, 1);
    }

    for (let i = 0; i < tracks.length; i ++) {
        drawPathLayer(tracks[i], 'rgba(125, 126, 47, 1)', _sizeFactor / 2, 1);
    }
    
    for (let i = 0; i < bigRoads.length; i ++) {
        drawBigRoadLayerA(bigRoads[i], _sizeFactor);
    }
    for (let i = 0; i < bigRoads.length; i ++) {
        drawBigRoadLayerB(bigRoads[i], _sizeFactor);
        // drawPathLayer(bigRoads[i], 'rgba(130, 130, 130, 1)', _sizeFactor, bigRoads[i].props.width / 6);
    }
    if (_sizeFactor > 1.5) {
        for (let i = 0; i < bigRoads.length; i ++) {
            drawBigRoadLayerC(bigRoads[i], _sizeFactor);
        }
    }
    
    return contextFinal.getImageData(0, 0, canvasSize, canvasSize);
}

function drawBigRoadLayerA(_way, _sizeFactor) {
    drawLine(contextFinal, _way.positions, _way.props.width, [100, 100, 100], _sizeFactor, 'butt');
}
function drawBigRoadLayerB(_way, _sizeFactor) {
    drawLine(contextFinal, _way.positions, _way.props.width * 0.6, [130, 130, 130], _sizeFactor, 'round');
    
}
function drawBigRoadLayerC(_way, _sizeFactor) {
    contextCompose.clearRect(0, 0, canvasSize, canvasSize);
    contextCompose.globalCompositeOperation = 'source-over';

    contextCompose.setLineDash([4 * _sizeFactor, 4 * _sizeFactor]);
    drawLine(contextCompose, _way.positions, 0.2, [220, 220, 220], _sizeFactor, 'round');
    contextCompose.globalCompositeOperation = 'destination-in';
    contextCompose.drawImage(noiseTexture, 0, 0);
    contextCompose.globalCompositeOperation = 'source-over';
    contextFinal.drawImage(canvasCompose, 0, 0);
    contextFinal.setLineDash([]);
    contextCompose.setLineDash([]);
}

function drawPathLayer(_way, _color, _sizeFactor, _width) {
    contextFinal.setLineDash([]);
    contextCompose.clearRect(0, 0, canvasSize, canvasSize);
    contextCompose.globalCompositeOperation = 'source-over';
    drawLineImage(canvasTexture, _way.positions, contextCompose, _sizeFactor, _width);
    contextCompose.globalCompositeOperation = 'source-in';
    contextCompose.fillStyle = _color;
    contextCompose.fillRect(0, 0, canvasSize, canvasSize)
    contextFinal.drawImage(canvasCompose, 0, 0);
    contextCompose.clearRect(0, 0, canvasSize, canvasSize);
    contextCompose.globalCompositeOperation = 'source-over';
}



function drawNormalRoad(_way, _sizeFactor) {
    drawLine(contextFinal, _way.positions, _way.props.width, [130, 130, 130], _sizeFactor, 'round');
}

function drawLineImage(_canvasTexture, _coords, _context, _sizeFactor, _width) {
    const splatSpace = 1;
    let lastPoint = _coords[0];
    for (let i = 1; i < _coords.length; i ++) {
        const point = _coords[i];
        const angle = Math.atan2(point[1] - lastPoint[1], point[0] - lastPoint[0]);
        const distance = Math.sqrt(Math.pow(lastPoint[0] - point[0], 2) + Math.pow(lastPoint[1] - point[1], 2));
        const nbDraw = Math.ceil(distance / splatSpace);
        const stepX = Math.cos(angle) * splatSpace;
        const stepY = Math.sin(angle) * splatSpace;
        for (let d = 0; d < nbDraw; d ++) {
            const rotation = Math.random() * 6;
            const scale = (0.1 + Math.random() * 0.2) * (_sizeFactor * _width);
            const dX = lastPoint[0] + stepX * d;
            const dY = lastPoint[1] + stepY * d;
            _context.save();
            _context.translate(dX, dY);
            _context.rotate(rotation);
            _context.scale(scale, scale);
            _context.drawImage(_canvasTexture, -16 / 2, -16 / 2);
            _context.restore();
        }
        lastPoint = point;
    }
}

function getSizeFactor(_zoom) {
    const zoomDiff = _zoom - 13;
    return zoomDiff * 0.5;
}

function drawLine(_context, points, _width = 1, col, _sizeFactor, _cap) {
    _context.beginPath();
    _context.lineCap = _cap;
    _context.lineJoin = 'round';
    _context.lineWidth = _width * _sizeFactor;
    _context.strokeStyle = 'rgba(' + col[0] + ', ' + col[1] + ', ' + col[2] + ', 1)';
	_context.moveTo(points[0][0], points[0][1]);
	for(var i = 1; i < points.length; i++) {
		_context.lineTo(points[i][0], points[i][1]);
	}
	_context.stroke();
}


function makeNoiseTextures() {
    noise.seed(Math.random());
    const canvas = new OffscreenCanvas(canvasSize, canvasSize);
    const context = canvas.getContext('2d');
    for (let x = 0; x < canvasSize; x ++) {
        for (let y = 0; y < canvasSize; y ++) {
            const value = perlinValue(x, y);
            let alpha = 0;
            if (value > 0.2) alpha = 0.5;
            if (value > 0.4) alpha = 1;
            // const alpha = 0.2 + perlinValue(x, y) * 0.8;
            const color = 100 + value * 150;
            context.fillStyle = 'rgba(0,0,0, ' + alpha + ')';
            context.fillRect(x, y, 1, 1);
        }
    }
    return canvas;
}

function perlinValue(_x, _y) {
    let res = 0;
    let scale = 0.01;
    let factor = 1;
    for (let i = 0; i < 8; i ++) {
        const value = noise.simplex2(_x * scale, _y * scale);
        res += (value * factor);
        factor *= 0.6;
        scale *= 2;
    }
    return Math.max(0, Math.min(1, (res + 1) / 2));
}