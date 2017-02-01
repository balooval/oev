var TileSurface = function ( _geoTile, _tileX, _tileY, _zoom ) {
	this.geoTile = _geoTile;
	this.datasLoaded = false;
	this.zoom = _zoom;
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.onStage = true;
	this.datas = undefined;
	// this.particules = undefined;
	this.partMeshes = {
		'vineyard' : undefined, 
		'forest' : undefined, 
		'scrub' : undefined, 
	};
}


TileSurface.prototype.useCache = true;

TileSurface.prototype.load = function() {
	if( !this.datasLoaded ){
		OEV.earth.tilesLandusesMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.geoTile.distToCam );
	}else{
		this.construct();
	}
}


TileSurface.prototype.setDatas = function( _datas ) {
	this.datasLoaded = true;
	this.datas = _datas;
	this.construct();
}




TileSurface.prototype.construct = function() {
	if( this.onStage ){

		var partGeom = {
				'vineyard' : undefined, 
				'forest' : undefined, 
				'scrub' : undefined, 
			};
		
		var surfacesTypes = [];
		var surfaces = [];
		var tileW = this.geoTile.endCoord.x - this.geoTile.startCoord.x;
		var tileH = Math.abs( this.geoTile.endCoord.y - this.geoTile.startCoord.y );
		for( var i = 0; i < this.datas['elements'].length; i ++ ){
			if( this.datas['elements'][i]['type'] == 'way' ){
				var curSurface = [];
				for( var n = 0; n < this.datas['elements'][i]['nodes'].length; n ++ ){
					var myNodeId = this.datas['elements'][i]['nodes'][n];
					for( var o = 0; o < this.datas['elements'].length; o ++ ){
						if( this.datas['elements'][o]['type'] == 'node' && this.datas['elements'][o]['id'] == myNodeId ){
							curSurface.push( { "lon" : parseFloat( this.datas['elements'][o]['lon'] ), "lat" : parseFloat( this.datas['elements'][o]['lat'] ) } );
						}
					}
				}
				
				
				var curType = 'none';
				if( "landuse" in this.datas['elements'][i]['tags'] ){
					if( this.datas['elements'][i]['tags']['landuse'] == 'vineyard' ){
						curType = 'vineyard';
					}else if( this.datas['elements'][i]['tags']['landuse'] == 'forest' ){
						curType = 'forest';
					}
				}else if( "natural" in this.datas['elements'][i]['tags'] ){
					if( this.datas['elements'][i]['tags']['natural'] == 'wood' ){
						curType = 'forest';
					}else if( this.datas['elements'][i]['tags']['natural'] == 'scrub' ){
						curType = 'scrub';
					}else if( this.datas['elements'][i]['tags']['natural'] == 'water' ){
						curType = 'water';
					}
				}else if( "waterway" in this.datas['elements'][i]['tags'] ){
					if( this.datas['elements'][i]['tags']['waterway'] == 'riverbank' ){
						curType = 'water';
					}
				}
				if( curType != 'none' ){
					surfaces.push( curSurface );
					surfacesTypes.push( curType );
					if( curType != 'water' ){
						partGeom[curType] = new THREE.Geometry();
					}
				}
			}
		}
		
		var nbVert = 0;
		var bbox = [ this.geoTile.startCoord.x, this.geoTile.endCoord.y, this.geoTile.endCoord.x, this.geoTile.startCoord.y ];
		for( var s = 0; s < surfaces.length; s ++ ){
			var curPoly = [];
			for( var n = 0; n < surfaces[s].length - 1; n ++ ){
				curPoly.push( [surfaces[s][n]["lon"], surfaces[s][n]["lat"]] );
			}
			var res = lineclip.polygon( curPoly, bbox );
			if( res.length > 0 ){
				res.push( res[0] );
			}
			
			// this.geoTile.makeTextureOverlay( res, surfacesTypes[s] );

			if( surfacesTypes[s] == 'vineyard' ){
				for( var coordLon = this.geoTile.startCoord.x; coordLon < this.geoTile.endCoord.x; coordLon += tileW / 40 ){
					for( var coordLat = this.geoTile.endCoord.y; coordLat < this.geoTile.startCoord.y; coordLat += tileH / 80 ){
						if( this.isIn( res, coordLon, coordLat ) ){
							var altP = this.geoTile.interpolateEle( coordLon, coordLat, true );
							var pos = OEV.earth.coordToXYZ( coordLon + ( ( tileW / 100 ) * Math.random() ), coordLat + ( ( tileH / 120 ) * Math.random() ), altP + 1 - ( Math.random() * 0.5 ) );
							var particle = new THREE.Vector3( pos.x, pos.y, pos.z );
							partGeom[surfacesTypes[s]].vertices.push( particle );
						}
					}
				}
			}else if( surfacesTypes[s] == 'scrub' || surfacesTypes[s] == 'forest' ){
				var surGeoJson = {
					"type": "Polygon",
					"coordinates": [res]
				};
				var curArea = Math.round( geojsonArea.geometry( surGeoJson ) / 50 );
				var nbPartIn = 0;
				while( nbPartIn < curArea ){
					var coordLon = this.geoTile.startCoord.x + ( tileW * Math.random() );
					var coordLat = this.geoTile.endCoord.y + ( tileH * Math.random() );
					if( this.isIn( res, coordLon, coordLat ) ){
						nbPartIn ++;
						var altP = this.geoTile.interpolateEle( coordLon, coordLat, true );
						var pos = OEV.earth.coordToXYZ( coordLon, coordLat, altP + 5 - Math.random() * 2 );
						var particle = new THREE.Vector3( pos.x, pos.y, pos.z );
						partGeom[surfacesTypes[s]].vertices.push( particle );
					}
				}
				
			}else if( surfacesTypes[s] == 'water' && this.geoTile.showWater ){
				this.geoTile.makeTextureOverlay( res, surfacesTypes[s] );
			}
		}
		
		for( var type in partGeom ){
			if( !partGeom.hasOwnProperty( type ) ) continue;
			if( partGeom[type] != undefined ){
				var mat;
				if( type == 'vineyard' ){
					mat = OEV.earth.vineyardMat;
				}else if( type == 'scrub' ){
					mat = OEV.earth.vineyardMat;
				}else{
					mat = OEV.earth.forestMat;
				}
				this.partMeshes[type] = new THREE.Points( partGeom[type], mat );
				OEV.scene.add( this.partMeshes[type] );
			}
		}
		OEV.MUST_RENDER = true;
	}
}



