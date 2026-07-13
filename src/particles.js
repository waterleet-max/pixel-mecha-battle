export class ParticleSystem {
  constructor() {
    this.particles = []
  }

  spawn(x, y, count, color, speed = 3, size = 2) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const v = speed * (0.5 + Math.random() * 0.8)
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 1.5,
        life: 30 + Math.random() * 20,
        maxLife: 30 + Math.random() * 20,
        color,
        size: size + Math.random() * 2,
        gravity: 0.15,
        type: 'normal',
      })
    }
  }

  sparks(x, y, color = '#ffffff', count = 8) {
    this.spawn(x, y, count, color, 4, 1.5)
  }

  explosion(x, y, color, count = 24) {
    this.spawn(x, y, count, color, 6, 3)
  }

  slashTrail(x, y, facing, color, width = 20) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + facing * (Math.random() * width - width / 2),
        y: y + (Math.random() - 0.5) * 15,
        vx: facing * (1 + Math.random() * 2),
        vy: (Math.random() - 0.5) * 2,
        life: 12 + Math.random() * 8,
        maxLife: 20,
        color,
        size: 2 + Math.random() * 3,
        gravity: 0,
        type: 'trail',
      })
    }
  }

  impactBurst(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const v = 2 + Math.random() * 7
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        color: Math.random() > 0.5 ? color : '#ffffff',
        size: 2 + Math.random() * 4,
        gravity: 0.1,
        type: 'burst',
      })
    }
  }

  dust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color: 'rgba(180, 180, 200, 0.4)',
        size: 3 + Math.random() * 4,
        gravity: -0.02,
        type: 'dust',
      })
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha

      if (p.type === 'trail') {
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 6
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        ctx.shadowBlur = 0
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      } else {
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.size
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        ctx.shadowBlur = 0
      }
    }
    ctx.globalAlpha = 1
  }
}
