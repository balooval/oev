import Renderer from '../../renderer.js';
import * as LinesLoader from './linesLoader.js';
import LinesMaterial from './linesMaterial.js';
import LinesStore from './linesStore.js';

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
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);


        if (LinesMaterial.isReady) {
            this.onMaterialReady();
        } else {
            LinesMaterial.evt.addEventListener('READY', this, this.onMaterialReady);
        }
    }

    onMaterialReady() {
        LinesMaterial.evt.removeEventListener('READY', this, this.onMaterialReady);
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
        if (!this.isActive) return false;
        LinesStore.tileRemoved(this.tile);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}