import { useCallback, useRef } from 'react'
import { animate } from 'animejs'

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE', '#FFD60A']
const PARTICLE_COUNT = 50
const DURATION = 1400
const GRAVITY = 800
const SPREAD = 420

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  size: number
  color: string
  shape: 'rect' | 'circle'
}

function createParticles(originX: number, originY: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.4 + Math.random() * 0.6
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.6, // 偏向上方
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }
  })
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  progress: number,
  originX: number,
  originY: number
) {
  ctx.clearRect(0, 0, ctx.canvas.width / (window.devicePixelRatio || 1), ctx.canvas.height / (window.devicePixelRatio || 1))

  const t = progress
  const opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4

  for (const p of particles) {
    const x = originX + p.vx * SPREAD * t
    const y = originY + p.vy * SPREAD * t + GRAVITY * t * t
    const rot = p.rotation + p.rotationSpeed * t
    const scale = t < 0.1 ? t / 0.1 : 1

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.globalAlpha = opacity * (0.7 + Math.random() * 0.3)
    ctx.fillStyle = p.color

    const s = p.size * scale
    if (p.shape === 'rect') {
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.6)
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

/**
 * Confetti 庆祝动画 Hook
 * 在指定容器上创建 Canvas 覆盖层，从按钮位置发射粒子
 */
export function useConfetti(containerRef: React.RefObject<HTMLElement>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const triggerConfetti = useCallback((originElement: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      const container = containerRef.current
      if (!container) { resolve(); return }

      // 创建 canvas
      const canvas = document.createElement('canvas')
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
      canvas.style.pointerEvents = 'none'
      canvas.style.zIndex = '50'

      container.appendChild(canvas)
      canvasRef.current = canvas

      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)

      // 计算发射原点（按钮中心相对于容器）
      const btnRect = originElement.getBoundingClientRect()
      const originX = btnRect.left - rect.left + btnRect.width / 2
      const originY = btnRect.top - rect.top + btnRect.height / 2

      const particles = createParticles(originX, originY)
      const progressObj = { value: 0 }

      animate(progressObj, {
        value: [0, 1],
        duration: DURATION,
        easing: 'easeOutQuad',
        onUpdate: () => {
          drawParticles(ctx, particles, progressObj.value, originX, originY)
        },
        onComplete: () => {
          canvas.remove()
          canvasRef.current = null
          resolve()
        }
      })
    })
  }, [containerRef])

  return { triggerConfetti }
}
