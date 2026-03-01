const canvas = document.getElementById('supernova-preview');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

// ─── Shared vertex shader (used by both passes) ───────────────────────────────
const QUAD_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// ─── PASS 1: Star-bake shader ─────────────────────────────────────────────────
// Runs ONCE (or on resize) into a half-res FBO texture.
// The 1000-star loop is paid only that once, not every frame.
const STAR_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;

#define PI 3.14159265359

float hash1(float n) { return fract(sin(n) * 43758.5453); }

// Diffraction spike helper
float spike(vec2 uv, float angle, float len, float w) {
  float c = cos(angle), s = sin(angle);
  vec2 r = vec2(c*uv.x + s*uv.y, -s*uv.x + c*uv.y);
  float fade = (1.0 - clamp(r.x/len, 0.0, 1.0));
  return smoothstep(w, 0.0, abs(r.y)) * fade * fade * step(0.0, r.x);
}

vec3 starColor(float seed) {
  float t = hash1(seed * 7.3);
  if (t < 0.3) return vec3(0.9, 0.95, 1.0);   // blue-white
  if (t < 0.6) return vec3(1.0, 0.97, 0.88);  // warm white
  if (t < 0.8) return vec3(1.0, 0.7,  0.4);   // orange
  return vec3(0.9, 0.4, 0.3);                  // red
}

