export class AIController {
  constructor(mecha, enemy) {
    this.mecha = mecha
    this.enemy = enemy
    this.state = 'idle'
    this.timer = 0
    this.decisionTimer = 0
    this.decisionInterval = mecha.type === 'heavy' ? 18 : 14
    this.dodgeTimer = 0
    this.attackCooldown = 0
    this.lastDirection = 1
    this.moveTimer = 0
    this.jumpTimer = 0

    // Memory system for learning enemy patterns
    this.memory = []
    this.maxMemory = 40
    this.patternCache = null
    this.patternConfidence = 0

    // Strategy weights (learned over time)
    this.strategyWeights = {
      aggressive: 0.5,
      defensive: 0.5,
      evasive: 0.5,
    }

    // Battle statistics
    this.battleStats = {
      hitsLanded: 0,
      hitsTaken: 0,
      successfulDodges: 0,
      failedAttacks: 0,
    }

    // Prediction
    this.predictedEnemyAction = null
    this.predictionConfidence = 0
  }

  update() {
    if (this.mecha.state === 'dead' || this.mecha.state === 'hit') return

    this.decisionTimer++
    this.timer++
    if (this.attackCooldown > 0) this.attackCooldown--
    if (this.dodgeTimer > 0) this.dodgeTimer--
    if (this.jumpTimer > 0) this.jumpTimer--

    // Record enemy behavior every frame
    this.#recordMemory()

    // Analyze patterns periodically
    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0
      this.#analyzePatterns()
      this.#predictEnemyAction()
      this.#makeDecision()
    }

    const input = {
      left: false,
      right: false,
      up: false,
      attack: false,
      guard: false,
    }

    const distToEnemy = Math.abs(this.enemy.x - this.mecha.x)
    const attackRange = this.mecha.type === 'heavy' ? 62 : 48
    const idealRange = this.mecha.type === 'heavy' ? 55 : 65

    switch (this.state) {
      case 'idle':
        if (distToEnemy > idealRange + 30) {
          this.state = 'approach'
          this.moveTimer = 0
        } else if (distToEnemy < attackRange - 10) {
          this.state = 'retreat'
          this.moveTimer = 0
        }
        break

      case 'approach':
        this.moveTimer++
        if (this.enemy.x > this.mecha.x) {
          input.right = true
          this.mecha.facing = 1
          this.lastDirection = 1
        } else {
          input.left = true
          this.mecha.facing = -1
          this.lastDirection = -1
        }
        if (distToEnemy <= idealRange) {
          this.state = 'idle'
        } else if (distToEnemy <= attackRange) {
          input.attack = true
          this.state = 'idle'
        }
        if (this.moveTimer > 40 && Math.random() < 0.12) {
          this.state = 'idle'
        }
        break

      case 'retreat':
        this.moveTimer++
        if (this.enemy.x > this.mecha.x) {
          input.left = true
          this.mecha.facing = -1
          this.lastDirection = -1
        } else {
          input.right = true
          this.mecha.facing = 1
          this.lastDirection = 1
        }
        if (distToEnemy >= idealRange) {
          this.state = 'idle'
        }
        if (this.moveTimer > 30 && Math.random() < 0.18) {
          this.state = 'idle'
        }
        break

      case 'strafe':
        this.moveTimer++
        if (this.strafeDirection === 1) {
          input.right = true
          this.mecha.facing = this.enemy.x > this.mecha.x ? 1 : -1
        } else {
          input.left = true
          this.mecha.facing = this.enemy.x > this.mecha.x ? 1 : -1
        }
        if (this.moveTimer > 30) {
          this.state = 'idle'
        }
        break

      case 'attack':
        input.attack = true
        this.state = 'idle'
        break

      case 'guard':
        input.guard = true
        if (this.timer > 25) {
          this.state = 'idle'
          this.timer = 0
        }
        break

      case 'dodge':
        input.up = true
        this.jumpTimer = 15
        if (this.enemy.x > this.mecha.x) {
          input.left = true
          this.mecha.facing = -1
        } else {
          input.right = true
          this.mecha.facing = 1
        }
        if (this.dodgeTimer <= 0) {
          this.state = 'idle'
        }
        break

      case 'jump_attack':
        input.up = true
        this.jumpTimer = 10
        if (this.moveTimer < 10) {
          if (this.enemy.x > this.mecha.x) {
            input.right = true
            this.mecha.facing = 1
          } else {
            input.left = true
            this.mecha.facing = -1
          }
        } else {
          input.attack = true
          this.state = 'idle'
        }
        this.moveTimer++
        break

      case 'bait':
        // Pretend to retreat, then counter-attack
        this.moveTimer++
        if (this.enemy.x > this.mecha.x) {
          input.left = true
        } else {
          input.right = true
        }
        if (this.moveTimer > 15 && distToEnemy < attackRange + 10) {
          input.attack = true
          this.state = 'idle'
        } else if (this.moveTimer > 35) {
          this.state = 'idle'
        }
        break
    }