TileSurface.prototype.isIn = function( _polygon, _lon, _lat ) {
		var angle = 0;
		var ptA;
		var ptB;
		var segNb = _polygon.length - 1;
		for( var i = 0; i < segNb; i++ ){
			ptA = _polygon[i];
			ptB = _polygon[i+1];
			angle += Oev.Math.angle2D( ptA[0]-_lon, ptA[1]-_lat, ptB[0]-_lon, ptB[1]-_lat );
		}
		if( Math.abs( angle ) < Math.PI ){
			return false;
		}
		return true;
}

TileSurface.prototype.hide = function( _state ) {
	if( _state && this.onStage == true ){
		this.onStage = false;
		if( this.datasLoaded ){
			for( var type in this.partMeshes ){
				if( !this.partMeshes.hasOwnProperty( type ) ) continue;
				if( this.partMeshes[type] != undefined ){
					OEV.scene.remove( this.partMeshes[type] );
				}
			}
		}
	}else if( !_state && this.onStage == false ){
		this.onStage = true;
		if( this.datasLoaded ){
			for( var type in this.partMeshes ){
				if( !this.partMeshes.hasOwnProperty( type ) ) continue;
				if( this.partMeshes[type] != undefined ){
					OEV.scene.add( this.partMeshes[type] );
				}
			}
		}else{
			this.load();
		}
	}
}



TileSurface.prototype.dispose = function() {
	this.hide( true );
	if( !this.datasLoaded ){
		OEV.earth.tilesLandusesMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
	}

	for( var type in this.partMeshes ){
		if( !this.partMeshes.hasOwnProperty( type ) ) continue;
		if( this.partMeshes[type] != undefined ){
			this.partMeshes[type].geometry.dispose();
			OEV.scene.remove( this.partMeshes[type] );
		}
	}
}
