import Renderer from '../../renderer.js';
import * as PlaneLoader from './planeLoader.js';
import PlaneStore from './planeStore.js';
import PlaneModels from './planeModels.js';

export {setApiUrl} from './planeLoader.js';

export function extensionClass() {
	return PlaneExtension;
}

class PlaneExtension {
	constructor(_tile) {
		this.id = 'PLANE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;

        this.isActive = this.tile.zoom == 10;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);

        if (PlaneModels.isReady) {
            this.onModelsReady();
        }
        if (!PlaneModels.isReady) {
            PlaneModels.evt.addEventListener('READY', this, this.onModelsReady);
        }
    }

    onModelsReady() {
        PlaneModels.evt.removeEventListener('READY', this, this.onModelsReady);
        if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
        
        PlaneLoader.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
                y : this.tile.tileY,
                minLon : this.tile.startCoord.x,  
                maxLon : this.tile.endCoord.x,  
                minLat : this.tile.endCoord.y,  
                maxLat : this.tile.startCoord.y,  
				priority : this.tile.distToCam
			}, 
			_datas => this.onPlanesLoaded(_datas)
		);
    }
    
    refreshDatas() {
        // console.log('refreshDatas');
        this.dataLoading = false;
        this.dataLoaded = false;
        if (!this.tile) return false;
        if (!this.tile.isReady) return false;
        this.onTileReady();
    }

    onPlanesLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        PlaneStore.setDatas(_datas, this.tile);
        setTimeout(() => this.refreshDatas(), 20000);
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		PlaneLoader.loader.abort({
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
        PlaneStore.tileRemoved(this.tile);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}
