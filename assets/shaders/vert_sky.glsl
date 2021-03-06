uniform vec3 sunPos;
uniform float sunLuminosity;
uniform float skyRadius;
varying float vSunLight;
varying float vRedish;
varying float vRedishFactor;
void main() {
	vec3 sunDistance = vec3(0.0, 0.0, 0.0);
	sunDistance.x = position.x - sunPos.x;
	sunDistance.y = position.y - sunPos.y;
	sunDistance.z = position.z - sunPos.z;

	
	float attenuation = (length(sunDistance) / ((skyRadius * 6.0) * sunLuminosity));
	vSunLight = 2.0 - attenuation;
	vSunLight = min(2.0, vSunLight * 2.0);
	
	float myDistFromHorizon = abs(position.y / skyRadius);
	float sunDistToHorizon = 1.0 - abs(sunPos.y / skyRadius);
	float myDistToSun = 1.0 - abs(sunDistance.y / skyRadius);
	vRedish = myDistToSun * sunDistToHorizon;
	vRedishFactor = sunDistToHorizon * 0.7;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}