/**
 * ShaderBackground — Purple dithering WebGL shader.
 * Adapted from Paper Shaders (Apache-2.0).
 * Zero dependencies: one WebGL canvas that fills its parent.
 */
import { useEffect, useRef } from "react"

const VERT = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 mixColour(vec3 a, vec3 b, float t) {
  return mix(a, b, t);
}

vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  float cells = mix(180.0, 28.0, u_paramA);
  vec2 pixel = floor(uv * cells);
  float field = fbm(p * (1.7 + u_intensity * 4.0) + vec2(t * 0.08, -t * 0.05));
  float threshold = fract(dot(pixel, vec2(0.75487766, 0.56984029)));
  float steps = mix(2.0, 7.0, u_intensity);
  float dithered = floor(field * steps + threshold) / steps;
  return palette(dithered);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);

  p *= u_scale;
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }

  vec3 col = shade(uv, p, u_time);

  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

const UNIFORMS = {
  colors: [
    [0.06274509803921569, 0, 0.16862745098039217],
    [0.35294117647058826, 0.09411764705882353, 0.6039215686274509],
    [0.615686274509804, 0.3058823529411765, 0.8666666666666667],
    [0.8784313725490196, 0.6666666666666666, 1],
    [0.8784313725490196, 0.6666666666666666, 1],
    [0.8784313725490196, 0.6666666666666666, 1],
    [0.8784313725490196, 0.6666666666666666, 1],
    [0.8784313725490196, 0.6666666666666666, 1],
  ] as [number, number, number][],
  colorCount: 4,
  scale: 1.26,
  intensity: 0.35,
  paramA: 0.28,
  warp: 0.0,
  detail: 1.824,
  contrast: 1.005,
  brightness: 0.0,
  saturation: 1.0,
  hue: 0.0,
  vignette: 0.0,
  blur: 0.0,
  grain: 0.042,
  seed: 8428.0,
  rotate: 0.0,
  offsetX: 0.0,
  offsetY: 0.0,
  drift: 0.0,
  timeScale: 0.575,
}

const pendingContextReleases = new WeakMap<HTMLCanvasElement, number>()

export default function ShaderBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pendingRelease = pendingContextReleases.get(canvas)
    if (pendingRelease !== undefined) window.clearTimeout(pendingRelease)
    pendingContextReleases.delete(canvas)
    const gl = canvas.getContext("webgl", { antialias: false })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const program = gl.createProgram()!
    const vertexShader = compile(gl.VERTEX_SHADER, VERT)
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG)
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uni = {
      scene: gl.getUniformLocation(program, "u_scene"),
      shape: gl.getUniformLocation(program, "u_shape"),
      surface: gl.getUniformLocation(program, "u_surface"),
      finish: gl.getUniformLocation(program, "u_finish"),
      transform: gl.getUniformLocation(program, "u_transform"),
      space: gl.getUniformLocation(program, "u_space"),
      cursor: gl.getUniformLocation(program, "u_cursor"),
      colors: gl.getUniformLocation(program, "u_colors"),
    }
    gl.uniform3fv(uni.colors, new Float32Array(UNIFORMS.colors.flat()))
    gl.uniform4f(uni.shape, UNIFORMS.scale, UNIFORMS.intensity, UNIFORMS.paramA, UNIFORMS.warp)
    gl.uniform4f(uni.surface, UNIFORMS.detail, UNIFORMS.contrast, UNIFORMS.brightness, UNIFORMS.saturation)
    gl.uniform4f(uni.finish, UNIFORMS.hue, UNIFORMS.vignette, UNIFORMS.blur, UNIFORMS.grain)
    gl.uniform4f(uni.transform, UNIFORMS.seed, UNIFORMS.rotate, UNIFORMS.drift, 0)
    gl.uniform4f(uni.cursor, 0, 0, 0, 0)

    let raf = 0
    let lastNow: number | null = null
    let visible = document.visibilityState === "visible"
    let inView = true
    let disposed = false
    const start = performance.now()
    const bounds = { width: 0, height: 0 }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      bounds.width = rect.width
      bounds.height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rawW = Math.max(1, Math.round(rect.width * dpr))
      const rawH = Math.max(1, Math.round(rect.height * dpr))
      const pixelScale = Math.min(1, Math.sqrt(2_000_000 / Math.max(1, rawW * rawH)))
      const w = Math.max(1, Math.round(rawW * pixelScale))
      const h = Math.max(1, Math.round(rawH * pixelScale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    function requestRender() {
      if (!disposed && visible && inView && raf === 0) raf = requestAnimationFrame(render)
    }

    const updateLayout = () => { resizeCanvas(); requestRender() }
    window.addEventListener("resize", updateLayout)

    const resizeObserver = new ResizeObserver(updateLayout)
    resizeObserver.observe(canvas)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true
      if (inView) requestRender()
      else if (raf) { cancelAnimationFrame(raf); raf = 0; lastNow = null }
    })
    intersectionObserver.observe(canvas)
    const onVisChange = () => {
      visible = document.visibilityState === "visible"
      if (visible) requestRender()
      else if (raf) { cancelAnimationFrame(raf); raf = 0; lastNow = null }
    }
    document.addEventListener("visibilitychange", onVisChange)

    function render(now: number) {
      raf = 0
      if (disposed || !visible || !inView || !gl || !canvas) return
      lastNow = now
      resizeCanvas()
      gl.uniform4f(uni.scene, canvas.width, canvas.height, ((now - start) / 1000) * UNIFORMS.timeScale, UNIFORMS.colorCount)
      gl.uniform4f(uni.space, UNIFORMS.offsetX, UNIFORMS.offsetY, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      requestRender()
    }
    requestRender()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisChange)
      window.removeEventListener("resize", updateLayout)
      gl.deleteBuffer(buf)
      gl.deleteProgram(program)
      const releaseTimer = window.setTimeout(() => {
        if (pendingContextReleases.get(canvas) !== releaseTimer) return
        pendingContextReleases.delete(canvas)
        gl.getExtension("WEBGL_lose_context")?.loseContext()
        canvas.width = 1; canvas.height = 1
      }, 0)
      pendingContextReleases.set(canvas, releaseTimer)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={{ display: "block" }} />
}
