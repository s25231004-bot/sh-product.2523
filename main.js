const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Game State
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameRunning = false;
let animationId;
let gameWidth, gameHeight;

// Shooting State
let isShooting = false;
let lastShotTime = 0;
const fireRate = 150; // Milliseconds between shots

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

// Background Clouds
let clouds = [];
class Cloud {
    constructor() {
        this.reset(true);
    }
    reset(initial = false) {
        this.w = Math.random() * 100 + 50;
        this.h = this.w * 0.6;
        this.x = initial ? Math.random() * gameWidth : gameWidth + this.w;
        this.y = Math.random() * (gameHeight * 0.6);
        this.speed = Math.random() * 0.5 + 0.2;
        this.opacity = Math.random() * 0.4 + 0.2;
    }
    draw() {
        ctx.fillStyle = body.classList.contains('dark-mode') ? `rgba(200, 200, 255, ${this.opacity})` : `rgba(255, 255, 255, ${this.opacity})`;
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

// Player
const player = {
    x: 50,
    y: gameHeight / 2,
    width: 60,
    height: 30,
    targetY: gameHeight / 2,
    speed: 0.1,
    color: '#ffeb3b',
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2196f3';
        ctx.fillRect(this.x + 10, this.y + 10, 10, 10);
    },
    update() {
        this.y += (this.targetY - (this.y + this.height / 2)) * this.speed;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > gameHeight) this.y = gameHeight - this.height;
    }
};

// Bullets
let bullets = [];
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = 12;
        this.color = '#ffeb3b';
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Bullet glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
    }
    update() {
        this.x += this.speed;
    }
}

// Particles for Explosion
let particles = [];
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
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
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }
}

// Obstacles (Realistic Stones)
let obstacles = [];
const obstacleConfig = {
    minSize: 40,
    maxSize: 90,
    speed: 3,
    spawnRate: 60,
    frameCounter: 0
};

class Obstacle {
    constructor() {
        this.size = Math.random() * (obstacleConfig.maxSize - obstacleConfig.minSize) + obstacleConfig.minSize;
        this.width = this.size;
        this.height = this.size;
        this.x = gameWidth;
        this.y = Math.random() * (gameHeight - this.height);
        this.baseColor = body.classList.contains('dark-mode') ? '#444' : '#666';
        this.passed = false;
        
        // Random polygon points
        this.points = [];
        const numPoints = 7 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const r = (this.size / 2) * (0.8 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        
        // Craters/Texture details
        this.details = [];
        for (let i = 0; i < 3; i++) {
            this.details.push({
                x: (Math.random() - 0.5) * this.size * 0.5,
                y: (Math.random() - 0.5) * this.size * 0.5,
                r: Math.random() * (this.size * 0.15) + 5
            });
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        
        // 1. Draw main body with gradient for volume
        const grad = ctx.createRadialGradient(-this.size/4, -this.size/4, 0, 0, 0, this.size);
        grad.addColorStop(0, body.classList.contains('dark-mode') ? '#666' : '#999'); // Light side
        grad.addColorStop(1, this.baseColor); // Shadow side
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 2. Draw details (crater-like depth)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.details.forEach(d => {
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
            // Highlight edge of crater
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.stroke();
        });

        // 3. Highlight edges
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
        ctx.shadowBlur = 0; // Reset shadow for other draws
    }
    update() {
        this.x -= obstacleConfig.speed;
    }
}

// Sound Effects
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
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
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
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    whiteNoise.start();
    whiteNoise.stop(audioCtx.currentTime + 0.1);
}

// Auto-fire Trigger logic
function shoot() {
    const now = Date.now();
    if (now - lastShotTime > fireRate) {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2));
        playShootSound();
        lastShotTime = now;
    }
}

// Input handling
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('mousedown', () => { if (gameRunning) isShooting = true; });
window.addEventListener('mouseup', () => isShooting = false);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameRunning) isShooting = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') isShooting = false;
});

canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    if (gameRunning) isShooting = true;
}, { passive: false });
canvas.addEventListener('touchend', () => isShooting = false);

// Theme
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = 'Light Mode';
}

highScoreDisplay.textContent = `High Score: ${highScore}`;

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) particles.push(new Particle(x, y, color));
    playExplosionSound();
}

function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Auto-fire check
    if (isShooting && gameRunning) shoot();

    // Draw Background Clouds
    clouds.forEach(cloud => { cloud.update(); cloud.draw(); });

    player.update();
    player.draw();

    // Update & Draw Bullets
    ctx.shadowBlur = 0; // Ensure shadow doesn't bleed
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        b.draw();
        if (b.x > gameWidth) bullets.splice(i, 1);
    }
    ctx.shadowBlur = 0;

    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Obstacles
    obstacleConfig.frameCounter++;
    if (obstacleConfig.frameCounter >= obstacleConfig.spawnRate) {
        obstacles.push(new Obstacle());
        obstacleConfig.frameCounter = 0;
        obstacleConfig.speed += 0.05;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update();
        obs.draw();

        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ffeb3b');
            gameOver();
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            if (
                b.x > obs.x && b.x < obs.x + obs.width &&
                b.y > obs.y && b.y < obs.y + obs.height
            ) {
                createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.baseColor);
                obstacles.splice(i, 1);
                bullets.splice(j, 1);
                score += 5;
                scoreDisplay.textContent = `Score: ${score}`;
                break;
            }
        }

        if (obs && !obs.passed && obs.x + obs.width < player.x) {
            score++;
            obs.passed = true;
            scoreDisplay.textContent = `Score: ${score}`;
        }

        if (obs && obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    if (gameRunning) animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    obstacles = [];
    bullets = [];
    particles = [];
    isShooting = false;
    obstacleConfig.speed = 3;
    obstacleConfig.frameCounter = 0;
    gameRunning = true;
    startBtn.style.display = 'none';
    gameLoop();
}

function gameOver() {
    gameRunning = false;
    isShooting = false;
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