void main() {
  // Map vUv to 2× the normal world space so rotation never hits the edges.
  // At zoom=1 the screen diagonal reaches radius ≈1.41; covering [-2,2] gives
  // comfortable margin for any drag angle.
  vec2 uv = (vUv * 2.0 - 1.0) * 2.0;
  uv.x *= uRes.x / uRes.y;

  vec3 stars = vec3(0.0);

  for (int i = 0; i < 10000; i++) {
    float fi = float(i);
    // Star position in [-1.5, 1.5]
    vec2 sp = vec2(hash1(fi * 1.1) * 6.0 - 3.0,
                   hash1(fi * 2.3) * 6.0 - 3.0);
    sp.x *= uRes.x / uRes.y;

    vec2 d    = uv - sp;
    float dist = length(d);
    float br  = hash1(fi * 0.7);
    float sz  = 0.0003 + br * br * 0.002;

    // Core glow — early-out if far away to save ALU
    if (dist > sz * 12.0 && br < 0.75) continue;

    float core = exp(-dist * dist / (sz * sz * 2.0));
    vec3  sc   = starColor(fi);

    // Diffraction spikes for brighter stars
    if (br > 0.75) {
      float slen = 0.012 + br * 0.035;
      float sw   = 0.0008;
      float spk  = (spike(d, 0.0,        slen,       sw) +
                    spike(d, PI,          slen,       sw) +
                    spike(d, PI * 0.5,    slen,       sw) +
                    spike(d, PI * 1.5,    slen,       sw)) * br * br
                 + (spike(d, PI * 0.25,   slen * 0.6, sw * 0.7) +
                    spike(d, PI * 0.75,   slen * 0.6, sw * 0.7) +
                    spike(d, PI * 1.25,   slen * 0.6, sw * 0.7) +
                    spike(d, PI * 1.75,   slen * 0.6, sw * 0.7)) * br * 0.5;
      stars += sc * spk * (0.3 + br * 0.7);
    }
    stars += sc * core * (0.5 + br * 0.5);
  }

  gl_FragColor = vec4(stars, 1.0);
}`;

// ─── PASS 2: Main SNR shader ──────────────────────────────────────────────────
// Stars are sampled from a texture — no loop here.
// FBM reduced to 3 octaves max; wisp uses single domain-warp (3 fbm calls → 1 warp).
// w5/w6 are cheap linear blends of existing wisps.
const MAIN_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform float uZoom;
uniform float uAngle;
uniform sampler2D uStarTex;   // pre-baked star field

#define PI  3.14159265359
#define TAU 6.28318530718

// ── Hash / noise ─────────────────────────────────────────────────────────────
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float hash1(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i),          b = hash(i + vec2(1, 0)),
        c = hash(i + vec2(0,1)),d = hash(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// ── Reduced-octave FBM (max 3) ────────────────────────────────────────────────
// Was 5–6 octaves; 3 gives ≈ the same visual character at half the work.
float fbm(vec2 p, int oct) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 3; i++) {
    if (i >= oct) break;
    v += a * noise(p);
    p  = rot * p * 2.07;
    a *= 0.5;
  }
  return v;
}

// ── Single-warp wisp ──────────────────────────────────────────────────────────
// Original had a triple domain-warp (q→r→result = 5 fbm calls).
// Single warp (q→result = 3 fbm calls) is 40 % cheaper and visually comparable.
float wisp(vec2 p, float scale, float t) {
  float ts = t * 0.04;
  vec2 q = vec2(fbm(p * scale + vec2(0.0,  ts),        3),
                fbm(p * scale + vec2(5.2,   1.3 - ts), 3));
  return    fbm(p * scale + 3.5 * q + vec2(1.7, 9.2 + t * 0.02), 3);
}

float filament(float v, float w) {
  return smoothstep(0.0, w, v) * smoothstep(2.0 * w, w, v);
}

void main() {
  // ── Coordinate setup ───────────────────────────────────────────────────
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uRes.x / uRes.y;
  uv /= uZoom;
  float cosA = cos(uAngle), sinA = sin(uAngle);
  uv = vec2(cosA * uv.x - sinA * uv.y,
            sinA * uv.x + cosA * uv.y);

  // ── Background ──────────────────────────────────────────────────────────
  // Sample star texture. Bake covers world space [-2,2] so divide by 2
  // before the standard *0.5+0.5 remap → overall * 0.25 + 0.5.
  float aspect   = uRes.x / uRes.y;
  vec2 starTexUv = vec2(uv.x / aspect, uv.y) * 0.25 + 0.5;
  vec3 stars = texture2D(uStarTex, starTexUv).rgb;

  // Sparkle: modulate brightness with a per-star sine wave.
  // noise() gives each local star region a unique frequency + phase offset.
  float sPhase = noise(starTexUv * 75.0);
  float twinkle = 0.65 + 0.35 * sin(uTime * (2.5 + 4.5 * sPhase) + sPhase * 6.2832);
  stars *= twinkle;

  vec3 bg = vec3(0.005, 0.003, 0.008);
  float bgNoise = fbm(uv * 0.8 + vec2(1.2, 3.4), 3);
  bg += vec3(0.0, 0.01, 0.02) * bgNoise * bgNoise;
  bg += vec3(0.0, 0.025, 0.015)
      * smoothstep(0.7, 1.0, fbm(uv * 0.5 + vec2(8.0, 2.0), 2));

  // ── SNR geometry ────────────────────────────────────────────────────────
  float r     = length(uv);
  float angle = atan(uv.y, uv.x);

  float rot = uTime * 0.008;
  vec2 ruv = vec2(cos(rot) * uv.x - sin(rot) * uv.y,
                  sin(rot) * uv.x + cos(rot) * uv.y);

  float pulse  = 1.0 + 0.008 * sin(uTime * 0.4);
  float R_SNR  = 0.68 * pulse;

  float shellDeform = 0.10 * fbm(vec2(angle * 1.6, uTime * 0.02 + r), 3)
                    + 0.06 * fbm(vec2(angle * 3.2 + 1.0, uTime * 0.015), 2);
  float shellR  = R_SNR * (1.0 + shellDeform);
  float normR   = r / max(shellR, 0.001);

  // Wider interior mask — fills more of the ball instead of just a thin shell
  float shellMask = smoothstep(1.30, 0.55, normR);
  float outerMask = smoothstep(1.05, 0.85, normR) * smoothstep(1.6, 1.0, normR);

  // ── 4 wisp layers (was 6) ────────────────────────────────────────────────
  float w1 = wisp(ruv,              2.8, uTime);
  float w2 = wisp(ruv + vec2(1.3, 0.7), 4.5, uTime * 1.1);
  float w3 = wisp(ruv * 1.2 + vec2(3.1, 1.4), 7.0, uTime * 0.9);
  float w4 = wisp(ruv * 0.7 + vec2(-1.2, 2.0), 3.2, uTime * 1.3);
  // w5/w6: cheap linear blends of existing wisps instead of two more wisp() calls
  float w5 = mix(w1, w3, 0.55);
  float w6 = mix(w2, w4, 0.45);

  // ── Color layers ────────────────────────────────────────────────────────
  vec3 redEjecta  = vec3(0.85, 0.08, 0.05);
  // Broadened: removed the tight w2 gate so red fills more of the outer shell
  float redDens   = outerMask * (0.5 + 0.6 * w1) * smoothstep(0.35, 0.65, w2)
                  + shellMask * (0.25 + 0.4 * w1) * smoothstep(0.3, 0.0, normR);

  vec3  blueShock = vec3(0.15, 0.55, 0.95);
  vec3  cyanShock = vec3(0.2,  0.85, 0.9);
  // Lower thresholds → blobs appear over a larger fraction of the shell
  float blueFluid = smoothstep(0.32, 0.62, w2) * smoothstep(0.28, 0.58, w5);
  float blueDens  = shellMask * blueFluid * (0.6 + 0.5 * w3)
                  + outerMask * smoothstep(0.38, 0.68, w1) * (0.5 + 0.5 * w4);

  vec3  whitePeak = vec3(0.95, 0.97, 1.0);
  float whiteDens = shellMask
                  * smoothstep(0.38, 0.78, w1)
                  * smoothstep(0.35, 0.78, w3)
                  * (0.4 + 0.6 * smoothstep(0.3, 0.85, normR));

  vec3  yellowGreen = vec3(0.75, 0.95, 0.15);
  float ygDens = shellMask * (0.4 + 0.7 * w3) * filament(w4, 0.10) * 3.5
               + shellMask * smoothstep(0.55, 0.0, normR)
                           * smoothstep(0.32, 0.62, w6) * 1.8;

  vec3  purple = vec3(0.55, 0.12, 0.75);
  float purpleFluid = smoothstep(0.32, 0.65, w5) * smoothstep(0.28, 0.60, w2);
  float purpleDens  = shellMask * purpleFluid * (0.5 + 0.6 * fbm(ruv * 3.0, 3))
                    + shellMask * smoothstep(0.65, 0.0, normR)
                                * smoothstep(0.30, 0.60, w6) * (0.7 + 0.5 * w3);

  vec3  orange     = vec3(1.0, 0.45, 0.05);
  float orangeDens = shellMask * filament(w1, 0.09) * 3.2;

  // Hot turbulent core fill — warms up the centre significantly
  vec3  coreHot  = vec3(0.9, 0.25, 0.05);
  float coreFill = smoothstep(0.70, 0.0, normR)
                 * (0.55 + 0.45 * w1)
                 * (0.45 + 0.55 * smoothstep(0.3, 0.65, w5));

  float coreBright = smoothstep(0.38, 0.0, normR)
                   * smoothstep(0.48, 0.82, w3)
                   * smoothstep(0.42, 0.78, w1);

  // ── Knots (3 iterations — compiler unrolls this automatically) ───────────
  float knots = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk     = float(k);
    float kAngle = fk * TAU / 18.0 + hash1(fk) * 1.2
                 + uTime * 0.005 * (hash1(fk + 99.0) - 0.5);
    float kR     = R_SNR * (0.85 + hash1(fk * 3.7) * 0.3);
    vec2  kPos   = kR * vec2(cos(kAngle), sin(kAngle));
    float kDist  = length(uv - kPos);
    float kSz    = 0.03 + hash1(fk * 5.1) * 0.06;
    knots += exp(-kDist * kDist / (kSz * kSz)) * (0.5 + 0.5 * hash1(fk * 2.2));
  }

  // ── Assemble ────────────────────────────────────────────────────────────
  vec3 snrCol = vec3(0.0);
  snrCol += redEjecta  * redDens    * 3.0;
  snrCol += mix(cyanShock, blueShock, w3) * blueDens * 3.5;
  snrCol += whitePeak  * whiteDens  * 4.2;
  snrCol += yellowGreen* ygDens     * 3.0;
  snrCol += purple     * purpleDens * 2.8;
  snrCol += orange     * orangeDens * 2.8;
  snrCol += coreHot    * coreFill   * 3.0;   // restored hot core
  snrCol += whitePeak  * coreBright * 5.0;

  vec3 knotCol = mix(redEjecta, whitePeak, knots * 0.5);
  snrCol += knotCol * knots * (outerMask * 2.4 + shellMask * 1.8);

  // Stronger radial glow to fill the centre
  snrCol += vec3(0.3, 0.12, 0.5) * exp(-r * r * 0.5) * 0.35;

  // ── Composite ───────────────────────────────────────────────────────────
  vec3 col = bg + stars + snrCol;

  // ACES filmic tone map
  col = col * (col * 2.51 + 0.03) / (col * (col * 2.43 + 0.59) + 0.14);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(0.88));

  // Vignette
  col *= max(1.0 - dot(vUv - 0.5, vUv - 0.5) * 1.6, 0.0);

  gl_FragColor = vec4(col, 1.0);
}`;

