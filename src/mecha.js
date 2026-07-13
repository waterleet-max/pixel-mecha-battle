export const STATES = {
  IDLE: 'idle',
  MOVE: 'move',
  ATTACK: 'attack',
  ATTACK2: 'attack2',
  GUARD: 'guard',
  HIT: 'hit',
  DEAD: 'dead',
}

export class Mecha {
  constructor({ id, x, y, type, keys, facing = 1 }) {
    this.id = id
    this.type = type
    this.x = x
    this.y = y
    this.facing = facing
    this.keys = keys
    this.groundY = y
    this.onGround = true

    // Type-specific stats
    if (type === 'heavy') {
      this.width = 46
      this.height = 68
      this.speed = 2.4
      this.jumpForce = -8.0
      this.color = '#1a4a8a'
      this.accent = '#29adff'
      this.eyeColor = '#00e5ff'
      this.weaponColor = '#4a90d9'
      this.damage = 18
      this.attackReach = 54
      this.attackDuration = 18
      this.attackCooldownMax = 45
      this.guardColor = 'rgba(41, 173, 255, 0.5)'
    } else {
      this.width = 34
      this.height = 58
      this.speed = 3.8
      this.jumpForce = -10.0
      this.color = '#8a1a2e'
      this.accent = '#ff0044'
      this.eyeColor = '#ff5500'
      this.weaponColor = '#ff5577'
      this.damage = 10
      this.attackReach = 42
      this.attackDuration = 10
      this.attackCooldownMax = 24
      this.guardColor = 'rgba(255, 0, 68, 0.5)'
    }

    this.vx = 0
    this.vy = 0
    this.gravity = 0.45

    this.maxHp = 300
    this.hp = this.maxHp
    this.displayHp = this.maxHp
    this.hpDrain = 0
    this.hpDrainRate = 0.6
    this.state = STATES.IDLE
    this.stateTimer = 0
    this.attackCooldown = 0
    this.hitFlash = 0
    this.deadTimer = 0
    this.showDamage = null
    this.damageTimer = 0
    this.comboCount = 0
    this.animFrame = 0
  }

  reset(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.hp = this.maxHp
    this.displayHp = this.maxHp
    this.hpDrain = 0
    this.state = STATES.IDLE
    this.stateTimer = 0
    this.attackCooldown = 0
    this.hitFlash = 0
    this.deadTimer = 0
    this.showDamage = null
    this.damageTimer = 0
    this.comboCount = 0
    this.animFrame = 0
    this.onGround = true
  }

  handleInput(pressed) {
    if (this.state === STATES.DEAD || this.state === STATES.HIT) return

    const left = pressed.left !== undefined ? pressed.left : pressed[this.keys.left]
    const right = pressed.right !== undefined ? pressed.right : pressed[this.keys.right]
    const up = pressed.up !== undefined ? pressed.up : pressed[this.keys.up]
    const attack = pressed.attack !== undefined ? pressed.attack : pressed[this.keys.attack]
    const guard = pressed.guard !== undefined ? pressed.guard : pressed[this.keys.guard]

    if (this.attackCooldown > 0) this.attackCooldown--

    if (this.state === STATES.ATTACK || this.state === STATES.ATTACK2) {
      this.stateTimer--
      if (this.stateTimer <= 0) {
        this.state = STATES.IDLE
        this.vx *= 0.5
      }
      return
    }

    if (guard) {
      this.state = STATES.GUARD
      this.vx = 0
      return
    }

    if (attack && this.attackCooldown === 0 && this.onGround) {
      if (this.type === 'heavy') {
        this.state = STATES.ATTACK
        this.stateTimer = this.attackDuration
        this.attackCooldown = this.attackCooldownMax
        this.vx = this.facing * 5.5
        this.comboCount = 0
      } else {
        this.comboCount++
        if (this.comboCount > 3) this.comboCount = 1
        this.state = this.comboCount === 2 ? STATES.ATTACK2 : STATES.ATTACK
        this.stateTimer = this.attackDuration
        this.attackCooldown = this.attackCooldownMax
        this.vx = this.facing * (this.comboCount === 3 ? 6 : 3.5)
      }
      return
    }

    if (left || right) {
      this.state = STATES.MOVE
      this.facing = right ? 1 : -1
      this.vx = this.facing * this.speed
    } else {
      this.state = STATES.IDLE
      this.vx = 0
      this.comboCount = 0
    }

    if (up && this.onGround) {
      this.vy = this.jumpForce
      this.onGround = false
    }
  }

