Oev.Tile.Extension.Node = function(_tile, _tags, _model, _texture) {
	this.tile = _tile;
	this.tags = _tags;
	this.model = _model;
	this.texture = _texture;
	this.geoObjects = new THREE.Geometry();
	this._nodeNb = 0;
	if (this.alreadyDispose === true) {
		console.warn('constructor alreadyDispose');
	}
	this.alreadyDispose = false;
}

Oev.Tile.Extension.Node.prototype = {
	
	isHandlingTag : function(_tags) {
		for (var key in _tags) {
			if (this.tags[key] === undefined) {
				return false;
			}
			if (this.tags[key] !== _tags[key]) {
				return false;
			}
		}
		return true;
	}, 
	
	addNode : function(_node) {
		this._mergeGeometry(_node.lon, _node.lat);
		this._nodeNb ++;
	}, 
	
	getMesh : function() {
		if (this._nodeNb == 0) {
			return undefined;
		}
		var meshObjects = new THREE.Mesh(this.geoObjects, new THREE.MeshPhongMaterial( {map:OEV.textures[this.texture], color: 0xffffff, transparent:true} ));
		return meshObjects;
	}, 
	
	desactivate : function() {
		
	}, 
	
	dispose : function() {
		this.geoObjects.dispose();
		this.geoObjects = null;
		this.alreadyDispose = true;
	}, 
	
	_mergeGeometry : function(_lon, _lat) {
		if (this.alreadyDispose) {
			console.warn('alreadyDispose');
		}
		var geoModel = OEV.modelsLib[this.model].geometry.clone();
		geoModel = new THREE.Geometry().fromBufferGeometry(geoModel);
		var meshModel = new THREE.Mesh(geoModel);
		// var alt = Oev.Globe.getElevationAtCoords(_lon, _lat, true);
		var alt = this.tile.interpolateEle(_lon, _lat, true);
		// console.log('alt', alt);
		// var alt = 100;
		var pos = Oev.Globe.coordToXYZ(_lon, _lat, alt);
		// console.log('pos', pos.x, pos.y, pos.z);
		meshModel.position.x = pos.x;
		meshModel.position.y = pos.y;
		meshModel.position.z = pos.z;
		meshModel.rotation.z = Math.PI;
		var scale = 0.2;
		meshModel.scale.x = scale;
		meshModel.scale.y = scale;
		meshModel.scale.z = scale;
		meshModel.updateMatrix();
		this.geoObjects.merge(meshModel.geometry, meshModel.matrix);
		meshModel.geometry.dispose();
	}, 
}