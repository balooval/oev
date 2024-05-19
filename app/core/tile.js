import { texture as TextureLoader } from '../net/textures.js';
import { loader as MapLoader } from '../tileExtensions/map/mapLoader.js';
import * as TileExtension from '../tileExtensions/tileExtension.js';
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DataTexture,
	DoubleSide,
	Mesh,
	Texture,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	MeshBasicMaterial,
	Vector2,
	Vector3,
} from '../vendor/three.module.js';
import Evt from './event.js';
import GEO from './geo.js';
import GLOBE from './globe.js';
import Renderer from './renderer.js';
import * as NET_TEXTURES from '../net/textures.js';

export const mapSize = 256;

export class TileBasic {
		
	constructor(_tileX, _tileY, _zoom, parent = null) {
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
		this.verticesNb = (GLOBE.tilesDefinition + 1) * (GLOBE.tilesDefinition + 1);
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

		this.distToCam = ((GLOBE.coordDetails.x - this.middleCoord.x) * (GLOBE.coordDetails.x - this.middleCoord.x) + (GLOBE.coordDetails.y - this.middleCoord.y) * (GLOBE.coordDetails.y - this.middleCoord.y));
        
        this.extensionsMaps = new Map();
		this.composeMap = this.#createCanvas();
		this.composeContext = this.composeMap.getContext('2d');
		this.diffuseTexture = new Texture(this.composeMap);
		this.diffuseTexture.needsUpdate = true;
		this.diffuseMap = null;


		this.material = new MeshPhysicalMaterial({
			color: 0xffffff,
			roughness: 0.7,
			metalness: 0,
			map: this.diffuseTexture,
			// map: dataTexture,
			// map: NET_TEXTURES.texture('landuse_color'),
			// roughnessMap: NET_TEXTURES.texture('landuse_roughness'),
			// normalMap: NET_TEXTURES.texture('landuse_normal'),
			// side: DoubleSide,
		});

		this.extensions = new Map();
		TileExtension.listActives().forEach(p => this.addExtension(p));
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.#onExtensionActivation);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', this, this.#onExtensionDisabled);

		// Coupé car ça bug : certaines tuiles parent sont encore affichées en même temps que leurs enfants, voir l'inverse aussi
		// this.isFacingCamera = true;
		this.directionToCamera = new Vector2();
		// this.tileUnitsPosition = GLOBE.coordToXYZ(this.middleCoord.x, this.middleCoord.y, 0);
		// if (this.zoom === 14) {
			// GLOBE.evt.addEventListener('GLOBE_CAMERA_UPDATE', this, this.onCameraUpdated);
		// }

		this.viewByCamera = false;
    }
    
    redrawDiffuse() {
		if (!this.diffuseMap) return;

		this.composeContext.fillStyle = "#ffffff";
		this.composeContext.fillRect(0, 0, mapSize, mapSize);

		this.composeContext.drawImage(this.diffuseMap, 0, 0, 256, 256, 0, 0, mapSize, mapSize);
        this.extensionsMaps.forEach(map => {
            this.composeContext.drawImage(map, 0, 0);
        });

		// this.#debugDot(this.zoom);
		
        this.diffuseTexture.needsUpdate = true
        Renderer.MUST_RENDER = true;
    }

	#createCanvas() {
		const canvas = document.createElement('canvas');
		canvas.width = mapSize;
		canvas.height = mapSize;
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

