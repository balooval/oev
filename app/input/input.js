import Mouse from './mouse.js';
import Keyboard from './keyboard.js';

export function init() {
	Mouse.init();
	Keyboard.init();
}

export {Mouse, Keyboard};