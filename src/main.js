import { Game } from './game.js'
import { Renderer } from './renderer.js'

const input = {
  pressed: {},
}

window.addEventListener('keydown', (e) => {
  input.pressed[e.code] = true
})

window.addEventListener('keyup', (e) => {
  input.pressed[e.code] = false
})

let mobileControlledPlayer = 'p1'
const mobileKeyMap = {
  p1: { left: 'KeyA', right: 'KeyD', up: 'KeyW', attack: 'KeyJ', guard: 'KeyK' },
  p2: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', attack: 'Digit1', guard: 'Digit2' },
}

function setMobileKey(action, pressed) {
  const keys = mobileKeyMap[mobileControlledPlayer]
  if (keys && keys[action]) {
    input.pressed[keys[action]] = pressed
  }
}

const joystickZone = document.getElementById('joystick-zone')
const joystickStick = document.getElementById('joystick-stick')
let joystickActive = false
let joystickTouchId = null
const joystickMaxDist = 45

function resetJoystick() {
  joystickActive = false
  joystickTouchId = null
  joystickStick.style.transform = 'translate(-50%, -50%)'
  setMobileKey('left', false)
  setMobileKey('right', false)
}

function handleJoystickMove(touch) {
  const rect = joystickZone.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = touch.clientX - centerX
  const dy = touch.clientY - centerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const clampedDist = Math.min(dist, joystickMaxDist)
  const angle = Math.atan2(dy, dx)
  const stickX = Math.cos(angle) * clampedDist
  const stickY = Math.sin(angle) * clampedDist
  joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`
  const threshold = 15
  if (dx < -threshold) {
    setMobileKey('left', true)
    setMobileKey('right', false)
  } else if (dx > threshold) {
    setMobileKey('right', true)
    setMobileKey('left', false)
  } else {
    setMobileKey('left', false)
    setMobileKey('right', false)
  }
}

joystickZone.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (joystickActive) return
  const touch = e.changedTouches[0]
  joystickActive = true
  joystickTouchId = touch.identifier
  handleJoystickMove(touch)
}, { passive: false })

joystickZone.addEventListener('touchmove', (e) => {
  e.preventDefault()
  if (!joystickActive) return
  for (const touch of e.changedTouches) {
    if (touch.identifier === joystickTouchId) {
      handleJoystickMove(touch)
      break
    }
  }
}, { passive: false })

function handleJoystickEnd(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier === joystickTouchId) {
      resetJoystick()
      break
    }
  }
}

joystickZone.addEventListener('touchend', handleJoystickEnd)
joystickZone.addEventListener('touchcancel', handleJoystickEnd)

const btnJump = document.getElementById('btn-jump')
const btnAttack = document.getElementById('btn-attack')
const btnGuard = document.getElementById('btn-guard')

function setupActionButton(btn, action) {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault()
    setMobileKey(action, true)
    btn.style.transform = 'scale(0.88)'
  }, { passive: false })
  btn.addEventListener('touchend', (e) => {
    e.preventDefault()
    setMobileKey(action, false)
    btn.style.transform = ''
  }, { passive: false })
  btn.addEventListener('touchcancel', (e) => {
    e.preventDefault()
    setMobileKey(action, false)
    btn.style.transform = ''
  }, { passive: false })
}

setupActionButton(btnJump, 'up')
setupActionButton(btnAttack, 'attack')
setupActionButton(btnGuard, 'guard')

const switchBtn = document.getElementById('mobile-switch')
switchBtn.addEventListener('click', () => {
  setMobileKey('left', false)
  setMobileKey('right', false)
  setMobileKey('up', false)
  setMobileKey('attack', false)
  setMobileKey('guard', false)
  mobileControlledPlayer = mobileControlledPlayer === 'p1' ? 'p2' : 'p1'
  switchBtn.textContent = `CONTROL: ${mobileControlledPlayer.toUpperCase()}`
})

const canvas = document.getElementById('game-canvas')
const game = new Game()
const renderer = new Renderer(canvas)

const btnP1 = document.getElementById('mode-p1')
const btnP2 = document.getElementById('mode-p2')
const startBtn = document.getElementById('start-btn')
const modeSelect = document.getElementById('mode-select')
const resumeBtn = document.getElementById('resume-btn')
const restartPauseBtn = document.getElementById('restart-pause-btn')
const quitBtn = document.getElementById('quit-btn')
const mobilePauseBtn = document.getElementById('mobile-pause')

function toggleMode(player, btn) {
  const current = player === 'p1' ? game.p1Mode : game.p2Mode
  const newMode = current === 'player' ? 'ai' : 'player'
  game.setMode(player, newMode)
  btn.textContent = newMode.toUpperCase()
  btn.classList.toggle('ai', newMode === 'ai')
}

btnP1.addEventListener('click', () => toggleMode('p1', btnP1))
btnP2.addEventListener('click', () => toggleMode('p2', btnP2))

modeSelect.addEventListener('click', () => {
  const newMode = game.gameMode === 'vs' ? 'story' : 'vs'
  game.setGameMode(newMode)
  modeSelect.textContent = newMode === 'vs' ? 'VS MODE' : 'STORY MODE'
  startBtn.textContent = newMode === 'vs' ? 'START' : 'STORY'
  modeSelect.classList.remove('hidden')
})

startBtn.addEventListener('click', () => {
  if (game.status === 'ko') {
    game.restart()
  } else {
    game.start()
  }
})

resumeBtn.addEventListener('click', () => {
  game.resume()
})

restartPauseBtn.addEventListener('click', () => {
  game.restart()
})

quitBtn.addEventListener('click', () => {
  game.restart()
})

mobilePauseBtn.addEventListener('click', () => {
  if (game.status === 'playing') {
    game.pause()
  } else if (game.status === 'paused') {
    game.resume()
  }
})

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (game.status === 'playing') {
      game.pause()
    } else if (game.status === 'paused') {
      game.resume()
    }
  }
})

let updateCounter = 0
let koHandled = false

function loop() {
  updateCounter++

  if (game.slowMotion) {
    if (updateCounter % 3 === 0) {
      game.update(input)
    } else {
      game.particles.update()
    }
  } else {
    game.update(input)
  }

  if (game.status === 'ko' && !koHandled) {
    koHandled = true
    if (game.gameMode === 'story' && game.winner === '1') {
      setTimeout(() => {
        game.advanceStory()
        koHandled = false
      }, 2500)
    }
  }
  if (game.status !== 'ko') {
    koHandled = false
  }

  renderer.render(game)
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
