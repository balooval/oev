import * as NET_TEXTURES from './net/NetTextures.js';

OpenEarthViewer.planes = {
	init : function(){
		console.log( "Plugin PLANES loaded" );
		this.label = 'Planes';
		this.planes = [];
		this.followedPlane = -1;
		
		requestAnimationFrame( OpenEarthViewer.planes.onFrame );
	}, 
	
	onFrame : function(){
		OpenEarthViewer.planes.update();
		requestAnimationFrame( OpenEarthViewer.planes.onFrame );
	}, 
	
	update : function(){
		for( var p = 0; p < this.planes.length; p ++ ){
			this.planes[p].update();
		}
		if( this.followedPlane >= 0 ){
			console.log( "camera follow me" );
			OEV.camCtrl.setLookAt( this.planes[this.followedPlane].tweenLon.value, this.planes[this.followedPlane].tweenLat.value );
		}
	}, 
	
	drawDialog : function(){
		var html = '<div class="btn" onclick="closeModal();OpenEarthViewer.planes.drawParams();" title="planes">Planes</div>';
		return html;
	}, 
	
	
	drawParams : function(){
		var html = '<div id="params_planes">';
		html += '<div><span onclick="">close</span> Planes</div>';
		html += '<div class="btn" onclick="OpenEarthViewer.planes.addPlane();" title="load file">Add plane</div> ';
		html += '<br><div id="plugPlanesList"></div>';
		html += '</div>';
		document.getElementById( "overlayPlugins" ).innerHTML += html;
	}, 
	
	
	
	updatePlaneVisible : function( _plane, _visible ){
		for( var p = 0; p < this.planes.length; p ++ ){
			if( _plane == this.planes[p] ){
				setElementActiv( document.getElementById( 'btnPlaneVisibility_'+p ), _visible );
				break;
			}
		}
	}, 
	
	gotoPlane : function( _id ){
		if( this.followedPlane != _id ){
			OEV.camCtrl.setLookAt( this.planes[_id].tweenLon.value, this.planes[_id].tweenLat.value );
			OEV.camCtrl.setZoomDest( this.planes[_id].zoom, 2000 );
			this.followedPlane = _id;
		}else{
			this.followedPlane = -1;
		}
	}, 
	
	updatePlanesList : function(){
		var html = '';
		for( var p = 0; p < this.planes.length; p ++ ){
			html += '<div class="btn" id="btnPlaneVisibility_'+p+'" onclick="OpenEarthViewer.planes.gotoPlane('+p+');">Plane '+p+'</div><br>';
			if( this.planes[p].onStage ){
				setElementActiv( document.getElementById( 'btnPlaneVisibility_'+p ), true );
			}
		}
		document.getElementById( "plugPlanesList" ).innerHTML = html;
	}, 
	
	addPlane : function( _start, _end ){
		if( OEV.earth.curLOD == OEV.earth.LOD_CITY ){
			_start = _start || OEV.camCtrl.coordLookat;
			
			
			for( var i = 0; i < 10; i ++ ){
				_start.x = Math.random() * 6;
				_start.y = 42 + Math.random() * 6;
				_end = _end || new THREE.Vector2( 2.383138,48.880945 );
				var plane = new Plane( _start, _end );
				this.planes.push( plane );
			}
			
			this.updatePlanesList();
		}else{
			showNotification( 'You can add a plane only if zoom level > ' + OEV.earth.LOD_CITY, 'warning' );
		}
	}, 
	
	removePlane : function( _plane ) {
		var pId = this.planes.indexOf( _plane );
		if( pId < 0 ){
			console.log( "OpenEarthViewer.planes ERR : plane not found !" );
		}
		this.planes.splice( pId, 1 );
		_plane.dispose();
		this.updatePlanesList();
	}
}

OpenEarthViewer.plugins["PLANES"] = OpenEarthViewer.planes;





