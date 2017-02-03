OpenEarthViewer.gpx = {
	init : function(){
		debug( "Plugin GPX loaded" );
		this.label = 'Gpx';
		this.fileName = '20140723';
		this.json = undefined;
		this.datas = undefined;
		this.lineMat = new THREE.LineBasicMaterial({color: 0xFF0000});
		this.lineMeshe = undefined;
		this.curPt = -1;
		this.ptOffset = 5;
		this.playing = false;
	}, 
	
	drawDialog : function(){
		var html = '<div class="btn" onclick="closeModal();OpenEarthViewer.gpx.drawParams();" title="gpx">GPX</div>';
		return html;
	}, 
	
	
	drawParams : function(){
		var html = '<div id="params_gpx">';
		html += '<div><span onclick="">close</span> Gpx</div>';
		html += '<div class="btn" onclick="OpenEarthViewer.gpx.load();" title="load file">Load</div> ';
		html += '<div class="btn" onclick="OpenEarthViewer.gpx.switchPlaying();" title="play/pause">Play/Stop</div> ';
		html += '<div class="btn" onclick="OpenEarthViewer.gpx.speedMod(-1);" title="play">Slow</div> <div class="btn" onclick="OpenEarthViewer.gpx.speedMod(1);" title="play">Fast</div>';
		html += '</div>';
		document.getElementById( "overlayPlugins" ).innerHTML += html;
	}, 
	
	
	
	load : function(){
		if( this.json == undefined ){
			OEV.camCtrl.evt.addEventListener( "DEST_REACH", this, this.playNextPt );
			debug( "Loading gpx ..." );
			var url = "libs/remoteImg.php?gpx=1&name="+this.fileName+"";
			var _gpx = this;
			var ajaxMng = new AjaxMng( url, {'gpx':_gpx}, function( res, _params ){
				debug( "Gpx loaded" );
				_params['gpx'].draw( JSON.parse( res ) );
			});
		}else{
			this.draw( this.json );
		}
	}, 
	
	draw : function( _jsonDatas ) {
		this.json = _jsonDatas;
		if( this.lineMeshe == undefined ){
			this.datas = [];
			var lineGeo = new THREE.Geometry();
			for( var i = 0; i < this.json.length; i ++ ){
				var gpxTime = parseInt( this.json[i]["time"] );
				var gpxLon = parseFloat( this.json[i]["lon"]["0"] );
				var gpxLat = parseFloat( this.json[i]["lat"]["0"] );
				var gpxEle = parseFloat( this.json[i]["ele"]["0"] ) + 10;
				this.datas.push( { "time" : gpxTime, "lon" : gpxLon, "lat" : gpxLat, "ele" : gpxEle } );
				var pos = OEV.earth.coordToXYZ( gpxLon, gpxLat, gpxEle );
				lineGeo.vertices.push(
					new THREE.Vector3( pos.x, pos.y, pos.z )
				);
			}
			this.lineMeshe = new THREE.Line( lineGeo, this.lineMat );
			OEV.scene.add( this.lineMeshe );
			this.curPt = 3500;
			// this.play();
		}
	}, 
	
	speedMod : function( _factor ) {
		this.ptOffset += _factor;
		this.ptOffset = Math.max( this.ptOffset, 1 );
	}, 
	
	switchPlaying : function() {
		this.playing = !this.playing;
		if( this.playing ){
			this.playNextPt();
		}
	}, 
	
	play : function() {
		this.playing = true;
		this.curPt ++;
		this.playNextPt();
	}, 
	
	playNextPt : function() {
		if( this.playing ){
			this.curPt += this.ptOffset;
			OEV.camCtrl.setDestination( this.datas[this.curPt]["lon"], this.datas[this.curPt]["lat"], 100 );
		}
	}
}

OpenEarthViewer.plugins["GPX"] = OpenEarthViewer.gpx;