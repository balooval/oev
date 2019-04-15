export class Evt {

	constructor() {
		this.events = {};
		this.listeners = {};
	}

	addEventListener(_evtName, _listener, _callback) {
		if (this.events[_evtName] === undefined) {
			this.events[_evtName] = [];
			this.listeners[_evtName] = [];
		}
		this.events[_evtName].push(_callback);
		this.listeners[_evtName].push(_listener);
	}

	removeEventListener(_evtName, _listener, _callback) {
		var i;
		var index = -1;
		if (!this.events.hasOwnProperty(_evtName)){
			return false;
		}
		for (i = 0; i < this.listeners[_evtName].length; i ++) {
			if (this.listeners[_evtName][i] == _listener && this.events[_evtName][i] == _callback) {
				index = i;
				break;
			}
		}
		if (index < 0){
			console.error('removeEventListener "' + _evtName + '" NOT found');
			return false;
		}
		this.events[_evtName].splice(index, 1);
		this.listeners[_evtName].splice(index, 1);
	}

	fireEvent(_evtName, _args) {
		var i;
		if (!this.events.hasOwnProperty(_evtName)){
			return false;
		}
		if (_args === undefined) {
			_args = [];
		}
		var evs = this.events[_evtName].slice(0);
		var lst = this.listeners[_evtName].slice(0);
		var listenerNb = evs.length;
		for (i = 0; i < listenerNb; i++) {
			evs[i].call(lst[i], _args);
		}
	}
}


export { Evt as default}