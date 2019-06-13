import GEO from './geo.js';
import * as NET_TEXTURES from '../net/textures.js'
import LanduseMaterial from '../tileExtensions/landuse/landuseMaterial.js';

const finalSize = 256;
const canvasFinal = document.createElement('canvas');
canvasFinal.width = finalSize;
canvasFinal.height = finalSize;
const contextFinal = canvasFinal.getContext("2d");

const canvasTypes = new Map();
canvasTypes.set('forest', createCanvas(finalSize));
canvasTypes.set('scrub', createCanvas(finalSize));

const splatSize = 16;
const canvasSplat = document.createElement('canvas');
canvasSplat.width = splatSize;
canvasSplat.height = splatSize;
const contextSplat = canvasSplat.getContext("2d");

const groundImage = {
    forest : null, 
    scrub : null, 
};

LanduseMaterial.evt.addEventListener('READY', null, onMaterialReady);

function onMaterialReady() {
    LanduseMaterial.evt.removeEventListener('READY', null, onMaterialReady);
    groundImage.forest = NET_TEXTURES.texture('shell_tree_0').image, 
    groundImage.scrub = NET_TEXTURES.texture('shell_scrub_1').image, 
    contextSplat.drawImage(NET_TEXTURES.texture('splat').image, 0, 0);
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
  
	draw : function(_landuses, _tile) {
        contextFinal.clearRect(0, 0, finalSize, finalSize);
        if (!_landuses.size) return canvasFinal;
        clearTypedDatas();
        
        _landuses.forEach(curLanduse => {
            if (!curLanduse.bordersSplit.length) {
                return false;
            }
            convertCoordToCanvasPositions(curLanduse.bordersSplit, typedDatas[curLanduse.type].borders, _tile.bbox);
            convertCoordToCanvasPositions(curLanduse.holesSplit, typedDatas[curLanduse.type].holes, _tile.bbox);
        });

        for (let type in typedDatas) {
            const datas = typedDatas[type];
            const canvasTemp = canvasTypes.get(type);
            const contextTemp = canvasTemp.getContext('2d');
            contextTemp.clearRect(0, 0, finalSize, finalSize);

            for (let i = 0; i < datas.borders.length; i ++) {
                const coords = datas.borders[i];
                contextTemp.globalCompositeOperation = 'source-over';
                drawLineImage(coords, contextTemp, _tile);
                drawCanvasShape(coords, contextTemp, '#ffffff', _tile);
            }
            for (let i = 0; i < datas.holes.length; i ++) {
                const coords = datas.holes[i];
                contextTemp.globalCompositeOperation = 'destination-out';
                drawCanvasShape(coords, contextTemp, '#ffffff', _tile);
                contextTemp.globalCompositeOperation = 'source-over';
                drawLineImage(coords, contextTemp, _tile);
            }
            contextTemp.globalCompositeOperation = 'source-in';
            contextTemp.fillStyle = contextTemp.createPattern(groundImage[type], 'repeat');
            contextTemp.fillRect(0, 0, finalSize, finalSize);
            contextFinal.drawImage(canvasTemp, 0, 0);
        }

        return canvasFinal;
    }, 

};

function convertCoordToCanvasPositions(_coords, _res, _tileBox) {
  for (let s = 0; s < _coords.length; s ++) {
    _res.push(GEO.coordToCanvas(_tileBox, finalSize, _coords[s]));
  }
}

function createCanvas(_size) {
    const canvas = document.createElement('canvas');
    canvas.width = _size;
    canvas.height = _size;
    return canvas;
  }
  

function drawLineImage(_coords, _context, _tile) {
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
        const scale = 0.2 + Math.random() * 0.8;
        const dX = lastPoint[0] + stepX * d;
        const dY = lastPoint[1] + stepY * d;
        _context.save();
        _context.translate(dX, dY);
        _context.rotate(rotation);
        _context.scale(scale, scale);
        _context.drawImage(canvasSplat, -splatSize / 2, -splatSize / 2);
        _context.restore();
      }
      lastPoint = point;
    }
}

function drawCanvasShape(_coords, _context, _color, _tile) {
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