varying float vSunLight;
varying float vRedish;
varying float vRedishFactor;
void main() {
	vec3 color = vec3(1.0, 1.0, 1.0);
	color.r = 0.3;
	color.g = 0.4;
	color.b = 1.5;
	color.r *= vSunLight;
	color.g *= vSunLight;
	color.b *= vSunLight;
	vec3 colorRed = vec3(0.0, 0.0, 0.0);
	colorRed.r = vRedish;
	colorRed.g = 0.5;
	colorRed.b = 0.4 + vRedish * 0.3;
	color = mix(color, colorRed, vRedishFactor);
	vec4 colFinal = vec4(color, 1.0);

	gl_FragColor = colFinal;
}