import * as NET_TEXTURES from '../../net/NetTextures.js';

const tilesNb = 4;
const nbTileBySide = Math.sqrt(tilesNb);
const tileDefinition = 512;
// const tileDefinition = 1024;
const canvasList = createCanvas(tilesNb, tileDefinition);

const patternsTextures = {
    other : [
        'shell_tree_1', 
        'shell_tree_2', 
        'shell_tree_3', 
        'shell_tree_4', 
    ], 
    vineyard : [
        'shell_vine_1', 
        'shell_vine_2', 
        'shell_vine_3', 
        'shell_vine_5', 
    ], 
    scrub : [
        'shell_scrub_1', 
        'shell_scrub_2', 
        'shell_vine_5', 
        'shell_vine_5', 
    ], 
};

const api = {

    definition : function() {
        return tileDefinition;
    }, 

    tilesNb : function() {
        return tilesNb;
    }, 

    tilesOffset : function() {
        const res = [];
        for (let x = 0; x < nbTileBySide; x ++) {
            for (let y = 0; y < nbTileBySide; y ++) {
                res.push([
                    x / nbTileBySide, 
                    y / nbTileBySide, 
                ]);
            }
        }
        return res;
    }, 

    drawTexture : function(_landusesDatas, _definition) {
        return build(_landusesDatas, _definition);
    }
}

function build(_landusesDatas) {
    canvasList.forEach((layerCanvas, layer) => {
        const layerContext = layerCanvas.getContext('2d');
        layerContext.clearRect(0, 0, tileDefinition, tileDefinition);
        _landusesDatas.forEach(landuse => {
            drawLanduse(landuse, layerContext, layer);
        });
    });
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = nbTileBySide * tileDefinition;
    finalCanvas.height = nbTileBySide * tileDefinition;
    const finalContext = finalCanvas.getContext('2d');
    let curCanvasId = 0;
    for (let x = 0; x < nbTileBySide; x ++) {
        for (let y = 0; y < nbTileBySide; y ++) {
            const layerCanvas = canvasList[curCanvasId];
            finalContext.drawImage(
                layerCanvas, 
                0, 0, 
                tileDefinition, tileDefinition, 
                x * tileDefinition,  y * tileDefinition, 
                tileDefinition, tileDefinition
            );
            curCanvasId ++;
        }
    }
    const texture = new THREE.Texture(finalCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

function drawLanduse(_landuse, _context, layer) {
    _context.beginPath();
    drawPolygon(_landuse.positions, _context);
    _context.closePath();
    _landuse.holes.forEach(hole => {
        drawPolygon(hole, _context);
        _context.closePath();
    });
    const tileTexture = NET_TEXTURES.texture(patternsTextures[_landuse.texture][layer]).image
    _context.fillStyle = _context.createPattern(tileTexture, 'repeat');
    _context.fill('evenodd');
}

function drawPolygon(_positions, _context) {
    if (!_positions.length) return false;
    const start = _positions.shift();
    _context.moveTo(
        start[0], 
        tileDefinition - start[1]
    );
    _positions.forEach(pos => {
        _context.lineTo(
            pos[0], 
            tileDefinition - pos[1]
        );
    });
}

function createCanvas(_nb, _size) {
    const list = [];
    for (let i = 0; i < _nb; i ++) {
        const canvas = document.createElement('canvas');
        canvas.width = _size;
        canvas.height = _size;
        list.push(canvas);
    }
    return list;
}


export {api as default};