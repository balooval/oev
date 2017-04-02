varying float vSunColor;
varying float vSunElevation;
void main() {
	vec3 color = vec3(vSunColor);
	color.r = 1.0;
	color.g = (0.8 + vSunColor) * vSunElevation;
	color.b = (0.5 + vSunColor) * vSunElevation;
	
	vec4 colFinal = vec4(color, vSunColor + 0.3);
	gl_FragColor = colFinal;
}