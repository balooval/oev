/*
* 
* APP bootstrap
* Generic start point in charge of loading and updating application.
* 
*/

'use strict';

var APP = APP || {};

APP = (function(api){
    var appSrc = null;
    
    var subModules = [
        'DpiApi', 
        'DpiApiCache', 
        'DpiUi', 
        'DpiUtil', 
    ];
    
    api.app = null;
    api.api = null;
    api.evt = null;
    
    
    api.loadApp = function(_src) {
        appSrc = _src;
    }
    
    api.init = function() {
        _requireSubModules();
        if (appSrc !== null) {
            api.require(appSrc);
        }
        _loadSrc();
    }
    
    api.start = function() {
        console.log('All scripts loaded, start now');
        // init sub modules
        // APP.api.init();
        // APP.UI.init();
        // APP.UTIL.init();
        api.evt = new APP.UTIL.EvtDispatcher();
        // init Main APP
        api.app.init();
    }
    
    api.require = function(_srcFile) {
        if (required.indexOf(_srcFile) < 0) {
            required.push(_srcFile);
            srcToLoad.push(_srcFile);
        }
    }
    
    api.setApp = function(_app) {
        if (api.app) {
            throw 'APP.app already defined';
        }
        api.app = _app;
        if (srcToLoad.length == 0) {
            api.app.init();
        }
    }
    
    
    var required = [];
    var srcToLoad = [];
    
    function _requireSubModules() {
        for (var i = 0; i < subModules.length; i ++) {
            api.require('js/oev/' + subModules[i] + '.js');
        }
    }
    
    function _injectScriptBase(_scriptName) {
        var script = document.createElement('script');
        script.setAttribute('id', 'script_' + _scriptName);
        script.type = 'text/javascript';
        script.async = true;
        script.onload = function(){
            _loadSrc();
        };
        script.addEventListener('error', function(_err){
                console.warn('Error loading dcript');
            }, 
            false
        );
        
        script.src = _scriptName;
        document.getElementsByTagName('head')[0].appendChild(script);
    }
    
    function hashCode(_str) {
        var hash = 0, i, chr, len;
        if (_str.length === 0) return hash;
        for (i = 0, len = _str.length; i < len; i++) {
            chr = _str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    
    function _loadSrc() {
        if (srcToLoad.length > 0) {
            var nextScript = srcToLoad.shift();
			_injectScriptBase(nextScript);
        } else if (api.app) {
            api.start();
        }
    }
    
    return api;
    
}(APP));
