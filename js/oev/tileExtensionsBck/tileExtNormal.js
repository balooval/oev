'use strict';

Oev.Tile.Extension.Normal = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	var loaderNormal = OEV.earth.loaderNormal;
	
	ext.id = 'NORMAL';
	
	ext.loadDatas = function() {
		if (!this.tile.onStage || this.tile.zoom < 6 || this.tile.zoom > 11) {
			return false;
		}
		var _self = this;
		loaderNormal.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			function(_texture) {
				_self.onNormalLoaded(_texture);
			}
		);
	}
	
	ext.hide = function() {
		loaderNormal.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}
	
	ext.onNormalLoaded = function(_normalMap) {
		if (!this.isActiv) {
			return false;
		}
		this.dataLoaded = true;
		this.tile.material.normalMap = _normalMap;
		this.tile.material.needsUpdate = true;
		OEV.MUST_RENDER = true;
	}
	
	ext.dispose = function() {
		this.hide();
		this.tile.material.normalMap = null;
		this.tile.material.needsUpdate = true;
		OEV.MUST_RENDER = true;
	}
	
	ext.init(_tile);
	
	return ext;
}