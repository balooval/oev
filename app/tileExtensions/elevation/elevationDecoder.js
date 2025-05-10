import {TILES_DEFINITION} from '../../core/tile.js';

const canvasSize = TILES_DEFINITION + 1;
const canvas = new OffscreenCanvas(canvasSize, canvasSize);
const context = canvas.getContext('2d', {willReadFrequently: true});

export function extractElevation(eleBuffer, image, imageWidth, imageHeight) {
    context.drawImage(image, 0, 0, imageWidth, imageHeight);
    const imageData = context.getImageData(0, 0, imageWidth, imageHeight).data;
    let bufferIndex = 0;

    for (let x = 0; x < imageWidth; ++x) {
        for (let y = imageHeight - 1; y >= 0; y --) {
            let index = (y * imageWidth + x) * 4;
            const red = imageData[index];
            index ++;
            const blue = imageData[++index];
            const green = imageData[++index];
			const centimeters = green / 100;
            const alt = red * 256 + blue + centimeters;
            eleBuffer[bufferIndex] = alt;
            bufferIndex ++;
        }
    }

    return eleBuffer;
}
