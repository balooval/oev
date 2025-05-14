
import * as MATH from '../core/math.js';

const canvasSize = 256;
const textureSize = 256;

const noiseSize = 50;

const canvasFinal = new OffscreenCanvas(canvasSize, canvasSize);
const contextFinal = canvasFinal.getContext('2d', {willReadFrequently: true, alpha: false});
const canvasNormal = new OffscreenCanvas(canvasSize, canvasSize);
const contextNormal = canvasNormal.getContext('2d', {willReadFrequently: true, alpha: true});

const canvasNoisePattern = new OffscreenCanvas(noiseSize, noiseSize);
const contextNoisePattern = canvasNoisePattern.getContext('2d', {willReadFrequently: true, alpha: false});

const canvasNoiseResult = new OffscreenCanvas(noiseSize, noiseSize);
const contextNoiseResult = canvasNoiseResult.getContext('2d', {willReadFrequently: true, alpha: false});

const noisePattern = initNoisePattern();

let texturesImages = {};
let patterns = new Map();

onmessage = function (evt) {
    const command = evt.data.command;
    const response = {
        command: command,
    };

    if (command === 'test') {
        response.message = 'OK test, ' + evt.data.datas;

    } else if (command === 'uploadTextures') {
        // texturesImages = evt.data.textures;
        // response.message = 'OK uploadTextures';
        // testPattern = contextFinal.createPattern(evt.data.map, 'repeat');
        evt.data.patterns.forEach(pattern => {
            patterns.set(pattern.type, contextFinal.createPattern(pattern.image, 'repeat'));
        });
        

    } else if (command === 'noise') {
        response.tileKey = evt.data.tileKey;
        response.type = evt.data.type;
        response.landuseData = evt.data.landuseData;
        response.imagesDatas = createNoiseTexture(evt.data.landuseData, evt.data.tileBbox);

    } else if (command === 'draw') {
        response.message = 'OK draw';
        response.tileKey = evt.data.tileKey;
        
        response.imagesDatas = createMaterialTexture(evt.data.landusesDatas, evt.data.tileBbox);
        
    } else {
        response.message = 'Commande ' + command + ' inconnue';
    }

    postMessage(response);
};


function createNoiseTexture(landuseData, tileBbox) {
    contextNoiseResult.fillStyle = '#000000';
    contextNoiseResult.fillRect(0, 0, noiseSize, noiseSize);

    drawLanduseNoise(landuseData, tileBbox);

    const imageData = contextNoiseResult.getImageData(0, 0, noiseSize, noiseSize);
    contextNoiseResult.clearRect(0, 0, noiseSize, noiseSize);

    return imageData;
}

function drawLanduseNoise(landuse, tileBbox) {
    if (landuse.border.length === 0) {
        return;
    }

    const canvasBorderPositions = convertCoordToCanvasPositions([landuse.border], tileBbox, noiseSize);
    const canvasHolesPositions = convertCoordToCanvasPositions(landuse.holes, tileBbox, noiseSize);

    contextNoiseResult.fillStyle = noisePattern;
    contextNoiseResult.beginPath();
    
    drawPolygon(canvasBorderPositions[0], contextNoiseResult);
    
    for (let h = 0; h < canvasHolesPositions.length; h ++) {
        drawPolygon(canvasHolesPositions[h], contextNoiseResult);
    }
    
    contextNoiseResult.closePath();
    contextNoiseResult.fill();
    // contextNoiseResult.fill('evenodd');
}

function createMaterialTexture(landusesDatas, tileBbox) {
    const res = {
        'map': null,
    };

    contextFinal.fillStyle = patterns.get('ground') ??'#b2b195';
    contextFinal.fillRect(0, 0, textureSize, textureSize);

    for (let i = 0; i < landusesDatas.length; i ++) {
        buildLanduse(landusesDatas[i], tileBbox);
    }

    res.map = contextFinal.getImageData(0, 0, textureSize, textureSize);
    res.normal = contextNormal.getImageData(0, 0, textureSize, textureSize);
    contextFinal.clearRect(0, 0, textureSize, textureSize);
    contextNormal.clearRect(0, 0, textureSize, textureSize);

    return res;
}

