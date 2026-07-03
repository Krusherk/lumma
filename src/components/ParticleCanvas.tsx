import { useEffect, useRef, useCallback } from 'react'

const N = 3500
const INTRO_MS = 2800 // slower contraction

function fibSphere(n: number) {
  const out: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / n)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    out.push([
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
    ])
  }
  return out
}

const SPHERE = fibSphere(N)

interface Particle {
  tx: number; ty: number; tz: number
  cx: number; cy: number; cz: number
  ph: number; wsp: number; wam: number
  sz: number; al: number; pur: boolean
}

interface ParticleCanvasProps {
  onPhaseChange?: (phase: number) => void
}

export default function ParticleCanvas({ onPhaseChange }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(-1)

  const notifyPhase = useCallback((p: number) => {
    if (phaseRef.current !== p) {
      phaseRef.current = p
      onPhaseChange?.(p)
    }
  }, [onPhaseChange])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    // Load logo image
    const logoImg = new Image()
    logoImg.src = '/images/lumma.svg'
    let logoLoaded = false
    logoImg.onload = () => { logoLoaded = true }

    const particles: Particle[] = SPHERE.map((s) => ({
      tx: s[0], ty: s[1], tz: s[2],
      cx: (Math.random() - 0.5) * 5,
      cy: (Math.random() - 0.5) * 5,
      cz: (Math.random() - 0.5) * 5,
      ph: Math.random() * Math.PI * 2,
      wsp: 0.007 + Math.random() * 0.011,
      wam: 0.005 + Math.random() * 0.009,
      sz: 0.3 + Math.random() * 1.0,
      al: 0.15 + Math.random() * 0.55,
      pur: Math.random() < 0.55,
    }))

    let VW = 0, VH = 0, CX = 0, CY = 0, R = 0
    let introStart: number | null = null
    let contractP = 0
    let expandP = 0         // 0 = ball formed, 1 = fully expanded
    let targetExpand = 0    // what expandP is lerping toward
    let logoA = 0
    let rotY = 0
    let tick = 0
    let mx = 0, my = 0
    let introComplete = false

    function resize() {
      const dpr = devicePixelRatio || 1
      VW = innerWidth; VH = innerHeight
      canvas.width = VW * dpr; canvas.height = VH * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      CX = VW / 2; CY = VH / 2
      R = Math.min(VW, VH) * 0.38
    }

    function onMouse(e: MouseEvent) {
      mx = (e.clientX / VW - 0.5) * 2
      my = (e.clientY / VH - 0.5) * 2
    }

    function easeInExpo(t: number) { return t <= 0 ? 0 : Math.pow(2, 10 * t - 10) }

    function update() {
      for (let i = 0; i < N; i++) {
        const p = particles[i]
        let ax: number, ay: number, az: number

        if (expandP < 0.01) {
          // Ball formed or forming
          ax = p.tx; ay = p.ty; az = p.tz
        } else {
          // Expanding outward
          const ef = 1 + easeInExpo(expandP) * 5.5
          ax = p.tx * ef; ay = p.ty * ef; az = p.tz * ef
        }

        const k = !introComplete ? 0.04 : 0.028
        p.cx += (ax - p.cx) * k
        p.cy += (ay - p.cy) * k
        p.cz += (az - p.cz) * k

        const w = p.wam * Math.max(0, 1 - expandP * 2)
        p.cx += Math.sin(tick * p.wsp + p.ph) * w
        p.cy += Math.sin(tick * p.wsp * 0.83 + p.ph + 1.3) * w
        p.cz += Math.cos(tick * p.wsp * 1.1 + p.ph + 2.5) * w * 0.6
      }
    }

    function render() {
      ctx.clearRect(0, 0, VW, VH)
      const rY = rotY + mx * 0.16
      const rX = my * 0.09
      const cY2 = Math.cos(rY), sY = Math.sin(rY)
      const cX = Math.cos(rX), sX = Math.sin(rX)
      const gFade = Math.max(0, 1 - expandP * 0.92)

      const list: { sx: number; sy: number; depth: number; p: Particle }[] = new Array(N)
      for (let i = 0; i < N; i++) {
        const p = particles[i]
        let x = p.cx, y = p.cy, z = p.cz
        let x2 = x * cY2 + z * sY; let z2 = -x * sY + z * cY2; x = x2; z = z2
        let y2 = y * cX - z * sX; let z3 = y * sX + z * cX; y = y2; z = z3
        list[i] = { sx: CX + x * R, sy: CY + y * R, depth: (z + 1) / 2, p }
      }
      list.sort((a, b) => a.depth - b.depth)

      for (let i = 0; i < list.length; i++) {
        const { sx, sy, depth, p } = list[i]
        const a = p.al * (0.05 + depth * 0.95) * gFade
        if (a < 0.007) continue
        let col: string
        if (p.pur) {
          col = `rgba(${Math.round(65 + depth * 125)},${Math.round(4 + depth * 38)},${Math.round(135 + depth * 120)},${a})`
        } else {
          const l = Math.round(128 + depth * 127)
          col = `rgba(${l},${l},${l},${a * 0.78})`
        }
        ctx.beginPath()
        ctx.arc(sx, sy, p.sz * (0.2 + depth * 0.92), 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
      }

      // Logo image inside ball
      if (logoLoaded && logoA > 0.01 && expandP < 0.5) {
        ctx.save()
        ctx.globalAlpha = logoA * (1 - expandP * 2)
        const logoSize = R * 0.28
        ctx.drawImage(logoImg, CX - logoSize / 2, CY - logoSize / 2, logoSize, logoSize)
        ctx.restore()
      }
    }

    function getScrollFraction() {
      // Spacer is 200vh, so scrollable range is roughly 100vh
      // (200vh spacer - 100vh viewport = 100vh of scroll before content)
      const spacerScroll = VH * 1.0
      return Math.min(1, Math.max(0, window.scrollY / spacerScroll))
    }

    function loop(ts: number) {
      requestAnimationFrame(loop)
      tick++
      rotY += 0.003

      // Phase 0: INTRO — particles contracting to form ball
      if (!introComplete) {
        if (!introStart) introStart = ts
        contractP = Math.min(1, (ts - introStart) / INTRO_MS)

        // Logo fades in at 70% contracted
        if (contractP > 0.70) {
          logoA = Math.min(1, logoA + 0.025)
        }

        update()
        render()

        if (contractP >= 1) {
          introComplete = true
          notifyPhase(1) // ball formed, show nav + scroll cue
        }
        return
      }

      // After intro: scroll controls everything — REVERSIBLE
      const scrollFrac = getScrollFraction()
      targetExpand = scrollFrac * 3 // amplify scroll so it expands faster
      targetExpand = Math.min(1, targetExpand)

      // Smooth lerp — ball gently expands/contracts
      expandP += (targetExpand - expandP) * 0.06

      // Logo alpha — visible when ball is formed, fades when expanding
      if (expandP < 0.1) {
        logoA = Math.min(1, logoA + 0.03)
      } else {
        logoA = Math.max(0, logoA - 0.05)
      }

      update()
      render()

      // Notify phases based on expandP
      if (expandP > 0.4) {
        notifyPhase(3) // content visible
      } else if (expandP > 0.05) {
        notifyPhase(2) // transitioning
      } else {
        notifyPhase(1) // ball formed
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouse)
    requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [notifyPhase])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, background: '#000', pointerEvents: 'none' }}
    />
  )
}
