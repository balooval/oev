import { texture as TextureLoader } from '../net/textures.js';
import { loader as MapLoader } from '../tileExtensions/map/mapLoader.js';
import * as TileExtension from '../tileExtensions/tileExtension.js';
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	Mesh,
	Texture,
	MeshPhysicalMaterial,
	Vector2,
} from 'three';
import Evt from './event.js';
import * as GEO from './geo.js';
import Renderer from './renderer.js';

export const MAP_SIZE = 256;
export const TILES_DEFINITION = 32;
export const TILES_VERTICES_COUNT = (TILES_DEFINITION + 1) * (TILES_DEFINITION + 1);
const tileBaseGeometry = buildTileBaseGeometry();

export class TileBasic {
		
	constructor(globe, _tileX, _tileY, _zoom, parent = null) {
		this.globe = globe;
		this.evt = new Evt();
		this.isReady = false;
		this.onStage = true;
		this.parentTile = parent;
		this.parentOffset = {
			x: 0,
			y: 0,
		};
		this.uvOffset = {
			x: 0,
			y: 0,
		};
		this.tileX = _tileX;
		this.tileY = _tileY;
		this.zoom = _zoom;
		this.childTiles = [];
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.meshe = undefined;
		this.key = this.tileX + '_' + this.tileY + '_' + this.zoom;
		this.verticesNb = (TILES_DEFINITION + 1) * (TILES_DEFINITION + 1);
		this.startCoord = GEO.tileToCoordsVect(this.tileX, this.tileY, this.zoom);
		this.endCoord = GEO.tileToCoordsVect(this.tileX + 1, this.tileY + 1, this.zoom);
		this.startLargeCoord = GEO.tileToCoordsVect(this.tileX - 1, this.tileY - 1, this.zoom);
		this.endLargeCoord = GEO.tileToCoordsVect(this.tileX + 2, this.tileY + 2, this.zoom);
		this.startMidCoord = GEO.tileToCoordsVect(this.tileX - 0.5, this.tileY - 0.5, this.zoom);
		this.endMidCoord = GEO.tileToCoordsVect(this.tileX + 1.5, this.tileY + 1.5, this.zoom);
		this.middleCoord = new Vector2((this.startCoord.x + this.endCoord.x) / 2, (this.startCoord.y + this.endCoord.y) / 2);
		this.bbox = [
			this.startCoord.x, // min X
			this.endCoord.x, // max X
			this.endCoord.y, // min Y
			this.startCoord.y, // max Y
		];
		this.corners = [
			new Vector2(this.startCoord.x, this.startCoord.y),
			new Vector2(this.startCoord.x, this.endCoord.y),
			new Vector2(this.endCoord.x, this.startCoord.y),
			new Vector2(this.endCoord.x, this.endCoord.y),
			new Vector2(this.middleCoord.x, this.middleCoord.y),
		];

		this.distToCam = this.globe.getTileDistance(this);
        
        this.extensionsMaps = new Map();
		this.composeMap = this.#createCanvas();
		this.composeContext = this.composeMap.getContext('2d');
		this.composeContext.fillStyle = "#ffffff";
		this.composeContext.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
		this.diffuseTexture = new Texture(this.composeMap);
		this.diffuseTexture.needsUpdate = true;
		
        this.extensionsNormalsMaps = new Map();
		this.composeNormalMap = this.#createCanvas();
		this.composeNormalContext = this.composeNormalMap.getContext('2d');
		this.composeNormalContext.drawImage(TextureLoader('neutralNormal').image, 0, 0, MAP_SIZE, MAP_SIZE);
		this.normalTexture = new Texture(this.composeNormalMap);
		this.normalTexture.needsUpdate = true;

		// this.diffuseMap = null;

		this.material = new MeshPhysicalMaterial({
			color: 0xffffff,
			roughness: 0.8,
			metalness: 0,
			map: this.diffuseTexture,
			normalMap: this.normalTexture,
		});

		this.extensions = new Map();
		TileExtension.listActives().forEach(p => this.addExtension(p));
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.#onExtensionActivation);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', this, this.#onExtensionDisabled);

		this.directionToCamera = new Vector2();
		this.viewByCamera = false;
		this.detailMargin = 1;

		this.viewByCameraCornerVector = new Vector2();
		this.viewByCameraCoordVector = new Vector2();


		this.bufferVerticesPlaneCoords = this.#computeVerticesCoords();
    }

	// drawOnDiffuseMap(drawerId, image) {
	// 	this.extensionsMaps.set(drawerId, image);
	// 	this.redrawDiffuse();
	// }
	
