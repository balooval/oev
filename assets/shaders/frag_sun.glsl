varying float vSunColor;
varying float vSunElevation;
void main() {
	vec3 color = vec3(vSunElevation * 0.5);
	color.r = 1.0;
	color.g *= 4.0;
	color.b *= 2.0;
	vec4 colFinal = vec4(color, 1);
	gl_FragColor = colFinal;
}