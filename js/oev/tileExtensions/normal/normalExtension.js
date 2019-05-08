import Renderer from '../../renderer.js';
import * as NormalLoader from './normalLoader.js';

export class NormalExtension {
	constructor(_tile) {
		this.id = 'NORMAL';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		if (this.dataLoaded) {
            this.tile.setTexture(this.texture);
            return true;
        }
        if (this.tile.zoom < 12) return false;
        if (this.tile.zoom > 15) return false;
        // if (this.tile.zoom != 13) return false;
		if (this.dataLoading) return false;
		this.dataLoading = true;
		NormalLoader.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onMapLoaded(_datas)
		);
    }
    
    onMapLoaded(_datas) {
        this.texture = _datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        this.tile.material.normalMap = this.texture;
        this.tile.material.needsUpdate = true;
        Renderer.MUST_RENDER = true;
	}
	
	onTileDispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		NormalLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        if (this.texture) this.texture.dispose();
        this.texture = null;
		this.dataLoaded = false;
		this.dataLoading = false;
		Renderer.MUST_RENDER = true;
	}
	
}