	// clearDiffuseLayer(drawerId) {
	// 	this.extensionsMaps.delete(drawerId);
	// 	this.redrawDiffuse();
	// }

	// redrawDiffuse() {
	// 	if (!this.diffuseMap) {
	// 		return;
	// 	}

	// 	this.composeContext.fillStyle = "#ffffff";
	// 	this.composeContext.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

	// 	this.composeContext.drawImage(this.diffuseMap, 0, 0, 256, 256, 0, 0, MAP_SIZE, MAP_SIZE);
    //     this.extensionsMaps.forEach(map => {
	// 		this.composeContext.drawImage(map, 0, 0);
    //     });

    //     this.diffuseTexture.needsUpdate = true
    //     Renderer.MUST_RENDER = true;

	// 	// this.#debug('x:' + this.tileX + ' y:' + this.tileY + ' z:' + this.zoom);
    // }

	// TODO: gérer ces "calques" dans une classe dédiée qui saur as'occuper de tous les types de map de la même manière (diffuse, normal, ...)
	drawOnNormalMap(drawerId, image) {
		this.extensionsNormalsMaps.set(drawerId, image);
		this.redrawNormalMap();
	}
	
	clearNormalLayer(drawerId) {
		this.extensionsNormalsMaps.delete(drawerId);
		this.redrawNormalMap();
	}

	redrawNormalMap() {
		this.composeNormalContext.drawImage(TextureLoader('neutralNormal').image, 0, 0, MAP_SIZE, MAP_SIZE);

        this.extensionsNormalsMaps.forEach(map => {
			this.composeNormalContext.drawImage(map, 0, 0);
        });

        this.normalTexture.needsUpdate = true
        Renderer.MUST_RENDER = true;
    }

