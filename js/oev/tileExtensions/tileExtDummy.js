'use strict';

Oev.Tile.Extension.Dummy = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	
	ext.id = 'DUMMY';
	
	ext.loadDatas = function() {
		
	}
	
	ext.hide = function() {
		
	}
	
	ext.dispose = function() {
		
	}
	
	ext.onInit(_tile);
	
	return ext;
}