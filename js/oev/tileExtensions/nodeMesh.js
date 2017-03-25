Oev.Tile.Extension.Node = function(_tile, _tagsHandled, _meshBuilder) {
	this.tile = _tile;
	this.tagsHandled = _tagsHandled;
	this.meshBuilder = _meshBuilder;
	this.geoObjects = new THREE.Geometry();
	this._nodeNb = 0;
	if (this.alreadyDispose === true) {
		console.warn('constructor alreadyDispose');
	}
	this.alreadyDispose = false;
}

Oev.Tile.Extension.Node.prototype = {
	
	isHandlingTag : function(_tags) {
		for (var key in this.tagsHandled) {
			if (_tags[key] === undefined) {
				console.log('A key', key);
				return false;
			}
			if (_tags[key] !== this.tagsHandled[key]) {
				console.log('B key', key);
				return false;
			}
		}
		return true;
		for (var key in _tags) {
			if (this.tagsHandled[key] === undefined) {
				console.log('A key', key);
				return false;
			}
			if (this.tagsHandled[key] !== _tags[key]) {
				console.log('B key', key);
				return false;
			}
		}
		return true;
	}, 
	
	addNode : function(_node) {
		this._mergeGeometry(_node);
		this._nodeNb ++;
	}, 
	
	getMesh : function() {
		if (this._nodeNb == 0) {
			return undefined;
		}
		var meshObjects = new THREE.Mesh(this.geoObjects, this.meshBuilder.getMaterial());
		return meshObjects;
	}, 
	
	desactivate : function() {
		
	}, 
	
	dispose : function() {
		this.geoObjects.dispose();
		this.geoObjects = null;
		this.alreadyDispose = true;
	}, 
	
	_mergeGeometry : function(_node) {
		if (this.alreadyDispose) {
			console.warn('alreadyDispose');
		}
		var geoModel = this.meshBuilder.getGeometry(_node.tags);
		var meshModel = new THREE.Mesh(geoModel);
		var alt = this.tile.interpolateEle(_node.lon, _node.lat, true);
		var pos = Oev.Globe.coordToXYZ(_node.lon, _node.lat, alt);
		meshModel.position.x = pos.x;
		meshModel.position.y = pos.y;
		meshModel.position.z = pos.z;
		// meshModel.rotation.y = Math.random() * 3;
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


Oev.Tile.Extension.NodeGeoTree = function(_material) {
	this.material = _material;
}

Oev.Tile.Extension.NodeGeoTree.prototype = {
	getMaterial : function() {
		return this.material;
	}, 
	
	_initTreeTags : function(_tags) {
		var treeTags = { // in meters
			height : _tags.height || (5 + Math.random() * 2), 
		};
		if (!_tags.height && _tags.diameter_crown) {
			treeTags.height = _tags.diameter_crown / 5 * 8;
		}
		treeTags.circumference = treeTags.height / 8;
		if (_tags.circumference) {
			treeTags.circumference = _tags.circumference;
		}
		treeTags.diameter_crown = treeTags.circumference * 4;
		if (_tags.diameter_crown) {
			treeTags.diameter_crown = _tags.diameter_crown;
		}
		treeTags.diameter_crown_top = treeTags.diameter_crown ;
		if (_tags.leaf_type) {
			if (_tags.leaf_type == 'broadleaved') {
				treeTags.diameter_crown_top *= 0.5;
			} else {
				treeTags.diameter_crown_top *= 0.3;
			}
		}
		return treeTags;
	}, 
	
	_convertTagsToSlices : function(_tags) {
		var treeProps = {
			nbSections : Math.max(4, Math.min(20, Math.round(_tags.diameter_crown * 1)))
		};
		var trunkHeight = 0.3 + Math.random() * 0.25;
		var crownHeight = trunkHeight + Math.random() * 0.35;
		var tileVariant = Math.floor(Math.random() * 4) / 4;
		treeProps.height = _tags.height;
		treeProps.texTile = [
			{
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0, 
				endY : 0.2, 
			}, 
			{
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0.5, 
				endY : 0.55, 
			}, 
			{
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0.6, 
				endY : 0.7, 
			},  
			{
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0.8, 
				endY : 0.9, 
			}, 
			{
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0.9, 
				endY : 1, 
			}, 
		];
		treeProps.radius = [
			_tags.circumference * 1.5, 
			_tags.circumference, 
			_tags.diameter_crown, 
			_tags.diameter_crown_top, 
			0, 
		];
		treeProps.alts = [
			0, 
			trunkHeight, 
			crownHeight, 
			1, 
			1.1, 
		];
		
		if(treeProps.height > 15) {
			treeProps.alts.splice(1, 0, trunkHeight * 0.1);
			treeProps.alts.splice(3, 0, crownHeight * 0.9);
			treeProps.alts.splice(5, 0, crownHeight + (1 - crownHeight) / 2);
			treeProps.radius.splice(1, 0, _tags.circumference);
			treeProps.radius.splice(3, 0, _tags.diameter_crown * 0.8);
			treeProps.radius.splice(5, 0, _tags.diameter_crown * 1.3);
			treeProps.texTile.splice(1, 0, {
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.2, 
					endY : 0.5, 
				} 
			);
			treeProps.texTile.splice(3, 0, {
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.55, 
					endY : 0.6, 
				}
			);
			treeProps.texTile.splice(5, 0, {
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.7, 
					endY : 0.8, 
				}
			);
		}
		return treeProps;
	}, 
	
	getGeometry : function(_tags) {
		var treeTags = this._initTreeTags(_tags);
		var treeProps = this._convertTagsToSlices(treeTags);
		// treeProps.scale = 0.2;
		treeProps.scale = 1;
		var geometry = new THREE.Geometry();
		// Oev.GeometryBuilder.cylinder(geometry, treeProps);
		Oev.GeometryBuilder.foliage(geometry);
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		geometry.uvsNeedUpdate = true;
		geometry.verticesNeedUpdate = true;
		return geometry;
	}, 
}


Oev.Tile.Extension.NodeGeoLib = function(_model, _material) {
	this.model = _model;
	this.material = _material;
}

Oev.Tile.Extension.NodeGeoLib.prototype = {
	getMaterial : function() {
		return this.material;
	}, 
	
	getGeometry : function() {
		var geoModel = OEV.modelsLib[this.model].geometry.clone();
		geoModel = new THREE.Geometry().fromBufferGeometry(geoModel);
		return geoModel;
	}, 
}
	