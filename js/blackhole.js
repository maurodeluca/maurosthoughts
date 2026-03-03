const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

// ── Shader Sources ────────────────────────────────────────────────────────────
const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const STAR_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;

float hash1(float n){ return fract(sin(n)*43758.5453); }

vec3 starColor(float seed){
  float t=hash1(seed*7.3);
  if(t<0.3) return vec3(0.9,0.95,1.0);
  if(t<0.6) return vec3(1.0,0.97,0.88);
  if(t<0.8) return vec3(1.0,0.7,0.4);
  return vec3(0.9,0.4,0.3);
}

void main(){
  vec2 uv=vUv*2.0-1.0;
  uv.x*=uRes.x/uRes.y;

  vec3 stars=vec3(0.0);

  for(int i=0;i<10000;i++){
    float fi=float(i);
    vec2 sp=vec2(hash1(fi*1.1)*6.0-3.0,
                 hash1(fi*2.3)*6.0-3.0);
    sp.x*=uRes.x/uRes.y;

    vec2 d=uv-sp;
    float dist=length(d);
    float br=hash1(fi*0.7);
    float sz=0.0004+br*br*0.002;

    float core=exp(-dist*dist/(sz*sz*2.0));
    stars+=starColor(fi)*core*(0.6+br*0.5);
  }

  gl_FragColor=vec4(stars,1.0);
}
`;

const FS_BH = `
precision highp float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uCamPos;
uniform mat3  uCamMat;
uniform sampler2D uStarTex;

const float PI      = 3.14159265359;
const float RS      = 2.0;
const float R_IN    = 5.0;
const float R_OUT   = 20.0;
const int   STEPS   = 300;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.55;
  mat2 rot = mat2(0.8,0.6,-0.6,0.8);
  for(int i=0;i<6;i++){v+=a*noise(p);p=rot*p*2.1;a*=0.5;}
  return v;
}

vec4 sampleDisk(vec3 dp) {
  float r = length(dp.xz);
  if(r < R_IN || r > R_OUT) return vec4(0.0);
  float t   = (r - R_IN) / (R_OUT - R_IN);
  float phi = atan(dp.z, dp.x);
  phi += r*0.5;  // twists more at larger radii

  // -------------------------------------------------------------------
  // KEY FIX: sample FBM in *rotating world-space* coordinates.
  // Using angle-space (phi*N) creates concentric ring artifacts.
  // Differential Keplerian rotation: inner gas orbits faster.
  // Each radius r gets its own rotation angle, creating spiral cloud
  // blobs rather than circles.
  // -------------------------------------------------------------------
  float omega  = uTime * 0.055 / pow(max(r, 0.5), 1.0);
  float cosW   = cos(omega);
  float sinW   = sin(omega);
  // Rotated position in disk plane
  vec2  rp     = vec2(cosW*dp.x - sinW*dp.z, sinW*dp.x + cosW*dp.z);

  // Tangential unit vector along the disk plane
  vec2 tang = vec2(-dp.z, dp.x) / max(r, 0.001);
  // Flow speed depends on radius (inner faster)
  float speed = 0.3 / pow(max(r, 0.5), 0.8);
  rp += tang * uTime * speed;

  // Three cloud scales in rotated world space — no ring artifacts
  float c1 = fbm(rp * 0.17 + vec2(0.0,  1.7 + uTime*0.05));
  float c2 = fbm(rp * 0.38 + vec2(3.5,  0.8 - uTime*0.07));
  float c3 = fbm(rp * 0.80 + vec2(1.2,  5.6 + uTime*0.10));

  t += 0.02 * sin(uTime*0.5 + r*5.0);
  
  // Blend: mostly large blobs to keep it soft
  float cloud = c1*0.55 + c2*0.30 + c3*0.15;

  // Soft density — NO hard smoothstep threshold, keeps it fluid/cloudy
  float radFade = pow(1.0 - t, 2.5) * smoothstep(0.0, 0.08, t);
  float dens    = radFade * (0.28 + cloud * 0.85);

  // Doppler brightening — approaching side noticeably brighter
  float doppler = 0.5 + 0.45 * cos(phi + PI*0.3);
  dens *= mix(0.05, 1.0, doppler);
  dens  = clamp(dens, 0.0, 1.0);

  // Color: creamy-white inner → warm gold → dark amber outer
  // (matches Interstellar palette — no harsh orange/blue)
  vec3 hot  = vec3(1.0, 0.45, 0.15);  // inner smoldering core
  vec3 mid  = vec3(0.7, 0.2, 0.05);   // glowing ember
  vec3 cool = vec3(0.2, 0.05, 0.02);  // outer char
  vec3 col  = t < 0.28
    ? mix(hot, mid, t/0.28)
    : mix(mid, cool, (t-0.28)/0.72);

  col *= 0.60 + cloud * 0.0;
  col += hot * pow(1.0-t, 5.5) * 0.0;   // bright inner corona

  return vec4(col, dens);
}

