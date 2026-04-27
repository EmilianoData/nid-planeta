// Shader procedural de planeta — agora com pipeline de iluminação mais realista:
// - Diffuse (Lambert) + Ambient hemisférico (espaço = frio, céu = leve warm)
// - Specular Blinn-Phong só em faixas "oceânicas" (rochoso) ou topos de banda (gás)
// - Normal-map procedural (derivado do FBM) pra relevo de verdade
// - Terminador suave com dispersão atmosférica
// - Sombreamento auto-ocluso em crateras
//
// A API é idêntica (mesmos uniforms): uColor, uSunDir, uSeed, uEmissive, uTime.
// Nenhum componente externo precisa mudar.

export const planetVert = /* glsl */ `
varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewPos;
void main() {
  vLocalPos = position;
  vNormal   = normalize(normalMatrix * normal);
  vec4 wp   = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vViewPos  = (viewMatrix * wp).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const planetFrag = /* glsl */ `
precision highp float;

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewPos;

uniform vec3  uColor;
uniform vec3  uSunDir;
uniform float uSeed;
uniform float uEmissive;
uniform float uTime;

// ---------- noise ----------
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
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
// ridged noise pra cadeias montanhosas / jatos
float ridged(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    v += a * n * n;
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

// ---------- HSL helpers ----------
vec3 rgb2hsl(vec3 c) {
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float l  = (mx + mn) * 0.5;
  float d  = mx - mn;
  float h  = 0.0;
  float s  = 0.0;
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

// Terrain height-field — mesmo em todos os estilos (é o que vira normal map)
// Cada estilo interpreta "altura" diferente, mas a normal perturbada é real.
float terrainHeight(vec3 p, float style, float seed) {
  vec3 q = p + vec3(seed * 13.0);
  if (style < 0.33) {
    // rochoso: continentes amplos + cordilheiras + ruído fino
    float base = fbm(q * 2.2);
    float mtns = ridged(q * 3.4) * 0.6;
    return base + mtns * smoothstep(0.45, 0.65, base);
  } else if (style < 0.66) {
    // gás: bandas zonais + turbulência
    float lat  = p.y;
    float band = sin(lat * (5.5 + seed * 9.0) + fbm(q * 1.3) * 2.6);
    float turb = fbm(q * 3.8 + vec3(uTime * 0.015, 0.0, 0.0)) * 0.6;
    return 0.5 + band * 0.25 + turb * 0.2;
  } else {
    // luar: crateras (ridged invertido) + mares
    float mares = fbm(q * 2.0);
    float crat  = ridged(q * 6.5) * 0.55;
    return mares - crat * smoothstep(0.4, 0.75, mares);
  }
}

// Calcula normal perturbada via diferenças finitas do height-field.
// Em coordenadas locais (esfera unitária), a normal geométrica = local; então derivamos
// duas tangentes ortogonais e amostramos height em ±eps pra obter gradiente.
vec3 perturbNormal(vec3 localN, vec3 worldN, float style, float seed, float bumpStrength) {
  float eps = 0.01;
  // base ortogonal em torno da normal geométrica
  vec3 up = abs(localN.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T  = normalize(cross(up, localN));
  vec3 B  = normalize(cross(localN, T));

  float hC = terrainHeight(localN, style, seed);
  float hT = terrainHeight(normalize(localN + T * eps), style, seed);
  float hB = terrainHeight(normalize(localN + B * eps), style, seed);

  float dT = (hT - hC) / eps;
  float dB = (hB - hC) / eps;

  // Normal perturbada em espaço local — vira em espaço-mundo multiplicando pela mesma
  // rotação que worldN sofreu em relação a localN. Como é uma esfera, a rotação é a mesma
  // que mandar localN -> worldN; aproximamos projetando o delta no plano ortogonal a worldN.
  vec3 perturbedLocal = normalize(localN - (T * dT + B * dB) * bumpStrength);

  // transforma local -> world usando a mesma matriz normal (vNormal já foi transformada,
  // então construímos a base tangente no espaço mundo e aplicamos o mesmo delta)
  vec3 upW = abs(worldN.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 Tw  = normalize(cross(upW, worldN));
  vec3 Bw  = normalize(cross(worldN, Tw));
  return normalize(worldN - (Tw * dT + Bw * dB) * bumpStrength);
}

void main() {
  vec3 Nworld = normalize(vNormal);
  vec3 local  = normalize(vLocalPos);
  float style = uSeed;
  float seed  = uSeed;

  // ---------- base color por estilo ----------
  vec3 baseHsl = rgb2hsl(uColor);
  vec3 shade   = hsl2rgb(vec3(baseHsl.x, baseHsl.y * 0.85, max(0.0, baseHsl.z - 0.22)));
  vec3 deep    = hsl2rgb(vec3(baseHsl.x, min(1.0, baseHsl.y + 0.1), max(0.0, baseHsl.z - 0.38)));
  vec3 hilite  = hsl2rgb(vec3(fract(baseHsl.x + 0.02), baseHsl.y * 0.55, min(1.0, baseHsl.z + 0.22)));

  float height = terrainHeight(local, style, seed);
  vec3 col;
  float specMask = 0.0;
  float bumpStrength = 0.0;

  if (style < 0.33) {
    // --- ROCHOSO com oceanos ---
    float seaLevel = 0.48;
    float ocean = smoothstep(seaLevel + 0.02, seaLevel - 0.02, height);
    vec3 land = mix(shade, uColor, smoothstep(0.4, 0.75, height));
    // pico nevado
    land = mix(land, hilite, smoothstep(0.78, 0.92, height));
    vec3 sea = mix(deep * 0.6, deep, smoothstep(0.2, 0.48, height));
    col = mix(land, sea, ocean);
    specMask = ocean * 0.9; // mar brilha
    bumpStrength = (1.0 - ocean) * 0.35; // terra tem relevo, mar é liso
  }
  else if (style < 0.66) {
    // --- GÁS com bandas turbulentas + polos mais claros ---
    float band = sin(local.y * (5.5 + seed * 9.0) + fbm(local * 1.3) * 2.6);
    band = smoothstep(-0.3, 0.3, band);
    vec3 bandMix = mix(shade, uColor, band);
    // polos levemente descoloridos
    float polar = smoothstep(0.6, 0.95, abs(local.y));
    bandMix = mix(bandMix, hilite * 0.9, polar * 0.35);
    // vórtices / grande mancha
    float storm = smoothstep(0.72, 0.88, fbm(local * 4.5 + vec3(uTime * 0.02, 0.0, 0.0)));
    col = mix(bandMix, hilite, storm * 0.55);
    specMask = 0.15; // gás reflete pouco, mas topo de bandas cintila
    bumpStrength = 0.08; // relevo super sutil
  }
  else {
    // --- LUAR/ROCHOSO ÁRIDO com crateras de verdade ---
    col = mix(shade * 0.7, uColor, smoothstep(0.3, 0.7, height));
    float crater = smoothstep(0.72, 0.82, ridged(local * 6.5 + vec3(seed * 17.0)));
    col = mix(col, deep * 0.55, crater * 0.75);
    // ejecta clara ao redor
    float ejecta = smoothstep(0.78, 0.9, fbm(local * 11.0 + 3.0));
    col = mix(col, hilite, ejecta * 0.3);
    specMask = 0.05;
    bumpStrength = 0.45;
  }

  // ---------- normal perturbada ----------
  vec3 N = perturbNormal(local, Nworld, style, seed, bumpStrength);

  // ---------- lighting ----------
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 H = normalize(L + V);

  float NdotL = dot(N, L);
  // diffuse com wrap — evita terminador 100% preto (luz reflexa de poeira)
  float diffuse = max(NdotL * 0.92 + 0.08, 0.0);

  // ambient hemisférico: céu (levemente azulado) vs espaço (preto)
  float hemi = (N.y * 0.5 + 0.5);
  vec3 ambient = mix(vec3(0.03, 0.035, 0.05), vec3(0.08, 0.085, 0.10), hemi);

  // specular Blinn-Phong
  float NdotH = max(dot(N, H), 0.0);
  float spec = pow(NdotH, 64.0) * specMask * max(NdotL, 0.0);

  // terminador avermelhado (dispersão atmosférica baixa)
  float term = smoothstep(-0.25, 0.0, NdotL) * (1.0 - smoothstep(0.0, 0.35, NdotL));
  vec3 termTint = vec3(1.25, 0.72, 0.55);

  vec3 lit = col * (ambient + vec3(diffuse));
  lit = mix(lit, lit * termTint, term * 0.55);
  lit += vec3(1.0, 0.92, 0.82) * spec * 1.2;

  // emissive (NID glow ou auto-emissão do planeta)
  lit += col * uEmissive;

  // fresnel sutil para profundidade em view-space
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  lit += uColor * fres * 0.18;

  gl_FragColor = vec4(lit, 1.0);
}
`;
