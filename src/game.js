import { Mecha, STATES } from './mecha.js'
import { ParticleSystem } from './particles.js'
import { AIController } from './ai.js'

const GROUND_Y = 430
const WORLD_LEFT = 40
const WORLD_RIGHT = 920

const KEY_P1 = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  attack: 'KeyJ',
  guard: 'KeyK',
}

const KEY_P2 = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  attack: 'Digit1',
  guard: 'Digit2',
}

const STORY_BOSSES = [
  { level: 1, hp: 300, damage: 10, speedMult: 1.0, type: 'light', scale: 1.0 },
  { level: 2, hp: 450, damage: 12, speedMult: 1.05, type: 'light', scale: 1.15 },
  { level: 3, hp: 600, damage: 14, speedMult: 1.1, type: 'heavy', scale: 1.3 },
  { level: 4, hp: 800, damage: 16, speedMult: 1.15, type: 'heavy', scale: 1.5 },
  { level: 5, hp: 1000, damage: 18, speedMult: 1.2, type: 'light', scale: 1.7 },
]

export class Game {
  constructor() {
    this.particles = new ParticleSystem()
    this.bounds = { left: WORLD_LEFT, right: WORLD_RIGHT }
    this.p1Mode = 'player'
    this.p2Mode = 'player'
    this.tick = 0
    this.gameMode = 'vs'
    this.storyLevel = 1
    this.storyTransitionTimer = 0
    this.storyVictory = false
    this.reset()
  }

  reset() {
    this.status = 'menu'
    this.winner = null
    this.cameraShake = 0
    this.particles.particles = []
    this.tick = 0
    this.koTimer = 0
    this.koPhase = null
    this.slowMotion = false
    this.freezeFrame = 0
    this.storyTransitionTimer = 0
    this.storyVictory = false

    this.p1 = new Mecha({
      id: 'p1',
      x: 240,
      y: GROUND_Y,
      type: 'heavy',
      keys: KEY_P1,
      facing: 1,
    })

    const p2Type = this.gameMode === 'story' && STORY_BOSSES[this.storyLevel - 1]
      ? STORY_BOSSES[this.storyLevel - 1].type
      : 'light'

    this.p2 = new Mecha({
      id: 'p2',
      x: 720,
      y: GROUND_Y,
      type: p2Type,
      keys: KEY_P2,
      facing: -1,
    })

    if (this.gameMode === 'story') {
      const boss = STORY_BOSSES[this.storyLevel - 1]
      if (boss) {
        this.p2.maxHp = boss.hp
        this.p2.hp = boss.hp
        this.p2.displayHp = boss.hp
        this.p2.damage = boss.damage
        this.p2.speed *= boss.speedMult
        this.p2.width *= boss.scale
        this.p2.height *= boss.scale
        this.p2.groundY = GROUND_Y
        this.p2.y = GROUND_Y
        this.p2.attackReach *= boss.scale
        this.p2.jumpForce *= (2 - boss.scale * 0.5)
        this.p2.bossScale = boss.scale
      }
      this.p2Mode = 'ai'
    }

    this.aiP1 = new AIController(this.p1, this.p2)
    this.aiP2 = new AIController(this.p2, this.p1)
  }

  start() {
    this.status = 'countdown'
    this.tick = 0
    this.countdownTimer = 0
    this.countdownDuration = 180 // 3秒
  }

  pause() {
    if (this.status === 'playing') {
      this.status = 'paused'
    }
  }

  resume() {
    if (this.status === 'paused') {
      this.status = 'playing'
    }
  }

  restart() {
    if (this.gameMode === 'story') {
      this.storyLevel = 1
      this.storyVictory = false
    }
    this.reset()
  }

  setMode(player, mode) {
    if (player === 'p1') this.p1Mode = mode
    if (player === 'p2') this.p2Mode = mode
  }

  setGameMode(mode) {
    this.gameMode = mode
    this.storyLevel = 1
    this.storyVictory = false
    this.reset()
  }

