import PolygonClipping from '../../../libs/polygon-clipping.esm.js';
import Renderer from '../../renderer.js';
import * as TILE from '../../tile.js';
import LanduseStore from './landuseStore.js';
import LanduseMaterial from './landuseMaterial.js';
import * as LanduseLoader from './landuseLoader.js';
import CanvasComposer from '../../utils/canvasComposer.js';

export {setApiUrl} from './landuseLoader.js';

export function extensionClass() {
	return LanduseExtension;
}

class LanduseExtension {
	constructor(_tile) {
		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;

        this.shapes = new Map();
        this.scheduleNb = 0;
        this.canvas = null;
        /*
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
		const canvasSize = 256;
		this.canvas.width = canvasSize;
		this.canvas.height = canvasSize;
        this.tile.extensionsMaps.set(this.id, this.canvas);
        */

        this.isActive = this.tile.zoom >= 13;
        if (LanduseMaterial.isReady) {
            this.onMaterialReady();
        } else {
            LanduseMaterial.evt.addEventListener('READY', this, this.onMaterialReady);
        }
    }

    onMaterialReady() {
        LanduseMaterial.evt.removeEventListener('READY', this, this.onMaterialReady);
        this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
        this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
        this.tile.evt.addEventListener('ADD_CHILDRENS', this, this.onTileSplit);
        if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		LanduseLoader.loader.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onLanduseLoaded(_datas)
		);
    }
    
    onLanduseLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        LanduseStore.setDatas(_datas, this.tile);
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		LanduseLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
        this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.tile.evt.removeEventListener('ADD_CHILDRENS', this, this.onTileSplit);
        // this.tile.extensionsMaps.delete(this.id);

        if (this.canvas) {
            this.tile.extensionsMaps.delete(this.id);
            this.drawCanvas();
            this.context = null;
            this.canvas = null;
        }


        // this.drawCanvas();
        // if (!this.isActive) return false;
        LanduseStore.tileRemoved(this.tile.key);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
        this.shapes.clear();
		Renderer.MUST_RENDER = true;
    }
    


    initCanvas() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
		this.canvas.width = TILE.mapSize;
		this.canvas.height = TILE.mapSize;
        this.tile.extensionsMaps.set(this.id, this.canvas);
    }


    scheduleDraw() {
        if (this.scheduleNb > 0) return false;
        this.scheduleNb ++;
        setTimeout(() => this.drawCanvas(), 1000);
    }

    drawCanvas() {
        this.scheduleNb --;
        if (!this.tile) return false
        this.context.clearRect(0, 0, 256, 256);
        this.context.drawImage(CanvasComposer.draw(this.shapes, this.tile.bbox, this.tile.zoom), 0, 0);
        this.tile.redrawDiffuse();
    }


    removeLanduse(_landuseId) {
        if (!this.tile) return false;
        if (!this.shapes.has(_landuseId)) return false;
		this.shapes.delete(_landuseId);
		this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.removeLanduse(_landuseId);
		}
	}

    onTileSplit() {
        for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
			extension.setLanduses(this.shapes);
		}
    }

    setLanduses(_landuses) {
		if (!this.splitLanduses(_landuses)) return false;
		this.initCanvas();
		this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.setLanduses(this.shapes);
		}
	}

	splitLanduses(_landuses) {
        let addNb = 0;
		const box = [
			[this.tile.startCoord.x, this.tile.endCoord.y], 
			[this.tile.endCoord.x, this.tile.endCoord.y], 
			[this.tile.endCoord.x, this.tile.startCoord.y], 
			[this.tile.startCoord.x, this.tile.startCoord.y], 
			[this.tile.startCoord.x, this.tile.endCoord.y], 
		];
		_landuses.forEach(curLanduse => {
			if (this.shapes.has(curLanduse.id)) return false;
			const myLanduse = {
				id : curLanduse.id, 
				type : curLanduse.type, 
				border : curLanduse.border, 
				bordersSplit : [], 
				holes : curLanduse.holes, 
				holesSplit : [], 
			};
			const shapesBorder = PolygonClipping.intersection([box], [curLanduse.border]);
			for (let s = 0; s < shapesBorder.length; s ++) {
                myLanduse.bordersSplit.push(shapesBorder[s][0]);
            }
            if (myLanduse.bordersSplit.length == 0) {
                return false;
            }
			const shapesHoles = PolygonClipping.intersection([box], curLanduse.holes);
			for (let s = 0; s < shapesHoles.length; s ++) {
                myLanduse.holesSplit.push(shapesHoles[s][0]);
            }
			this.shapes.set(curLanduse.id, myLanduse);
            addNb ++;
        });
        return addNb;
	}
}