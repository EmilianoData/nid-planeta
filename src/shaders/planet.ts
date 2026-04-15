// Shader procedural de planeta — bandas/feições únicas por seed.
// Objetivo: setores com cores semelhantes ganham "rosto" diferente (gás, rochoso, listrado)
// sem custo de textura ou memória.

export const planetVert = /* glsl */ `
varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vLocalPos = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const planetFrag = /* glsl */ `
precision highp float;

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3  uColor;
uniform vec3  uSunDir;
uniform float uSeed;       // 0..1 — estilo de planeta
uniform float uEmissive;
uniform float uTime;

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// HSL helper pra derivar tons claros/escuros da cor base
vec3 rgb2hsl(vec3 c) {
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float l = (mx + mn) * 0.5;
  float d = mx - mn;
  float h = 0.0;
  float s = 0.0;
  if (d > 0.0001) {
    s = d / (1.0 - abs(2.0 * l - 1.0) + 0.0001);
    if (mx == c.r)      h = mod((c.g - c.b) / d, 6.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else                h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5)     return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}
vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  if (s < 0.0001) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 local = normalize(vLocalPos);

  // Estilo determinado pelo seed:
  // 0.0–0.33: rochoso manchado
  // 0.33–0.66: gás com bandas latitudinais
  // 0.66–1.0: crateras + manchas
  float style = uSeed;

  // base HSL pra derivar tons claros e escuros
  vec3 baseHsl = rgb2hsl(uColor);
  vec3 shade   = hsl2rgb(vec3(baseHsl.x, baseHsl.y * 0.85, max(0.0, baseHsl.z - 0.18)));
  vec3 hilite  = hsl2rgb(vec3(fract(baseHsl.x + 0.03), baseHsl.y * 0.7, min(1.0, baseHsl.z + 0.18)));

  vec3 col = uColor;

  // ---- ROCHOSO MANCHADO ----
  if (style < 0.33) {
    float n = fbm(local * 3.2 + vec3(uSeed * 13.0));
    float c = smoothstep(0.35, 0.75, n);
    col = mix(shade, uColor, c);
    float dots = smoothstep(0.78, 0.88, fbm(local * 7.0 + vec3(uSeed * 5.0)));
    col = mix(col, hilite, dots * 0.55);
  }
  // ---- GÁS COM BANDAS ----
  else if (style < 0.66) {
    float band = sin(local.y * (6.0 + uSeed * 10.0) + fbm(local * 1.6 + vec3(uSeed * 7.0)) * 2.2);
    band = smoothstep(-0.3, 0.3, band);
    col = mix(shade, uColor, band);
    float turb = fbm(local * 4.0 + vec3(uTime * 0.02, 0.0, 0.0));
    col = mix(col, hilite, smoothstep(0.55, 0.85, turb) * 0.5);
  }
  // ---- CRATERAS + MANCHAS ----
  else {
    float n = fbm(local * 4.5 + vec3(uSeed * 17.0));
    col = mix(shade, uColor, smoothstep(0.3, 0.7, n));
    float craters = smoothstep(0.72, 0.82, fbm(local * 9.0));
    col = mix(col, shade * 0.55, craters * 0.7);
    float hi = smoothstep(0.82, 0.9, fbm(local * 11.0 + 3.0));
    col = mix(col, hilite, hi * 0.4);
  }

  // ---- Iluminação ----
  vec3 L = normalize(uSunDir);
  float lambert = max(dot(N, L), 0.0);
  float ambient = 0.28;
  float lit = ambient + lambert * 0.85;

  // Terminador ganha tom quente
  float term = smoothstep(0.0, 0.15, lambert) - smoothstep(0.15, 0.3, lambert);
  col = mix(col, col * vec3(1.15, 0.85, 0.7), term * 0.3);

  vec3 final = col * lit + col * uEmissive;

  // Leve fresnel pra dar profundidade
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  final += uColor * fres * 0.25;

  gl_FragColor = vec4(final, 1.0);
}
`;
