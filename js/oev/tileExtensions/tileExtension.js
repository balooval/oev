'use strict';

Oev.Tile.Extension = {
	
		id : '', 
		
		evt : new Oev.Utils.Evt(), 
		
		toggleExtension : function(_extensionId, _state) {
			console.log('toggle', _extensionId, _state);
			Oev.Tile.Extension.evt.fireEvent('TILE_EXTENSION_TOGGLE_' + _extensionId, _state);
		}, 
	
		init : function(_tile) {
			this.tile = _tile;
			this.isActiv = false;
			Oev.Tile.Extension.evt.addEventListener('TILE_EXTENSION_TOGGLE_' + this.id, this, this._onToggle);
		}, 
		
		_activate : function() {
			this.isActiv = true;
			this.dataLoaded = false;
			this.tile.evt.addEventListener('TILE_READY', this, this.onLoadDatas);
			this.tile.evt.addEventListener('SHOW', this, this.onShow);
			this.tile.evt.addEventListener('HIDE', this, this.onHide);
			this.tile.evt.addEventListener('DISPOSE', this, this.onDispose);
			this.onActivate();
			this.onLoadDatas();
		}, 
		
		_desactivate : function() {
			this.tile.evt.removeEventListener('TILE_READY', this, this.onLoadDatas);
			this.tile.evt.removeEventListener('SHOW', this, this.onShow);
			this.tile.evt.removeEventListener('HIDE', this, this.onHide);
			this.tile.evt.removeEventListener('DISPOSE', this, this.onDispose);
			this.onDesactivate();
			this.dispose();
		}, 
		
		_onToggle : function(_state) {
			if (_state !== undefined) {
				this.isActiv = _state;
			} else {
				this.isActiv = !this.isActiv;
			}
			if (this.isActiv) {
				this._activate();
			} else {
				this._desactivate();
			}
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
		
		onActivate : function() {
			
		}, 
		
		onDesactivate : function() {
			
		}, 
		
		loadDatas : function() {
			
		}, 
		
		show : function() {
			
		}, 
		
		hide : function() {
		
		}, 
		
		dispose : function() {
			
		}, 
};