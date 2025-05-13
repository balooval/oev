
import PolygonClipping from '../vendor/polygon-clipping.module.js';
import * as MATH from '../core/math.js';

const canvasSize = 256;
const textureSize = 256;

const canvasFinal = new OffscreenCanvas(canvasSize, canvasSize);
const contextFinal = canvasFinal.getContext('2d', {willReadFrequently: true, alpha: false});

let texturesImages = {};

onmessage = function (evt) {
    const command = evt.data.command;
    const response = {
        command: command,
    };

    if (command === 'test') {
        response.message = 'OK test, ' + evt.data.datas;

    } else if (command === 'uploadTextures') {
        texturesImages = evt.data.textures;
        response.message = 'OK uploadTextures';

    } else if (command === 'draw') {
        response.message = 'OK draw';
        response.tileKey = evt.data.tileKey;
        
        response.imagesDatas = createMaterialTexture(evt.data.landusesDatas, evt.data.tileBbox, evt.data.tilePolygon);
        
    } else {
        response.message = 'Commande ' + command + ' inconnue';
    }

    postMessage(response);
};


function createMaterialTexture(landusesDatas, tileBbox, tilePolygon) {
    const res = {
        'map': null,
    };

    contextFinal.fillStyle = '#b2b195';
    contextFinal.fillRect(0, 0, textureSize, textureSize);

    for (let i = 0; i < landusesDatas.length; i ++) {
        buildLanduse(landusesDatas[i], tilePolygon, tileBbox);
    }

    res.map = contextFinal.getImageData(0, 0, textureSize, textureSize);
    contextFinal.clearRect(0, 0, textureSize, textureSize);

    return res;
}

function buildLanduse(landuse, tilePolygon, tileBbox) {
    const typesColors = {
        forest: 'rgb(123, 153, 61)',
        scrub: 'rgb(149, 173, 52)',
        residential: 'rgb(179, 181, 171)',
        rock: 'rgb(159, 169, 173)',
        vineyard: 'rgb(112, 102, 41)',
        grass: 'rgb(162, 193, 104)',
    };

    if (!typesColors[landuse.type]) {
        console.log(landuse.type);
    }

    const color = typesColors[landuse.type] ?? '#ff0000';

    if (landuse.border.length === 0) {
        return false;
    }

    const canvasBorderPositions = convertCoordToCanvasPositions([landuse.border], tileBbox);
    const canvasHolesPositions = convertCoordToCanvasPositions(landuse.holes, tileBbox);

    drawCanvasShape(
        canvasBorderPositions[0],
        canvasHolesPositions,
        color
    );
    
    /*
    const polygon = [
        landuse.border,
        ...landuse.holes
    ];

    const multipolygons = PolygonClipping.intersection([tilePolygon], [polygon]);

    if (multipolygons.length === 0) {
        return false;
    }

    for (let i = 0; i < multipolygons.length; i ++) {
        const polygon = multipolygons[i];
        
        const border = polygon.shift().slice(1);
        const holes = polygon.map(hole => hole.slice(1));

        const canvasBorderPositions = convertCoordToCanvasPositions([border], tileBbox);
        const canvasHolesPositions = convertCoordToCanvasPositions(holes, tileBbox);

        drawCanvasShape(
            canvasBorderPositions[0],
            canvasHolesPositions,
            color,
        );
    }
    */
    
    return true;
}


function convertCoordToCanvasPositions(coords, tileBox) {
    const res = [];

    for (let i = 0; i < coords.length; i ++) {
        const positions = coordToCanvas(tileBox, textureSize, coords[i]);
        res.push(positions);
    }

    return res;
}


function drawCanvasShape(coords, holesCoords, color) {
    contextFinal.fillStyle = color;
    contextFinal.beginPath();
    
    drawPolygon(coords);
    
    for (let h = 0; h < holesCoords.length; h ++) {
        drawPolygon(holesCoords[h]);
    }
    
    contextFinal.closePath();
    contextFinal.fill('evenodd');
    // contextFinal.fill();
}

function drawPolygon(coords) {
    
    const start = coords[0];
    
    contextFinal.moveTo(start[0], start[1]);
    for (let i = 1; i < coords.length; i ++) {
        contextFinal.lineTo(coords[i][0], coords[i][1]);
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

function coordToCanvas(box, canvasSize, coords) {
    const points = new Array(coords.length);
    for (let i = 0; i < coords.length; i ++) {
        const coord = coords[i];
        const point = [
            Math.round(MATH.mapValue(coord[0], box[0], box[1]) * canvasSize),
            Math.round(canvasSize - (MATH.mapValue(coord[1], box[2], box[3]) * canvasSize)),
        ];
        points[i] = point;
    }
    return points;
}