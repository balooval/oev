uniform float normalizedTime;
varying float vNormalizedTime;
varying float vAlpha;
varying vec2 vUv;
void main() {
	vUv = uv;
	vNormalizedTime = normalizedTime;
	vec3 normal_cameraspace = normalize(( viewMatrix * modelMatrix * vec4(normal,0.0)).xyz); 
	vec3 cameraVector = normalize(vec3(0, 0, 0) - (viewMatrix * modelMatrix * vec4(position, 1)).xyz);
	float cosTheta = dot( normal_cameraspace, cameraVector );
	cosTheta = abs(cosTheta);
	vAlpha = clamp(cosTheta - 0.5, 0.0, 1.0);
	vAlpha *= 2.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}