	#createCanvas() {
		const canvas = new OffscreenCanvas(MAP_SIZE, MAP_SIZE);
		return canvas;
	}
	
	#onExtensionActivation(extensionId) {
		this.addExtension(extensionId);
	}

	#onExtensionDisabled(extensionId) {
		this.removeExtension(extensionId);
	}
	
	addExtension(extensionId) {
		if (this.#ownExtension(extensionId)) {
			return false;
		}

		const ext = new TileExtension.extensions[extensionId](this);
		this.extensions.set(extensionId, ext);

		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].addExtension(extensionId);
		}

		return true;
	}
	
	#ownExtension(extensionId) {
        return this.extensions.has(extensionId);
	}
	
	removeExtension(extensionId) {
        const extension = this.extensions.get(extensionId);
        if (extension) {
            extension.dispose();
            this.extensions.delete(extensionId);
        }
		
		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].removeExtension(extensionId);
		}
	}

	getParent(zoomTarget) {
		if (this.zoom == zoomTarget) {
			return this;
		}

		if (!this.parentTile) {
			return null;
		}

		return this.parentTile.getParent(zoomTarget);
	}

	#nearestTextures() {
		if (this.textureLoaded) {
			return null;
		}

		const defaultDatas = {
			map : TextureLoader("checker"), 
			uvReduc : 1, 
			offsetX : 0, 
			offsetY : 0, 
		};

		if (!this.parentTile) {
			return defaultDatas;
		}

		let curParent = this.parentTile;
		let uvReduc = 0.5;

		let curOffsetX = this.uvOffset.x * 0.5;
		let curOffsetY = this.uvOffset.y * 0.5;

		while (curParent && !curParent.textureLoaded) {
			uvReduc *= 0.5;
			curOffsetX = curParent.uvOffset.x * 0.5 + (curOffsetX * 0.5);
			curOffsetY = curParent.uvOffset.y * 0.5 + (curOffsetY * 0.5);
			curParent = curParent.parentTile;
		}

		if (!curParent) {
			return defaultDatas;
		}

		return {
			map : curParent.material.map, 
			uvReduc : uvReduc, 
			offsetX : curOffsetX, 
			offsetY : curOffsetY, 
		};
	}

	#applyTexture(textureDatas) {
		if (textureDatas === null) {
			return false;
		}
		
		if (this.meshe === undefined) {
			return false;
		}

        // this.diffuseMap = textureDatas.map.image;
		
		this.composeContext.drawImage(
			textureDatas.map.image,
			MAP_SIZE * textureDatas.offsetX,
			MAP_SIZE * textureDatas.offsetY,
			MAP_SIZE * textureDatas.uvReduc,
			MAP_SIZE * textureDatas.uvReduc,
			0,
			0,
			MAP_SIZE,
			MAP_SIZE
		);

		this.diffuseTexture.needsUpdate = true

		this.#debug('x:' + this.tileX + ' y:' + this.tileY + ' z:' + this.zoom);
	}

	#computeVerticesCoords() {
		const vertBySide = TILES_DEFINITION + 1;
		const vertNb = vertBySide * vertBySide;
		const verticesCoords = new Float32Array(vertNb * 2);
		let coordId = 0;
		const stepCoordX = (this.endCoord.x - this.startCoord.x) / TILES_DEFINITION;
		const stepCoordY = (this.startCoord.y - this.endCoord.y) / TILES_DEFINITION;

		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				verticesCoords[coordId + 0] = this.startCoord.x + (stepCoordX * x);
				verticesCoords[coordId + 1] = this.endCoord.y + (stepCoordY * y);
				coordId += 2;
			}
		}
		return verticesCoords;
	}

	buildGeometry() {
		const tileGeometry = tileBaseGeometry.clone();
		const verticePositions = tileGeometry.getAttribute('position');
		let curVertId = 0;
		
		for (let i = 0; i < this.bufferVerticesPlaneCoords.length / 2; i ++) {
			const vertPos = this.globe.coordToXYZ(
				this.bufferVerticesPlaneCoords[i * 2], 
				this.bufferVerticesPlaneCoords[i * 2 + 1], 
				0
			);
			verticePositions.array[curVertId + 0] = vertPos[0];
			verticePositions.array[curVertId + 1] = vertPos[1];
			verticePositions.array[curVertId + 2] = vertPos[2];
			
			curVertId += 3;
		}

		verticePositions.needsUpdate = true;
		tileGeometry.computeVertexNormals();

		if (this.meshe !== undefined) {
			this.globe.removeMeshe(this.meshe);
			this.meshe.geometry.dispose();
		}

		this.meshe = new Mesh(tileGeometry, this.material);

		if (this.onStage) {
			this.globe.addMeshe(this.meshe);
		}

		this.meshe.castShadow = true;
		this.meshe.receiveShadow = true;
		const parentTexture = this.#nearestTextures();
		this.#applyTexture(parentTexture);
		this.isReady = true;
		this.evt.fireEvent('TILE_READY');
	}

	updategeometry() {
		this.globe.removeMeshe(this.meshe);
		this.meshe.geometry.dispose();
		this.buildGeometry();

		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].updategeometry();
		}
	}

	refreshVertices() {
		const verticePositions = this.meshe.geometry.getAttribute('position');
		verticePositions.needsUpdate = true;
		this.meshe.geometry.verticesNeedUpdate = true;
		this.meshe.geometry.uvsNeedUpdate = true;
		this.meshe.geometry.computeVertexNormals();
		Renderer.MUST_RENDER = true;
	}

	searchTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom > _zoom) {
			return false;
		}
		
		if (this.#isTileAtXYZ(_tileX, _tileY, _zoom)) {
			return this;
		}
		
		for (let i = 0; i < this.childTiles.length; i ++) {
			const res = this.childTiles[i].searchTileAtXYZ(_tileX, _tileY, _zoom);
			if (res) {
				return res;
			}
		}
		
		if (this.#containTileAtXYZ(_tileX, _tileY, _zoom)) {
			return this;
		}

		return null;
	}
	
	#containTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom >= _zoom) {
			return false;
		}
		const zoomDiff = _zoom - this.zoom;
		const zoomX = this.tileX * Math.pow(2, zoomDiff);
		const zoomY = this.tileY * Math.pow(2, zoomDiff);
		if (_tileX < zoomX) return false;
		if (_tileY < zoomY) return false;
		if (_tileX > zoomX + 1) return false;
		if (_tileY > zoomY + 1) return false;
		return true;
	}

	#isTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom != _zoom) return false;
		if (this.tileX != _tileX) return false;
		if (this.tileY != _tileY) return false;
		return true;
	}

	show() {
		if (this.onStage) {
			return false;
		}

		this.onStage = true;
		this.globe.addMeshe(this.meshe);
		this.meshe.material.visible = true;
		this.evt.fireEvent('SHOW');
	}
	
	hide() {
		if (!this.onStage) {
			return false;
		}

		this.onStage = false;
		this.globe.removeMeshe(this.meshe);
		this.meshe.material.visible = false;

		if (!this.textureLoaded) {
			MapLoader.abort({
				z : this.zoom, 
				x : this.tileX, 
				y : this.tileY
			});
		}

		this.evt.fireEvent('HIDE');
	}

	#createChilds() {
		if (this.childTiles.length > 0) {
			return false;
		}

		this.#addChild(0, 0, 0, 0);
		this.#addChild(0, 1, 0, 1);
		this.#addChild(1, 0, 1, 0);
        this.#addChild(1, 1, 1, 1);
        this.evt.fireEvent('ADD_CHILDRENS');
	}
		
	#addChild(tileOffsetX, tileOffsetY, uvOffsetX, uvOffsetY) {
		const newTile = new TileBasic(
			this.globe,
			this.tileX * 2 + tileOffsetX,
			this.tileY * 2 + tileOffsetY,
			this.zoom + 1,
			this
		);
		newTile.parentOffset = {
			x: tileOffsetX,
			y: tileOffsetY,
		};
		newTile.uvOffset = {
			x: uvOffsetX,
			y: uvOffsetY,
		};
		newTile.buildGeometry();
		this.childTiles.push(newTile);
	}

	#clearChildrens() {
		if (this.childTiles.length == 0) {
			return false;
		}

		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].dispose();
		}

		this.childTiles = [];
	}

	onCameraUpdated(cameraDatas) {
		this.viewByCamera = this.#isViewByCamera(cameraDatas);

		if (this.viewByCamera === false) {
			this.detailMargin = 1;
			this.#clearChildrens();
			this.show();
			return;
		}

		this.detailMargin = Math.max(cameraDatas.detailMargin, this.detailMargin);
		
		if (this.zoom === Math.floor(cameraDatas.zoom)) {
			this.#clearChildrens();
			this.show();
			return;
		}
		
		// if (this.#cameraIsOver(cameraDatas.coordCam, this.globe.tilesDetailsMarge * 2)) {
		if (this.#cameraIsOver(cameraDatas.coordCam, this.detailMargin)) {
			addTileToSplit(this, cameraDatas);
			return;
		}
		
		this.#clearChildrens();
		this.show();
    }

	split(cameraDatas) {
		this.#createChilds();
		this.hide();

		for (let c = 0; c < this.childTiles.length; c ++) {
			this.childTiles[c].onCameraUpdated(cameraDatas);
		}
	}
	
	#isViewByCamera(cameraDatas) {
		if (this.#cameraIsOver(cameraDatas.coordCam, 1) === true) {
			return true;
		}

		this.viewByCameraCoordVector.x = cameraDatas.coordCam.x;
		this.viewByCameraCoordVector.y = cameraDatas.coordCam.y;
		
		for (let i = 0; i < this.corners.length; i ++) {
			this.directionToCamera.subVectors(
				this.corners[i],
				this.viewByCameraCoordVector
			).normalize();

			const dot = this.directionToCamera.dot(cameraDatas.viewDirection);
			
			if (dot > 0.4) {
				return true;
			}
		}

		return false;
	}
	
	getCurTile(coords) {
		if (this.#cameraIsOver(coords, 1) === false) {
			return false;
		}
		
		if (this.childTiles.length == 0) {
			return this;
		}

		const childs = this.childTiles
		.map(tile => tile.getCurTile(coords))
		.filter(res => res);
		return childs.pop();
	}

	#cameraIsOver(coords, margin) {
		const startLimit = GEO.tileToCoords(this.tileX - (margin - 1), this.tileY - (margin - 1), this.zoom);
		const endLimit = GEO.tileToCoords(this.tileX + margin, this.tileY + margin, this.zoom);

		if (startLimit[0] > coords.x) return false;
		if (endLimit[0] < coords.x) return false;
		if (startLimit[1] < coords.y) return false;
		if (endLimit[1] > coords.y) return false;

		return true;
	}

	setTexture(_texture) {
		this.textureLoaded = true;
		this.remoteTex = _texture;
		this.#applyTexture({
			map : this.remoteTex, 
			uvReduc : 1, 
			offsetX : 0, 
			offsetY : 0, 
		});
        Renderer.MUST_RENDER = true;
        this.evt.fireEvent('TEXTURE_LOADED');
	}

	unsetTexture() {
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.material.map = TextureLoader('checker');
	}

	#debug(value) {
		// this.composeContext.fillStyle = "#ffffff";
		// this.composeContext.fillRect(50, 100, 150, 100);
		this.composeContext.fillStyle = "#000000";
		this.composeContext.font = "20px serif";
		this.composeContext.fillText(' ' + value, 10, 20);
        this.diffuseTexture.needsUpdate = true
	}

	dispose() {
		TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE', this, this.#onExtensionActivation);
		this.#clearChildrens();
		this.hide();

		if (this.meshe != undefined) {
			this.meshe.geometry.dispose();
			this.material.map.dispose();
			if (this.material.normalMap) {
				this.material.normalMap.dispose();
			}
			this.material.dispose();
		}

		if (this.textureLoaded) {
			this.remoteTex.dispose();
		}

		this.composeMap = null;
		this.normalTexture.dispose();
		this.normalTexture = null;
		this.diffuseTexture.dispose();
		this.diffuseTexture = null;

		this.extensions.clear();
        this.extensionsMaps.clear();
        this.extensionsNormalsMaps.clear();
		this.isReady = false;
		this.evt.fireEvent('DISPOSE');

		this.evt.clear();

		removeTileToSplit(this);

	}
}