  update(bounds) {
    this.animFrame++

    if (!this.onGround && this.state !== STATES.HIT && this.state !== STATES.DEAD) {
      if (this.animFrame % 60 === 0) {
        this.hp = Math.min(this.maxHp, this.hp + 1)
        if (this.displayHp < this.hp) {
          this.displayHp = Math.min(this.maxHp, this.displayHp + 1)
        }
      }
    }

    if (this.hpDrain > 0) {
      const drain = Math.min(this.hpDrain, this.hpDrainRate)
      this.hp = Math.max(0, this.hp - drain)
      this.hpDrain -= drain
    }
    if (this.displayHp > this.hp) {
      this.displayHp -= 0.4
      if (this.displayHp < this.hp) this.displayHp = this.hp
    }

    if (this.state === STATES.DEAD) {
      this.deadTimer++
      this.vy += this.gravity
      this.y += this.vy
      if (this.y > this.groundY + 80) this.y = this.groundY + 80
      return
    }

    if (this.state === STATES.HIT) {
      this.stateTimer--
      this.hitFlash--
      this.vx *= 0.85
      this.vy += this.gravity
      this.x += this.vx
      this.y += this.vy
      if (this.y >= this.groundY) {
        this.y = this.groundY
        this.vy = 0
        this.onGround = true
      }
      if (this.stateTimer <= 0) this.state = STATES.IDLE
      return
    }

    this.vy += this.gravity
    this.x += this.vx
    this.y += this.vy

    if (this.y >= this.groundY) {
      this.y = this.groundY
      this.vy = 0
      this.onGround = true
    }

    if (this.x < bounds.left) this.x = bounds.left
    if (this.x > bounds.right) this.x = bounds.right

    if ((this.state === STATES.ATTACK || this.state === STATES.ATTACK2) && this.stateTimer > 0) {
      this.stateTimer--
      if (this.stateTimer <= 0) {
        this.state = STATES.IDLE
        this.vx *= 0.5
      }
    }
  }

  takeDamage(amount, fromDirection, particles) {
    if (this.state === STATES.DEAD) return 0

    let finalDamage = amount
    this.comboCount = 0

    if (this.state === STATES.GUARD) {
      finalDamage = Math.floor(amount * 0.2)
      particles.sparks(this.x + fromDirection * 20, this.y - 40, this.accent, 10)
      particles.sparks(this.x + fromDirection * 20, this.y - 50, '#ffffff', 6)
    } else {
      this.state = STATES.HIT
      this.stateTimer = 20
      this.hitFlash = 24
      this.vx = fromDirection * -6
      this.vy = -5
      this.onGround = false
      for (let i = 0; i < 12; i++) {
        particles.spawn(
          this.x + fromDirection * (8 + Math.random() * 16),
          this.y - 20 - Math.random() * 30,
          1, this.accent, 5, 3
        )
      }
      particles.sparks(this.x + fromDirection * 12, this.y - 35, '#ffffff', 18)
      particles.sparks(this.x + fromDirection * 12, this.y - 45, '#ffcc00', 8)
    }

    this.hpDrain += finalDamage
    this.showDamage = finalDamage
    this.damageTimer = 0

    if (this.hp - this.hpDrain <= 0) {
      this.hp = Math.max(0, this.hp - this.hpDrain)
      this.hpDrain = 0
      this.displayHp = this.hp
      this.state = STATES.DEAD
      this.vy = -6
      this.vx = fromDirection * -3
      particles.explosion(this.x, this.y - 35, this.accent, 45)
      particles.explosion(this.x, this.y - 55, '#ffffff', 25)
      particles.explosion(this.x, this.y - 20, '#ffcc00', 20)
    }
    return finalDamage
  }

