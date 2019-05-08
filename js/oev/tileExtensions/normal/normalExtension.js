import Renderer from '../../renderer.js';
import * as NormalLoader from './normalLoader.js';

export default class NormalExtension {
	constructor(_tile) {
        this.id = 'NORMAL';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		if (this.dataLoaded) {
            this.tile.setTexture(this.texture);
            return true;
        }
        if (this.tile.zoom < 11) return false;
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
        if (!this.tile) return false;
        this.texture = _datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        this.tile.material.normalMap = this.texture;
        this.tile.material.needsUpdate = true;
        Renderer.MUST_RENDER = true;
    }
    
    onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		NormalLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
        this.tile.material.normalMap = null;
        this.tile.material.needsUpdate = true;
    }
	
	dispose() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.hide();
        if (this.texture) this.texture.dispose();
        this.texture = null;
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
	
}