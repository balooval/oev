import { texture as TextureLoader } from '../net/textures.js';
import { loader as MapLoader } from '../tileExtensions/map/mapLoader.js';
import * as TileExtension from '../tileExtensions/tileExtension.js';
import {
	BufferAttribute,
	BufferGeometry,
	DoubleSide,
	Mesh,
	Texture,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	MeshBasicMaterial,
	Vector2,
} from '../vendor/three.module.js';
import Evt from './event.js';
import GEO from './geo.js';
import GLOBE from './globe.js';
import Renderer from './renderer.js';

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
			roughness:1,
			metalness:0,
			map: this.diffuseTexture,
			// side: DoubleSide,
		});

		this.extensions = new Map();
		TileExtension.listActives().forEach(p => this.addExtension(p));
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.#onExtensionActivation);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', this, this.#onExtensionDisabled);
    }
    
    redrawDiffuse() {
		if (!this.diffuseMap) return;

		this.composeContext.fillStyle = "#ffffff";
		this.composeContext.fillRect(0, 0, mapSize, mapSize);

		this.composeContext.drawImage(this.diffuseMap, 0, 0, 256, 256, 0, 0, mapSize, mapSize);
        this.extensionsMaps.forEach(map => {
            this.composeContext.drawImage(map, 0, 0);
        });
		
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
		// geoBuffer.computeFaceNormals();
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
		if (this.zoom < 7) {
			for (let i = 0; i < this.childTiles.length; i ++) {
				this.childTiles[i].debug();
			}
		}

		if (this.onStage === true) {
			console.log('this.tileX', this.tileX);
			// if (this.tileX === 67) {
			// 	console.log('debug', this.zoom, this.tileX, this.tileY);
				this.hide();
			// }
		}
	}

	show() {
		if (this.onStage) return false;
		this.onStage = true;
		GLOBE.addMeshe(this.meshe);

		let test = '7/65/46';
		// test = '10/523/373';
		if (this.zoom + '/' + this.tileX + '/' + this.tileY === test) {
			this.meshe.material.visible = true;
		}
		this.meshe.material.visible = true;


		this.evt.fireEvent('SHOW');
	}
	
	hide() {
		if (!this.onStage) {
			return false;
		}

		this.onStage = false;
		GLOBE.removeMeshe(this.meshe);

		let test = '7/65/46';
		// test = '10/523/373';
		if (this.zoom + '/' + this.tileX + '/' + this.tileY === test) {
			this.meshe.material.visible = false;
		}
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
		if (this.childTiles.length > 0) return false;
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

	updateDetails(coords) {
		if (this.#cameraIsOver(coords, GLOBE.tilesDetailsMarge)) {
			if (this.zoom < Math.floor(GLOBE.CUR_ZOOM)) {
				this.#createChilds();
				for (let c = 0; c < this.childTiles.length; c ++) {
					this.childTiles[c].updateDetails(coords);
				}
				this.hide();

			} else {
				this.#clearChildrens();
				this.show();
			}

		} else {
			this.#clearChildrens();
			if( this.zoom + 5 < GLOBE.CUR_ZOOM ){
				this.hide();

			} else {
				const tests = [
					// '62_45_7',
					'62_46_7',
					// '62_47_7',
					// '62_48_7',
					// '62_49_7',
					// '63_44_7',
					// '63_45_7',
					// '63_46_7',
					// '63_47_7',
					// '63_48_7',
					// '63_49_7',
					// '64_44_7',
					// '64_48_7',
					// '64_49_7',
					// '65_44_7',
					// '65_48_7',
					// '65_49_7',
					// '66_44_7',
					// '66_48_7',
					// '66_49_7',
					// '67_44_7',
					// '67_45_7',
					// '67_46_7',
					// '67_47_7',
					// '67_48_7',
					// '67_49_7',
				];
				// if (this.zoom === 7) {
				// 	console.log('SHOW', this.zoom, this.tileX, this.tileY);
				// }
				// const key = this.zoom+'/'+this.tileX+'/'+this.tileY;
				// if (tests.includes(this.key)) {
				// 	console.log('key', this.key);
				// 	this.show();
				// }
				this.show();
			}
		}
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

	dispose() {
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