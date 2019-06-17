import GEO from '../../utils/geo.js';
import * as TILE from '../../tile.js';

const canvasFinal = document.createElement('canvas');
canvasFinal.width = TILE.mapSize;
canvasFinal.height = TILE.mapSize;
const contextFinal = canvasFinal.getContext("2d");


const api = {
  
	draw : function(_ways, _tileBBox, _key) {
        contextFinal.clearRect(0, 0, TILE.mapSize, TILE.mapSize);
        if (!_ways.size) return canvasFinal;
        _ways.forEach(curWay => {
            if (!curWay.border.length) return false;
            for (let i = 0; i < curWay.bordersSplit.length; i ++ ){
                const local = GEO.coordToCanvas(_tileBBox, TILE.mapSize, curWay.bordersSplit[i]);
                
                // contextFinal.setLineDash([]);
                drawLine(contextFinal, local, curWay.props.width, 130);
                // contextFinal.setLineDash([4, 4]);
                drawLine(contextFinal, local, curWay.props.width - 2, 160);
                drawLine(contextFinal, local, 1, 140);
            }
        });
        return canvasFinal;
    }, 

};

function drawLine(_context, points, _width = 1, col) {
    _context.beginPath();
    _context.lineJoin = 'round';
    // _context.lineCap = 'round';
    _context.lineWidth = _width;
    _context.strokeStyle = 'rgba(' + col + ', ' + col + ', ' + col + ', 1)';
	_context.moveTo(points[0][0], points[0][1]);
	for(var i = 1; i < points.length; i++) {
		_context.lineTo(points[i][0], points[i][1]);
	}
	_context.stroke();
}

export {api as default}