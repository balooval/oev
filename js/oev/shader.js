var shaderName = 'none';
var material = null;
var glslVert = null;
var glslFrag = null;
var params = null;
var callback = null;

export function build(_shaderName, _callback, _params) {
	shaderName = _shaderName;
	callback = _callback;
	params = _params || {};
	params.map = _params.map || null;
	params.normalMap = _params.normalMap || null;
	params.time = _params.time || 0;
	loadGlsl(shaderName);
}
	
function buildMaterial() {
	var defines = {};
	defines["USE_MAP"] = "";
	var phongShader = THREE.ShaderLib.phong;
	var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
	// console.log('uniforms', uniforms);
	uniforms.color = {value : new THREE.Color(0xff0000)};
	uniforms.opacity = { type: "t", value: 0.7 };
	uniforms.offsetRepeat = { type: "t", value: new THREE.Vector4(2, 2, 2, 2) };
	uniforms.shininess = { type: "t", value: 60 };
	uniforms.map = { type: "t", value: params.map };
	uniforms.normalMap = { type: "t", value: params.normalMap};
	uniforms.time = { type: "t", value: params.time };
	material = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: glslVert,
		fragmentShader: glslFrag,
		defines : defines, 
		lights: true, 
		transparent: true, 
	});
	material.normalMap = true;
	callback(shaderName, material);
}

function loadGlsl(_name) {
	fetch('assets/shaders/' + _name + '_vert.glsl')
	.then(function(response) {
		return response.text();
	})
	.then(function(_glsl) {
		glslVert = _glsl;
		checkShader();
	}).catch(function(error) {console.log('Fetch error :', error);});
	
	fetch('assets/shaders/' + _name + '_frag.glsl')
	.then(function(response) {
		return response.text();
	})
	.then(function(_glsl) {
		glslFrag = _glsl;
		checkShader();
	});
}

function checkShader() {
	if (glslVert !== null && glslFrag !== null) {
		// console.log(glslVert);
		buildMaterial();
	}
}