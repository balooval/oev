import * as NET_MODELS from './oev/net/NetModels.js';

Oev.Tile.Extension.Life = (function() {
	var api = function(_tile) {
		var isOnGround = Oev.Globe.isCoordOnGround(_tile.middleCoord.x, _tile.middleCoord.y, 2);
		var ext;
		if (isOnGround == 0) {
			ext = new Oev.Tile.Extension.LifeWater(_tile);
		} else {
			ext = new Oev.Tile.Extension.LifeGround(_tile);
		}
		return ext;
	}
		
	var geometry = new THREE.SphereGeometry(5, 32, 32);
	var material = new THREE.MeshPhongMaterial( {color: 0x96a0a3} );

	api.getMeshLife = function() {
		var geo = NET_MODELS.model('whale').geometry.clone();
		return new THREE.Mesh(geo, material);
	}
	
	return api;
})();