		const vertBySide = GLOBE.tilesDefinition + 1;
		const bufferUvs = new Float32Array(this.verticesNb * 2);
		let stepUV = textureDatas.uvReduc / GLOBE.tilesDefinition;
		let uvIndex = 0;

		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				uvIndex = (x * vertBySide) + y;
				bufferUvs[uvIndex * 2] = textureDatas.offsetX + (stepUV * x);
				bufferUvs[uvIndex * 2 + 1] = textureDatas.offsetY + (stepUV * y);
			}
		}

		this.meshe.geometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
        this.meshe.geometry.attributes.uv.needsUpdate = true;
        this.diffuseMap = textureDatas.map.image;
        this.evt.fireEvent('TEXTURE_CHANGED');
        this.redrawDiffuse();
	}

	getVerticesPlaneCoords() {
		const vertBySide = GLOBE.tilesDefinition + 1;
		const vertNb = vertBySide * vertBySide;
		const bufferCoords = new Float32Array(vertNb * 2);
		let coordId = 0;
		const stepCoordX = (this.endCoord.x - this.startCoord.x) / GLOBE.tilesDefinition;
		const stepCoordY = (this.startCoord.y - this.endCoord.y) / GLOBE.tilesDefinition;

		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				bufferCoords[coordId + 0] = this.startCoord.x + (stepCoordX * x);
				bufferCoords[coordId + 1] = this.endCoord.y + (stepCoordY * y);
				coordId += 2;
			}
		}
		return bufferCoords;
	}

	buildGeometry() {
		let curVertId = 0;
		const bufferVertices = new Float32Array(this.verticesNb * 3);
		const bufferNormals = new Float32Array(this.verticesNb * 3);
		const vertCoords = this.getVerticesPlaneCoords();
		
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			const vertPos = GLOBE.coordToXYZ(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				0
			);
			bufferVertices[curVertId + 0] = vertPos[0];
			bufferVertices[curVertId + 1] = vertPos[1];
			bufferVertices[curVertId + 2] = vertPos[2];
			
			bufferNormals[curVertId + 0] = 0;
			bufferNormals[curVertId + 1] = 1;
			bufferNormals[curVertId + 2] = 0;

			curVertId += 3;
		}

		const def = GLOBE.tilesDefinition;
		const vertBySide = def + 1;
		let faceId = 0;
		const nbFaces = (def * def) * 2;
		const bufferFaces = new Uint32Array(nbFaces * 3);

		for (let x = 0; x < def; x ++) {
			for (let y = 0; y < def; y ++) {
				bufferFaces[faceId + 0] = (x * vertBySide) + y;
				bufferFaces[faceId + 2] = (x * vertBySide) + y + 1;
				bufferFaces[faceId + 1] = ((x + 1) * vertBySide) + y + 1;
				
				bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1;
				bufferFaces[faceId + 5] = ((x + 1) * vertBySide) + y;
				bufferFaces[faceId + 4] = (x * vertBySide) + y;
				faceId += 6;
			}
		}
		const geoBuffer = new BufferGeometry();
		geoBuffer.setAttribute('position', new BufferAttribute(bufferVertices, 3));
		geoBuffer.setAttribute('normal', new BufferAttribute(bufferNormals, 3));
		geoBuffer.setIndex(new BufferAttribute(bufferFaces, 1));
		geoBuffer.computeVertexNormals();

		if (this.meshe !== undefined) {
			GLOBE.removeMeshe(this.meshe);
			this.meshe.geometry.dispose();
		}

		this.meshe = new Mesh(geoBuffer, this.material);

		if (this.onStage) {
			GLOBE.addMeshe(this.meshe);
		}

		this.meshe.castShadow = true;
		this.meshe.receiveShadow = true;
		const parentTexture = this.#nearestTextures();
		this.#applyTexture(parentTexture);
		this.isReady = true;
		this.evt.fireEvent('TILE_READY');
	}

	updateVertex() {
		GLOBE.removeMeshe(this.meshe);
		this.meshe.geometry.dispose();
		this.buildGeometry();

		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].updateVertex();
		}
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

	debug() {
		
	}

	show() {
		if (this.onStage) {
			return false;
		}

		this.onStage = true;
		GLOBE.addMeshe(this.meshe);
		this.meshe.material.visible = true;
		this.evt.fireEvent('SHOW');
	}
	
	hide() {
		if (!this.onStage) {
			return false;
		}

		this.onStage = false;
		GLOBE.removeMeshe(this.meshe);
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

		this.#addChild(0, 0, 0, 1);
		this.#addChild(0, 1, 0, 0);
		this.#addChild(1, 0, 1, 1);
        this.#addChild(1, 1, 1, 0);
        this.evt.fireEvent('ADD_CHILDRENS');
	}
		
	#addChild(tileOffsetX, tileOffsetY, uvOffsetX, uvOffsetY) {
		const newTile = new TileBasic(
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
			this.#clearChildrens();
			this.show();
			return;
		}
		
		if (this.zoom === Math.floor(cameraDatas.zoom)) {
			this.#clearChildrens();
			this.show();
			return;
		}
		
		if (this.#cameraIsOver(cameraDatas.coordCam, GLOBE.tilesDetailsMarge * 2)) {
		// if (this.#cameraIsOver(cameraDatas.coordCam, 1)) {
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
		const cameraTargetCoord = new Vector2(cameraDatas.coordCam.x, cameraDatas.coordCam.y);
		if (this.#cameraIsOver(cameraTargetCoord, 1) === true) {
			return true;
		}

		const corners = [
			[this.startCoord.x, this.startCoord.y],
			[this.startCoord.x, this.endCoord.y],
			[this.endCoord.x, this.startCoord.y],
			[this.endCoord.x, this.endCoord.y],
			[this.middleCoord.x, this.middleCoord.y],
		];

		for (let i = 0; i < corners.length; i ++) {
			this.directionToCamera.subVectors(
				new Vector2(corners[i][0], corners[i][1]) ,
				new Vector2(cameraDatas.coordCam.x, cameraDatas.coordCam.y),
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
		.map(t => t.getCurTile(coords))
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

	#debugDot(dotValue) {
		this.composeContext.fillStyle = "#ffffff";
		this.composeContext.fillRect(100, 100, 100, 100);
		this.composeContext.fillStyle = "#000000";
		this.composeContext.font = "40px serif";
		this.composeContext.fillText(' ' + dotValue, 120, 130);
        this.diffuseTexture.needsUpdate = true
	}

	dispose() {
		// GLOBE.evt.removeEventListener('GLOBE_CAMERA_UPDATE', this, this.onCameraUpdated);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE', this, this.#onExtensionActivation);
		this.#clearChildrens();
		this.hide();

		if (this.meshe != undefined) {
			this.meshe.geometry.dispose();
			this.material.map.dispose();
			this.material.dispose();
		}

		if (this.textureLoaded) {
			this.remoteTex.dispose();
		}

		this.extensions.clear();
        this.extensionsMaps.clear();
		this.isReady = false;
		this.evt.fireEvent('DISPOSE');
	}
}

const tilesToSplit = new Map();
let splitTimeoutId = null;

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
		// console.log('END');
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

	return {tile: nearest.tile, cameraData: cameraData};
}