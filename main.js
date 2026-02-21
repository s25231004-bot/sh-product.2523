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
        // Simple airplane shape (triangle/rect)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        // Cockpit
        ctx.fillStyle = '#2196f3';
        ctx.fillRect(this.x + 10, this.y + 10, 10, 10);
    },
    update() {
        // Smoothly follow the target Y (mouse/touch position)
        this.y += (this.targetY - (this.y + this.height / 2)) * this.speed;
        
        // Keep in bounds
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > gameHeight) this.y = gameHeight - this.height;
    }
};

// Obstacles
let obstacles = [];
const obstacleConfig = {
    minWidth: 40,
    maxWidth: 80,
    minHeight: 40,
    maxHeight: 120,
    speed: 3,
    spawnRate: 60, // frames
    frameCounter: 0
};

class Obstacle {
    constructor() {
        this.width = Math.random() * (obstacleConfig.maxWidth - obstacleConfig.minWidth) + obstacleConfig.minWidth;
        this.height = Math.random() * (obstacleConfig.maxHeight - obstacleConfig.minHeight) + obstacleConfig.minHeight;
        this.x = gameWidth;
        this.y = Math.random() * (gameHeight - this.height);
        this.color = body.classList.contains('dark-mode') ? '#ccc' : '#555';
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Add "cloud" or "enemy" look
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    update() {
        this.x -= obstacleConfig.speed;
    }
}

// Input handling
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetY = e.clientY - rect.top;
});

canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetY = e.touches[0].clientY - rect.top;
    e.preventDefault();
}, { passive: false });

// Theme
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = 'Light Mode';
}

// High score init
highScoreDisplay.textContent = `High Score: ${highScore}`;

function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Update and draw player
    player.update();
    player.draw();

    // Spawn obstacles
    obstacleConfig.frameCounter++;
    if (obstacleConfig.frameCounter >= obstacleConfig.spawnRate) {
        obstacles.push(new Obstacle());
        obstacleConfig.frameCounter = 0;
        // Increase difficulty
        obstacleConfig.speed += 0.05;
    }

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update();
        obs.draw();

        // Collision detection
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }

        // Score
        if (obs.x + obs.width < player.x && !obs.passed) {
            score++;
            obs.passed = true;
            scoreDisplay.textContent = `Score: ${score}`;
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
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