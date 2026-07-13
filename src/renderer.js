const WIDTH = 960
const HEIGHT = 540

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resize()
    window.addEventListener('resize', () => this.resize())

    this.stars = []
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT * 0.6,
        size: Math.random() > 0.85 ? 3 : (Math.random() > 0.6 ? 2 : 1),
        blink: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      })
    }

    this.hpP1 = document.getElementById('hp-p1')
    this.hpP2 = document.getElementById('hp-p2')
    this.message = document.getElementById('message')
    this.storyMessage = document.getElementById('story-message')
    this.pauseOverlay = document.getElementById('pause-overlay')
    this.winnerId = document.getElementById('winner-id')
    this.startBtn = document.getElementById('start-btn')
    this.modeSelect = document.getElementById('mode-select')
    this.levelTag = document.getElementById('level-tag')
    this.topBar = document.getElementById('top-bar')

    this.introTick = 0
    this.koRenderTick = 0
    this.countdownTimer = 0
  }

  resize() {
    const container = this.canvas.parentElement
    const containerW = container.clientWidth
    const containerH = container.clientHeight
    
    const gameAspect = WIDTH / HEIGHT
    const containerAspect = containerW / containerH
    
    let canvasW, canvasH
    if (containerAspect > gameAspect) {
      canvasH = containerH
      canvasW = canvasH * gameAspect
    } else {
      canvasW = containerW
      canvasH = canvasW / gameAspect
    }
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = WIDTH * dpr
    this.canvas.height = HEIGHT * dpr
    this.canvas.style.width = canvasW + 'px'
    this.canvas.style.height = canvasH + 'px'
    this.canvas.style.position = 'absolute'
    this.canvas.style.left = (containerW - canvasW) / 2 + 'px'
    this.canvas.style.top = (containerH - canvasH) / 2 + 'px'
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)
    
    this.scale = canvasW / WIDTH
  }

  render(game) {
    const ctx = this.ctx
    const shake = game.getShakeOffset()

    ctx.save()
    ctx.translate(shake.x, shake.y)

    if (game.status === 'menu') {
      this.#renderIntro(ctx, game)
      ctx.restore()
      this.#updateHUD(game)
      return
    }

    if (game.status === 'countdown') {
      this.#renderCountdown(ctx, game)
      ctx.restore()
      this.#updateHUD(game)
      return
    }

    if (game.status === 'paused') {
      this.#drawBackground(ctx)
      this.#drawScene(ctx)
      game.p1.draw(ctx)
      game.p2.draw(ctx)
      ctx.restore()
      this.#updateHUD(game)
      return
    }

    if (game.status === 'story_transition') {
      this.#renderStoryTransition(ctx, game)
      ctx.restore()
      this.#updateHUD(game)
      return
    }

    if (game.status === 'ko') {
      this.#renderKO(ctx, game)
      ctx.restore()
      this.#updateHUD(game)
      return
    }

    this.#drawBackground(ctx)
    this.#drawScene(ctx)

    game.p1.draw(ctx)
    game.p2.draw(ctx)

    this.#drawDamageNumbers(ctx, game.p1)
    this.#drawDamageNumbers(ctx, game.p2)

    game.particles.draw(ctx)

    if (game.freezeFrame > 0) {
      this.#drawImpactLines(ctx, game.freezeFrame)
    }

    ctx.restore()

    this.#updateHUD(game)
  }

  #renderCountdown(ctx, game) {
    this.#drawBackground(ctx)
    this.#drawScene(ctx)
    game.p1.draw(ctx)
    game.p2.draw(ctx)
    game.particles.draw(ctx)

    const elapsed = game.countdownTimer
    const total = game.countdownDuration
    const remaining = Math.ceil((total - elapsed) / 60)
    
    const progress = elapsed / total
    const sweepX = progress * WIDTH * 1.5
    
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.beginPath()
    ctx.moveTo(sweepX - 100, 0)
    ctx.lineTo(sweepX, 0)
    ctx.lineTo(sweepX - 50, HEIGHT)
    ctx.lineTo(sweepX - 150, HEIGHT)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    const scale = 1.5 + Math.sin(elapsed * 0.2) * 0.2
    const alpha = 0.8 + Math.sin(elapsed * 0.3) * 0.2
    
    ctx.save()
    ctx.font = 'bold 72px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#ffcc00'
    ctx.shadowBlur = 30
    ctx.fillStyle = `rgba(255, 220, 0, ${alpha})`
    ctx.translate(WIDTH / 2, HEIGHT / 2)
    ctx.scale(scale, scale)
    ctx.fillText(String(remaining), 0, 0)
    ctx.restore()
  }

  #renderIntro(ctx, game) {
    this.introTick++

    let scale = 1.5
    let offsetX = 0
    let offsetY = -50

    if (this.introTick < 120) {
      const t = this.introTick / 120
      scale = 3.0 - t * 1.5
      offsetX = (1 - t) * 200
      offsetY = -100 + t * 50
    } else if (this.introTick < 240) {
      const t = (this.introTick - 120) / 120
      scale = 1.5
      offsetX = t * -300
      offsetY = -50
    } else if (this.introTick < 360) {
      const t = (this.introTick - 240) / 120
      scale = 1.5 - t * 0.5
      offsetX = -300 + t * 300
      offsetY = -50 + t * 50
    } else {
      scale = 1.0
      offsetX = 0
      offsetY = 0
    }

    ctx.save()
    ctx.translate(WIDTH / 2, HEIGHT / 2)
    ctx.scale(scale, scale)
    ctx.translate(-WIDTH / 2 + offsetX, -HEIGHT / 2 + offsetY)

    this.#drawBackground(ctx)
    this.#drawScene(ctx)

    if (this.introTick > 60) {
      game.p1.draw(ctx)
      game.p2.draw(ctx)
    }

    if (this.introTick < 30) {
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - this.introTick / 30})`
      ctx.fillRect(-WIDTH, -HEIGHT, WIDTH * 3, HEIGHT * 3)
    }

    ctx.restore()

    if (this.introTick > 300) {
      const titleAlpha = Math.min(1, (this.introTick - 300) / 60)
      ctx.save()
      this.#drawLegoTitle(ctx, WIDTH / 2, HEIGHT / 2 - 20, titleAlpha)
      
      if (this.startBtn) {
        this.startBtn.style.opacity = titleAlpha
        this.startBtn.style.pointerEvents = titleAlpha > 0.5 ? 'auto' : 'none'
      }
      if (this.modeSelect) {
        this.modeSelect.style.opacity = titleAlpha
        this.modeSelect.style.pointerEvents = titleAlpha > 0.5 ? 'auto' : 'none'
      }

      ctx.restore()
    }
  }

  #drawLegoTitle(ctx, x, y, alpha) {
    const text = '麦麦，战斗吧！'
    const fontSize = 28
    
    ctx.save()
    ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 4
    ctx.shadowOffsetY = 4
    ctx.fillStyle = `rgba(100, 60, 20, ${alpha})`
    ctx.fillText(text, x, y)
    
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.shadowBlur = 0
    
    const grad = ctx.createLinearGradient(x - 150, y - 15, x + 150, y + 15)
    grad.addColorStop(0, `rgba(255, 200, 80, ${alpha})`)
    grad.addColorStop(0.3, `rgba(255, 240, 150, ${alpha})`)
    grad.addColorStop(0.5, `rgba(255, 255, 200, ${alpha})`)
    grad.addColorStop(0.7, `rgba(255, 240, 150, ${alpha})`)
    grad.addColorStop(1, `rgba(255, 180, 50, ${alpha})`)
    ctx.fillStyle = grad
    ctx.fillText(text, x, y)
    
    ctx.strokeStyle = `rgba(180, 100, 20, ${alpha})`
    ctx.lineWidth = 2
    ctx.strokeText(text, x, y)
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`
    ctx.fillText(text, x, y - 2)
    
    ctx.restore()
  }

  #renderStoryTransition(ctx, game) {
    this.#drawBackground(ctx)
    this.#drawScene(ctx)

    const progress = 1 - game.storyTransitionTimer / 120
    const alpha = Math.sin(progress * Math.PI)

    ctx.save()
    ctx.font = 'bold 32px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.shadowColor = '#ffcc00'
    ctx.shadowBlur = 20
    ctx.fillStyle = `rgba(255, 220, 0, ${alpha})`
    ctx.fillText(`LEVEL ${game.storyLevel}`, WIDTH / 2, HEIGHT / 2 - 10)

    ctx.font = '14px "Press Start 2P", monospace'
    ctx.shadowBlur = 0
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`
    ctx.fillText('GET READY', WIDTH / 2, HEIGHT / 2 + 30)
    ctx.restore()
  }

  #drawBackground(ctx) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT)
    skyGrad.addColorStop(0, '#0d0f1c')
    skyGrad.addColorStop(0.5, '#1a1c2c')
    skyGrad.addColorStop(1, '#252840')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    for (const star of this.stars) {
      star.blink += 0.06
      const alpha = 0.3 + Math.sin(star.blink) * 0.25
      const size = star.size
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`
      if (size > 1) {
        ctx.shadowColor = '#fff'
        ctx.shadowBlur = size * 2
      }
      ctx.fillRect(star.x, star.y, size, size)
      ctx.shadowBlur = 0
    }

    ctx.fillStyle = '#0f1120'
    for (let i = 0; i < 18; i++) {
      const h = 30 + (i % 7) * 22 + Math.sin(i * 1.5) * 10
      const w = 45 + (i % 3) * 15
      ctx.fillRect(i * 65 - 20, HEIGHT - 100 - h, w, h)
    }

    ctx.fillStyle = 'rgba(255, 200, 80, 0.15)'
    for (let i = 0; i < 30; i++) {
      const lx = (i * 47 + 15) % WIDTH
      const ly = HEIGHT - 95 - (i % 5) * 15
      ctx.fillRect(lx, ly, 3, 4)
    }
  }

  #drawScene(ctx) {
    const groundGrad = ctx.createLinearGradient(0, HEIGHT - 85, 0, HEIGHT)
    groundGrad.addColorStop(0, '#2a2d4a')
    groundGrad.addColorStop(0.5, '#1f2240')
    groundGrad.addColorStop(1, '#151830')
    ctx.fillStyle = groundGrad
    ctx.fillRect(0, HEIGHT - 85, WIDTH, 85)

    ctx.strokeStyle = 'rgba(74, 77, 107, 0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= WIDTH; x += 36) {
      ctx.moveTo(x, HEIGHT - 85)
      ctx.lineTo(x - 70, HEIGHT)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(74, 77, 107, 0.3)'
    ctx.beginPath()
    for (let y = HEIGHT - 85; y < HEIGHT; y += 18) {
      ctx.moveTo(0, y)
      ctx.lineTo(WIDTH, y)
    }
    ctx.stroke()

    const glowGrad = ctx.createLinearGradient(0, HEIGHT - 115, 0, HEIGHT - 85)
    glowGrad.addColorStop(0, 'rgba(41, 173, 255, 0)')
    glowGrad.addColorStop(0.5, 'rgba(41, 173, 255, 0.2)')
    glowGrad.addColorStop(1, 'rgba(255, 0, 68, 0.1)')
    ctx.fillStyle = glowGrad
    ctx.fillRect(0, HEIGHT - 115, WIDTH, 30)

    ctx.fillStyle = '#3a3d5a'
    ctx.fillRect(0, HEIGHT - 87, WIDTH, 2)
  }

  #drawDamageNumbers(ctx, mecha) {
    if (mecha.showDamage !== null) {
      mecha.damageTimer++
      const alpha = Math.max(0, 1 - mecha.damageTimer / 28)
      const offsetY = mecha.damageTimer * 2.2
      const offsetX = Math.sin(mecha.damageTimer * 0.3) * 5

      ctx.save()
      ctx.font = 'bold 20px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 8
      ctx.fillStyle = `rgba(255, 220, 80, ${alpha})`
      ctx.fillText(`-${mecha.showDamage}`, mecha.x + offsetX, mecha.y - mecha.height - offsetY - 10)
      ctx.restore()

      if (mecha.damageTimer >= 28) {
        mecha.showDamage = null
        mecha.damageTimer = 0
      }
    }
  }

  #drawImpactLines(ctx, freezeFrame) {
    ctx.save()
    ctx.strokeStyle = `rgba(255, 255, 255, ${freezeFrame / 10})`
    ctx.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const len = 40 + freezeFrame * 8
      ctx.beginPath()
      ctx.moveTo(WIDTH / 2 + Math.cos(angle) * 20, HEIGHT / 2 + Math.sin(angle) * 20)
      ctx.lineTo(WIDTH / 2 + Math.cos(angle) * len, HEIGHT / 2 + Math.sin(angle) * len)
      ctx.stroke()
    }
    ctx.restore()
  }

  #renderKO(ctx, game) {
    this.koRenderTick++
    const timer = game.koTimer
    const winner = game.winner === '1' ? game.p1 : game.p2
    const loser = game.winner === '1' ? game.p2 : game.p1

    const vignetteAlpha = Math.min(0.5, timer / 30)
    ctx.fillStyle = `rgba(0, 0, 0, ${vignetteAlpha})`
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    this.#drawBackground(ctx)
    this.#drawScene(ctx)

    if (game.slowMotion) {
      ctx.globalAlpha = 0.85
    }

    winner.draw(ctx)
    loser.draw(ctx)
    game.particles.draw(ctx)

    if (timer < 12) {
      const flashAlpha = Math.max(0, 1 - timer / 12)
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
    }

    if (timer < 20) {
      const borderAlpha = Math.max(0, (20 - timer) / 20 * 0.6)
      ctx.strokeStyle = `rgba(255, 0, 0, ${borderAlpha})`
      ctx.lineWidth = 8
      ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8)
    }

    if (timer > 30) {
      ctx.save()
      const centerX = winner.x
      const centerY = winner.y - winner.height / 2
      const zoomProgress = Math.min(1, (timer - 30) / 50)
      const easeZoom = zoomProgress * (2 - zoomProgress)
      const zoom = 1 + easeZoom * 0.5

      ctx.translate(WIDTH / 2, HEIGHT / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-centerX, -centerY)

      this.#drawBackground(ctx)
      this.#drawScene(ctx)
      winner.draw(ctx)
      loser.draw(ctx)
      game.particles.draw(ctx)

      ctx.restore()

      const koDelay = 35
      const koAlpha = timer > koDelay ? Math.min(1, (timer - koDelay) / 25) : 0
      if (koAlpha > 0) {
        ctx.save()
        ctx.font = 'bold 80px "Press Start 2P", monospace'
        ctx.textAlign = 'center'
        ctx.shadowColor = game.winner === '1' ? '#29adff' : '#ff0044'
        ctx.shadowBlur = 40
        ctx.fillStyle = `rgba(255, 220, 0, ${koAlpha})`
        ctx.fillText('K.O.', WIDTH / 2, HEIGHT / 2)

        const winDelay = 55
        const winAlpha = timer > winDelay ? Math.min(1, (timer - winDelay) / 20) : 0
        if (winAlpha > 0) {
          ctx.font = 'bold 26px "Press Start 2P", monospace'
          ctx.fillStyle = `rgba(255, 255, 255, ${winAlpha})`
          if (game.gameMode === 'story' && game.winner === '1') {
            if (game.storyVictory || game.storyLevel >= 5) {
              ctx.fillText('STORY CLEAR!', WIDTH / 2, HEIGHT / 2 + 55)
            } else {
              ctx.fillText(`LEVEL ${game.storyLevel} CLEAR`, WIDTH / 2, HEIGHT / 2 + 55)
            }
          } else if (game.gameMode === 'story' && game.winner === '2') {
            ctx.fillText('GAME OVER', WIDTH / 2, HEIGHT / 2 + 55)
          } else {
            ctx.fillText(`PLAYER ${game.winner} WINS`, WIDTH / 2, HEIGHT / 2 + 55)
          }
        }

        const restartDelay = 80
        const restartAlpha = timer > restartDelay ? Math.min(1, (timer - restartDelay) / 15) : 0
        if (restartAlpha > 0) {
          ctx.font = '11px "Press Start 2P", monospace'
          ctx.fillStyle = `rgba(160, 160, 180, ${restartAlpha})`
          ctx.fillText('按 R 或点击下方按钮', WIDTH / 2, HEIGHT / 2 + 90)
        }

        ctx.restore()
      }
    }
  }

  #updateHUD(game) {
    this.hpP1.style.width = `${(game.p1.displayHp / game.p1.maxHp) * 100}%`
    this.hpP2.style.width = `${(game.p2.displayHp / game.p2.maxHp) * 100}%`

    if (game.status === 'ko') {
      this.message.classList.remove('hidden')
      this.storyMessage.classList.add('hidden')
      this.winnerId.textContent = game.winner
    } else {
      this.message.classList.add('hidden')
    }

    if (game.gameMode === 'story') {
      this.levelTag.classList.remove('hidden')
      this.levelTag.textContent = `LV.${game.storyLevel}`
    } else {
      this.levelTag.classList.add('hidden')
    }

    if (this.topBar) {
      if (game.status === 'menu') {
        this.topBar.style.display = 'flex'
        this.startBtn.textContent = game.gameMode === 'story' ? 'STORY' : 'START'
        this.modeSelect.textContent = game.gameMode === 'vs' ? 'VS MODE' : 'STORY MODE'
      } else if (game.status === 'ko') {
        this.topBar.style.display = 'flex'
        this.modeSelect.classList.add('hidden')
        this.startBtn.textContent = 'RESTART'
      } else if (game.status === 'countdown') {
        this.topBar.style.display = 'none'
      } else {
        this.topBar.style.display = 'none'
      }
    }

    if (this.pauseOverlay) {
      if (game.status === 'paused') {
        this.pauseOverlay.classList.remove('hidden')
      } else {
        this.pauseOverlay.classList.add('hidden')
      }
    }

    const controlBtns = document.querySelectorAll('.control-btn')
    controlBtns.forEach(btn => {
      btn.style.opacity = game.status === 'menu' ? '1' : (game.status === 'ko' ? '0.3' : '1')
      btn.style.pointerEvents = game.status !== 'ko' ? 'auto' : 'none'
    })
  }
}