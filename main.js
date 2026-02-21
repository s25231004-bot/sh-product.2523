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
        this.speed = 10;
        this.color = '#ffeb3b';
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
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

// Obstacles
let obstacles = [];
const obstacleConfig = {
    minWidth: 40,
    maxWidth: 80,
    minHeight: 40,
    maxHeight: 120,
    speed: 3,
    spawnRate: 60,
    frameCounter: 0
};

class Obstacle {
    constructor() {
        this.width = Math.random() * (obstacleConfig.maxWidth - obstacleConfig.minWidth) + obstacleConfig.minWidth;
        this.height = Math.random() * (obstacleConfig.maxHeight - obstacleConfig.minHeight) + obstacleConfig.minHeight;
        this.x = gameWidth;
        this.y = Math.random() * (gameHeight - this.height);
        this.color = body.classList.contains('dark-mode') ? '#ff5722' : '#555';
        this.passed = false;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    update() {
        this.x -= obstacleConfig.speed;
    }
}

// Sound Effects using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playShootSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
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
    for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
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

// Input handling
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('mousedown', () => {
    if (gameRunning) {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2));
        playShootSound();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameRunning) {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2));
        playShootSound();
    }
});

canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    if (gameRunning) {
        bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2));
        playShootSound();
    }
}, { passive: false });

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
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
    playExplosionSound();
}

function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    player.update();
    player.draw();

    // Update & Draw Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        b.draw();
        if (b.x > gameWidth) bullets.splice(i, 1);
    }

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
                createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.color);
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

    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    obstacles = [];
    bullets = [];
    particles = [];
    obstacleConfig.speed = 3;
    obstacleConfig.frameCounter = 0;
    gameRunning = true;
    startBtn.style.display = 'none';
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