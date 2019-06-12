import GEO from './geo.js';
import * as NET_TEXTURES from '../net/textures.js'

const finalSize = 256;
const canvasFinal = document.createElement('canvas');
canvasFinal.width = finalSize;
canvasFinal.height = finalSize;
const contextFinal = canvasFinal.getContext("2d");

const canvasTemp = document.createElement('canvas');
canvasTemp.width = finalSize;
canvasTemp.height = finalSize;
const contextTemp = canvasTemp.getContext("2d");

const splatSize = 16;
const canvasSplat = document.createElement('canvas');
canvasSplat.width = splatSize;
canvasSplat.height = splatSize;
const contextSplat = canvasSplat.getContext("2d");

const api = {
  // TODO: gérer les trous
	draw : function(_coords, _tile) {
    contextFinal.clearRect(0, 0, finalSize, finalSize);
    if (!_coords.length) return canvasFinal;
    const localCoords = new Array(_coords.length);
    for (let i = 0; i < _coords.length; i ++) {
      localCoords[i] = GEO.coordToCanvas(_tile, finalSize, _coords[i]);
    }
    // const shapes = split(localCoords);


    contextTemp.clearRect(0, 0, finalSize, finalSize);
    contextSplat.clearRect(0, 0, splatSize, splatSize);
    contextSplat.drawImage(NET_TEXTURES.texture('splat').image, 0, 0);
    const groundImage = NET_TEXTURES.texture('shell_tree_0').image;
    for (let i = 0; i < localCoords.length; i ++) {
      const coords = localCoords[i];


      contextTemp.globalCompositeOperation = 'source-over';
      drawLineImage(coords, contextTemp, _tile);
      contextTemp.globalCompositeOperation = 'source-over';
      drawCanvasShape(coords, contextTemp, '#ffffff', _tile);
      contextTemp.globalCompositeOperation = 'source-in';
      contextTemp.fillStyle = contextTemp.createPattern(groundImage, 'repeat');
      contextTemp.fillRect(0, 0, finalSize, finalSize);

      contextFinal.drawImage(canvasTemp, 0, 0);
    }
    return canvasFinal;
  }, 

};

function split(_coords) {
  const box = [
    [0, 0], 
    [256, 0], 
    [256, 256], 
    [0, 256], 
    [0, 0], 
  ];
  const res = [];
  for (let i = 0; i < _coords.length; i ++) {
    const shapes = polygonClipping.intersection([box], [_coords[i]]);
    for (let s = 0; s < shapes.length; s ++) {
      res.push(shapes[s][0]);
    }
  }
  return res;
}

function drawLineImage(_coords, _context, _tile) {
  const points = [..._coords];
  const splatSpace = 6;
  let lastPoint = points.shift();
  for (let i = 0; i < points.length; i ++) {
    const point = points[i];
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
    const points = [..._coords];
    const start = points.shift();
    _context.beginPath();
    _context.fillStyle = _color;
        _context.moveTo(start[0], start[1]);
        for (let i = 0; i < points.length; i ++) {
            _context.lineTo(points[i][0], points[i][1]);
        }
    _context.closePath();
    _context.fill();
}

export {api as default}