Oev.Animation = (function(){
	'use strict';
	var api = {
		
	};
	
	api.TweenValue = function(_value) {
		_value = _value || 0;
		this.value = _value;
		this.valueStart = 0;
		this.valueEnd = 0;
		this.timeStart = -1;
		this.timeEnd = -1;
		this.timeTotal = -1;
		this.running = false;
		this.evt = new Oev.Utils.Evt();
	};
	
	api.TweenValue.prototype = {
		setTargetValue : function(_value, _duration) {
			var d = new Date();
			var curTime = d.getTime();
			this.valueStart = this.value;
			this.valueEnd = _value;
			this.timeStart = curTime;
			this.timeEnd = curTime + _duration;
			this.timeTotal = this.timeEnd - this.timeStart;
			this.running = true;
		}, 
		
		getValueAtTime : function(_curTime) {
			this.timeTotal = this.timeEnd - this.timeStart;
			var timeElapsed = _curTime - this.timeStart;
			var timePrct = ( timeElapsed / this.timeTotal );
			var delta = this.valueEnd - this.valueStart;
			this.value = this.valueStart + ( delta * ( timePrct ) );
			if( timePrct >= 1 ){
				this.reachTargetValue();
			}
			return this.value;
		}, 

		reachTargetValue : function() {
			this.value = this.valueEnd;
			this.valueStart = this.valueEnd;
			this.timeEnd = -1;
			this.timeTotal = -1;
			this.running = false;
			this.evt.fireEvent( "END" );
		}, 
	};
	
	
	return api;
})();

