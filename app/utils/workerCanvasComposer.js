import GEO from '../core/geo.js';
import PolygonClipping from '../vendor/polygon-clipping.module.js';

const canvasSize = 256;
const textureSize = 256;

const canvasFinal = new OffscreenCanvas(canvasSize, canvasSize);
const contextFinal = canvasFinal.getContext('2d', {willReadFrequently: true});

let texturesImages = {};

onconnect = function (e) {
    const port = e.ports[0];
    
    port.onmessage = function (evt) {
        
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

        port.postMessage(response);
    };
};
  

function createMaterialTexture(landusesDatas, tileBbox, tilePolygon) {
    const res = {};
    
    const textureMaps = [
        'map',
        'normalMap',
        // 'roughnessMap',
    ];

    for (const mapType of textureMaps) {
        fillWithEmptyTexture(mapType); // Attention, remplit aussi les mers !
        for (let i = 0; i < landusesDatas.length; i ++) {
            const textureImage = texturesImages[`${mapType}_${landusesDatas[i].type}`];
            if (!textureImage) {
                console.warn(`Aucune texture pour ${mapType} et ${landusesDatas[i].type}`);
            }
            buildLanduse(landusesDatas[i], tilePolygon, tileBbox, textureImage);
        }

        res[mapType] = contextFinal.getImageData(0, 0, textureSize, textureSize);
        contextFinal.clearRect(0, 0, textureSize, textureSize);
    }

    return res;
}

function buildLanduse(landuse, tilePolygon, tileBbox, map) {
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
            map,
        );
    }
    
    return true;
}


function convertCoordToCanvasPositions(coords, tileBox) {
    const res = [];

    for (let i = 0; i < coords.length; i ++) {
        const positions = GEO.coordToCanvas(tileBox, textureSize, coords[i]);
        res.push(positions);
    }

    return res;
}


function drawCanvasShape(coords, holesCoords, map) {
    const pattern = contextFinal.createPattern(map, 'repeat');
    contextFinal.fillStyle = pattern;
    contextFinal.beginPath();
    
    drawPolygon(coords);
    
    for (let h = 0; h < holesCoords.length; h ++) {
        drawPolygon(holesCoords[h]);
    }
    
    contextFinal.closePath();
    contextFinal.fill('evenodd');
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