uniform float sunElevation;
varying float vSunElevation;
varying float vSunColor;
void main() {
	vSunElevation = (sunElevation * 8.0) + 0.3;
	vec3 fragPos = vec3(modelMatrix * vec4(position, 1.0));
	vec3 camDir = normalize(cameraPosition - fragPos); 
	float diff = dot(normal, camDir);
	vSunColor = diff;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}