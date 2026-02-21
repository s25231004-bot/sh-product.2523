const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const themeToggle = document.getElementById('theme-toggle');
const joystickContainer = document.getElementById('joystick-container');
const joystickHandle = document.getElementById('joystick-handle');
const body = document.body;

// Game State
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameRunning = false;
let animationId;
let gameWidth, gameHeight;

// Control State
let lastShotTime = 0;
const fireRate = 150;

// Power-up State
let powerLevel = 1; // Number of bullet streams

// Joystick Logic
let joystickActive = false;
let joystickVector = { x: 0, y: 0 };
const joystickLimit = 60;

// Resize canvas
function resize() {
    const container = document.getElementById('game-container');
    gameWidth = container.clientWidth;
    gameHeight = container.clientHeight;
    canvas.width = gameWidth;
    canvas.height = gameHeight;
}
window.addEventListener('resize', resize);
resize();

// Player
const player = {
    x: 100,
    y: gameHeight / 2,
    width: 60,
    height: 40,
    speed: 12,
    color: '#ffeb3b',
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + this.height / 2);

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(this.width, 5);
        ctx.lineTo(0, this.height/2 + 5);
        ctx.fill();

        const shipGrad = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
        shipGrad.addColorStop(0, '#fff176');
        shipGrad.addColorStop(0.5, '#fbc02d');
        shipGrad.addColorStop(1, '#f57f17');
        
        ctx.fillStyle = shipGrad;
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.lineTo(this.width, 0);
        ctx.lineTo(0, this.height/2);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.ellipse(25, 0, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(22, -2, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (gameRunning) {
            const pulse = Math.sin(Date.now() / 50) * 5;
            const engineGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 + pulse);
            engineGrad.addColorStop(0, '#fff');
            engineGrad.addColorStop(0.4, '#00e5ff');
            engineGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = engineGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 15 + pulse, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },
    update() {
        if (joystickActive) {
            this.x += (joystickVector.x / joystickLimit) * this.speed;
            this.y += (joystickVector.y / joystickLimit) * this.speed;
        }

        if (this.x < 20) this.x = 20;
        if (this.x + this.width > gameWidth - 20) this.x = gameWidth - this.width - 20;
        if (this.y < 20) this.y = 20;
        if (this.y + this.height > gameHeight - 20) this.y = gameHeight - this.height - 20;
    }
};

// Joystick Input
function handleJoystick(e) {
    if (!joystickActive) return;
    
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const rect = joystickContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > joystickLimit) {
        dx = (dx / distance) * joystickLimit;
        dy = (dy / distance) * joystickLimit;
    }

    joystickVector = { x: dx, y: dy };
    joystickHandle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

joystickContainer.addEventListener('mousedown', (e) => {
    if (gameRunning) {
        joystickActive = true;
        handleJoystick(e);
    }
});
joystickContainer.addEventListener('touchstart', (e) => {
    if (gameRunning) {
        joystickActive = true;
        handleJoystick(e);
    }
    e.preventDefault();
}, { passive: false });

window.addEventListener('mousemove', handleJoystick);
window.addEventListener('touchmove', handleJoystick, { passive: false });

window.addEventListener('mouseup', () => {
    joystickActive = false;
    joystickVector = { x: 0, y: 0 };
    joystickHandle.style.transform = `translate(-50%, -50%)`;
});
window.addEventListener('touchend', () => {
    joystickActive = false;
    joystickVector = { x: 0, y: 0 };
    joystickHandle.style.transform = `translate(-50%, -50%)`;
});