// ─── GL helpers ──────────────────────────────────────────────────────────────
function mkShader(src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}
function mkProg(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, mkShader(vs, gl.VERTEX_SHADER));
  gl.attachShader(p, mkShader(fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(p));
  return p;
}

// Compile both programs up-front
const starProg = mkProg(QUAD_VS, STAR_FS);
const mainProg = mkProg(QUAD_VS, MAIN_FS);

// Single quad buffer shared by both passes
const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

function bindQuad(prog) {
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  const l = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(l);
  gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
}

// ─── Star FBO ─────────────────────────────────────────────────────────────────
// The star texture is rendered at HALF the canvas resolution.
// Stars are smooth shapes, so bilinear upscaling is invisible.
let starFBO = null, starTex = null;
let starW   = 0,    starH   = 0;

function createStarFBO(w, h) {
  if (starTex) gl.deleteTexture(starTex);
  if (starFBO) gl.deleteFramebuffer(starFBO);

  starW = w; starH = h;

  starTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, starTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  starFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, starFBO);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, starTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Render the star field once into the FBO. Called on init and resize.
function bakeStars() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, starFBO);
  gl.viewport(0, 0, starW, starH);
  gl.useProgram(starProg);
  bindQuad(starProg);
  gl.uniform2f(gl.getUniformLocation(starProg, 'uRes'), starW, starH);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  const dpr = window.devicePixelRatio || 1;

  const displayWidth  = Math.floor(canvas.clientWidth  * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }

  // Star texture at half the main canvas size (quarter of the original area).
  createStarFBO(Math.max(1, canvas.width  >> 1),
                Math.max(1, canvas.height >> 1));
  bakeStars();
  render();
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', () => {
  resize();
  render();
});