function buildLanduse(landuse, tileBbox) {
    const typesColors = {
        // forest: 'rgb(123, 153, 61)',
        forest: patterns.get('forest') ?? 'rgb(81, 122, 46)',
        scrub: patterns.get('scrub') ?? 'rgb(149, 173, 52)',
        residential: patterns.get('road') ?? 'rgb(179, 181, 171)',
        rock: patterns.get('rock') ?? 'rgb(159, 169, 173)',
        vineyard: 'rgb(112, 102, 41)',
        grass: patterns.get('grass') ?? 'rgb(162, 193, 104)',
    };

    if (!typesColors[landuse.type]) {
        console.log(landuse.type);
    }

    const color = typesColors[landuse.type] ?? '#ff0000';

    if (landuse.border.length === 0) {
        return false;
    }

    const canvasBorderPositions = convertCoordToCanvasPositions([landuse.border], tileBbox, canvasSize);
    const canvasHolesPositions = convertCoordToCanvasPositions(landuse.holes, tileBbox, canvasSize);

    drawCanvasShape(
        canvasBorderPositions[0],
        canvasHolesPositions,
        contextFinal,
        color
    );

    const typesNormal = {
        forest: patterns.get('forest-normal'),
        rock: patterns.get('rock-normal'),
        scrub: patterns.get('scrub-normal'),
        grass: patterns.get('grass-normal'),
    };
    const normalPattern = typesNormal[landuse.type] ?? patterns.get('ground-normal');

    drawCanvasShape(
        canvasBorderPositions[0],
        canvasHolesPositions,
        contextNormal,
        normalPattern
    );
    
    return true;
}


function convertCoordToCanvasPositions(coords, tileBox, size) {
    const res = [];

    for (let i = 0; i < coords.length; i ++) {
        const positions = coordToCanvas(tileBox, size, coords[i]);
        res.push(positions);
    }

    return res;
}


function drawCanvasShape(coords, holesCoords, context, color) {
    context.fillStyle = color;
    context.beginPath();
    
    drawPolygon(coords, context);
    
    for (let h = 0; h < holesCoords.length; h ++) {
        drawPolygon(holesCoords[h], context);
    }
    
    context.closePath();
    context.fill('evenodd');
}

function drawPolygon(coords, context) {
    
    const start = coords[0];
    
    context.moveTo(start[0], start[1]);
    for (let i = 1; i < coords.length; i ++) {
        context.lineTo(coords[i][0], coords[i][1]);
    }
}

function fillWithEmptyTexture(mapType) {
    const textureImage = texturesImages[`${mapType}_empty`];
    const pattern = contextFinal.createPattern(textureImage, 'repeat');
    contextFinal.fillStyle = pattern;
    contextFinal.beginPath();
    contextFinal.fillRect(0, 0, textureSize, textureSize);
    contextFinal.closePath();
}

function coordToCanvas(box, size, coords) {
    const points = new Array(coords.length);
    for (let i = 0; i < coords.length; i ++) {
        const coord = coords[i];
        const point = [
            Math.round(MATH.mapValue(coord[0], box[0], box[1]) * size),
            Math.round(size - (MATH.mapValue(coord[1], box[2], box[3]) * size)),
        ];
        points[i] = point;
    }
    return points;
}

function initNoisePattern() {
    contextNoisePattern.fillStyle = '#ffffff';
    for (let x = 0; x < noiseSize; x ++) {
        for (let y = 0; y < noiseSize; y ++) {
            if (Math.random() > 0.2) {
                contextNoisePattern.fillRect(x, y, 1, 1);
            }
        }
    }

    return contextNoiseResult.createPattern(canvasNoisePattern, 'repeat');
}