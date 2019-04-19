import Evt from '../event.js';

const Mouse = (function(){
	'use strict';
	var api = {
		curMouseX : 0, 
		curMouseY : 0, 
		mouseBtnLeftState : false, 
		mouseBtnMiddleState : false, 
		mouseBtnRightState : false, 
		evt : new Evt(), 
		
		init : function() {
			document.onmousemove = api.onMouseMove;
			document.addEventListener('mousewheel', api.onMouseWheel, {passive: true});
		}, 
		
		onMouseDown : function(evt) {
			switch (evt.button) {
				case 0:
					api.mouseBtnLeftState = true;
					onMouseLeftDown();
				break;
				case 1:
					api.mouseBtnMiddleState = true;
				break;
				case 2:
					api.mouseBtnRightState = true;
					onMouseRightDown();
				break;
			}
		}, 
		
		onMouseUp : function(evt) {
			var btnCode;
			if ('object' === typeof evt) {
				btnCode = evt.button;
				switch (btnCode) {
					case 0:
						api.mouseBtnLeftState = false;
						onMouseLeftUp();
					break;
					case 1:
						api.mouseBtnMiddleState = false;
					break;
					case 2:
						api.mouseBtnRightState = false;
						onMouseRightUp();
					break;
				}
			}
		}, 
		
		onMouseMove : function(evt) {
			api.curMouseX = evt.clientX;
			api.curMouseY = evt.clientY;
		}, 
		
		onMouseWheel : function(evt) {
			var delta = evt.wheelDelta / 360;
			api.evt.fireEvent('MOUSE_WHEEL', delta);
		}, 
	};
	
	
	function onMouseLeftDown() {
		api.evt.fireEvent('MOUSE_LEFT_DOWN');
	}
	function onMouseRightDown() {
		api.evt.fireEvent('MOUSE_RIGHT_DOWN');
	}
	
	function onMouseLeftUp() {
		api.evt.fireEvent('MOUSE_LEFT_UP');
	}
	function onMouseRightUp() {
		api.evt.fireEvent('MOUSE_RIGHT_UP');
	}
	
	return api;
})();

export { Mouse as default} 