  update(input) {
    this.tick++

    if (this.status === 'menu') {
      this.particles.update()
      return
    }

    if (this.status === 'countdown') {
      this.countdownTimer++
      this.particles.update()
      this.p1.update(this.bounds)
      this.p2.update(this.bounds)
      if (this.countdownTimer >= this.countdownDuration) {
        this.status = 'playing'
        this.readyTimer = 0
      }
      return
    }

    if (this.status === 'paused') {
      return
    }

    if (this.status === 'story_transition') {
      this.storyTransitionTimer--
      this.particles.update()
      if (this.storyTransitionTimer <= 0) {
        this.reset()
        this.start()
      }
      return
    }

    if (this.status === 'ko') {
      this.koTimer++
      if (this.slowMotion && this.koTimer > 60) {
        this.slowMotion = false
        this.koPhase = 'pose'
      }
      if (input.pressed['KeyR']) {
        this.restart()
      }
      this.particles.update()
      this.#decayShake()
      return
    }

    if (this.freezeFrame > 0) {
      this.freezeFrame--
      this.particles.update()
      return
    }

    this.#handleRegeneration()

    if (this.p1Mode === 'player') {
      this.p1.handleInput(input.pressed)
    } else {
      const aiInput = this.aiP1.update()
      if (aiInput) this.p1.handleInput(aiInput)
    }

    if (this.p2Mode === 'player') {
      this.p2.handleInput(input.pressed)
    } else {
      const aiInput = this.aiP2.update()
      if (aiInput) this.p2.handleInput(aiInput)
    }

    this.p1.update(this.bounds)
    this.p2.update(this.bounds)

    this.#resolvePush()
    const hitResult = this.#resolveCombat()
    if (hitResult) {
      this.freezeFrame = hitResult.freeze
    }

    this.particles.update()
    this.#decayShake()

    if (this.p1.hp <= 0 || this.p2.hp <= 0) {
      this.status = 'ko'
      this.winner = this.p1.hp <= 0 ? '2' : '1'
      this.koTimer = 0
      this.koPhase = 'impact'
      this.cameraShake = 20
      this.slowMotion = true
    }
  }

  advanceStory() {
    if (this.storyLevel < 5) {
      this.storyLevel++
      this.status = 'story_transition'
      this.storyTransitionTimer = 120
    } else {
      this.storyVictory = true
    }
  }

  #handleRegeneration() {
    if (this.tick % 600 === 0) {
      this.p1.hp = Math.min(this.p1.maxHp, this.p1.hp + 2)
      this.p2.hp = Math.min(this.p2.maxHp, this.p2.hp + 2)
    }
  }

  #resolvePush() {
    const dx = this.p2.x - this.p1.x
    const minDist = (this.p1.width + this.p2.width) / 2 + 2
    if (Math.abs(dx) < minDist) {
      const overlap = minDist - Math.abs(dx)
      const dir = dx >= 0 ? 1 : -1
      const push = overlap / 2
      this.p1.x -= dir * push
      this.p2.x += dir * push
    }
  }

  #resolveCombat() {
    const p1Hit = this.p1.getAttackHitbox()
    const p2Hit = this.p2.getAttackHitbox()
    let result = null

    if (p1Hit && this.#intersects(p1Hit, this.p2.getBodyBox())) {
      const dmg = this.p2.takeDamage(this.p1.damage, 1, this.particles)
      if (dmg > 0) {
        const freeze = this.p1.type === 'heavy' ? 8 : 4
        this.cameraShake = Math.max(this.cameraShake, this.p1.type === 'heavy' ? 10 : 6)
        this.p1.stateTimer = Math.max(this.p1.stateTimer, 4)
        this.p2.showDamage = dmg
        result = { freeze }
      }
    }

    if (p2Hit && this.#intersects(p2Hit, this.p1.getBodyBox())) {
      const dmg = this.p1.takeDamage(this.p2.damage, -1, this.particles)
      if (dmg > 0) {
        const freeze = this.p2.type === 'heavy' ? 8 : 4
        this.cameraShake = Math.max(this.cameraShake, this.p2.type === 'heavy' ? 10 : 6)
        this.p2.stateTimer = Math.max(this.p2.stateTimer, 4)
        this.p1.showDamage = dmg
        result = { freeze }
      }
    }

    return result
  }

  #intersects(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  #decayShake() {
    if (this.cameraShake > 0) {
      this.cameraShake *= 0.88
      if (this.cameraShake < 0.5) this.cameraShake = 0
    }
  }

  getShakeOffset() {
    if (this.cameraShake <= 0) return { x: 0, y: 0 }
    return {
      x: (Math.random() - 0.5) * this.cameraShake,
      y: (Math.random() - 0.5) * this.cameraShake,
    }
  }
}