  getAttackHitbox() {
    if (this.state !== STATES.ATTACK && this.state !== STATES.ATTACK2) return null
    const reach = this.type === 'heavy' ? 56 : 42
    const top = this.y - this.height + 8
    const bottom = this.y - 4
    return {
      x: this.facing === 1 ? this.x : this.x - reach,
      y: top,
      width: reach,
      height: bottom - top,
    }
  }

  getBodyBox() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      width: this.width,
      height: this.height,
    }
  }

  draw(ctx) {
    ctx.save()
    const bob = this.state === STATES.IDLE ? Math.sin(this.animFrame * 0.1) * 1.5 : 0
    const drawX = Math.floor(this.x)
    const drawY = Math.floor(this.y + bob)

    if (this.hitFlash > 0 && this.hitFlash % 4 < 2) {
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = '#ff4444'
    }

    if (this.state === STATES.DEAD) {
      this.#drawDead(ctx, drawX, drawY)
      ctx.restore()
      return
    }

    const scale = this.bossScale || 1

    ctx.save()
    ctx.translate(drawX, drawY)
    ctx.scale(scale, scale)
    ctx.translate(-drawX, -drawY)

    if (this.type === 'heavy') {
      this.#drawHeavyLego(ctx, drawX, drawY)
    } else {
      this.#drawLightLego(ctx, drawX, drawY)
    }

    ctx.restore()

    if (scale > 1) {
      this.#drawBossEffects(ctx, drawX, drawY, scale)
    }

    ctx.restore()
  }

  #drawBossEffects(ctx, x, y, scale) {
    const effectIntensity = (scale - 1) * 2
    ctx.save()
    ctx.globalCompositeOperation = 'screen'

    if (scale >= 1.3) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.15 * effectIntensity})`
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 20 * effectIntensity
      ctx.beginPath()
      ctx.arc(x, y - this.height / 2, 40 * scale, 0, Math.PI * 2)
      ctx.fill()
    }

    if (scale >= 1.5) {
      ctx.fillStyle = `rgba(255, 100, 0, ${0.1 * effectIntensity})`
      ctx.shadowColor = '#ff6400'
      ctx.shadowBlur = 30 * effectIntensity
      ctx.beginPath()
      ctx.arc(x, y - this.height / 2, 50 * scale, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // Lego stud helper - draws a 2x2 stud on top of a brick surface
  #drawStud(ctx, cx, cy, color, highlight) {
    // Stud base shadow
    ctx.fillStyle = this.#darken(color, 0.7)
    ctx.fillRect(cx - 3, cy - 1, 6, 2)
    // Stud body
    ctx.fillStyle = color
    ctx.fillRect(cx - 3, cy - 4, 6, 4)
    // Stud highlight
    ctx.fillStyle = highlight || this.#lighten(color, 1.3)
    ctx.fillRect(cx - 2, cy - 3, 4, 2)
  }

  // Lego brick helper - draws a brick with studs, bevels, and inner detail
  #drawBrick(ctx, x, y, w, h, color, studs = true) {
    const dark = this.#darken(color, 0.6)
    const light = this.#lighten(color, 1.25)
    const shadow = this.#darken(color, 0.4)

    // Main body
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)

    // Top bevel (light)
    ctx.fillStyle = light
    ctx.fillRect(x + 1, y, w - 2, 2)
    // Left bevel (light)
    ctx.fillRect(x, y + 1, 2, h - 2)

    // Bottom bevel (dark)
    ctx.fillStyle = dark
    ctx.fillRect(x + 1, y + h - 2, w - 2, 2)
    // Right bevel (dark)
    ctx.fillRect(x + w - 2, y + 1, 2, h - 2)

    // Inner detail ( Lego brick hollow look )
    ctx.fillStyle = shadow
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6)
    ctx.fillStyle = this.#darken(color, 0.8)
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8)

    // Studs on top
    if (studs && w >= 8) {
      const studCount = Math.floor(w / 8)
      for (let i = 0; i < studCount; i++) {
        const sx = x + 4 + i * 8
        this.#drawStud(ctx, sx, y, color, light)
      }
    }
  }

  // Heavy mecha - Lego bulky knight style
  #drawHeavyLego(ctx, drawX, drawY) {
    const f = this.facing
    const bodyColor = this.color
    const darkColor = this.#darken(this.color, 0.55)
    const accent = this.accent
    const weapon = this.weaponColor

    // Heavy legs - 2x4 brick style each
    const legOffset = this.state === STATES.MOVE ? Math.sin(this.animFrame * 0.35) * 5 : 0
    // Left leg
    this.#drawBrick(ctx, drawX - 18 - legOffset, drawY - 24, 14, 24, darkColor)
    // Right leg
    this.#drawBrick(ctx, drawX + 4 + legOffset, drawY - 24, 14, 24, darkColor)
    // Feet
    ctx.fillStyle = this.#darken(this.color, 0.35)
    ctx.fillRect(drawX - 20 - legOffset, drawY - 4, 18, 4)
    ctx.fillRect(drawX + 2 + legOffset, drawY - 4, 18, 4)

    // Torso - large 4x4 brick
    this.#drawBrick(ctx, drawX - 20, drawY - 56, 40, 32, bodyColor)
    // Chest plate accent brick
    this.#drawBrick(ctx, drawX - 12, drawY - 52, 24, 12, accent, false)
    // Core light
    ctx.fillStyle = '#fff'
    ctx.shadowColor = accent
    ctx.shadowBlur = 8
    ctx.fillRect(drawX - 4, drawY - 48, 8, 4)
    ctx.shadowBlur = 0

    // Shoulders - 2x2 bricks
    this.#drawBrick(ctx, drawX - 26, drawY - 56, 10, 14, darkColor)
    this.#drawBrick(ctx, drawX + 16, drawY - 56, 10, 14, darkColor)

    // Head - 2x3 brick with visor
    this.#drawBrick(ctx, drawX - 14, drawY - 74, 28, 20, bodyColor)
    // Helmet crest
    this.#drawBrick(ctx, drawX - 4, drawY - 80, 8, 6, accent, false)
    // Visor
    ctx.fillStyle = this.eyeColor
    ctx.shadowColor = this.eyeColor
    ctx.shadowBlur = 6
    ctx.fillRect(drawX + f * 4, drawY - 68, 10, 4)
    ctx.shadowBlur = 0
    // Side helmets
    this.#drawBrick(ctx, drawX - 18, drawY - 72, 4, 16, darkColor, false)
    this.#drawBrick(ctx, drawX + 14, drawY - 72, 4, 16, darkColor, false)

    // Weapon arm
    const armX = drawX + f * 22
    const armY = drawY - 48
    if (this.state === STATES.ATTACK) {
      const progress = (this.attackDuration - this.stateTimer) / this.attackDuration
      const swingAngle = f * (progress * Math.PI - Math.PI * 0.3)
      ctx.save()
      ctx.translate(drawX + f * 18, drawY - 44)
      ctx.rotate(swingAngle)
      // Giant Lego sword - built from stacked bricks
      this.#drawBrick(ctx, 0, -50, f * 10, 48, weapon, false)
      ctx.fillStyle = '#fff'
      ctx.fillRect(f * 2, -46, f * 6, 40)
      ctx.fillStyle = accent
      ctx.fillRect(f * 1, -52, f * 8, 4)
      // Sword hilt
      this.#drawBrick(ctx, -2, -6, 6, 8, darkColor, false)
      ctx.restore()
    } else if (this.state === STATES.GUARD) {
      // Tower shield - large flat brick
      this.#drawBrick(ctx, drawX + f * 14, drawY - 66, f * 16, 56, this.#alpha(accent, 0.5), false)
      ctx.strokeStyle = accent
      ctx.lineWidth = 2
      ctx.strokeRect(drawX + f * 14, drawY - 66, f * 16, 56)
      // Shield emblem
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(drawX + f * 22, drawY - 38, 5, 0, Math.PI * 2)
      ctx.fill()
      // Arm holding shield
      this.#drawBrick(ctx, armX - 5, armY - 2, 10, 16, darkColor, false)
    } else {
      // Idle sword hold
      const armSwing = this.state === STATES.MOVE ? Math.sin(this.animFrame * 0.35) * 3 : Math.sin(this.animFrame * 0.08) * 1.5
      this.#drawBrick(ctx, armX - 5, armY + armSwing, 10, 18, darkColor, false)
      // Sword resting on shoulder
      this.#drawBrick(ctx, drawX + f * 22, drawY - 58, f * 8, 36, weapon, false)
      ctx.fillStyle = '#fff'
      ctx.fillRect(drawX + f * 23, drawY - 56, f * 6, 32)
    }

    // Back arm
    const backArmX = drawX - f * 16
    this.#drawBrick(ctx, backArmX - 4, drawY - 46, 8, 14, darkColor, false)
  }

  // Light mecha - Lego sleek ninja style
  #drawLightLego(ctx, drawX, drawY) {
    const f = this.facing
    const bodyColor = this.color
    const darkColor = this.#darken(this.color, 0.55)
    const accent = this.accent
    const weapon = this.weaponColor

    // Slim legs - 1x3 bricks
    const legOffset = this.state === STATES.MOVE ? Math.sin(this.animFrame * 0.5) * 6 : 0
    this.#drawBrick(ctx, drawX - 10 - legOffset, drawY - 20, 8, 20, darkColor)
    this.#drawBrick(ctx, drawX + 2 + legOffset, drawY - 20, 8, 20, darkColor)

    // Torso - 3x3 brick
    this.#drawBrick(ctx, drawX - 14, drawY - 48, 28, 28, bodyColor)
    // Chest stripe
    this.#drawBrick(ctx, drawX - 10, drawY - 44, 20, 4, accent, false)
    this.#drawBrick(ctx, drawX - 8, drawY - 40, 16, 2, accent, false)

    // Head - sleek 2x2 brick
    this.#drawBrick(ctx, drawX - 10, drawY - 62, 20, 16, bodyColor)
    // Ear fins - triangular plates
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(drawX - 14, drawY - 58)
    ctx.lineTo(drawX - 18, drawY - 52)
    ctx.lineTo(drawX - 14, drawY - 48)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(drawX + 14, drawY - 58)
    ctx.lineTo(drawX + 18, drawY - 52)
    ctx.lineTo(drawX + 14, drawY - 48)
    ctx.fill()
    // Eye visor
    ctx.fillStyle = this.eyeColor
    ctx.shadowColor = this.eyeColor
    ctx.shadowBlur = 8
    ctx.fillRect(drawX + f * 2, drawY - 58, 12, 3)
    ctx.shadowBlur = 0

    // Dual blades
    const armX = drawX + f * 14
    const armY = drawY - 38
    if (this.state === STATES.ATTACK || this.state === STATES.ATTACK2) {
      const progress = (this.attackDuration - this.stateTimer) / this.attackDuration
      const isSecond = this.state === STATES.ATTACK2
      const swingAngle = f * (progress * Math.PI * 1.2 - Math.PI * 0.2 + (isSecond ? 0.5 : 0))
      ctx.save()
      ctx.translate(drawX + f * 10, drawY - 36)
      ctx.rotate(swingAngle)
      // Primary blade - thin plate
      this.#drawBrick(ctx, 0, -32, f * 6, 36, weapon, false)
      ctx.fillStyle = '#fff'
      ctx.fillRect(f * 1, -30, f * 4, 32)
      ctx.fillStyle = accent
      ctx.fillRect(f * 0.5, -34, f * 5, 3)
      ctx.restore()

      // Secondary blade
      ctx.save()
      ctx.translate(drawX - f * 6, drawY - 36)
      ctx.rotate(-swingAngle * 0.7)
      this.#drawBrick(ctx, 0, -24, f * 5, 28, weapon, false)
      ctx.fillStyle = '#fff'
      ctx.fillRect(f * 0.5, -22, f * 4, 24)
      ctx.restore()

      // Afterimage trail
      if (progress < 0.5) {
        ctx.fillStyle = this.#alpha(accent, 0.25)
        ctx.fillRect(drawX + f * (8 + progress * 20), drawY - 42, f * 12, 8)
      }
    } else if (this.state === STATES.GUARD) {
      // Energy shield
      ctx.fillStyle = this.guardColor
      ctx.beginPath()
      ctx.arc(drawX, drawY - 32, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = accent
      ctx.lineWidth = 2
      ctx.stroke()
      // Crossed blades
      ctx.save()
      ctx.translate(drawX, drawY - 34)
      ctx.rotate(f * 0.4)
      this.#drawBrick(ctx, -2, -20, 4, 22, weapon, false)
      ctx.rotate(-f * 0.8)
      this.#drawBrick(ctx, -2, -20, 4, 22, weapon, false)
      ctx.restore()
    } else {
      // Idle dual blades
      const armSwing = this.state === STATES.MOVE ? Math.sin(this.animFrame * 0.5) * 5 : Math.sin(this.animFrame * 0.12) * 2
      this.#drawBrick(ctx, armX - 3, armY + armSwing, 6, 14, darkColor, false)
      this.#drawBrick(ctx, drawX - f * 10, armY + armSwing, 6, 14, darkColor, false)
      // Blades at rest
      this.#drawBrick(ctx, drawX + f * 16, drawY - 52, f * 5, 28, weapon, false)
      this.#drawBrick(ctx, drawX - f * 10, drawY - 48, -f * 4, 24, weapon, false)
      ctx.fillStyle = '#fff'
      ctx.fillRect(drawX + f * 17, drawY - 50, f * 3, 24)
      ctx.fillRect(drawX - f * 9, drawY - 46, -f * 3, 20)
    }
  }

  #drawDead(ctx, x, y) {
    if (this.type === 'heavy') {
      const bodyColor = this.color
      const darkColor = this.#darken(this.color, 0.55)
      this.#drawBrick(ctx, x - 20, y - 26, 40, 16, bodyColor, false)
      this.#drawBrick(ctx, x - 16, y - 10, 12, 8, darkColor, false)
      this.#drawBrick(ctx, x + 4, y - 10, 12, 8, darkColor, false)
      this.#drawBrick(ctx, x - 12, y - 22, 24, 4, this.accent, false)
      // Sword on ground
      this.#drawBrick(ctx, x + 12, y - 12, 8, 32, this.weaponColor, false)
    } else {
      const bodyColor = this.color
      const darkColor = this.#darken(this.color, 0.55)
      this.#drawBrick(ctx, x - 14, y - 20, 28, 12, bodyColor, false)
      this.#drawBrick(ctx, x - 10, y - 8, 8, 6, darkColor, false)
      this.#drawBrick(ctx, x + 2, y - 8, 8, 6, darkColor, false)
      this.#drawBrick(ctx, x - 8, y - 16, 16, 3, this.accent, false)
      // Blade on ground
      this.#drawBrick(ctx, x - 18, y - 6, 4, 22, this.weaponColor, false)
    }
  }

  #darken(hex, factor) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.floor(((num >> 16) & 0xff) * factor)
    const g = Math.floor(((num >> 8) & 0xff) * factor)
    const b = Math.floor((num & 0xff) * factor)
    return `rgb(${r},${g},${b})`
  }

  #lighten(hex, factor) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.floor(((num >> 16) & 0xff) * factor))
    const g = Math.min(255, Math.floor(((num >> 8) & 0xff) * factor))
    const b = Math.min(255, Math.floor((num & 0xff) * factor))
    return `rgb(${r},${g},${b})`
  }

  #alpha(hex, alpha) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) & 0xff
    const g = (num >> 8) & 0xff
    const b = num & 0xff
    return `rgba(${r},${g},${b},${alpha})`
  }
}