var Plane = function ( _start, _end ) {
	this.onStage = true;
	this.tweenLon = new Oev.Animation.TweenValue( _start.x );
	this.tweenLat = new Oev.Animation.TweenValue( _start.y );
	// this.altitude = 2000;
	this.altitude = 5000;
	var posTmp = OEV.earth.coordToXYZ( this.tweenLon.value, this.tweenLat.value, this.altitude );
	this.zoom = Math.floor( OEV.earth.zoomFromAltitude( Math.abs( posTmp.y ) ) );
	this.tile = Oev.Geo.coordsToTile( this.tweenLon.value, this.tweenLat.value, this.zoom );
	console.log( "Plane.this.zoom : " + this.zoom );

	var distance = GEO.coordDistance( _start.x, _start.y, _end.x, _end.y );
	_duration = distance / 1;
	
	this.tweenLon.setTargetValue( _end.x, _duration );
	this.tweenLat.setTargetValue( _end.y, _duration );
	
	
	this.material = new THREE.MeshLambertMaterial({ color: 0xD0D0E0 });
	var tmpBuffGeo = NET_MODELS.model('plane').geometry.clone();
	var tmpGeo = new THREE.Geometry().fromBufferGeometry( tmpBuffGeo );
	this.meshe = new THREE.Mesh( tmpGeo, this.material );
	
	var contrailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, map:NET_TEXTURES.texture('plane_contrail'), transparent: true });
	// right
	var contrailGeometry = new THREE.PlaneGeometry( 3, 20 );
	var contrailMeshe = new THREE.Mesh( contrailGeometry, contrailMat );
	contrailMeshe.position.x = -10;
	contrailMeshe.position.z = 8;
	contrailMeshe.rotation.x = Math.PI / 2;
	contrailMeshe.rotation.z = -Math.PI / 2;
	this.meshe.add( contrailMeshe );
	// left
	contrailMeshe = new THREE.Mesh( contrailGeometry, contrailMat );
	contrailMeshe.position.x = -10;
	contrailMeshe.position.z = -8;
	contrailMeshe.rotation.x = Math.PI / 2;
	contrailMeshe.rotation.z = -Math.PI / 2;
	this.meshe.add( contrailMeshe );
	
	this.meshe.rotation.x = Math.PI;
	this.meshe.rotation.y = Math.atan2( _end.y - _start.y, _end.x - _start.x ) * 1;
	
	
	this.update();
	OEV.scene.add( this.meshe );
}


Plane.prototype.hide = function( _state ) {
	if( _state && this.onStage ){
		OEV.scene.remove( this.meshe );
		OpenEarthViewer.planes.updatePlaneVisible( this, false );
	}else if( !_state && !this.onStage ){
		OEV.scene.add( this.meshe );
		OpenEarthViewer.planes.updatePlaneVisible( this, true );
	}
	this.onStage = !_state;
}


Plane.prototype.checkVisibility = function() {
	var myTileVisible = false;
	for( var i = 0; i < OEV.earth.tilesBase.length; i ++ ){
		var tile = OEV.earth.tilesBase[i];
		if( this.checkIfTileContainMe( tile ) ){
			myTileVisible = true;
			break;
		}
	}
	if( myTileVisible ){
		OEV.MUST_RENDER = true;
		this.hide( false );
	}else{
		this.hide( true );
	}
}
Plane.prototype.checkIfTileContainMe = function( _tile ) {
	var isIn = true;
	if( this.tweenLon.value < _tile.startCoord.x ){
		isIn = false;
	}
	if( this.tweenLon.value > _tile.endCoord.x ){
		isIn = false;
	}
	if( this.tweenLat.value > _tile.startCoord.y ){
		isIn = false;
	}
	if( this.tweenLat.value < _tile.endCoord.y ){
		isIn = false;
	}
	if( isIn ){
		if( _tile.zoom == ( this.zoom - 1 ) ){
			// debug( "OK myTile is visible : " + _tile.zoom + " / " + _tile.tileX + " / " + _tile.tileY );
			return true;
		}else{
			for( var i = 0; i < _tile.childTiles.length; i ++ ){
				if( this.checkIfTileContainMe( _tile.childTiles[i] ) ){
					return true;
				}
			}
		}
	}
	return false;
}

Plane.prototype.update = function() {
	if( OEV.earth.curLOD == OEV.earth.LOD_CITY ){
		if( this.tweenLon.running ){
			var d = new Date();
			var curTime = d.getTime();
			this.tweenLon.getValueAtTime( curTime );
			this.tweenLat.getValueAtTime( curTime );
			var pos = OEV.earth.coordToXYZ( this.tweenLon.value, this.tweenLat.value, this.altitude );
			this.meshe.position.x = pos.x;
			this.meshe.position.y = pos.y;
			this.meshe.position.z = pos.z;
			this.checkVisibility();
		}else{
			OpenEarthViewer.planes.removePlane( this );
		}
	}
}

Plane.prototype.dispose = function() {
	this.meshe.geometry.dispose();
	OEV.scene.remove( this.meshe );
	OEV.earth.evt.removeEventListener( "CURTILE_CHANGED", this, this.onCurTileChanged );
}