    return input
  }

  // Record a snapshot of enemy behavior
  #recordMemory() {
    const snapshot = {
      state: this.enemy.state,
      x: this.enemy.x,
      facing: this.enemy.facing,
      hp: this.enemy.hp,
      dist: Math.abs(this.enemy.x - this.mecha.x),
      tick: this.timer,
    }
    this.memory.push(snapshot)
    if (this.memory.length > this.maxMemory) {
      this.memory.shift()
    }
  }

  // Analyze enemy behavior patterns
  #analyzePatterns() {
    if (this.memory.length < 10) return

    const recent = this.memory.slice(-15)
    const states = recent.map(m => m.state)

    // Pattern 1: Attack-after-approach (enemy approaches then attacks)
    let approachAttackCount = 0
    for (let i = 2; i < states.length; i++) {
      if (states[i - 2] === 'move' && states[i - 1] === 'move' && states[i] === 'attack') {
        approachAttackCount++
      }
    }

    // Pattern 2: Defensive when low HP
    const lowHpDefend = recent.filter(m => m.hp < m.maxHp * 0.4 && m.state === 'guard').length
    const lowHpTotal = recent.filter(m => m.hp < m.maxHp * 0.4).length

    // Pattern 3: Attack frequency
    const attackCount = states.filter(s => s === 'attack' || s === 'attack2').length
    const attackRate = attackCount / states.length

    // Pattern 4: Jump/dodge pattern
    let dodgeAfterAttack = 0
    for (let i = 1; i < states.length; i++) {
      if ((states[i - 1] === 'attack' || states[i - 1] === 'attack2') && states[i] === 'hit') {
        dodgeAfterAttack++
      }
    }

    this.patternCache = {
      approachThenAttack: approachAttackCount,
      lowHpDefendRate: lowHpTotal > 0 ? lowHpDefend / lowHpTotal : 0,
      attackRate,
      counterAttackRate: dodgeAfterAttack,
    }
    this.patternConfidence = Math.min(1, this.memory.length / this.maxMemory)
  }

  // Predict what enemy will do next
  #predictEnemyAction() {
    if (!this.patternCache || this.memory.length < 10) {
      this.predictedEnemyAction = 'unknown'
      this.predictionConfidence = 0.2
      return
    }

    const dist = Math.abs(this.enemy.x - this.mecha.x)
    const enemyHpRatio = this.enemy.hp / this.enemy.maxHp
    const recentState = this.enemy.state

    let predictions = []

    // Based on distance
    if (dist < 60) {
      predictions.push({ action: 'attack', prob: 0.4 })
      predictions.push({ action: 'guard', prob: 0.25 })
      predictions.push({ action: 'dodge', prob: 0.2 })
      predictions.push({ action: 'retreat', prob: 0.15 })
    } else if (dist < 120) {
      predictions.push({ action: 'approach', prob: 0.5 })
      predictions.push({ action: 'attack', prob: 0.2 })
      predictions.push({ action: 'strafe', prob: 0.15 })
      predictions.push({ action: 'guard', prob: 0.15 })
    } else {
      predictions.push({ action: 'approach', prob: 0.7 })
      predictions.push({ action: 'jump_attack', prob: 0.2 })
      predictions.push({ action: 'strafe', prob: 0.1 })
    }

    // Adjust based on patterns
    if (this.patternCache.approachThenAttack >= 2) {
      const approach = predictions.find(p => p.action === 'approach')
      if (approach) approach.prob += 0.15
    }

    if (this.patternCache.lowHpDefendRate > 0.5 && enemyHpRatio < 0.4) {
      const guard = predictions.find(p => p.action === 'guard')
      if (guard) guard.prob += 0.25
      const retreat = predictions.find(p => p.action === 'retreat')
      if (retreat) retreat.prob += 0.15
    }

    if (this.patternCache.attackRate > 0.4) {
      const attack = predictions.find(p => p.action === 'attack')
      if (attack) attack.prob += 0.15
    }

    // Adjust based on recent state
    if (recentState === 'attack' || recentState === 'attack2') {
      // Enemy just attacked, likely to guard or retreat
      predictions.forEach(p => {
        if (p.action === 'guard') p.prob += 0.2
        if (p.action === 'dodge') p.prob += 0.15
        if (p.action === 'attack') p.prob -= 0.2
      })
    } else if (recentState === 'guard') {
      // Enemy was guarding, likely to attack or move
      predictions.forEach(p => {
        if (p.action === 'attack') p.prob += 0.15
        if (p.action === 'approach') p.prob += 0.1
        if (p.action === 'guard') p.prob -= 0.3
      })
    } else if (recentState === 'move') {
      // Enemy is moving, likely approaching to attack
      predictions.forEach(p => {
        if (p.action === 'attack') p.prob += 0.1
        if (p.action === 'approach') p.prob += 0.1
      })
    }

    // Normalize probabilities
    const total = predictions.reduce((sum, p) => sum + p.prob, 0)
    predictions.forEach(p => p.prob /= total)

    // Select highest probability
    predictions.sort((a, b) => b.prob - a.prob)
    this.predictedEnemyAction = predictions[0].action
    this.predictionConfidence = predictions[0].prob
  }

  #makeDecision() {
    const distToEnemy = Math.abs(this.enemy.x - this.mecha.x)
    const attackRange = this.mecha.type === 'heavy' ? 62 : 48
    const hpRatio = this.mecha.hp / this.mecha.maxHp
    const enemyHpRatio = this.enemy.hp / this.enemy.maxHp
    const prediction = this.predictedEnemyAction
    const confidence = this.predictionConfidence

    // Heavy mecha strategy
    if (this.mecha.type === 'heavy') {
      return this.#heavyDecision(distToEnemy, attackRange, hpRatio, enemyHpRatio, prediction, confidence)
    }

    // Light mecha strategy
    return this.#lightDecision(distToEnemy, attackRange, hpRatio, enemyHpRatio, prediction, confidence)
  }

  #heavyDecision(dist, attackRange, hpRatio, enemyHpRatio, prediction, confidence) {
    // Heavy: tanky, aggressive, punish predictably

    // If enemy predicted to attack and we're in range, punish with counter-attack
    if ((prediction === 'attack' || prediction === 'approach') && confidence > 0.45 && dist <= attackRange + 10) {
      if (Math.random() < 0.55) {
        this.state = 'attack'
        return
      }
    }

    // Predicted enemy attack -> guard
    if (prediction === 'attack' && confidence > 0.4 && dist < 90) {
      if (Math.random() < 0.45) {
        this.state = 'guard'
        this.timer = 0
        return
      }
    }

    // Predicted enemy guard -> bait and attack
    if (prediction === 'guard' && confidence > 0.45 && dist <= attackRange) {
      if (Math.random() < 0.5) {
        this.state = 'bait'
        this.moveTimer = 0
        return
      }
    }

    // Standard heavy logic
    if (dist <= attackRange) {
      if (hpRatio > 0.4 || enemyHpRatio < 0.3) {
        this.state = 'attack'
        return
      } else {
        this.state = 'guard'
        this.timer = 0
        return
      }
    }

    if (dist > attackRange + 25) {
      this.state = 'approach'
      this.moveTimer = 0
      return
    }

    if (hpRatio < 0.25) {
      this.state = 'guard'
      this.timer = 0
      return
    }

    if (Math.random() < 0.15) {
      this.state = 'guard'
      this.timer = 0
    } else {
      this.state = 'attack'
    }
  }

  #lightDecision(dist, attackRange, hpRatio, enemyHpRatio, prediction, confidence) {
    // Light: fast, evasive, exploit openings

    // High confidence prediction of enemy attack -> dodge
    if (prediction === 'attack' && confidence > 0.45 && dist < 90) {
      if (Math.random() < 0.65) {
        this.state = 'dodge'
        this.dodgeTimer = 25
        return
      } else if (Math.random() < 0.85) {
        this.state = 'guard'
        this.timer = 0
        return
      }
    }

    // Predicted enemy approach + dodge pattern -> prepare counter
    if (prediction === 'approach' && confidence > 0.5) {
      if (dist <= attackRange + 15 && Math.random() < 0.4) {
        this.state = 'jump_attack'
        this.moveTimer = 0
        return
      }
    }

    // Predicted enemy guard -> strafe to find opening
    if (prediction === 'guard' && confidence > 0.4 && dist <= attackRange + 20) {
      if (Math.random() < 0.45) {
        this.state = 'strafe'
        this.strafeDirection = Math.random() < 0.5 ? 1 : -1
        this.moveTimer = 0
        return
      }
    }

    // Predicted enemy retreat -> chase
    if (prediction === 'retreat' && confidence > 0.4) {
      this.state = 'approach'
      this.moveTimer = 0
      return
    }

    // Standard light logic
    if (dist <= attackRange) {
      const rand = Math.random()
      if (rand < 0.4) {
        this.state = 'attack'
        return
      } else if (rand < 0.6) {
        this.state = 'jump_attack'
        this.moveTimer = 0
        return
      } else if (rand < 0.8) {
        this.state = 'dodge'
        this.dodgeTimer = 25
        return
      }
    }

    if (dist > attackRange + 25) {
      if (Math.random() < 0.7) {
        this.state = 'approach'
        this.moveTimer = 0
        return
      } else {
        this.state = 'strafe'
        this.strafeDirection = Math.random() < 0.5 ? 1 : -1
        this.moveTimer = 0
        return
      }
    }

    if (dist < attackRange - 15) {
      if (Math.random() < 0.4) {
        this.state = 'retreat'
        this.moveTimer = 0
        return
      } else if (Math.random() < 0.7) {
        this.state = 'dodge'
        this.dodgeTimer = 25
        return
      }
    }

    if (hpRatio < 0.25) {
      if (Math.random() < 0.5) {
        this.state = 'guard'
        this.timer = 0
        return
      } else {
        this.state = 'retreat'
        this.moveTimer = 0
        return
      }
    }

    if (hpRatio > 0.7 && enemyHpRatio < 0.3 && Math.random() < 0.4) {
      this.state = 'attack'
      return
    }

    const rand = Math.random()
    if (rand < 0.12) {
      this.state = 'guard'
      this.timer = 0
    } else if (rand < 0.28) {
      this.state = 'attack'
    } else if (rand < 0.4) {
      this.state = 'jump_attack'
      this.moveTimer = 0
    } else if (rand < 0.5) {
      this.state = 'strafe'
      this.strafeDirection = Math.random() < 0.5 ? 1 : -1
      this.moveTimer = 0
    }
  }
}