const tilesToSplit = new Map();
let splitTimeoutId = null;

function removeTileToSplit(tile) {
	tilesToSplit.delete(tile);
}

function addTileToSplit(tile, cameraData) {
	tile.distToCam = Math.abs(cameraData.coordLookat.x - tile.middleCoord.x) + Math.abs(cameraData.coordLookat.y - tile.middleCoord.y);

	tilesToSplit.set(tile, cameraData);
	tilesToSplit.delete(tile.parentTile);

	if (splitTimeoutId === null) {
		splitNextTile();
	}
}

function splitNextTile() {
	if (tilesToSplit.size === 0) {
		splitTimeoutId = null;
		return;
	}

	const nextTileData = getNextTileToSplit();
	nextTileData.tile.split(nextTileData.cameraData);
	splitTimeoutId = setTimeout(splitNextTile, 1);
}

function getNextTileToSplit() {
	const nearest = {
		distance: 99999999,
		tile: null,
	};

	for (const tile of tilesToSplit.keys()) {
		const modulatedDistance = tile.distToCam / tile.zoom;
		if (modulatedDistance < nearest.distance) {
			nearest.distance = modulatedDistance,
			nearest.tile = tile;
		}
	}

	const cameraData = tilesToSplit.get(nearest.tile);
	tilesToSplit.delete(nearest.tile);

	return {
		tile: nearest.tile,
		cameraData: cameraData
	};
}


