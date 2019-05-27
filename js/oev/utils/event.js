class Evt {

	constructor() {
		this.events = new Map();
		this.listeners = new Map();
	}

	addEventListener(_evtName, _listener, _callback) {
		if (!this.events.has(_evtName)) {
			this.events.set(_evtName, []);
			this.listeners.set(_evtName, []);
		}
		this.events.get(_evtName).push(_callback);
		this.listeners.get(_evtName).push(_listener);
	}

	removeEventListener(_evtName, _listener, _callback) {
		var index = -1;
		if (!this.events.has(_evtName)) return false;
		const listeners = this.listeners.get(_evtName);
		const events = this.events.get(_evtName);
		for (let i = 0; i < listeners.length; i ++) {
			if (listeners[i] == _listener && events[i] == _callback) {
				index = i;
				break;
			}
		}
		if (index < 0){
			// console.error('removeEventListener "' + _evtName + '" NOT found');
			return false;
		}
		this.events.get(_evtName).splice(index, 1);
		listeners.splice(index, 1);
	}

	fireEvent(_evtName, _args = []) {
		if (!this.events.has(_evtName)) return false;
		var evs = this.events.get(_evtName).slice(0);
		var lst = this.listeners.get(_evtName).slice(0);
		var listenerNb = evs.length;
		for (let i = 0; i < listenerNb; i++) {
			evs[i].call(lst[i], _args);
		}
	}
}

export { Evt as default}