vec3 background(vec3 dir) {
  // Convert 3D direction to spherical UV
  float u = atan(dir.z, dir.x) / (2.0 * PI) + 0.5;
  float v = dir.y * 0.5 + 0.5;

  vec2 starUV = vec2(u, v);

  vec3 stars = texture2D(uStarTex, starUV).rgb;

  // Very subtle deep-space lift
  vec3 base = vec3(0.01, 0.003, 0.008);

  return base + stars;
}

vec3 raymarch(vec3 ro, vec3 rd) {
  vec3  pos   = ro;
  vec3  dir   = rd;
  vec3  col   = vec3(0.0);
  float alpha = 0.0;
  float prevY = pos.y;

  for(int i=0;i<STEPS;i++) {
    float r = length(pos);
    float step = max(0.015, (r - RS*0.6) * 0.028);
    step = min(step, 0.4);

    // Event horizon: stop the ray but KEEP accumulated disk color.
    // Disk sampled before this point remains visible in front of the shadow.
    if(r < RS*0.90) { alpha = 1.0; break; }

    // Disk crossing (sign change in y)
    float nY = pos.y + dir.y * step;
    if(prevY * nY <= 0.0 && alpha < 0.998) {
      float tc   = -pos.y / (dir.y + 1e-9);
      vec3  dPos = pos + dir * tc;
      vec4  ds   = sampleDisk(dPos);
      if(ds.a > 0.001) {
        float a  = clamp(ds.a, 0.0, 1.0);
        col   += (1.0-alpha) * ds.rgb * a * 3.5;
        // Keep near-side disk semi-transparent so it clearly shows in front of shadow
        alpha += (1.0-alpha) * a * 0.55;
      }
    }

    // Volumetric slab — moderate height, soft gaussian falloff
    // Large enough to wrap cloud around the BH from any viewing angle
    float t_r   = clamp((length(pos.xz)-R_IN)/(R_OUT-R_IN+0.001), 0.0, 1.0);
    float slabH = 0.20 + t_r * 0.60;   // thin near center, modest outer puff
    if(abs(pos.y) < slabH * 2.0 && alpha < 0.998) {
      float yNorm = pos.y / slabH;
      float yf    = exp(-yNorm*yNorm * 1.2);   // soft gaussian — no hard edge
      vec4 ds = sampleDisk(pos);
      if(ds.a > 0.001) {
        float c = ds.a * yf * step * 2.2;
        col   += (1.0-alpha) * ds.rgb * c * 2.8;
        alpha += (1.0-alpha) * c * 0.45;
      }
    }

    prevY = pos.y;
    if(alpha >= 0.998) break;

    // Geodesic deflection (Schwarzschild simplified)
    float grav = 1.5 * RS / (r*r);
    vec3 tC    = -pos/r;
    vec3 perp  = tC - dir*dot(tC, dir);
    dir = normalize(dir + perp * grav * step);
    pos += dir * step;

    if(r > 90.0) break;
  }

  if(alpha < 0.998) col += (1.0-alpha) * background(dir);
  return col;
}

