var ElevationCustom = function ( _startCoord, _endCoord ) {
	this.startCoord = _startCoord;
	this.endCoord = _endCoord;
	this.canvasEle = document.createElement('canvas');
	// this.size = 64;
	// this.size = 128;
	this.size = 1024;
	// this.size = 2048;
	this.canvasEle.height = this.size;
	this.canvasEle.width = this.size;
	this.contextEle = this.canvasEle.getContext('2d');
	this.contextEle.beginPath();
	this.contextEle.fillStyle = "rgba(0, 0, 0, 1)";
	this.contextEle.fill();
	this.contextEle.closePath();
	UiObj.evt.addEventListener( 'ON_CLICK_GROUND', this, this.paintElevation );
	
	this.eleDatas = [];
	for( var i = 0; i < this.size * this.size; i++ ){
		this.eleDatas.push( 0 );
	}
}


ElevationCustom.liste = {};

ElevationCustom.prototype.getCustomElevation = function( _lon, _lat ) {
	var prctHor = ( _lon - this.startCoord.x ) / Math.abs( this.startCoord.x - this.endCoord.x );
	var prctVert = ( this.startCoord.y - _lat ) / Math.abs( this.startCoord.y - this.endCoord.y );
	// var colData = this.contextEle.getImageData( Math.round( this.size * prctHor ), Math.round( this.size * prctVert ), 1, 1).data;
	// return colData[3];
	
	var posX = Math.round( this.size * prctHor );
	var posY = Math.round( this.size * prctVert );
	// debug( posX + ' / ' + posY );
	return this.eleDatas[ posX + posY * this.size ];
}

ElevationCustom.prototype.paintElevation = function() {
	if( UiObj.coordOnGround.x > this.startCoord.x && UiObj.coordOnGround.x < this.endCoord.x && UiObj.coordOnGround.y < this.startCoord.y && UiObj.coordOnGround.y > this.endCoord.y ){
		var prctHor = ( UiObj.coordOnGround.x - this.startCoord.x ) / Math.abs( this.startCoord.x - this.endCoord.x );
		var prctVert = ( this.startCoord.y - UiObj.coordOnGround.y ) / Math.abs( this.startCoord.y - this.endCoord.y );
		this.contextEle.beginPath();
		
		var drawSize = 32 / ( Math.pow( 2, OEV.camCtrl.zoomCur ) / 1000 );
		// var drawSize = 256;
		// var drawSize = 80 / OEV.camCtrl.zoomCur;
		debug( 'drawSize: ' + drawSize );
		
		var gradient = this.contextEle.createRadialGradient( this.size * prctHor, this.size * prctVert, 1, this.size * prctHor, this.size * prctVert, drawSize );
		gradient.addColorStop( 0, 'rgba(0,0,0,0.1)' );
		gradient.addColorStop( 1, 'rgba(0,0,0,0)' );
		
		this.contextEle.arc( this.size * prctHor, this.size * prctVert, drawSize, 0, 2 * Math.PI );
		// this.contextEle.fillStyle = 'rgba( 0, 0, 0, 0.4 )';
		this.contextEle.fillStyle = gradient;
		this.contextEle.fill();
		this.contextEle.closePath();
		
		var pxl = this.contextEle.getImageData( 0, 0, this.size, this.size );
		var pxlData = pxl.data;
		var length = pxlData.length;
		this.eleDatas = [];
		var c = 0;
		for( var i = 0; i < length; i += 4 ){
			this.eleDatas[c] = pxlData[i+3];
			c ++;
		}
		
		for( var i = 0; i < OEV.earth.tilesBase.length; i ++ ){
			OEV.earth.tilesBase[i].updateVertex();
		}
		
	}
}
