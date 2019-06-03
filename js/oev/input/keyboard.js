import Evt from '../utils/event.js';

let majActiv = false;
let ctrlActiv = false;
let lastKeyDown = -1;
let lastKeyUp = -1;

const api ={
	evt : new Evt(), 

	init : function() {
		document.addEventListener('keydown', api.onKeyDown);
		document.addEventListener('keyup', api.onKeyUp);
	}, 
	
	onKeyDown : function(event) {
		var key = event.keyCode;
		// var keychar = String.fromCharCode(key);
		// console.log('onKeyDown' + key + ' / ' + keychar);
		if (lastKeyDown != key ){
			lastKeyUp = -1;
			lastKeyDown = key;
			api.evt.fireEvent('ON_KEY_DOWN');
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
			
		}else if( key == 66 ){ // b
			
		}else if( key == 67 ){ // c
			
		}else if( key == 68 ){ // d
			
		}else if( key == 69 ){ // e

		}else if( key == 71 ){ // g
		
		}else if( key == 76 ){ // l

		}else if( key == 79 ){ // o
			
		}else if( key == 80 ){ // p
			
		}else if( key == 82 ){ // r
			
		}else if( key == 83 ){ // s
			
		}else if( key == 90 ){ // z
			
		}else if( key == 107 ){ // +
			
		}else if( key == 109 ){ // -
			
		}else if( key == 88 ){ // x
			
		}
	}, 
			
	onKeyUp : function(evt) {
		var key = evt.keyCode;
		if (lastKeyUp != key) {
			lastKeyDown = -1;
			lastKeyUp = key;
			api.evt.fireEvent('ON_KEY_UP');
		}
		if (key == 17) { // CTRL
			ctrlActiv = false;
		} else if (key == 16) { // MAJ
			majActiv = false;
		}
	}, 
};

export {api as default} 