void main() {
  vec2 uv  = (vUv*2.0-1.0);
  uv.x    *= uRes.x/uRes.y;
  float fovScale = tan(55.0*0.5*PI/180.0);
  vec3 rd  = normalize(uCamMat * vec3(uv*fovScale, -1.0));
  vec3 col = raymarch(uCamPos, rd);
  // ACES filmic
  col = col*(col*2.51+0.03)/(col*(col*2.43+0.59)+0.14);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(0.90));
  // Vignette
  float v = 1.0 - dot(vUv-0.5, vUv-0.5)*1.3;
  col *= max(v, 0.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_EXTRACT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uThresh;
void main(){
  vec3 c=texture2D(uTex,vUv).rgb;
  float lum=dot(c,vec3(0.299,0.587,0.114));
  float ex=max(0.0,lum-uThresh)/max(1.0-uThresh,0.001);
  gl_FragColor=vec4(c*ex,1.0);
}
`;

const FS_BLUR = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main(){
  vec4 c=vec4(0.0);
  float w[7];
  w[0]=0.2036;w[1]=0.1802;w[2]=0.1238;w[3]=0.0663;w[4]=0.0274;w[5]=0.0083;w[6]=0.0019;
  c+=texture2D(uTex,vUv)*w[0];
  for(int i=1;i<7;i++){
    float fi=float(i);
    c+=texture2D(uTex,vUv+uDir*fi)*w[i];
    c+=texture2D(uTex,vUv-uDir*fi)*w[i];
  }
  gl_FragColor=c;
}
`;

const FS_COMP = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uB1;
uniform sampler2D uB2;
uniform sampler2D uB3;
void main(){
  vec3 sc=texture2D(uScene,vUv).rgb;
  vec3 b1=texture2D(uB1,vUv).rgb;
  vec3 b2=texture2D(uB2,vUv).rgb;
  vec3 b3=texture2D(uB3,vUv).rgb;
  vec3 bloom=b1*1.5+b2*1.2+b3*0.8;
  gl_FragColor=vec4(sc+bloom,1.0);
}
`;

// ── GL Helpers ─────────────────────────────────────────────────────────────────
function mkShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
}
function mkProg(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, mkShader(vs, gl.VERTEX_SHADER));
    gl.attachShader(p, mkShader(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    return p;
}

const pStar = mkProg(VS, STAR_FS);
const pBH = mkProg(VS, FS_BH);
const pExt = mkProg(VS, FS_EXTRACT);
const pBlur = mkProg(VS, FS_BLUR);
const pComp = mkProg(VS, FS_COMP);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

function bindQ(p) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const l = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
}
function uni1f(p, n, v) { gl.uniform1f(gl.getUniformLocation(p, n), v); }
function uni2f(p, n, x, y) { gl.uniform2f(gl.getUniformLocation(p, n), x, y); }
function uni3f(p, n, x, y, z) { gl.uniform3f(gl.getUniformLocation(p, n), x, y, z); }
function uniM3(p, n, v) { gl.uniformMatrix3fv(gl.getUniformLocation(p, n), false, v); }
function uni1i(p, n, v) { gl.uniform1i(gl.getUniformLocation(p, n), v); }

function mkRT(w, h) {
    const fb = gl.createFramebuffer(), tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
}

function bindTex(p, name, unit, rt) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, rt.tex);
    uni1i(p, name, unit);
}

// ── RTs ───────────────────────────────────────────────────────────────────────
let W, H, rtScene, rtB1h, rtB1v, rtB2h, rtB2v, rtB3h, rtB3v;

function initRTs() {
    W = canvas.width; H = canvas.height;
    rtScene = mkRT(W, H);
    rtB1h = mkRT(W >> 1, H >> 1); rtB1v = mkRT(W >> 1, H >> 1);
    rtB2h = mkRT(W >> 2, H >> 2); rtB2v = mkRT(W >> 2, H >> 2);
    rtB3h = mkRT(W >> 3, H >> 3); rtB3v = mkRT(W >> 3, H >> 3);
}

let starRT;

function initStars() {
  starRT = mkRT(1024, 512); // 2:1 ratio works well for spherical map

  gl.bindFramebuffer(gl.FRAMEBUFFER, starRT.fb);
  gl.viewport(0,0,starRT.w,starRT.h);

  gl.useProgram(pStar);
  bindQ(pStar);
  uni2f(pStar,'uRes',starRT.w,starRT.h);

  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}

function resize() {
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    initRTs();
}
window.addEventListener('resize', resize);
resize();
initStars();

// ── Camera ────────────────────────────────────────────────────────────────────
let theta = -0.25, phi = 0.32, dist = 40.0, lastDist = 0;
let drag = false, px = 0, py = 0, pinch = false;

function getDist(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

canvas.addEventListener('mousedown', e => { 
  drag = true; 
  px = e.clientX; 
  py = e.clientY;
});

window.addEventListener('mouseup', () => drag = false );

window.addEventListener('mousemove', e => {
    if (!drag) return;
    theta -= (e.clientX - px) * 0.006;
    phi = Math.max(0.02, Math.min(1.4, phi + (e.clientY - py) * 0.005));
    px = e.clientX; py = e.clientY;
});

canvas.addEventListener('wheel', e => {
    dist = Math.max(5, Math.min(80, dist + e.deltaY * 0.02));
     e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    // Single finger → rotate
    drag = true;
    pinch = false;
    px = e.touches[0].clientX;
    py = e.touches[0].clientY;
  }

  if (e.touches.length === 2) {
    // Two fingers → zoom
    drag = false;
    pinch = true;
    lastDist = getDist(e.touches[0], e.touches[1]);
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();

  // ROTATION
  if (drag && e.touches.length === 1) {
    const nx = e.touches[0].clientX;
    const ny = e.touches[0].clientY;

    theta -= (nx - px) * 0.006;
    phi = Math.max(0.02, Math.min(1.4, phi + (ny - py) * 0.005));

    px = nx;
    py = ny;
  }

  // PINCH ZOOM
  if (pinch && e.touches.length === 2) {
    const newDist = getDist(e.touches[0], e.touches[1]);
    const delta = newDist - lastDist;

    dist -= delta * 0.05;
    dist = Math.max(5, Math.min(80, dist));

    lastDist = newDist;
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  drag = false;
  pinch = false;
});

// Adjust camera distance for mobile / small screens
function adjustForMobile() {
    const isMobile = window.innerWidth < 768; // you can tweak the breakpoint
    if (isMobile) {
        dist = 80;   // zoom out more
    } else {
        dist = 40;   // default distance
    }
}

window.addEventListener('resize', adjustForMobile);
adjustForMobile(); // run once on load

function camSetup() {
    const cx = dist * Math.cos(phi) * Math.sin(theta);
    const cy = dist * Math.sin(phi);
    const cz = dist * Math.cos(phi) * Math.cos(theta);
    const fwd = [-cx, -cy, -cz].map((v, i, a) => { let l = Math.hypot(...a); return v / l; });
    const wUp = [0, 1, 0];
    const right = [
        fwd[1] * wUp[2] - fwd[2] * wUp[1],
        fwd[2] * wUp[0] - fwd[0] * wUp[2],
        fwd[0] * wUp[1] - fwd[1] * wUp[0]
    ];
    const rl = Math.hypot(...right); const r = right.map(v => v / rl);
    const up = [r[1] * fwd[2] - r[2] * fwd[1], r[2] * fwd[0] - r[0] * fwd[2], r[0] * fwd[1] - r[1] * fwd[0]];
    return { pos: [cx, cy, cz], mat: [r[0], r[1], r[2], up[0], up[1], up[2], -fwd[0], -fwd[1], -fwd[2]] };
}

// ── Blur pass ─────────────────────────────────────────────────────────────────
function blurPass(src, dstH, dstV) {
    gl.useProgram(pBlur); bindQ(pBlur);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstH.fb);
    gl.viewport(0, 0, dstH.w, dstH.h);
    bindTex(pBlur, 'uTex', 0, src);
    uni2f(pBlur, 'uDir', 1.0 / dstH.w, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dstV.fb);
    gl.viewport(0, 0, dstV.w, dstV.h);
    bindTex(pBlur, 'uTex', 0, dstH);
    uni2f(pBlur, 'uDir', 0, 1.0 / dstV.h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ── Render ────────────────────────────────────────────────────────────────────
const t0 = performance.now();

function frame() {
    requestAnimationFrame(frame);
    const t = (performance.now() - t0) * 0.001;
    const cam = camSetup();

    // 1. Raymarch BH
    gl.bindFramebuffer(gl.FRAMEBUFFER, rtScene.fb);
    gl.viewport(0, 0, W, H);
    gl.useProgram(pBH); bindQ(pBH);
    uni2f(pBH, 'uRes', W, H);
    uni1f(pBH, 'uTime', t);
    uni3f(pBH, 'uCamPos', ...cam.pos);
    uniM3(pBH, 'uCamMat', cam.mat);
    bindTex(pBH, 'uStarTex', 0, starRT);  
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 2. Extract bloom
    gl.bindFramebuffer(gl.FRAMEBUFFER, rtB1h.fb);
    gl.viewport(0, 0, rtB1h.w, rtB1h.h);
    gl.useProgram(pExt); bindQ(pExt);
    bindTex(pExt, 'uTex', 0, rtScene);
    uni1f(pExt, 'uThresh', 1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 3. Multi-scale blur
    blurPass(rtB1h, rtB1v, rtB1h);  // read rtB1h, write horizontal -> vertical in rtB1v, then vertical -> horizontal in rtB1h
    blurPass(rtB1h, rtB2v, rtB2h);  // read B1 result, write to B2
    blurPass(rtB2h, rtB3v, rtB3h);  // read B2 result, write to B3

    // 4. Composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(pComp); bindQ(pComp);
    bindTex(pComp, 'uScene', 0, rtScene);
    bindTex(pComp, 'uB1', 1, rtB1h);
    bindTex(pComp, 'uB2', 2, rtB2h);
    bindTex(pComp, 'uB3', 3, rtB3h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
frame();
