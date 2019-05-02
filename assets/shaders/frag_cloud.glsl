uniform sampler2D map;
varying float vNormalizedTime;
varying float vAlpha;
varying vec2 vUv;
void main() {
	vec4 pxlColor = texture2D(map, vUv);
	vec3 color = vec3(vNormalizedTime);
	float morning = smoothstep(0.24, 0.3, vNormalizedTime);
	float clampedAlpha = clamp(pxlColor.a, 0.5, 0.9);
	float night = smoothstep(0.71, 0.75, vNormalizedTime) * 0.9;
	float red = (1.0 - clampedAlpha) * morning;
	red *= abs(smoothstep(0.74, 0.76, vNormalizedTime) - 1.0);
	color.r = 0.1 + morning - night + red * 2.0;
	color.g = 0.1 + morning - night + red * 0.2;
	color.b = 0.1 + morning - night + red * 0.1;
	vec4 colFinal = vec4(color, vAlpha * pxlColor.a);
	gl_FragColor = colFinal;
}