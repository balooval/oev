/*
let tmp = false;
let tmpNoCache = false;

Oev.Input.Keyboard = (function(){
	'use strict';
	var majActiv = false;
	var ctrlActiv = false;
	
	var api ={
		lastKeyDown : -1, 
		lastKeyUp : -1, 
		evt : new Oev.Utils.Evt(), 
		
		onKeyDown : function(event) {
			if (document.activeElement.type == undefined ){
				var key = event.keyCode || event.which;
				var keychar = String.fromCharCode(key);
				// console.log( "onKeyDown : " + key + " / " + keychar );
				if( api.lastKeyDown != key ){
					api.lastKeyUp = -1;
					api.lastKeyDown = key;
					api.evt.fireEvent("ON_KEY_DOWN");
				}
				if( key == 87 ){ // w
					
				}else if( key == 16 ){ // MAJ
					majActiv = true;
				}else if( key == 17 ){ // CTRL
					ctrlActiv = true;
				}else if( key == 37 ){ // LEFT
					
				}else if( key == 39 ){ // RIGHT
					
				}else if( key == 38 ){ // TOP

				}else if( key == 40 ){ // BOTTOM

				}else if( key == 49 ){ // 1
					
				}else if( key == 50 ){ // 2
					
				}else if( key == 51 ){ // 3
					
				}else if( key == 65 ){ // a
					Oev.Sky.tmp(0.00001);
					
				}else if( key == 66 ){ // b
					
				}else if( key == 67 ){ // c
					tmpNoCache = !tmpNoCache;
					console.warn('Refresh cache : ', tmpNoCache);
				}else if( key == 68 ){ // d
					
				}else if( key == 69 ){ // e

				}else if( key == 71 ){ // g
				
				}else if( key == 76 ){ // l

				}else if( key == 79 ){ // o
					
				}else if( key == 80 ){ // p
					
				}else if( key == 82 ){ // r
					
				}else if( key == 83 ){ // s
					tmp = !tmp;
					console.log('tmp', tmp);
					
					// var resAlt = Oev.Globe.posFromAltitude(100);
					// console.log('resAlt', resAlt);
					var testA = Oev.Globe.coordToXYZ(0, 0, 10);
					var testB = Oev.Globe.coordToXYZ(10, 10, 10);
					testB.x -= testA.x;
					testB.z -= testA.z;
					console.log('test', testB);
					
				}else if( key == 90 ){ // z
					// Oev.Net.Overpass.load(Oev.Globe.getCurTile());
				}else if( key == 107 ){ // +
					// OEV.camCtrl.setZoomDest( OEV.camCtrl.zoomDest + 1, 200 );
					// Oev.Tile.Extension.WhaleRot += 0.2;
					// console.log('Oev.Tile.Extension.WhaleRot', Oev.Tile.Extension.WhaleRot);
					zoomIn();
				}else if( key == 109 ){ // -
					// OEV.camCtrl.setZoomDest(OEV.camCtrl.zoomDest - 1, 200);
					// Oev.Tile.Extension.WhaleRot -= 0.2;
					// console.log('Oev.Tile.Extension.WhaleRot', Oev.Tile.Extension.WhaleRot);
					zoomOut()
				}else if( key == 88 ){ // x
					
				}
			}
		}, 
				
		onKeyUp : function(evt) {
			var key = evt.keyCode || evt.which;
			var keychar = String.fromCharCode(key);
			if( api.lastKeyUp != key ){
				api.lastKeyDown = -1;
				api.lastKeyUp = key;
				api.evt.fireEvent("ON_KEY_UP");
			}
			if( key == 17 ){ // CTRL
				ctrlActiv = false;
			}else if( key == 16 ){ // MAJ
				majActiv = false;
			}
		}, 
	};
	
	return api;
})();
*/