let clouds = [];
class Cloud {
    constructor() { this.reset(true); }
    reset(initial = false) {
        this.w = Math.random() * 100 + 50;
        this.h = this.w * 0.6;
        this.x = initial ? Math.random() * gameWidth : gameWidth + this.w;
        this.y = Math.random() * (gameHeight * 0.6);
        this.speed = Math.random() * 0.5 + 0.2;
        this.opacity = Math.random() * 0.3 + 0.1;
    }
    draw() {
        ctx.fillStyle = body.classList.contains('dark-mode') ? `rgba(150, 150, 255, ${this.opacity})` : `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.w, this.h, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    update() {
        this.x -= this.speed;
        if (this.x + this.w < 0) this.reset();
    }
}
for(let i=0; i<8; i++) clouds.push(new Cloud());

let bullets = [];
class Bullet {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = 12;
        this.angle = angle;
        this.color = '#00e5ff';
    }
    draw() {
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }
}

// Items (Power-ups)
let items = [];
class Item {
    constructor() {
        this.radius = 15;
        this.x = gameWidth + this.radius;
        this.y = Math.random() * (gameHeight - this.radius * 2) + this.radius;
        this.speed = 2;
        this.color = '#ff4081';
    }
    draw() {
        const pulse = Math.sin(Date.now() / 100) * 5;
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Inner white circle
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    update() {
        this.x -= this.speed;
    }
}

let particles = [];
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY; this.life -= this.decay;
    }
}

let obstacles = [];
const obstacleConfig = { minSize: 40, maxSize: 90, speed: 3, spawnRate: 60, frameCounter: 0 };
class Obstacle {
    constructor() {
        this.size = Math.random() * (obstacleConfig.maxSize - obstacleConfig.minSize) + obstacleConfig.minSize;
        this.width = this.size; this.height = this.size;
        this.x = gameWidth; this.y = Math.random() * (gameHeight - this.height);
        this.baseColor = body.classList.contains('dark-mode') ? '#444' : '#666';
        this.passed = false;
        this.points = [];
        const numPoints = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const r = (this.size / 2) * (0.8 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        this.details = [];
        for (let i = 0; i < 3; i++) {
            this.details.push({ x: (Math.random()-0.5)*this.size*0.4, y: (Math.random()-0.5)*this.size*0.4, r: Math.random()*10+5 });
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        const grad = ctx.createRadialGradient(-this.size/4, -this.size/4, 0, 0, 0, this.size);
        grad.addColorStop(0, body.classList.contains('dark-mode') ? '#666' : '#999');
        grad.addColorStop(1, this.baseColor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for(let p of this.points) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let d of this.details) {
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();
        ctx.restore();
    }
    update() { this.x -= obstacleConfig.speed; }
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playShootSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}
function playExplosionSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    whiteNoise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    whiteNoise.start(); whiteNoise.stop(audioCtx.currentTime + 0.1);
}
function playPowerUpSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function shoot() {
    const now = Date.now();
    if (now - lastShotTime > fireRate) {
        const startX = player.x + player.width;
        const startY = player.y + player.height / 2;
        
        if (powerLevel === 1) {
            bullets.push(new Bullet(startX, startY, 0));
        } else if (powerLevel === 2) {
            bullets.push(new Bullet(startX, startY - 10, 0));
            bullets.push(new Bullet(startX, startY + 10, 0));
        } else if (powerLevel === 3) {
            bullets.push(new Bullet(startX, startY, 0));
            bullets.push(new Bullet(startX, startY, -0.1));
            bullets.push(new Bullet(startX, startY, 0.1));
        } else {
            // Level 4+
            bullets.push(new Bullet(startX, startY, 0));
            bullets.push(new Bullet(startX, startY, -0.1));
            bullets.push(new Bullet(startX, startY, 0.1));
            bullets.push(new Bullet(startX, startY, -0.2));
            bullets.push(new Bullet(startX, startY, 0.2));
        }
        
        playShootSound();
        lastShotTime = now;
    }
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) particles.push(new Particle(x, y, color));
    playExplosionSound();
}

function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    if (gameRunning) shoot();
    clouds.forEach(c => { c.update(); c.draw(); });
    player.update();
    player.draw();

    // Items
    if (Math.random() < 0.005) items.push(new Item()); // Random spawn
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.update();
        item.draw();

        // Player collision
        const dx = (player.x + player.width/2) - item.x;
        const dy = (player.y + player.height/2) - item.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < player.width/2 + item.radius) {
            powerLevel++;
            items.splice(i, 1);
            playPowerUpSound();
            score += 50;
            scoreDisplay.textContent = `Score: ${score}`;
        } else if (item.x + item.radius < 0) {
            items.splice(i, 1);
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.update(); b.draw();
        if (b.x > gameWidth || b.y < 0 || b.y > gameHeight) bullets.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.update(); p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    }
    obstacleConfig.frameCounter++;
    if (obstacleConfig.frameCounter >= obstacleConfig.spawnRate) {
        obstacles.push(new Obstacle()); obstacleConfig.frameCounter = 0;
        obstacleConfig.speed += 0.05;
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i]; obs.update(); obs.draw();
        if (player.x < obs.x + obs.width && player.x + player.width > obs.x &&
            player.y < obs.y + obs.height && player.y + player.height > obs.y) {
            createExplosion(player.x + player.width/2, player.y + player.height/2, '#ffeb3b');
            gameOver();
        }
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            if (b.x > obs.x && b.x < obs.x + obs.width && b.y > obs.y && b.y < obs.y + obs.height) {
                createExplosion(obs.x + obs.width/2, obs.y + obs.height/2, obs.baseColor);
                obstacles.splice(i, 1); bullets.splice(j, 1);
                score += 5; scoreDisplay.textContent = `Score: ${score}`;
                break;
            }
        }
        if (obs && !obs.passed && obs.x + obs.width < player.x) {
            score++; obs.passed = true; scoreDisplay.textContent = `Score: ${score}`;
        }
        if (obs && obs.x + obs.width < 0) obstacles.splice(i, 1);
    }
    if (gameRunning) animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0; scoreDisplay.textContent = `Score: ${score}`;
    obstacles = []; bullets = []; particles = []; items = [];
    powerLevel = 1;
    obstacleConfig.speed = 3; obstacleConfig.frameCounter = 0;
    player.x = 100; player.y = gameHeight / 2;
    gameRunning = true; startBtn.style.display = 'none';
    gameLoop();
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    startBtn.style.display = 'block';
    startBtn.textContent = 'Game Over! Restart?';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = `High Score: ${highScore}`;
    }
}

startBtn.addEventListener('click', startGame);