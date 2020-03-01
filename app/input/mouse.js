import Evt from '../core/event.js';
import Renderer from '../core/renderer.js';

const api = {
	curMouseX : 0, 
	curMouseY : 0, 
	mouseBtnLeftState : false, 
	mouseBtnMiddleState : false, 
	mouseBtnRightState : false, 
	evt : new Evt(), 
	
	init : function() {
		document.onmousemove = api.onMouseMove;
		const domContainer = Renderer.domContainer();
		domContainer.addEventListener('mousewheel', api.onMouseWheel, {passive: true});
		domContainer.addEventListener('mousedown',api.onMouseDown,false);
		domContainer.addEventListener('mouseup',api.onMouseUp,true);
		domContainer.addEventListener('contextmenu', e => e.preventDefault(), true);
	}, 
	
	onMouseDown : function(_evt) {
		switch (_evt.button) {
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
	
	onMouseUp : function(_evt) {
		switch ( _evt.button) {
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
	}, 
	
	onMouseMove : function(_evt) {
		api.curMouseX = _evt.clientX;
		api.curMouseY = _evt.clientY;
	}, 
	
	onMouseWheel : function(_evt) {
		var delta = _evt.wheelDelta / 360;
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

export {api as default} 