// ─── Main uniform locations ───────────────────────────────────────────────────
const uRes   = gl.getUniformLocation(mainProg, 'uRes');
const uTime  = gl.getUniformLocation(mainProg, 'uTime');
const uZoom  = gl.getUniformLocation(mainProg, 'uZoom');
const uAngle = gl.getUniformLocation(mainProg, 'uAngle');
const uStarTex = gl.getUniformLocation(mainProg, 'uStarTex');

// ─── Interaction ──────────────────────────────────────────────────────────────
let zoom  = 1.0;
let angle = 0.0;
let drag  = false, px = 0, py = 0;
let velAngle = 0;

// ─── Render loop ──────────────────────────────────────────────────────────────
const t0 = performance.now();

function frame() {
  requestAnimationFrame(frame);
  const t = (performance.now() - t0) * 0.001;

  if (!drag) { angle += velAngle; velAngle *= 0.92; }

  // Render the main SNR pass to the screen (default FBO)
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(mainProg);
  bindQuad(mainProg);

  gl.uniform2f(uRes,   canvas.width, canvas.height);
  gl.uniform1f(uTime,  t);
  gl.uniform1f(uZoom,  zoom);
  gl.uniform1f(uAngle, angle);

  // Bind the pre-baked star texture to texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, starTex);
  gl.uniform1i(uStarTex, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
frame();