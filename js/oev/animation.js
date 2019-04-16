import Evt from './event.js';

export class TweenValue {

	constructor(_value = 0) {
		this.value = _value;
		this.valueStart = 0;
		this.valueEnd = 0;
		this.timeStart = -1;
		this.timeEnd = -1;
		this.timeTotal = -1;
		this.running = false;
		this.evt = new Evt();
	}

	setTargetValue(_value, _duration) {
		const d = new Date();
		const curTime = d.getTime();
		this.valueStart = this.value;
		this.valueEnd = _value;
		this.timeStart = curTime;
		this.timeEnd = curTime + _duration;
		this.timeTotal = this.timeEnd - this.timeStart;
		this.running = true;
	}
	
	getValueAtTime(_curTime) {
		this.timeTotal = this.timeEnd - this.timeStart;
		const timeElapsed = _curTime - this.timeStart;
		const timePrct = (timeElapsed / this.timeTotal);
		const delta = this.valueEnd - this.valueStart;
		this.value = this.valueStart + (delta * (timePrct));
		if(timePrct >= 1){
			this.reachTargetValue();
		}
		return this.value;
	}

	reachTargetValue() {
		this.value = this.valueEnd;
		this.valueStart = this.valueEnd;
		this.timeEnd = -1;
		this.timeTotal = -1;
		this.running = false;
		this.evt.fireEvent('END');
	}
}