function buildTileBaseGeometry() {
	const bufferVertices = new Float32Array(TILES_VERTICES_COUNT * 3);
	const bufferNormals = new Float32Array(TILES_VERTICES_COUNT * 3);
	const bufferUvs = new Float32Array(TILES_VERTICES_COUNT * 2);
	
	const vertBySide = TILES_DEFINITION + 1;
	const verticesCount = vertBySide * vertBySide;
	let curVertId = 0;
	
	for (let i = 0; i < verticesCount / 2; i ++) {
		bufferVertices[curVertId + 0] = 0;
		bufferVertices[curVertId + 1] = 0;
		bufferVertices[curVertId + 2] = 0;
		
		bufferNormals[curVertId + 0] = 0;
		bufferNormals[curVertId + 1] = 1;
		bufferNormals[curVertId + 2] = 0;

		curVertId += 3;
	}

	let faceId = 0;
	const facesCount = (TILES_DEFINITION * TILES_DEFINITION) * 2;
	const bufferFaces = new Uint32Array(facesCount * 3);
	
	for (let x = 0; x < TILES_DEFINITION; x ++) {
		for (let y = 0; y < TILES_DEFINITION; y ++) {
			bufferFaces[faceId + 0] = (x * vertBySide) + y;
			bufferFaces[faceId + 2] = (x * vertBySide) + y + 1;
			bufferFaces[faceId + 1] = ((x + 1) * vertBySide) + y + 1;
			
			bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1;
			bufferFaces[faceId + 5] = ((x + 1) * vertBySide) + y;
			bufferFaces[faceId + 4] = (x * vertBySide) + y;
			faceId += 6;
		}
	}
	
	let stepUV = 1 / TILES_DEFINITION;
	let uvIndex = 0;

	for (let x = 0; x < vertBySide; x ++) {
		for (let y = 0; y < vertBySide; y ++) {
			uvIndex = (x * vertBySide) + y;
			bufferUvs[uvIndex * 2] = stepUV * x;
			bufferUvs[uvIndex * 2 + 1] = stepUV * y;
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
	geometry.setAttribute('normal', new BufferAttribute(bufferNormals, 3));
	geometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
	geometry.setIndex(new BufferAttribute(bufferFaces, 1));
	geometry.computeVertexNormals();

	return geometry;
}