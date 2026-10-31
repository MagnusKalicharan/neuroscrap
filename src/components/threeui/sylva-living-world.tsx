"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildScrapRobot } from "./scrap-robot";

/* ============================================================
   SylvaLivingWorld — React wrapper for the Sylva 3D moss scene.

   Ported from the standalone HTML source:
   • All geometry (moss roots, fur blades, ferns, flowers, wire)
   • All GLSL (bark, grass, fern, flower, wire, pollen shaders)
   • Scan-pulse entrance animation
   • Wind + pointer-driven grass deformation
   • Ambient pollen motes + cursor spray
   • Reconstructed layout() and renderFrame() from the original.
   ============================================================ */

export function SylvaLivingWorld() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // ── version shims ───────────────────────────────────────────────
      const ENCODE =
        (THREE.ShaderChunk as Record<string, unknown>).colorspace_fragment
          ? "#include <colorspace_fragment>"
          : "#include <encodings_fragment>";

      function setOutputColorSpace(r: THREE.WebGLRenderer) {
        if ("outputColorSpace" in r) (r as unknown as Record<string, unknown>).outputColorSpace = THREE.SRGBColorSpace;
        else (r as unknown as Record<string, unknown>).outputEncoding = (THREE as Record<string, unknown>).sRGBEncoding;
      }
      function setTexColorSpace(t: THREE.Texture) {
        if ("colorSpace" in t) (t as unknown as Record<string, unknown>).colorSpace = THREE.SRGBColorSpace;
        else (t as unknown as Record<string, unknown>).encoding = (THREE as Record<string, unknown>).sRGBEncoding;
      }

      // Polyfill: THREE.QuadraticBezierCurve3 removed in r151
      class QuadraticBezierCurve3 extends THREE.Curve<THREE.Vector3> {
        v0: THREE.Vector3; v1: THREE.Vector3; v2: THREE.Vector3;
        constructor(v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3) {
          super(); this.v0 = v0; this.v1 = v1; this.v2 = v2;
        }
        getPoint(t: number) {
          const s = 1 - t;
          return new THREE.Vector3(
            s*s*this.v0.x + 2*s*t*this.v1.x + t*t*this.v2.x,
            s*s*this.v0.y + 2*s*t*this.v1.y + t*t*this.v2.y,
            s*s*this.v0.z + 2*s*t*this.v1.z + t*t*this.v2.z,
          );
        }
      }

      // ── constants ───────────────────────────────────────────────────
      const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const NARROW  = window.matchMedia("(max-width: 900px)");
      const TAU = Math.PI * 2;
      const UP  = new THREE.Vector3(0, 1, 0);
      const BOXW = 10;
      const DIST = 1400;
      const SCAN_SPEED = 820; // world units per second

      const ARCH   = { w: 1900, left: -180, top: 306, aspect: 2800/1377 };
      const ARCH_N = { w: 1120, left: -290, top: 555, aspect: 2800/1377 };
      const FAR    = { w: 1150, left:  -40, top: 320, aspect: 1600/ 757, z: -260 };
      const FAR_N  = { w:  780, left: -110, top: 600, aspect: 1600/ 757, z: -260 };

      // ── deterministic RNG ───────────────────────────────────────────
      let rngState = 0x3f9a1c7b | 0;
      const rng = () => {
        rngState = (rngState + 0x6d2b79f5) | 0;
        let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const rand  = (lo: number, hi: number) => lo + (hi - lo) * rng();
      const sstep = (a: number, b: number, x: number) => {
        const t = Math.min(Math.max((x-a)/(b-a), 0), 1);
        return t*t*(3-2*t);
      };
      const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;

      const hash2 = (x: number, y: number) => {
        let n = Math.imul(x|0, 374761393) + Math.imul(y|0, 668265263);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
      };
      const vnoise = (x: number, y: number) => {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x-ix, fy = y-iy;
        const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
        const a=hash2(ix,iy), b=hash2(ix+1,iy), c=hash2(ix,iy+1), d=hash2(ix+1,iy+1);
        return a+(b-a)*ux + ((c+(d-c)*ux) - (a+(b-a)*ux))*uy;
      };
      const fbm2 = (x: number, y: number) => {
        let s=0, amp=0.5, nx: number, ny: number;
        for (let i=0; i<4; i++) {
          s += amp*vnoise(x,y);
          nx=0.80*x+0.60*y; ny=-0.60*x+0.80*y;
          x=nx*2.07+3.1; y=ny*2.07-1.7; amp*=0.5;
        }
        return s/0.9375;
      };

      // ── GLSL strings ────────────────────────────────────────────────
      const LIGHT_GLSL = `
uniform vec3 uKeyDir, uKeyCol, uFillDir, uFillCol, uAmbCol, uHazeCol;
uniform float uHaze, uFog, uMaskOn, uHazeLift;
uniform vec4 uMask;
vec3 litSurface(vec3 N, vec3 albedo, float ao){
  float k=max(dot(N,uKeyDir),0.);
  float f=max(dot(N,uFillDir),0.);
  float sky=0.5+0.5*N.y;
  return albedo*(uKeyCol*(0.09+1.05*k)+uFillCol*(0.04+0.34*f)+uAmbCol*(0.35+0.65*sky))*ao;
}
vec3 aerial(vec3 c, float h){
  float amt=clamp(uFog+uHaze*smoothstep(0.05,0.95,h),0.,1.);
  float gain=smoothstep(0.003,0.075,dot(c,vec3(0.30,0.59,0.11)));
  return mix(c,uHazeCol,amt*mix(uHazeLift,1.,gain));
}
uniform vec3 uScanO;
uniform float uScanR, uScanOn;
bool unscanned(vec3 w, float lag){
  if(uScanOn<0.5) return false;
  float wob=sin(w.y*0.011+w.x*0.007)*36.+sin(w.z*0.021+w.y*0.013)*17.;
  return distance(w,uScanO)>uScanR-lag+wob;
}
float maskAt(vec3 lp, float boxH){
  if(uMaskOn<0.5) return 1.;
  float e=1.-smoothstep(uMask.x,uMask.y,lp.x);
  float l=smoothstep(uMask.z,uMask.w,lp.y/boxH+0.5);
  return clamp(e*l,0.,1.);
}`;

      const NOISE_GLSL = `
vec2 hash22(vec2 p){
  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  return -1.+2.*fract(sin(p)*43758.5453123);
}
float gnoise(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(dot(hash22(i+vec2(0,0)),f-vec2(0,0)),dot(hash22(i+vec2(1,0)),f-vec2(1,0)),u.x),
             mix(dot(hash22(i+vec2(0,1)),f-vec2(0,1)),dot(hash22(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
}
const mat2 ROT=mat2(0.80,0.60,-0.60,0.80);
float gfbm(vec2 p){float a=0.5,s=0.;for(int i=0;i<5;i++){s+=a*gnoise(p);p=ROT*p*2.03;a*=0.5;}return s;}
float ridged(vec2 p){float a=0.5,s=0.;for(int i=0;i<4;i++){s+=a*(1.-abs(gnoise(p)*2.));p=ROT*p*2.11;a*=0.5;}return s;}`;

      const WIND_GLSL = `
uniform float uTime, uWind;
vec3 windOffset(vec3 p){
  float ph=p.x*0.42+p.y*0.30+p.z*0.70, a=0.030*uWind;
  return vec3((sin(uTime*0.58+ph)+0.45*sin(uTime*1.37+ph*2.3))*a,
               sin(uTime*0.79+ph*1.7)*a*0.42,
               sin(uTime*0.51+ph*0.9)*a*0.55);
}`;

      // ── shared uniforms ─────────────────────────────────────────────
      const uTime   = { value: 0 };
      const uWind   = { value: REDUCED ? 0.0 : 1.0 };
      const uScanO  = { value: new THREE.Vector3(-900, -260, 240) };
      const uScanR  = { value: 0 };
      const uScanOn = { value: 0 };
      const uWire   = { value: 0 };
      const uMouseNear = { value: new THREE.Vector3(9999,9999,9999) };
      const uMouseFar  = { value: new THREE.Vector3(9999,9999,9999) };
      const KEY  = new THREE.Vector3(-0.30, 0.92, 0.28).normalize();
      const FILL = new THREE.Vector3( 0.12,-0.86, 0.50).normalize();

      function lightUniforms(extra: Record<string, unknown> = {}) {
        return {
          uTime, uWind,
          uKeyDir:  { value: KEY.clone() },
          uKeyCol:  { value: new THREE.Color(1.14, 1.06, 0.88) },
          uFillDir: { value: FILL.clone() },
          uFillCol: { value: new THREE.Color(0.78, 0.78, 0.62) },
          uAmbCol:  { value: new THREE.Color(0.125, 0.135, 0.110) },
          uHazeCol: { value: new THREE.Color(0.176, 0.195, 0.145) },
          uHaze:    { value: 0.14 },
          uHazeLift:{ value: 0.20 },
          uFog:     { value: 0.0 },
          uAlpha:   { value: 1.0 },
          uBoxH:    { value: BOXW / ARCH.aspect },
          uMask:    { value: new THREE.Vector4(0,1,0,1) },
          uMaskOn:  { value: 0 },
          uScanO, uScanR, uScanOn,
          uMouse:   { value: uMouseNear.value },
          uMouseR:  { value: 1.5 },
          ...extra,
        };
      }

      // ── geometry utilities ──────────────────────────────────────────
      const _fp=new THREE.Vector3(), _ft=new THREE.Vector3(),
            _fn=new THREE.Vector3(), _fb=new THREE.Vector3();

      function transportFrames(curve: THREE.Curve<THREE.Vector3>, segs: number) {
        const pts=[], tans=[], nrms=[];
        for (let i=0; i<=segs; i++) {
          pts.push(curve.getPointAt(i/segs));
          tans.push(curve.getTangentAt(i/segs).normalize());
        }
        const ref = Math.abs(tans[0].y) < 0.9 ? UP : new THREE.Vector3(1,0,0);
        nrms.push(new THREE.Vector3().crossVectors(tans[0], ref).normalize());
        for (let i=1; i<=segs; i++) {
          const axis = new THREE.Vector3().crossVectors(tans[i-1], tans[i]);
          const n = nrms[i-1].clone();
          if (axis.lengthSq() > 1e-12) {
            axis.normalize();
            n.applyAxisAngle(axis, Math.acos(Math.min(1, Math.max(-1, tans[i-1].dot(tans[i])))));
          }
          nrms.push(n.normalize());
        }
        return { pts, tans, nrms };
      }

      function mossCap(p: THREE.Vector3, n: THREE.Vector3, steep: number) {
        const upness = n.y + n.z*(0.10+0.42*steep) - n.x*(0.05+0.45*steep);
        const fray  = fbm2(p.x*2.30+4.4, p.z*2.30-p.y*1.90) - 0.5;
        const tongue= fbm2(p.x*0.95+21.0, p.z*0.95-p.y*0.80) - 0.5;
        const patch = fbm2(p.x*0.52+9.3, p.z*0.52+p.y*0.44);
        const c = sstep(0.16, 0.70, upness+fray*0.40+tongue*0.52);
        return c * sstep(0.10, 0.50, patch);
      }
      function mossLump(p: THREE.Vector3) {
        return 0.66 + 0.48*fbm2(p.x*2.4-2.2, p.z*2.4+p.y*2.0)
                    + 0.18*fbm2(p.x*7.3+5.1, p.z*7.3-p.y*4.4) - 0.09;
      }

      function tableInterp(vals: number[]) {
        return (t: number) => {
          const x = clamp01(t)*(vals.length-1);
          const i = Math.min(vals.length-2, Math.floor(x));
          return vals[i] + (vals[i+1]-vals[i])*(x-i);
        };
      }
      const knot = (t: number, a: number, b: number) =>
        1 + a*Math.sin(t*23+1.3) + b*Math.sin(t*57+0.4) + b*0.5*Math.sin(t*103+2.2);

      function makeP(aspect: number) {
        const bh = BOXW/aspect;
        return (fx: number, fy: number, z=0) =>
          new THREE.Vector3((fx-0.5)*BOXW, (0.5-fy)*bh, z);
      }

      type Limb = {
        curve: THREE.Curve<THREE.Vector3>; segs: number; radial: number;
        rw: (t:number)=>number; moss: (t:number)=>number; blade: (t:number)=>number;
        sink?: number; vScale: number;
        fr: ReturnType<typeof transportFrames>; len: number;
        grid?: Float32Array|null; gnrm?: Float32Array|null; gcaps?: Float32Array|null;
        S?: number; R?: number;
      };

      function makeLimb(P: ReturnType<typeof makeP>, pts: number[][], opt: Record<string, unknown>): Limb {
        const v3 = pts.map(q => P(q[0], q[1], q[2]||0));
        const curve = new THREE.CatmullRomCurve3(v3, false, "centripetal", 0.5);
        let rw: (t:number)=>number, moss: (t:number)=>number;
        if (opt.rt) {
          const rt = tableInterp(opt.rt as number[]);
          rw   = (t) => rt(t)*0.52*knot(t, 0.05, 0.024);
          moss = (t) => rt(t)*0.88;
        } else {
          rw   = opt.rw as (t:number)=>number;
          moss = opt.moss as (t:number)=>number;
        }
        const blade = (opt.blade as ((t:number)=>number)) ||
                      ((t: number) => moss(t)*0.055 + 0.014);
        return {
          curve, segs: opt.segs as number, radial: opt.radial as number,
          rw, moss, blade, sink: (opt.sink as number)||0,
          vScale: opt.vScale as number,
          fr: transportFrames(curve, opt.segs as number),
          len: curve.getLength(),
        };
      }

      function limbFrame(L: Limb, t: number) {
        const f = clamp01(t)*L.segs;
        const i = Math.min(L.segs-1, Math.floor(f)), a = f-i;
        _fp.copy(L.fr.pts[i]).lerp(L.fr.pts[i+1], a);
        if (L.sink) _fp.y -= L.moss(t)*L.sink;
        _ft.copy(L.fr.tans[i]).lerp(L.fr.tans[i+1], a).normalize();
        _fn.copy(L.fr.nrms[i]).lerp(L.fr.nrms[i+1], a);
        _fn.addScaledVector(_ft, -_fn.dot(_ft)).normalize();
        _fb.crossVectors(_ft, _fn).normalize();
      }

      function limbSurface(L: Limb, t: number, th: number,
                           outP: THREE.Vector3, outN: THREE.Vector3) {
        limbFrame(L, t);
        const steep = Math.min(1, Math.abs(_ft.y)*1.15);
        const c = Math.cos(th), s = Math.sin(th);
        outN.set(_fn.x*c+_fb.x*s, _fn.y*c+_fb.y*s, _fn.z*c+_fb.z*s).normalize();
        const rw = L.rw(t);
        outP.copy(_fp).addScaledVector(outN, rw);
        const cap = mossCap(outP, outN, steep);
        const d = rw + L.moss(t)*cap*mossLump(outP);
        outP.copy(_fp).addScaledVector(outN, d);
        return cap;
      }

      function tessellate(L: Limb, bag: {pos:number[];nor:number[];inf:number[];idx:number[]}) {
        const S=L.segs, R=L.radial;
        const base = bag.pos.length/3;
        const grid = new Float32Array((S+1)*(R+1)*3);
        const gnrm = new Float32Array((S+1)*(R+1)*3);
        const caps = new Float32Array((S+1)*(R+1));
        const p=new THREE.Vector3(), n=new THREE.Vector3();

        for (let i=0; i<=S; i++) for (let j=0; j<=R; j++) {
          const cap = limbSurface(L, i/S, (j/R)*TAU, p, n);
          const k=(i*(R+1)+j)*3;
          grid[k]=p.x; grid[k+1]=p.y; grid[k+2]=p.z;
          caps[i*(R+1)+j]=cap;
        }

        const a=new THREE.Vector3(), b=new THREE.Vector3();
        const du=new THREE.Vector3(), dv=new THREE.Vector3();
        const get = (i2: number, j2: number, out: THREE.Vector3) => {
          i2=Math.min(S,Math.max(0,i2)); j2=((j2%R)+R)%R;
          const q=(i2*(R+1)+j2)*3;
          return out.set(grid[q],grid[q+1],grid[q+2]);
        };

        for (let i=0; i<=S; i++) for (let j=0; j<=R; j++) {
          get(i+1,j,a); get(i-1,j,b); du.subVectors(a,b);
          get(i,j+1,a); get(i,j-1,b); dv.subVectors(a,b);
          n.crossVectors(dv,du);
          if (n.lengthSq()<1e-12) limbSurface(L,i/S,(j/R)*TAU,p,n); else n.normalize();
          const k=(i*(R+1)+j)*3;
          bag.pos.push(grid[k],grid[k+1],grid[k+2]);
          bag.nor.push(n.x,n.y,n.z);
          bag.inf.push(1-Math.abs(2*(j/R)-1), (i/S)*L.vScale, caps[i*(R+1)+j]);
          gnrm[k]=n.x; gnrm[k+1]=n.y; gnrm[k+2]=n.z;
        }
        for (let i=0; i<S; i++) for (let j=0; j<R; j++) {
          const q0=base+i*(R+1)+j, q1=q0+R+1;
          bag.idx.push(q0,q1,q0+1, q1,q1+1,q0+1);
        }
        L.grid=grid; L.gnrm=gnrm; L.gcaps=caps; L.S=S; L.R=R;
      }

      function plantBlades(L: Limb, count: number,
                           bag: {off:number[];nrm:number[];rnd:number[];aux:number[]}) {
        const S=L.S!, R=L.R!, grid=L.grid!, gn=L.gnrm!, caps=L.gcaps!;
        const cells=S*R;
        const cdf=new Float64Array(cells);
        let total=0;

        for (let i=0; i<S; i++) for (let j=0; j<R; j++) {
          const q00=(i*(R+1)+j)*3, q10=q00+3, q01=((i+1)*(R+1)+j)*3;
          const ax=grid[q10]-grid[q00], ay=grid[q10+1]-grid[q00+1], az=grid[q10+2]-grid[q00+2];
          const bx=grid[q01]-grid[q00], by=grid[q01+1]-grid[q00+1], bz=grid[q01+2]-grid[q00+2];
          const cx=ay*bz-az*by, cy=az*bx-ax*bz, cz=ax*by-ay*bx;
          const area=Math.sqrt(cx*cx+cy*cy+cz*cz);
          const cap=0.25*(caps[i*(R+1)+j]+caps[i*(R+1)+j+1]+
                          caps[(i+1)*(R+1)+j]+caps[(i+1)*(R+1)+j+1]);
          total+=area*cap*cap;
          cdf[i*R+j]=total;
        }
        if (total<=0) return 0;

        let planted=0;
        for (let b=0; b<count; b++) {
          const target=rng()*total;
          let lo=0, hi=cells-1;
          while (lo<hi) { const mid=(lo+hi)>>1; if (cdf[mid]<target) lo=mid+1; else hi=mid; }
          const i=(lo/R)|0, j=lo-i*R;
          const u=rng(), v=rng();
          const i0=i*(R+1)+j, i1=i0+1, i2=i0+R+1, i3=i2+1;
          const w0=(1-u)*(1-v), w1=u*(1-v), w2=(1-u)*v, w3=u*v;
          const cap2=caps[i0]*w0+caps[i1]*w1+caps[i2]*w2+caps[i3]*w3;
          if (cap2<0.05) continue;
          const p0=i0*3,p1=i1*3,p2=i2*3,p3=i3*3;
          const px=grid[p0]*w0+grid[p1]*w1+grid[p2]*w2+grid[p3]*w3;
          const py=grid[p0+1]*w0+grid[p1+1]*w1+grid[p2+1]*w2+grid[p3+1]*w3;
          const pz=grid[p0+2]*w0+grid[p1+2]*w1+grid[p2+2]*w2+grid[p3+2]*w3;
          const nx=gn[p0]*w0+gn[p1]*w1+gn[p2]*w2+gn[p3]*w3;
          const ny=gn[p0+1]*w0+gn[p1+1]*w1+gn[p2+1]*w2+gn[p3+1]*w3;
          const nz=gn[p0+2]*w0+gn[p1+2]*w1+gn[p2+2]*w2+gn[p3+2]*w3;
          const nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
          bag.off.push(px,py,pz);
          bag.nrm.push(nx/nl,ny/nl,nz/nl);
          const stray=rng()<0.06?rand(1.4,1.9):1.0;
          bag.rnd.push(rng()*TAU, L.blade((i+v)/S)*(0.45+0.60*cap2)*(0.58+0.50*rng())*stray,
                       (rng()-0.5)*1.15, rng());
          bag.aux.push(fbm2(px*0.85+17,pz*0.85-py*0.7)*0.62 +
                       fbm2(px*5.60-3.3,pz*5.60+py*2.1)*0.38);
          planted++;
        }
        return planted;
      }

      function growOffshoot(list: Limb[], start: THREE.Vector3,
                            dir: THREE.Vector3, len: number, r0: number, gen: number) {
        const side=new THREE.Vector3().crossVectors(dir,UP);
        if (side.lengthSq()<1e-6) side.set(1,0,0); side.normalize();
        const up=new THREE.Vector3().crossVectors(side,dir).normalize();
        const bow=gen===0?rand(0.10,0.46):rand(-0.34,0.42);
        const kink=rand(-0.26,0.26);
        const node=(f:number,u2:number,k:number)=>
          start.clone().addScaledVector(dir,len*f).addScaledVector(up,len*u2).addScaledVector(side,len*k);
        const pts=[start.clone(),node(0.32,bow*0.30,kink*0.70),node(0.68,bow*0.85,kink*0.24),node(1,bow,kink*0.44)];
        const curve=new THREE.CatmullRomCurve3(pts,false,"centripetal",0.5);
        const r1=r0*0.52;
        const L: Limb = {
          curve, segs:gen===0?16:11, radial:gen===0?9:7,
          rw:(t)=>(r0+(r1-r0)*t)*(1-0.86*sstep(0.90,1.0,t)),
          moss:(t)=>(r0+(r1-r0)*t)*0.95*(1-0.55*t),
          blade:(t)=>(r0+(r1-r0)*t)*0.30*(1-0.55*t)+0.035,
          sink:0, vScale:len*7,
          fr:transportFrames(curve,gen===0?16:11),
          len:curve.getLength(),
        };
        list.push(L);
        if (gen>=1) return;
        const kids=Math.round(rand(1,2));
        for (let i=0; i<kids; i++) {
          const tt=0.34+(i/Math.max(kids,1))*0.5+rand(-0.06,0.06);
          const pt=curve.getPointAt(Math.min(tt,0.98));
          const tan=curve.getTangentAt(Math.min(tt,0.98)).normalize();
          const ax=new THREE.Vector3().crossVectors(tan,UP);
          if (ax.lengthSq()<1e-6) ax.set(1,0,0);
          ax.normalize().applyAxisAngle(tan,rng()*TAU);
          const kdir=tan.clone().applyAxisAngle(ax,rand(0.45,1.05)).addScaledVector(UP,0.16).normalize();
          growOffshoot(list,pt,kdir,len*rand(0.50,0.74),(r0+(r1-r0)*tt)*rand(0.58,0.78),gen+1);
        }
      }

      // ── root definitions ────────────────────────────────────────────
      function buildNearRoot() {
        const P=makeP(ARCH.aspect); const limbs: Limb[]=[];
        limbs.push(makeLimb(P,[
          [-0.075,0.845,-0.62],[0,0.790,-0.38],[0.107,0.695,0.04],[0.196,0.588,0.28],
          [0.250,0.566,0.34],[0.304,0.603,0.22],[0.411,0.733,-0.10],[0.500,0.779,-0.28],
          [0.585,0.742,-0.05],[0.696,0.661,0.20],[0.750,0.672,0.14],[0.850,0.640,-0.08],
          [0.930,0.626,-0.30],[1.030,0.634,-0.55],[1.090,0.638,-0.70]
        ],{ segs:300, radial:26, vScale:30,
            rt:[0.760,0.740,0.720,0.700,0.695,0.615,0.580,0.480,0.550,0.550,0.520], sink:0.45 }));
        const legRw  =tableInterp([0.30,0.28,0.26,0.25,0.24,0.23,0.22]);
        const legMoss=tableInterp([0.24,0.24,0.23,0.22,0.21,0.20,0.19]);
        limbs.push(makeLimb(P,[
          [0.532,0.860,0.20],[0.572,0.700,0.28],[0.612,0.540,0.34],[0.652,0.390,0.33],
          [0.690,0.263,0.26],[0.722,0.180,0.15],[0.752,0.163,0.02]
        ],{ segs:130, radial:20, vScale:22, rw:(t: number)=>legRw(t)*knot(t,0.05,0.022), moss:legMoss }));
        const legR =tableInterp([0.23,0.25,0.27,0.30,0.33,0.36,0.40]);
        const legRm=tableInterp([0.19,0.20,0.21,0.22,0.24,0.25,0.26]);
        limbs.push(makeLimb(P,[
          [0.706,0.176,-0.02],[0.740,0.158,0.02],[0.772,0.245,-0.08],[0.797,0.400,-0.18],
          [0.816,0.570,-0.22],[0.836,0.760,-0.18],[0.858,0.950,-0.08],[0.888,1.180,0.04]
        ],{ segs:150, radial:20, vScale:22, rw:(t: number)=>legR(t)*knot(t,0.05,0.022), moss:legRm }));
        return limbs;
      }

      function buildFarRoot() {
        const P=makeP(FAR.aspect);
        return [makeLimb(P,[
          [-0.060,0.880,-0.35],[0.100,0.762,-0.05],[0.210,0.698,0.22],[0.300,0.570,0.30],
          [0.410,0.467,0.18],[0.500,0.500,-0.05],[0.600,0.622,-0.22],[0.720,0.748,-0.26],
          [0.800,0.788,-0.08],[0.900,0.660,0.14],[0.990,0.454,0.28]
        ],{ segs:220, radial:20, vScale:26,
            rt:[0.760,0.900,0.900,0.960,0.925,0.950,1.020,1.020,0.990,1.100,1.300], sink:0.5 })];
      }

      // ── materials ───────────────────────────────────────────────────
      function barkMaterial(uni: object, transparent: boolean) {
        return new THREE.ShaderMaterial({
          uniforms: uni as Record<string, THREE.IUniform>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          extensions: { derivatives: true } as any,
          vertexShader: WIND_GLSL + `
attribute vec3 inf;
varying vec3 vN,vW,vInf,vL; varying float vH;
uniform float uBoxH;
void main(){
  vInf=inf; vN=normalize(normal);
  vec3 p=position+windOffset(position)*(0.35+0.65*inf.z);
  vL=p; vH=clamp(p.y/uBoxH+0.5,0.,1.);
  vec4 wp=modelMatrix*vec4(p,1.); vW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`,
          fragmentShader: NOISE_GLSL + LIGHT_GLSL + `
precision highp float;
uniform float uAlpha,uBoxH;
varying vec3 vN,vW,vInf,vL; varying float vH;
vec2 barkDomain(vec2 uv){return vec2(uv.x*7.,uv.y*0.62);}
float barkHeight(vec2 uv){
  vec2 q=barkDomain(uv),w=vec2(gfbm(q*0.5),gfbm(q*0.5+9.1)),p=q+w*0.60;
  return (ridged(p)-0.5)*1.85*mix(0.35,1.,smoothstep(-0.25,0.45,gfbm(q*0.34)))
         -smoothstep(0.30,0.86,ridged(p*1.9+4.))*0.42+(gfbm(p*5.5)*0.5+0.5)*0.20;
}
vec3 bumped(vec3 N,vec3 p,float h,float k){
  vec3 dpx=dFdx(p),dpy=dFdy(p);
  float dhx=dFdx(h)*k,dhy=dFdy(h)*k;
  vec3 r1=cross(dpy,N),r2=cross(N,dpx);
  float det=dot(dpx,r1);
  return normalize(abs(det)*N-sign(det)*(dhx*r1+dhy*r2));
}
void main(){
  if(unscanned(vW,520.)) discard;
  vec2 uv=vInf.xy; float cap=vInf.z, m=smoothstep(0.05,0.42,cap);
  vec3 N=normalize(vN); float h=barkHeight(uv);
  N=bumped(N,vW,h,mix(0.26,0.06,m));
  vec2 q=barkDomain(uv);
  float grain=gfbm(q*1.25)*0.5+0.5, mottle=gfbm(q*0.28+21.)*0.5+0.5;
  float crack=smoothstep(0.30,0.86,ridged(q*1.9+4.));
  vec3 silver=mix(vec3(0.020,0.019,0.018),vec3(0.290,0.283,0.264),grain);
  vec3 umber =mix(vec3(0.024,0.019,0.016),vec3(0.175,0.140,0.110),grain);
  vec3 wood=mix(silver,umber,mottle*0.78)*(1.-0.70*crack);
  float mo=gfbm(vec2(vW.x*2.6,vW.z*2.6+vW.y*1.9))*0.5+0.5;
  vec3 moss=mix(vec3(0.0204,0.0311,0.0050),vec3(0.0914,0.1392,0.0227),mo)*(0.80+0.42*cap);
  vec3 col=mix(wood,moss,m);
  float lich=smoothstep(0.56,0.84,gfbm(q*0.62+31.)*0.5+0.5);
  lich*=(1.-m)*smoothstep(-0.10,0.70,N.y)*smoothstep(0.15,0.50,h);
  col=mix(col,vec3(0.162,0.176,0.132),lich*0.78);
  float contact=smoothstep(0.,0.16,cap)*(1.-smoothstep(0.16,0.60,cap));
  col*=1.-0.48*contact;
  float ao=mix(0.30,1.02,smoothstep(-0.40,0.62,h))*mix(1.,0.86,m);
  vec3 lit=litSurface(N,col,ao);
  vec3 V=normalize(cameraPosition-vW);
  lit+=col*uAmbCol*pow(1.-max(dot(N,V),0.),4.)*0.85;
  lit+=uKeyCol*pow(max(dot(reflect(-uKeyDir,N),V),0.),20.)*0.045*(1.-m)*ao;
  float a=uAlpha*maskAt(vL,uBoxH);
  if(a<0.004) discard;
  gl_FragColor=vec4(aerial(lit,vH),a);
  #include <tonemapping_fragment>
  ${ENCODE}
}`,
          transparent, depthWrite:true, side:THREE.DoubleSide,
        });
      }

      function grassMaterial(uni: object, transparent: boolean) {
        return new THREE.ShaderMaterial({
          uniforms: uni as Record<string, THREE.IUniform>,
          side:THREE.DoubleSide, transparent, depthWrite:true,
          vertexShader: WIND_GLSL + `
attribute vec3 offset,nrm; attribute vec4 rnd; attribute float aux;
uniform vec3 uMouse; uniform float uMouseR,uBoxH;
varying float vT,vShade,vDark,vTone,vH; varying vec3 vN,vW,vL;
void main(){
  float t=uv.y; vT=t; float len=rnd.y;
  vec3 ref=abs(nrm.y)<0.95?vec3(0,1,0):vec3(1,0,0);
  vec3 T0=normalize(cross(nrm,ref)), B0=cross(nrm,T0);
  float ca=cos(rnd.x),sa=sin(rnd.x);
  vec3 widthDir=T0*ca+B0*sa, leanDir=T0*-sa+B0*ca;
  float bend=t*t;
  float gust=(sin(uTime*1.75+offset.x*1.6+rnd.x)*0.12+sin(uTime*0.85+offset.x*0.55)*0.07)*uWind;
  vec3 world=offset+windOffset(offset)+nrm*(t*len)+widthDir*(position.x*len*0.62)
            +leanDir*(rnd.z*0.42*len)*bend+(T0*gust+B0*gust*0.6)*bend*len*1.6;
  vec3 toB=offset-uMouse;
  float infl=smoothstep(uMouseR,0.,length(toB*vec3(1.,1.,0.30))); infl*=infl;
  vec3 push=toB-nrm*dot(toB,nrm); float pl=length(push);
  push=pl>0.0001?push/pl:T0;
  world+=push*infl*bend*len*2.2; world-=nrm*infl*bend*len*1.;
  vDark=infl;
  vShade=(0.66+0.34*rnd.w)*(0.82+0.18*sin(rnd.x*2.))*(0.46+0.54*clamp(nrm.y*0.5+0.62,0.,1.));
  vTone=smoothstep(0.16,0.86,aux);
  vN=normalize(mix(nrm,normalize(leanDir*rnd.z+nrm),0.35));
  vL=world; vH=clamp(world.y/uBoxH+0.5,0.,1.);
  vec4 wp=modelMatrix*vec4(world,1.); vW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`,
          fragmentShader: LIGHT_GLSL + `
precision highp float;
uniform float uAlpha,uBoxH;
varying float vT,vShade,vDark,vTone,vH; varying vec3 vN,vW,vL;
void main(){
  if(unscanned(vW,520.)) discard;
  vec3 deep=vec3(0.0126,0.0192,0.0031),mid=vec3(0.0488,0.0744,0.0121);
  vec3 tip=vec3(0.1222,0.1860,0.0304),tipHi=vec3(0.2600,0.3900,0.0640);
  vec3 col=mix(deep,mid,smoothstep(0.,0.62,vT));
  col=mix(col,tip,smoothstep(0.38,1.,vT)*(0.35+0.65*vTone));
  col*=0.62+0.72*vTone; col*=vShade; col*=1.-vDark*0.55;
  vec3 N=normalize(vN);
  vec3 lit=litSurface(N,col,mix(0.40,1.10,smoothstep(0.,0.88,vT))*(0.70+0.52*vTone));
  lit+=tipHi*smoothstep(0.68,1.,vT)*vTone*(0.30+0.70*max(dot(N,uKeyDir),0.))*0.95;
  vec3 V=normalize(cameraPosition-vW);
  lit+=col*uKeyCol*pow(max(dot(V,-uKeyDir),0.),2.2)*0.55*vT;
  float a=uAlpha*maskAt(vL,uBoxH);
  if(a<0.004) discard;
  gl_FragColor=vec4(aerial(lit,vH),a);
  #include <tonemapping_fragment>
  ${ENCODE}
}`,
        });
      }

      function fernMaterial(uni: object) {
        return new THREE.ShaderMaterial({
          uniforms: uni as Record<string, THREE.IUniform>,
          side:THREE.DoubleSide,
          vertexShader: WIND_GLSL + `
attribute vec3 iPos; attribute vec4 iQuat; attribute vec2 iRnd;
uniform float uBoxH;
varying vec2 vUv; varying vec3 vN,vW,vL; varying float vH,vTint;
vec3 qrot(vec4 q,vec3 v){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
void main(){
  vUv=uv; vTint=iRnd.y;
  vec3 local=qrot(iQuat,position*iRnd.x);
  vN=normalize(qrot(iQuat,normal));
  float sway=sin(uTime*1.15+iRnd.y*6.28)*0.055*uWind;
  local+=vec3(sway,0.,sway*0.45)*clamp(position.y,0.,1.2)*iRnd.x;
  vec3 p=iPos+windOffset(iPos)+local;
  vL=p; vH=clamp(p.y/uBoxH+0.5,0.,1.);
  vec4 wp=modelMatrix*vec4(p,1.); vW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`,
          fragmentShader: LIGHT_GLSL + `
precision highp float;
uniform float uAlpha,uBoxH;
varying vec2 vUv; varying vec3 vN,vW,vL; varying float vH,vTint;
void main(){
  if(unscanned(vW,520.)) discard;
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(cameraPosition-vW);
  vec3 base=mix(vec3(0.0270,0.0450,0.0099),vec3(0.0690,0.1150,0.0253),vTint);
  base*=0.80+0.30*smoothstep(0.,0.8,vUv.x);
  vec3 lit=litSurface(N,base,0.9);
  lit+=base*uKeyCol*pow(max(dot(V,-uKeyDir),0.),2.)*1.05;
  float a=uAlpha*maskAt(vL,uBoxH);
  if(a<0.004) discard;
  gl_FragColor=vec4(aerial(lit,vH),a);
  #include <tonemapping_fragment>
  ${ENCODE}
}`,
        });
      }

      function flowerMaterial(uni: object) {
        return new THREE.ShaderMaterial({
          uniforms: { ...uni as Record<string, THREE.IUniform>, uMap:{ value: null } },
          transparent:true, depthWrite:false, side:THREE.DoubleSide,
          vertexShader: WIND_GLSL + `
attribute vec3 iPos; attribute vec2 iRnd;
uniform float uBoxH;
varying vec2 vUv; varying vec3 vL,vW; varying float vH;
void main(){
  vUv=uv;
  vec3 p=iPos+windOffset(iPos);
  p+=vec3(sin(uTime*1.5+iRnd.y*6.28),0.,0.)*0.020*uWind;
  vL=p; vH=clamp(p.y/uBoxH+0.5,0.,1.);
  vW=(modelMatrix*vec4(p,1.)).xyz;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  float ws=length(modelMatrix[0].xyz);
  mv.xy+=position.xy*iRnd.x*ws;
  gl_Position=projectionMatrix*mv;
}`,
          fragmentShader: LIGHT_GLSL + `
precision highp float;
uniform sampler2D uMap; uniform float uAlpha,uBoxH;
varying vec2 vUv; varying vec3 vL,vW; varying float vH;
void main(){
  if(unscanned(vW,520.)) discard;
  vec4 t=texture2D(uMap,vUv); if(t.a<0.14) discard;
  vec3 col=t.rgb*t.rgb*(uKeyCol*0.62+uAmbCol*0.9);
  gl_FragColor=vec4(aerial(col,vH),t.a*uAlpha*maskAt(vL,uBoxH));
  #include <tonemapping_fragment>
  ${ENCODE}
}`,
        });
      }

      function wireMaterial() {
        return new THREE.ShaderMaterial({
          uniforms:{ uScanO, uScanR, uWire, uTime },
          transparent:true, depthWrite:false, depthTest:false,
          blending:THREE.AdditiveBlending,
          vertexShader:`varying vec3 vW;
void main(){
  vec4 wp=modelMatrix*vec4(position,1.); vW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`,
          fragmentShader:`precision highp float;
uniform vec3 uScanO; uniform float uScanR,uWire,uTime;
varying vec3 vW;
void main(){
  float d=distance(vW,uScanO);
  float rim=exp(-pow((d-uScanR)/135.,2.));
  float trail=smoothstep(uScanR,uScanR-950.,d);
  float a=(rim*1.60+trail*0.34)*uWire;
  if(a<0.004) discard;
  a*=0.66+0.34*sin(d*0.045-uTime*7.);
  vec3 col=mix(vec3(0.30,0.72,0.46),vec3(0.86,1.00,0.90),rim);
  gl_FragColor=vec4(col,clamp(a,0.,1.));
}`,
        });
      }

      // ── helpers ─────────────────────────────────────────────────────
      function radialTexture(size: number, stops: [number,string][]) {
        const c=document.createElement("canvas"); c.width=c.height=size;
        const g=c.getContext("2d")!;
        const grad=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
        stops.forEach(s=>grad.addColorStop(s[0],s[1]));
        g.fillStyle=grad; g.fillRect(0,0,size,size);
        const t=new THREE.CanvasTexture(c);
        t.minFilter=THREE.LinearFilter; setTexColorSpace(t);
        return t;
      }

      function bladeGeometry() {
        const SEGS=3, verts: number[]=[], uvs: number[]=[], idx: number[]=[];
        for (let i=0; i<=SEGS; i++) {
          const t=i/SEGS, w=0.5*(1-t*t);
          verts.push(-w,t,0, w,t,0); uvs.push(0,t, 1,t);
        }
        verts[verts.length-6]=0; verts[verts.length-3]=0;
        for (let i=0; i<SEGS; i++) {
          const a=i*2, b=a+1, c=a+2, d=a+3;
          idx.push(a,b,c, b,d,c);
        }
        const g=new THREE.InstancedBufferGeometry();
        g.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
        g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
        g.setIndex(idx);
        return g;
      }

      function fernGeometry() {
        const PAIRS=13, SEG=3, pos: number[]=[], uv: number[]=[], idx: number[]=[];
        const rachis=(s: number, out: THREE.Vector3) =>
          out.set(0, s*(1.06-0.44*s*s), 0.36*s*s);
        const a=new THREE.Vector3(), b=new THREE.Vector3();
        for (let i=1; i<=PAIRS; i++) {
          const s=i/(PAIRS+0.6);
          rachis(s,a);
          const pl=0.36*Math.pow(Math.max(0,1-Math.pow(s,0.62)),0.75)*(1-0.18*s)*
                   Math.sin(Math.PI*Math.pow(s,0.62));
          for (const side of [-1,1]) {
            const base=pos.length/3;
            for (let k=0; k<=SEG; k++) {
              const f=k/SEG;
              const w=0.088*pl*Math.pow(Math.sin(Math.PI*Math.min(f*1.25,1)),0.7)*(1-0.35*f);
              rachis(s+f*pl*0.34,b);
              const x=side*f*pl, y=b.y-0.22*pl*f*f, z=b.z+0.06*pl*f;
              pos.push(x,y-w,z, x,y+w,z); uv.push(f,0, f,1);
            }
            for (let k2=0; k2<SEG; k2++) {
              const q=base+k2*2;
              idx.push(q,q+1,q+2, q+1,q+3,q+2);
            }
          }
        }
        const st=pos.length/3;
        for (let j=0; j<=8; j++) {
          const s2=j/8; rachis(s2,a);
          pos.push(-0.011*(1-0.6*s2),a.y,a.z, 0.011*(1-0.6*s2),a.y,a.z);
          uv.push(0.5,0, 0.5,1);
        }
        for (let j2=0; j2<8; j2++) {
          const q2=st+j2*2;
          idx.push(q2,q2+1,q2+2, q2+1,q2+3,q2+2);
        }
        const g=new THREE.InstancedBufferGeometry();
        g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
        g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
        g.setIndex(idx);
        const tmp=new THREE.BufferGeometry();
        tmp.setAttribute("position",g.getAttribute("position"));
        tmp.setIndex(idx); tmp.computeVertexNormals();
        g.setAttribute("normal",tmp.getAttribute("normal"));
        return g;
      }

      function makeFlowerTexture() {
        const c=document.createElement("canvas"); c.width=c.height=64;
        const g=c.getContext("2d")!;
        const FLORETS: [number,number,number][]=[
          [32,22,7.4],[22,33,6],[42,33,6.2],[27,44,5],[39,45,5.4],[32,33,4.4],[46,22,4.2],[18,22,4]
        ];
        for (let f=0; f<FLORETS.length; f++) {
          const [cx,cy,r]=FLORETS[f];
          g.save(); g.translate(cx,cy); g.rotate(f*1.31);
          for (let p=0; p<5; p++) {
            g.save(); g.rotate((p/5)*TAU);
            g.fillStyle=`rgba(255,255,251,${0.72+0.28*(r/7.4)})`;
            g.beginPath(); g.ellipse(0,-r*0.55,r*0.34,r*0.55,0,0,TAU); g.fill();
            g.restore();
          }
          g.fillStyle="#f0e7bd";
          g.beginPath(); g.arc(0,0,r*0.24,0,TAU); g.fill();
          g.restore();
        }
        const t=new THREE.CanvasTexture(c);
        setTexColorSpace(t);
        t.minFilter=THREE.LinearMipmapLinearFilter;
        t.generateMipmaps=true;
        return t;
      }

      // ── wire building ────────────────────────────────────────────────
      const wireMeshes: THREE.LineSegments[]=[];
      function buildWire(L: Limb, out: number[]) {
        if (!L.grid) return;
        const S=L.S!, R=L.R!, g=L.grid;
        const ringEvery=Math.max(2,Math.round(S/52));
        const longEvery=Math.max(2,Math.round(R/9));
        for (let i=0; i<=S; i+=ringEvery)
          for (let j=0; j<R; j++) {
            const a=(i*(R+1)+j)*3, b=a+3;
            out.push(g[a],g[a+1],g[a+2], g[b],g[b+1],g[b+2]);
          }
        for (let j=0; j<R; j+=longEvery)
          for (let i=0; i<S; i++) {
            const a=(i*(R+1)+j)*3, b=((i+1)*(R+1)+j)*3;
            out.push(g[a],g[a+1],g[a+2], g[b],g[b+1],g[b+2]);
          }
      }

      // ── assemble one root group ──────────────────────────────────────
      function assembleRoot(
        limbs: Limb[],
        opt: {
          aspect: number; haze: number; fog: number; alpha: number; order: number;
          blades: number; ferns: number; flowers: number;
          fernSize: [number,number]; flowerSize: [number,number];
          mainLimbs?: number; wire?: boolean;
          mask?: [number,number,number,number];
          hazeCol?: number[]; hazeLift?: number;
          mouse: typeof uMouseNear; mouseR: number;
        }
      ) {
        const group=new THREE.Group();
        const uni=lightUniforms({
          uBoxH:    { value: BOXW/opt.aspect },
          uHaze:    { value: opt.haze },
          uFog:     { value: opt.fog },
          uHazeCol: { value: new THREE.Color().fromArray(opt.hazeCol??[0.176,0.195,0.145]) },
          uHazeLift:{ value: opt.hazeLift??0.20 },
          uAlpha:   { value: opt.alpha },
          uMask:    { value: new THREE.Vector4(...(opt.mask??[0,1,0,1])) },
          uMaskOn:  { value: opt.mask?1:0 },
          uMouse:   { value: opt.mouse.value },
          uMouseR:  { value: opt.mouseR },
        });
        const soft=!!opt.mask||opt.alpha<1;

        // Shell
        const bag={pos:[],nor:[],inf:[],idx:[]};
        for (const L of limbs) tessellate(L, bag);
        const geo=new THREE.BufferGeometry();
        geo.setAttribute("position",new THREE.Float32BufferAttribute(bag.pos,3));
        geo.setAttribute("normal",  new THREE.Float32BufferAttribute(bag.nor,3));
        geo.setAttribute("inf",     new THREE.Float32BufferAttribute(bag.inf,3));
        geo.setIndex(bag.idx);
        const shell=new THREE.Mesh(geo, barkMaterial(uni, soft));
        shell.frustumCulled=false; shell.renderOrder=opt.order;
        group.add(shell);

        // Fur
        const fur={off:[],nrm:[],rnd:[],aux:[]};
        let totalLen=0; for (const L of limbs) totalLen+=L.len;
        for (const L of limbs)
          plantBlades(L, Math.round(opt.blades*L.len/totalLen), fur);
        const bg=bladeGeometry();
        bg.setAttribute("offset",new THREE.InstancedBufferAttribute(new Float32Array(fur.off),3));
        bg.setAttribute("nrm",   new THREE.InstancedBufferAttribute(new Float32Array(fur.nrm),3));
        bg.setAttribute("rnd",   new THREE.InstancedBufferAttribute(new Float32Array(fur.rnd),4));
        bg.setAttribute("aux",   new THREE.InstancedBufferAttribute(new Float32Array(fur.aux),1));
        bg.instanceCount=fur.off.length/3;
        const grass=new THREE.Mesh(bg, grassMaterial(uni, soft));
        grass.frustumCulled=false; grass.renderOrder=opt.order+0.1;
        group.add(grass);

        // Ferns + flowers
        const host=limbs.slice(0, opt.mainLimbs??limbs.length);
        const plantMaxX=opt.mask?opt.mask[0]+0.25:1e9;
        const fP=[],fQ=[],fR=[],wP=[],wR=[];
        const pp=new THREE.Vector3(),pn=new THREE.Vector3();
        const q=new THREE.Quaternion(),face=new THREE.Vector3();

        let k,guard;
        for (k=0,guard=0; k<opt.ferns&&guard<opt.ferns*60; guard++) {
          const Lf=host[Math.floor(rng()*host.length)];
          const t=rng(), th=rng()*TAU;
          if (limbSurface(Lf,t,th,pp,pn)<0.55||pp.x>plantMaxX||pn.y<0.25) continue;
          face.copy(pn).addScaledVector(UP,0.18)
            .addScaledVector(new THREE.Vector3(rand(-0.62,0.62),rand(-0.2,0.05),rand(0.15,0.75)),1).normalize();
          q.setFromUnitVectors(UP,face);
          q.multiply(new THREE.Quaternion().setFromAxisAngle(UP,rng()*TAU));
          fP.push(pp.x,pp.y,pp.z); fQ.push(q.x,q.y,q.z,q.w);
          fR.push(rand(opt.fernSize[0],opt.fernSize[1]),rng()); k++;
        }
        for (k=0,guard=0; k<opt.flowers&&guard<opt.flowers*60; guard++) {
          const Lw=host[Math.floor(rng()*host.length)];
          const t0=rng(), th0=rng()*TAU;
          for (let c2=0; c2<9&&k<opt.flowers; c2++) {
            const tt=clamp01(t0+rand(-0.008,0.008));
            if (limbSurface(Lw,tt,th0+rand(-0.24,0.24),pp,pn)<0.45||pp.x>plantMaxX) continue;
            pp.addScaledVector(pn,rand(0.02,0.16));
            wP.push(pp.x,pp.y,pp.z); wR.push(rand(opt.flowerSize[0],opt.flowerSize[1]),rng()); k++;
          }
        }
        if (fP.length) {
          const fg=fernGeometry();
          fg.setAttribute("iPos", new THREE.InstancedBufferAttribute(new Float32Array(fP),3));
          fg.setAttribute("iQuat",new THREE.InstancedBufferAttribute(new Float32Array(fQ),4));
          fg.setAttribute("iRnd", new THREE.InstancedBufferAttribute(new Float32Array(fR),2));
          fg.instanceCount=fP.length/3;
          const fern=new THREE.Mesh(fg, fernMaterial(uni));
          fern.frustumCulled=false; fern.renderOrder=opt.order+0.2;
          group.add(fern);
        }
        if (wP.length) {
          const wg=new THREE.InstancedBufferGeometry();
          wg.setAttribute("position",new THREE.Float32BufferAttribute([-0.5,-0.5,0, 0.5,-0.5,0, 0.5,0.5,0, -0.5,0.5,0],3));
          wg.setAttribute("uv",new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,1],2));
          wg.setIndex([0,1,2, 0,2,3]);
          wg.setAttribute("iPos",new THREE.InstancedBufferAttribute(new Float32Array(wP),3));
          wg.setAttribute("iRnd",new THREE.InstancedBufferAttribute(new Float32Array(wR),2));
          wg.instanceCount=wP.length/3;
          const fm=flowerMaterial(uni) as THREE.ShaderMaterial;
          fm.uniforms.uMap={ value: makeFlowerTexture() };
          const blooms=new THREE.Mesh(wg,fm);
          blooms.frustumCulled=false; blooms.renderOrder=opt.order+0.3;
          group.add(blooms);
        }
        if (opt.wire) {
          const wpos: number[]=[];
          for (const L of limbs) buildWire(L,wpos);
          if (wpos.length) {
            const wgeo=new THREE.BufferGeometry();
            wgeo.setAttribute("position",new THREE.Float32BufferAttribute(wpos,3));
            const wmesh=new THREE.LineSegments(wgeo,wireMaterial());
            wmesh.frustumCulled=false; wmesh.renderOrder=8;
            group.add(wmesh);
            wireMeshes.push(wmesh);
          }
        }
        for (const L of limbs) { L.grid=L.gnrm=L.gcaps=null; }
        group.userData={ uni, blades:bg.instanceCount };
        return group;
      }

      // ── scene setup ─────────────────────────────────────────────────
      const small = NARROW.matches || window.innerWidth*window.innerHeight < 620000;
      const BLADES_NEAR = small ? 90000 : 185000;
      const BLADES_FAR  = small ? 20000 : 50000;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:!small });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, small?1.6:2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.30;
      setOutputColorSpace(renderer);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 10, 8000);
      camera.position.set(0, 0, DIST);

      // Dedicated scene lights for standard 3D meshes (e.g. scrap robot)
      const sceneAmb = new THREE.AmbientLight(0xffffff, 1.8);
      scene.add(sceneAmb);
      const sceneKey = new THREE.DirectionalLight(0xfffaea, 2.2);
      sceneKey.position.set(-200, 400, 300);
      scene.add(sceneKey);

      // Near root
      const nearLimbs = buildNearRoot();
      const mainCount = nearLimbs.length;
      const extraLimbs: Limb[]=[];
      const hp=new THREE.Vector3(), hn=new THREE.Vector3();
      for (let i=0; i<14; i++) {
        const r=rng();
        const src=nearLimbs[r<0.62?0:r<0.82?1:2];
        const t=rand(0.04,0.96), th=rng()*TAU;
        limbSurface(src,t,th,hp,hn);
        if (hn.y<-0.35) continue;
        limbFrame(src,t);
        const dir=hn.clone().multiplyScalar(rand(0.5,1.2))
          .addScaledVector(_ft,rand(-0.6,1.5))
          .addScaledVector(UP,rand(-0.5,0.55)).normalize();
        hp.addScaledVector(hn,-src.rw(t)*0.55);
        growOffshoot(extraLimbs,hp.clone(),dir,rand(0.28,0.72),src.rw(t)*rand(0.22,0.40),0);
      }
      const allNearLimbs=[...nearLimbs,...extraLimbs];

      const nearGroup = assembleRoot(allNearLimbs, {
        aspect:ARCH.aspect, haze:0.15, fog:0.0, alpha:1.0, order:2,
        blades:BLADES_NEAR, ferns:small?30:54, flowers:small?150:320,
        fernSize:[0.22,0.50], flowerSize:[0.055,0.118], mainLimbs:mainCount, wire:true,
        mouse:uMouseNear, mouseR:1.20,
      });
      scene.add(nearGroup);

      // ── Perch Scrap Robot Atop Arch Crest ──
      const robotPerchP = new THREE.Vector3();
      const robotPerchN = new THREE.Vector3();
      let bestY = -999;
      const testP = new THREE.Vector3();
      const testN = new THREE.Vector3();
      for (let i = 0; i < 32; i++) {
        const th = (i / 32) * Math.PI * 2;
        limbSurface(nearLimbs[2], 0.06, th, testP, testN);
        if (testP.y > bestY) {
          bestY = testP.y;
          robotPerchP.copy(testP);
          robotPerchN.copy(testN);
        }
      }
      const robot = buildScrapRobot(
        nearGroup,
        robotPerchP.clone().addScaledVector(robotPerchN, 0.05),
        robotPerchN
      );

      const farGroup = assembleRoot(buildFarRoot(), {
        aspect:FAR.aspect, haze:0.16, fog:0.26, alpha:1.0, order:0,
        hazeCol:[0.150,0.164,0.120], hazeLift:0.92,
        blades:BLADES_FAR, ferns:small?8:16, flowers:small?40:90,
        fernSize:[0.26,0.56], flowerSize:[0.034,0.062],
        mask:[0.4,3.4,0.0,0.42], wire:true,
        mouse:uMouseFar, mouseR:1.4,
      });
      scene.add(farGroup);

      // Ambient
      const geo = new THREE.PlaneGeometry(1,1);
      const shadowMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map:radialTexture(256,[[0,"rgba(12,16,10,0.35)"],[0.45,"rgba(12,16,10,0.10)"],[1,"rgba(12,16,10,0)"]]),
        transparent:true, depthWrite:false, depthTest:false,
      }));
      shadowMesh.renderOrder=1; shadowMesh.position.z=-70; scene.add(shadowMesh);

      const glowMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map:radialTexture(256,[[0,"rgba(226,236,212,0.30)"],[0.42,"rgba(214,226,200,0.10)"],[1,"rgba(214,226,200,0)"]]),
        transparent:true, depthWrite:false, depthTest:false,
        blending:THREE.AdditiveBlending,
      }));
      glowMesh.renderOrder=-1; glowMesh.position.z=-320; scene.add(glowMesh);

      // Pollen motes
      const MOTE_COUNT = small ? 1500 : 3600;
      const motePos=new Float32Array(MOTE_COUNT*3), moteSeed=new Float32Array(MOTE_COUNT*4);
      for (let i=0; i<MOTE_COUNT; i++) {
        motePos[i*3]=(Math.random()-0.5)*3400;
        motePos[i*3+1]=(Math.random()-0.5)*1500;
        motePos[i*3+2]=-380+Math.random()*1000;
        moteSeed[i*4]=Math.random()*6.283; moteSeed[i*4+1]=0.25+Math.random()*0.9;
        moteSeed[i*4+2]=0.4+Math.random()*1.4; moteSeed[i*4+3]=0.70+1.05*Math.pow(Math.random(),2.2);
      }
      const poleTex=radialTexture(64,[[0,"rgba(255,255,255,1)"],[0.35,"rgba(236,244,224,0.5)"],[1,"rgba(236,244,224,0)"]]);
      const motePg=new THREE.BufferGeometry();
      motePg.setAttribute("position",new THREE.BufferAttribute(motePos,3));
      motePg.setAttribute("seed",new THREE.BufferAttribute(moteSeed,4));
      const motes=new THREE.Points(motePg, new THREE.ShaderMaterial({
        uniforms:{ uTime, uMap:{value:poleTex}, uSize:{value:9}, uScale:{value:440} },
        transparent:true, depthWrite:false, depthTest:true,
        blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec4 seed;
uniform float uTime,uSize,uScale; varying float vFade;
void main(){
  float ph=seed.x,sp=seed.y,am=seed.z; vec3 p=position;
  p.x+=sin(uTime*sp*0.35+ph)*34.*am;
  float climb=mod(uTime*11.*sp+ph*60.,1500.)-750.; p.y+=climb;
  p.z+=cos(uTime*sp*0.28+ph)*24.*am;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_PointSize=uSize*seed.w*(uScale/max(-mv.z,1.));
  float edge=1.-abs(climb)/750.;
  vFade=clamp(edge*3.,0.,1.)*(0.55+0.45*sin(uTime*(0.7+sp*1.6)+ph*3.1));
  gl_Position=projectionMatrix*mv;
}`,
        fragmentShader:`precision highp float;
uniform sampler2D uMap; varying float vFade;
void main(){
  vec4 t=texture2D(uMap,gl_PointCoord);
  gl_FragColor=vec4(t.rgb,t.a*vFade*0.52);
}`,
      }));
      motes.frustumCulled=false; motes.renderOrder=6; scene.add(motes);

      // Cursor spray
      const SPRAY_N=500, SPRAY_LIFE=1.6;
      const sprayPos=new Float32Array(SPRAY_N*3);
      const sprayVel=new Float32Array(SPRAY_N*3);
      const sprayBirth=new Float32Array(SPRAY_N);
      const sprayRnd=new Float32Array(SPRAY_N*2);
      for (let i=0; i<SPRAY_N; i++) sprayBirth[i]=-999;
      const sprayGeo=new THREE.BufferGeometry();
      sprayGeo.setAttribute("position",  new THREE.BufferAttribute(sprayPos,3));
      sprayGeo.setAttribute("aVel",      new THREE.BufferAttribute(sprayVel,3));
      sprayGeo.setAttribute("aBirth",    new THREE.BufferAttribute(sprayBirth,1));
      sprayGeo.setAttribute("aRnd",      new THREE.BufferAttribute(sprayRnd,2));
      const sprayMesh=new THREE.Points(sprayGeo, new THREE.ShaderMaterial({
        uniforms:{ uTime, uMap:{value:poleTex}, uSize:{value:13}, uScale:{value:440}, uLife:{value:SPRAY_LIFE} },
        transparent:true, depthWrite:false, depthTest:false,
        blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 aVel; attribute float aBirth; attribute vec2 aRnd;
uniform float uTime,uSize,uScale,uLife; varying float vA;
void main(){
  float age=uTime-aBirth;
  if(age<0.||age>uLife){vA=0.;gl_PointSize=0.;gl_Position=vec4(2,2,2,1);return;}
  float u=age/uLife;
  vec3 p=position+aVel*age*(1.-0.34*u)+vec3(sin(aRnd.y*6.28+age*2.6)*22.*u,46.*age,0.);
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_PointSize=uSize*aRnd.x*(uScale/max(-mv.z,1.))*(0.45+0.55*(1.-u));
  vA=smoothstep(0.,0.09,u)*(1.-smoothstep(0.40,1.,u));
  gl_Position=projectionMatrix*mv;
}`,
        fragmentShader:`precision highp float;
uniform sampler2D uMap; varying float vA;
void main(){ vec4 t=texture2D(uMap,gl_PointCoord); gl_FragColor=vec4(t.rgb,t.a*vA*0.85); }`,
      }));
      sprayMesh.frustumCulled=false; sprayMesh.renderOrder=7; scene.add(sprayMesh);

      let sprayHead=0, sprayDirty=false;
      const sprayOrigin=new THREE.Vector3();
      const sprayLast=new THREE.Vector3(9999,0,0);
      const sprayPlane=new THREE.Plane(new THREE.Vector3(0,0,1),-240);

      const spawnSpray=(p: THREE.Vector3, boost=1) => {
        const i=sprayHead; sprayHead=(sprayHead+1)%SPRAY_N;
        const o=i*3;
        sprayPos[o]=p.x+rand(-15,15)*boost; sprayPos[o+1]=p.y+rand(-15,15)*boost; sprayPos[o+2]=p.z+rand(-45,45);
        sprayVel[o]=rand(-38,38)*boost; sprayVel[o+1]=(rand(2,64)+22*(boost-1))*boost; sprayVel[o+2]=rand(-26,26)*boost;
        sprayBirth[i]=uTime.value;
        sprayRnd[i*2]=rand(0.50,1.15); sprayRnd[i*2+1]=rng();
        sprayDirty=true;
      };

      // ── layout ──────────────────────────────────────────────────────
      const raycaster=new THREE.Raycaster();
      const mousePlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
      const mouseHit=new THREE.Vector3();
      let mouseLive=false, mouseNdcX=0, mouseNdcY=0;

      function layout() {
        const narrow=NARROW.matches;
        const W=(container?.offsetWidth)||window.innerWidth;
        const H=(container?.offsetHeight)||window.innerHeight;
        camera.aspect=W/H; camera.updateProjectionMatrix();
        renderer.setSize(W,H,false);

        const cfg = narrow?ARCH_N:ARCH;
        const cfgF= narrow?FAR_N:FAR;
        const REF_W= narrow?760:1600;
        const REF_H= narrow?560:880;
        const worldH=2*DIST*Math.tan(20*Math.PI/180); // fov=40
        const wup=worldH/REF_H;

        const sN=cfg.w*wup/BOXW;
        nearGroup.scale.setScalar(sN);
        const bHN=cfg.w/cfg.aspect;
        nearGroup.position.set(
          (cfg.left+cfg.w/2-REF_W/2)*wup,
          -(cfg.top+bHN/2-REF_H/2)*wup,
          0
        );

        const sF=cfgF.w*wup/BOXW;
        farGroup.scale.setScalar(sF);
        const bHF=cfgF.w/cfgF.aspect;
        farGroup.position.set(
          (cfgF.left+cfgF.w/2-REF_W/2)*wup,
          -(cfgF.top+bHF/2-REF_H/2)*wup,
          cfgF.z||0
        );

        const worldW=worldH*(W/H);
        shadowMesh.scale.set(worldW*1.4, worldH*0.85, 1);
        shadowMesh.position.set(nearGroup.position.x*0.2, nearGroup.position.y*0.5-worldH*0.1, -70);
        glowMesh.scale.set(worldW*0.9, worldH*0.7, 1);
        glowMesh.position.set(nearGroup.position.x*0.15, nearGroup.position.y*0.45+worldH*0.05, -320);

        // Scan origin: left of near root in world space
        const lo=new THREE.Vector3(-4.1,-1.2,1.1);
        nearGroup.localToWorld(lo);
        uScanO.value.copy(lo);
      }

      layout();
      const ro=new ResizeObserver(layout);
      ro.observe(container);

      // ── pointer & interactive tracking ──────────────────────────────
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        const r = container?.getBoundingClientRect() || {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
        mouseNdcX = ((e.clientX - r.left) / r.width) * 2 - 1;
        mouseNdcY = -((e.clientY - r.top) / r.height) * 2 + 1;
        mouseLive = true;
      };
      const onLeave = () => {
        mouseLive = false;
      };
      const onClick = (e: MouseEvent) => {
        const r = container?.getBoundingClientRect() || {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
        const clickNdc = new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1
        );
        raycaster.setFromCamera(clickNdc, camera);
        robot.handleClick(raycaster);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      window.addEventListener("click", onClick);

      // ── render loop ──────────────────────────────────────────────────
      let scanning = !REDUCED;
      let rafId = 0;
      uScanOn.value = scanning ? 1 : 0;
      uScanR.value = 0;
      const clock = new THREE.Clock();

      function renderFrame() {
        const dt = Math.min(clock.getDelta(), 0.05);
        uTime.value += dt;

        // Scan pulse
        if (scanning) {
          uScanR.value += SCAN_SPEED * dt;
          uWire.value = Math.max(0, 1 - (uScanR.value / 3000) * 2.5);
          if (uScanR.value >= 3000) {
            scanning = false;
            uScanOn.value = 0;
            uWire.value = 0;
            for (const m of wireMeshes) {
              m.geometry.dispose();
              m.parent?.remove(m);
            }
            wireMeshes.length = 0;
          }
        }

        // Mouse hit in world space & grass deformation
        if (mouseLive) {
          raycaster.setFromCamera(new THREE.Vector2(mouseNdcX, mouseNdcY), camera);
          if (raycaster.ray.intersectPlane(mousePlane, mouseHit)) {
            const ln = mouseHit.clone();
            nearGroup.worldToLocal(ln);
            uMouseNear.value.copy(ln);
            const lf = mouseHit.clone();
            farGroup.worldToLocal(lf);
            uMouseFar.value.copy(lf);
          }
          // Cursor spray
          if (raycaster.ray.intersectPlane(sprayPlane, sprayOrigin)) {
            if (sprayLast.x < 9000) {
              const d = sprayOrigin.distanceTo(sprayLast);
              const n = Math.min(14, Math.floor(d / 7));
              const tmp = new THREE.Vector3();
              for (let k = 1; k <= n; k++) {
                tmp.lerpVectors(sprayLast, sprayOrigin, k / n);
                spawnSpray(tmp);
              }
              if (n > 0) sprayLast.copy(sprayOrigin);
            } else {
              sprayLast.copy(sprayOrigin);
            }
          }
        } else {
          mouseHit.set(9999, 9999, 9999);
          uMouseNear.value.set(9999, 9999, 9999);
          uMouseFar.value.set(9999, 9999, 9999);
          sprayLast.x = 9999;
        }

        // Update scrap robot interaction & animations (with world mouse position & scan status)
        robot.update(dt, uTime.value, mouseHit, mouseLive, scanning);

        if (sprayDirty) {
          const at = sprayGeo.attributes;
          (at.position as THREE.BufferAttribute).needsUpdate = true;
          (at.aVel as THREE.BufferAttribute).needsUpdate = true;
          (at.aBirth as THREE.BufferAttribute).needsUpdate = true;
          (at.aRnd as THREE.BufferAttribute).needsUpdate = true;
          sprayDirty = false;
        }

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(renderFrame);
      }

      rafId = requestAnimationFrame(renderFrame);

      // Cleanup
      return () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("click", onClick);
        robot.dispose();
        renderer.dispose();
      };
  }, []);

  return (
    <div
      ref={containerRef}
      suppressHydrationWarning
      className="w-full h-full"
    >
      <canvas
        ref={canvasRef}
        suppressHydrationWarning
        className="w-full h-full block"
      />
    </div>
  );
}
