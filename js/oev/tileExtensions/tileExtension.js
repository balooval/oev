'use strict';

Oev.Tile.Extension = {
		
		init : function(_tile) {
			this.dataLoaded = false;
			this.tile = _tile;
			// this.tile.evt.addEventListener('LOAD_DATAS', this, this.onLoadDatas);
			this.tile.evt.addEventListener('TILE_READY', this, this.onLoadDatas);
			this.tile.evt.addEventListener('SHOW', this, this.onShow);
			this.tile.evt.addEventListener('HIDE', this, this.onHide);
			this.tile.evt.addEventListener('DISPOSE', this, this.onDispose);
		}, 
		
		onLoadDatas : function(_evt) {
			if (this.dataLoaded) {
				return false;
			}
			this.loadDatas();
		}, 
		
		onShow : function() {
			this.show();
		}, 
		
		onHide : function() {
			this.hide();
		}, 
		
		onDispose : function() {
			this.tile.evt.removeEventListener('LOAD_DATAS', this, this.onLoadDatas);
			this.tile.evt.removeEventListener('SHOW', this, this.onShow);
			this.tile.evt.removeEventListener('HIDE', this, this.onHide);
			this.tile.evt.removeEventListener('DISPOSE', this, this.onDispose);
			this.dispose();
		}, 
		
		/*		TO OVERRIDE	*/
		
		loadDatas : function() {
			
		}, 
		
		show : function() {
			
		}, 
		
		hide : function() {
		
		}, 
		
		dispose : function() {
			
		}, 
};