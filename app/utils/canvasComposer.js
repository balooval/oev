import GEO from '../core/geo.js';
import * as NET_TEXTURES from '../net/textures.js'
import * as TILE from '../core/tile.js'
import LanduseMaterial from '../tileExtensions/landuse/landuseMaterial.js';

const canvasFinal = document.createElement('canvas');
canvasFinal.width = TILE.mapSize;
canvasFinal.height = TILE.mapSize;
const contextFinal = canvasFinal.getContext("2d");

const canvasTypes = new Map();
canvasTypes.set('forest', createCanvas(TILE.mapSize));
canvasTypes.set('scrub', createCanvas(TILE.mapSize));

const splatSize = 16;

const linePatterns = new Map();
linePatterns.set('forest', {
    canvas : createCanvas(splatSize), 
    minFactor : 0.2, 
    maxFactor : 0.8, 
});
linePatterns.set('scrub', {
    canvas : createCanvas(splatSize), 
    minFactor : 0.2, 
    maxFactor : 0.5, 
});

const groundImage = {
    forest : null, 
    scrub : null, 
};

LanduseMaterial.evt.addEventListener('READY', null, onMaterialReady);

function onMaterialReady() {
    LanduseMaterial.evt.removeEventListener('READY', null, onMaterialReady);
    groundImage.forest = NET_TEXTURES.texture('shell_tree_0').image 
    groundImage.scrub = NET_TEXTURES.texture('shell_scrub_1').image;

    let contextLine;
    contextLine = linePatterns.get('forest').canvas.getContext('2d');
    contextLine.drawImage(NET_TEXTURES.texture('landuse_border_forest').image, 0, 0);
    contextLine = linePatterns.get('scrub').canvas.getContext('2d');
    contextLine.drawImage(NET_TEXTURES.texture('landuse_border_scrub').image, 0, 0);
}

const typedDatas = {
    forest : {
        borders : [], 
        holes : [], 
    }, 
    scrub : {
        borders : [], 
        holes : [], 
    }, 
};

function clearTypedDatas() {
    typedDatas.forest.borders.length = 0;
    typedDatas.forest.holes.length = 0;
    typedDatas.scrub.borders.length = 0;
    typedDatas.scrub.holes.length = 0;
}

const api = {
  
	draw : function(_landuses, _tileBBox, _zoom) {
        const sizeFactor = getSizeFactor(_zoom);
        contextFinal.clearRect(0, 0, TILE.mapSize, TILE.mapSize);
        if (!_landuses.size) return canvasFinal;
        clearTypedDatas();
        
        _landuses.forEach(curLanduse => {
            if (!curLanduse.bordersSplit.length) {
                return false;
            }
            convertCoordToCanvasPositions(curLanduse.bordersSplit, typedDatas[curLanduse.type].borders, _tileBBox);
            convertCoordToCanvasPositions(curLanduse.holesSplit, typedDatas[curLanduse.type].holes, _tileBBox);
        });

        for (let type in typedDatas) {
            const linePattern = linePatterns.get(type);
            const datas = typedDatas[type];
            const canvasTemp = canvasTypes.get(type);
            const contextTemp = canvasTemp.getContext('2d');
            contextTemp.clearRect(0, 0, TILE.mapSize, TILE.mapSize);

            for (let i = 0; i < datas.borders.length; i ++) {
                const coords = datas.borders[i];
                contextTemp.globalCompositeOperation = 'source-over';
                drawLineImage(linePattern, coords, contextTemp, sizeFactor);
                drawCanvasShape(coords, contextTemp, '#ffffff');
            }
            for (let i = 0; i < datas.holes.length; i ++) {
                const coords = datas.holes[i];
                contextTemp.globalCompositeOperation = 'destination-out';
                drawCanvasShape(coords, contextTemp, '#ffffff');
                contextTemp.globalCompositeOperation = 'source-over';
                drawLineImage(linePattern, coords, contextTemp, sizeFactor);
            }
            contextTemp.globalCompositeOperation = 'source-in';
            contextTemp.fillStyle = contextTemp.createPattern(groundImage[type], 'repeat');
            contextTemp.fillRect(0, 0, TILE.mapSize, TILE.mapSize);
            contextFinal.drawImage(canvasTemp, 0, 0);
        }

        return canvasFinal;
    }, 

};

function getSizeFactor(_zoom) {
    const zoomDiff = _zoom - 13;
    return zoomDiff * 0.5;
}

function convertCoordToCanvasPositions(_coords, _res, _tileBox) {
  for (let s = 0; s < _coords.length; s ++) {
    _res.push(GEO.coordToCanvas(_tileBox, TILE.mapSize, _coords[s]));
  }
}

function createCanvas(_size) {
    const canvas = document.createElement('canvas');
    canvas.width = _size;
    canvas.height = _size;
    return canvas;
  }
  

function drawLineImage(_linePattern, _coords, _context, _sizeFactor) {
  const splatSpace = 6;
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
        const scale = (_linePattern.minFactor + Math.random() * _linePattern.maxFactor) * _sizeFactor;
        const dX = lastPoint[0] + stepX * d;
        const dY = lastPoint[1] + stepY * d;
        _context.save();
        _context.translate(dX, dY);
        _context.rotate(rotation);
        _context.scale(scale, scale);
        _context.drawImage(_linePattern.canvas, -splatSize / 2, -splatSize / 2);
        _context.restore();
      }
      lastPoint = point;
    }
}

function drawCanvasShape(_coords, _context, _color) {
    const start = _coords[0];
    _context.beginPath();
    _context.fillStyle = _color;
        _context.moveTo(start[0], start[1]);
        for (let i = 1; i < _coords.length; i ++) {
            _context.lineTo(_coords[i][0], _coords[i][1]);
        }
    _context.closePath();
    _context.fill('evenodd');
}

export {api as default}