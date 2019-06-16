import Renderer from '../../renderer.js';
import * as LinesLoader from './linesLoader.js';
import LinesMaterial from './linesMaterial.js';
import LinesModel from './linesModels.js';
import LinesStore from './linesStore.js';
import HighwayDrawer from './highwayDrawer.js';

export {setApiUrl} from './linesLoader.js';

export function extensionClass() {
	return LinesExtension;
}

class LinesExtension {
	constructor(_tile) {
		this.id = 'LINES';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.meshes = {};
        this.mesh = null;
        this.isActive = this.tile.zoom == 15;

        this.shapes = new Map();
        this.scheduleNb = 0;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
		const canvasSize = 256;
		this.canvas.width = canvasSize;
		this.canvas.height = canvasSize;
        this.tile.extensionsMaps.set(this.id, this.canvas);

        if (LinesMaterial.isReady && LinesModel.isReady) {
            this.onRessourcesLoaded();
        }
        if (!LinesMaterial.isReady) {
            LinesMaterial.evt.addEventListener('READY', this, this.onMaterialReady);
        }
        if (!LinesModel.isReady) {
            LinesModel.evt.addEventListener('READY', this, this.onModelsReady);
        }
    }

    onMaterialReady() {
        LinesMaterial.evt.removeEventListener('READY', this, this.onMaterialReady);
		if (this.tile.isReady) this.onTileReady();
    }

    onModelsReady() {
        LinesModel.evt.removeEventListener('READY', this, this.onModelsReady);
        this.onRessourcesLoaded();
    }

    onRessourcesLoaded() {
        if (!LinesMaterial.isReady) return false;
        if (!LinesModel.isReady) return false;
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
		LinesLoader.loader.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onLinesLoaded(_datas)
		);
    }
    
    onLinesLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        LinesStore.setDatas(_datas, this.tile);
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		LinesLoader.loader.abort({
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
        this.tile.extensionsMaps.delete(this.id);
        this.drawCanvas();
        // if (!this.isActive) return false;
        LinesStore.tileRemoved(this.tile);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
        this.shapes.clear();
		Renderer.MUST_RENDER = true;
    }


    removeLine(_lineId) {
        // console.log('removeLine');
        if (!this.tile) return false;
        if (!this.shapes.has(_lineId)) return false;
		this.shapes.delete(_lineId);
		this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.removeLine(_lineId);
		}
    }
        
    onTileSplit() {
        console.log('onTileSplit');
        for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
			extension.setHighways(this.shapes);
		}
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
        this.context.drawImage(HighwayDrawer.draw(this.shapes, this.tile.bbox, this.tile.key), 0, 0);
        this.tile.redrawDiffuse();
    }
    

    setHighways(_highways) {
        if (!this.splitHighways(_highways)) return false;
		this.drawCanvas();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.setHighways(this.shapes);
		}
	}

	splitHighways(_highways) {
        // if (this.tile.key != '16756_11936_15') {
        //     return 0;
        // }
        const bbox = [
            this.tile.startCoord.x, // min X
			this.tile.endCoord.y, // min Y
			this.tile.endCoord.x, // max X
            this.tile.startCoord.y, // max Y
        ];
        let addNb = 0;
		_highways.forEach(curWay => {
            if (this.shapes.has(curWay.id)) return false;
			const myWay = {
				id : curWay.id, 
				type : curWay.type, 
				props : curWay.props, 
				border : curWay.border, 
				bordersSplit : [], 
            };
            // if (curWay.props.width < 4) return false;
            // if (curWay.props.highway != 'primary') return false;
            myWay.bordersSplit = lineclip(curWay.border, bbox);
            if (myWay.bordersSplit.length == 0) {
                return false;
            }
			this.shapes.set(curWay.id, myWay);
            addNb ++;
        });
        return addNb;
	}
}