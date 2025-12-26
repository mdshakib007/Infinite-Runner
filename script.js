// Game Configuration
const CONFIG = {
    GRAVITY: 0.8,
    JUMP_FORCE: -15,
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    GROUND_HEIGHT: 100,
    PLAYER_SIZE: 40,
    MIN_OBSTACLE_DISTANCE: 200,
    MAX_OBSTACLE_DISTANCE: 400
};

// Game States
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// Particle System
class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity || { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 };
        this.life = 1.0;
        this.decay = 0.02;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y += 0.2; // gravity
        this.life -= this.decay;
        this.size *= 0.98;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

// Trail System
class Trail {
    constructor() {
        this.points = [];
        this.maxPoints = 20;
    }

    addPoint(x, y) {
        this.points.push({ x, y, life: 1.0 });
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    update() {
        this.points.forEach(point => {
            point.life -= 0.05;
        });
        this.points = this.points.filter(point => point.life > 0);
    }

    draw(ctx, color) {
        ctx.save();
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const alpha = point.life * (i / this.points.length);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            const size = 8 * alpha;
            ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
        }
        ctx.restore();
    }
}

// Player Class
class Player {
    constructor() {
        this.reset();
        this.trail = new Trail();
    }

    reset() {
        this.x = 100;
        this.y = CONFIG.CANVAS_HEIGHT - CONFIG.GROUND_HEIGHT - CONFIG.PLAYER_SIZE;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.velocityY = 0;
        this.onGround = false;
        this.rotation = 0;
        this.color = '#00ffff';
    }

    jump() {
        if (this.onGround) {
            this.velocityY = CONFIG.JUMP_FORCE;
            this.onGround = false;
        }
    }

    update() {
        this.velocityY += CONFIG.GRAVITY;
        this.y += this.velocityY;

        // Ground collision
        const groundY = CONFIG.CANVAS_HEIGHT - CONFIG.GROUND_HEIGHT;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.velocityY = 0;
            this.onGround = true;
            this.rotation = 0;
        } else {
            this.onGround = false;
            this.rotation += 0.15;
        }

        // Ceiling collision
        if (this.y <= 0) {
            this.y = 0;
            this.velocityY = 0;
        }

        this.trail.addPoint(this.x + this.width/2, this.y + this.height/2);
        this.trail.update();

        return 'alive';
    }

    draw(ctx) {
        this.trail.draw(ctx, this.color);

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width/3, -this.height/3, this.width*2/3, this.height*2/3);
        
        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x + 2,
            y: this.y + 2,
            width: this.width - 4,
            height: this.height - 4
        };
    }
}

// Camera Class
class Camera {
    constructor() {
        this.x = 0;
        this.shake = 0;
        this.shakeDecay = 0.9;
    }

    update() {
        if (this.shake > 0) {
            this.shake *= this.shakeDecay;
        }
    }

    addShake(intensity) {
        this.shake = Math.max(this.shake, intensity);
    }

    getShakeOffset() {
        if (this.shake > 0) {
            return {
                x: (Math.random() - 0.5) * this.shake,
                y: (Math.random() - 0.5) * this.shake
            };
        }
        return { x: 0, y: 0 };
    }
}

// Obstacle Generator
class ObstacleGenerator {
    constructor() {
        this.obstacles = [];
        this.nextObstacleX = CONFIG.CANVAS_WIDTH;
        this.obstacleTypes = [
            // Ground obstacles
            { type: 'spike', width: 40, height: 60, color: '#02ff70ff', ground: true, glow: true },
            { type: 'cube', width: 50, height: 50, color: '#8844ff', ground: true, filled: true },
            { type: 'cube', width: 50, height: 50, color: '#4488ff', ground: true, filled: false },
            { type: 'orb', width: 35, height: 35, color: '#ffff00', ground: true, glow: true },
            { type: 'robot', width: 45, height: 55, color: '#00ff88', ground: true },
            { type: 'ship', width: 60, height: 35, color: '#ff8800', ground: true },    
            { type: 'ball', width: 40, height: 40, color: '#ff44ff', ground: true },
            { type: 'wave', width: 55, height: 30, color: '#44ffff', ground: true },
            { type: 'spider', width: 50, height: 40, color: '#ff4444', ground: true },
            { type: 'swing', width: 45, height: 50, color: '#88ff44', ground: true },
            // Sky obstacles  
            { type: 'ufo', width: 60, height: 25, color: '#aaaaaa', ground: false },
            { type: 'star', width: 30, height: 30, color: '#ffff00', ground: false, glow: true },
            { type: 'star', width: 20, height: 20, color: '#ffff88', ground: false, glow: true }
        ];
    }

    update(gameSpeed, distance) {
        // Move obstacles left
        this.obstacles.forEach(obstacle => {
            obstacle.x -= gameSpeed;
        });

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > -100);

        // Generate new obstacles
        if (this.obstacles.length === 0 || 
            this.obstacles[this.obstacles.length - 1].x < CONFIG.CANVAS_WIDTH) {
            this.generateObstacle(gameSpeed, distance);
        }
    }

    generateObstacle(gameSpeed, distance) {
        // Better spacing - minimum 300px between obstacles
        const minDistance = 300;
        const maxDistance = 500;
        const distanceFromLast = minDistance + Math.random() * (maxDistance - minDistance);
        
        if (this.obstacles.length > 0) {
            this.nextObstacleX = this.obstacles[this.obstacles.length - 1].x + distanceFromLast;
        } else {
            this.nextObstacleX = CONFIG.CANVAS_WIDTH + 200;
        }

        // Choose obstacle type
        const obstacleTemplate = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
        
        let obstacleY;
        if (obstacleTemplate.ground) {
            // Ground obstacles
            obstacleY = CONFIG.CANVAS_HEIGHT - CONFIG.GROUND_HEIGHT - obstacleTemplate.height;
        } else {
            // Air obstacles - random height in upper area
            obstacleY = 50 + Math.random() * 150;
        }
        
        const obstacle = {
            x: this.nextObstacleX,
            y: obstacleY,
            width: obstacleTemplate.width,
            height: obstacleTemplate.height,
            type: obstacleTemplate.type,
            color: obstacleTemplate.color,
            isAir: !obstacleTemplate.ground
        };

        this.obstacles.push(obstacle);
    }

    draw(ctx, cameraOffset) {
        this.obstacles.forEach(obstacle => {
            const drawX = obstacle.x + (cameraOffset ? cameraOffset.x : 0);
            
            if (drawX < -200 || drawX > CONFIG.CANVAS_WIDTH + 200) return;

            ctx.save();
            ctx.shadowBlur = obstacle.glow ? 30 : 20;
            ctx.shadowColor = obstacle.color;
            ctx.fillStyle = obstacle.color;

            switch (obstacle.type) {
                case 'spike':
                    ctx.beginPath();
                    ctx.moveTo(drawX + 5, obstacle.y + obstacle.height);
                    ctx.lineTo(drawX + obstacle.width/2, obstacle.y);
                    ctx.lineTo(drawX + obstacle.width - 5, obstacle.y + obstacle.height);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'cube':
                    if (obstacle.filled) {
                        ctx.fillRect(drawX, obstacle.y, obstacle.width, obstacle.height);
                    } else {
                        ctx.strokeStyle = obstacle.color;
                        ctx.lineWidth = 3;
                        ctx.strokeRect(drawX, obstacle.y, obstacle.width, obstacle.height);
                    }
                    break;

                case 'orb':
                    ctx.beginPath();
                    ctx.arc(drawX + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/2, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'robot':
                    // Body
                    ctx.fillRect(drawX + 10, obstacle.y + 15, obstacle.width - 20, obstacle.height - 15);
                    // Head
                    ctx.fillRect(drawX + 15, obstacle.y, obstacle.width - 30, 20);
                    // Arms
                    ctx.fillRect(drawX + 5, obstacle.y + 20, 8, 15);
                    ctx.fillRect(drawX + obstacle.width - 13, obstacle.y + 20, 8, 15);
                    break;

                case 'ship':
                    // Main body
                    ctx.fillRect(drawX, obstacle.y + obstacle.height/3, obstacle.width * 0.7, obstacle.height/3);
                    // Nose
                    ctx.beginPath();
                    ctx.moveTo(drawX + obstacle.width * 0.7, obstacle.y + obstacle.height/3);
                    ctx.lineTo(drawX + obstacle.width, obstacle.y + obstacle.height/2);
                    ctx.lineTo(drawX + obstacle.width * 0.7, obstacle.y + obstacle.height * 2/3);
                    ctx.fill();
                    break;

                case 'ball':
                    ctx.beginPath();
                    ctx.arc(drawX + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/2, 0, Math.PI * 2);
                    ctx.fill();
                    // Inner circle
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(drawX + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/3, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                case 'wave':
                    ctx.beginPath();
                    for (let i = 0; i < obstacle.width; i += 5) {
                        const waveY = obstacle.y + obstacle.height/2 + Math.sin(i * 0.3) * 10;
                        if (i === 0) ctx.moveTo(drawX + i, waveY);
                        else ctx.lineTo(drawX + i, waveY);
                    }
                    ctx.strokeStyle = obstacle.color;
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    break;

                case 'spider':
                    // Body
                    ctx.fillRect(drawX + 15, obstacle.y + 10, obstacle.width - 30, obstacle.height - 20);
                    // Legs
                    for (let i = 0; i < 4; i++) {
                        ctx.strokeStyle = obstacle.color;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(drawX + 15, obstacle.y + 15 + i * 5);
                        ctx.lineTo(drawX + 5, obstacle.y + 20 + i * 3);
                        ctx.moveTo(drawX + obstacle.width - 15, obstacle.y + 15 + i * 5);
                        ctx.lineTo(drawX + obstacle.width - 5, obstacle.y + 20 + i * 3);
                        ctx.stroke();
                    }
                    break;

                case 'swing':
                    // Chain
                    ctx.strokeStyle = '#888888';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(drawX + obstacle.width/2, obstacle.y);
                    ctx.lineTo(drawX + obstacle.width/2, obstacle.y + obstacle.height - 15);
                    ctx.stroke();
                    // Swing seat
                    ctx.fillRect(drawX + 10, obstacle.y + obstacle.height - 15, obstacle.width - 20, 15);
                    break;

                case 'ufo':
                    // Main disc
                    ctx.beginPath();
                    ctx.ellipse(drawX + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/2, obstacle.height/3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Top dome
                    ctx.beginPath();
                    ctx.ellipse(drawX + obstacle.width/2, obstacle.y + obstacle.height/3, obstacle.width/3, obstacle.height/4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'star':
                    // 5-pointed star
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * 4 * Math.PI) / 5;
                        const x1 = drawX + obstacle.width/2 + Math.cos(angle) * obstacle.width/2;
                        const y1 = obstacle.y + obstacle.height/2 + Math.sin(angle) * obstacle.height/2;
                        if (i === 0) ctx.moveTo(x1, y1);
                        else ctx.lineTo(x1, y1);
                        
                        const angle2 = ((i + 0.5) * 4 * Math.PI) / 5;
                        const x2 = drawX + obstacle.width/2 + Math.cos(angle2) * obstacle.width/4;
                        const y2 = obstacle.y + obstacle.height/2 + Math.sin(angle2) * obstacle.height/4;
                        ctx.lineTo(x2, y2);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(drawX, obstacle.y, obstacle.width, obstacle.height);
                    break;

                case 'double_spike':
                    // Two spikes side by side
                    ctx.beginPath();
                    ctx.moveTo(drawX + 5, obstacle.y + obstacle.height);
                    ctx.lineTo(drawX + obstacle.width/4, obstacle.y);
                    ctx.lineTo(drawX + obstacle.width/2 - 5, obstacle.y + obstacle.height);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(drawX + obstacle.width/2 + 5, obstacle.y + obstacle.height);
                    ctx.lineTo(drawX + 3*obstacle.width/4, obstacle.y);
                    ctx.lineTo(drawX + obstacle.width - 5, obstacle.y + obstacle.height);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'tall_cactus':
                    // Tall cactus with more arms
                    ctx.fillRect(drawX + obstacle.width/3, obstacle.y, obstacle.width/3, obstacle.height);
                    ctx.fillRect(drawX + 2, obstacle.y + obstacle.height/4, obstacle.width/4, obstacle.height/5);
                    ctx.fillRect(drawX + obstacle.width - obstacle.width/4 - 2, obstacle.y + obstacle.height/3, obstacle.width/4, obstacle.height/6);
                    ctx.fillRect(drawX + 2, obstacle.y + 2*obstacle.height/3, obstacle.width/5, obstacle.height/8);
                    break;
            }
            
            ctx.restore();
        });
    }

    checkCollision(player) {
        const playerBounds = player.getBounds();
        
        for (const obstacle of this.obstacles) {
            if (obstacle.x < playerBounds.x + playerBounds.width &&
                obstacle.x + obstacle.width > playerBounds.x &&
                obstacle.y < playerBounds.y + playerBounds.height &&
                obstacle.y + obstacle.height > playerBounds.y) {
                return true;
            }
        }
        return false;
    }

    reset() {
        this.obstacles = [];
        this.nextObstacleX = CONFIG.CANVAS_WIDTH;
    }
}
// Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        this.state = GAME_STATES.MENU;
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') || 0;
        this.highDistance = localStorage.getItem('highDistance') || 0;
        this.gameSpeed = 5;
        this.distance = 0;
        
        this.player = new Player();
        this.camera = new Camera();
        this.obstacleGenerator = new ObstacleGenerator();
        this.particles = [];
        this.backgroundOffset = 0;
        
        this.setupUI();
        this.setupInput();
        
        this.gameLoop();
    }

    setupCanvas() {
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
        CONFIG.CANVAS_WIDTH = this.canvas.width;
        CONFIG.CANVAS_HEIGHT = this.canvas.height;
    }

    setupUI() {
        document.getElementById('play-btn').onclick = () => this.startGame();
        document.getElementById('retry-btn').onclick = () => this.startGame();
        document.getElementById('pause-btn').onclick = () => this.pauseGame();
        document.getElementById('resume-btn').onclick = () => this.resumeGame();
        document.getElementById('restart-btn').onclick = () => this.startGame();
        
        const menuBtns = document.querySelectorAll('#menu-btn, #menu-btn-2, #menu-btn-3');
        menuBtns.forEach(btn => btn.onclick = () => this.showMenu());
        
        // Update high score display
        document.getElementById('high-score').textContent = this.highScore;
        document.getElementById('high-distance').textContent = this.highDistance;
    }

    setupInput() {
        let isJumping = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === GAME_STATES.MENU) {
                    this.startGame();
                } else if (this.state === GAME_STATES.GAME_OVER) {
                    this.startGame();
                } else if (this.state === GAME_STATES.PLAYING && !isJumping) {
                    this.player.jump();
                    isJumping = true;
                }
            }
            if (e.code === 'KeyP') {
                if (this.state === GAME_STATES.MENU) {
                    this.startGame();
                }
            }
            if (e.code === 'Escape') {
                if (this.state === GAME_STATES.PLAYING) {
                    this.pauseGame();
                } else if (this.state === GAME_STATES.PAUSED) {
                    this.resumeGame();
                }
            }
            if (e.code === 'KeyR') {
                if (this.state === GAME_STATES.GAME_OVER) {
                    this.startGame();
                } else if (this.state === GAME_STATES.PAUSED) {
                    this.resumeGame();
                }
            }
            if (e.code === 'KeyS' && this.state === GAME_STATES.PAUSED) {
                this.startGame();
            }
            if (e.code === 'KeyM') {
                this.showMenu();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                isJumping = false;
            }
        });

        // Mouse/touch controls - works for jump and menu navigation
        let isMouseDown = false;
        
        const handleJump = () => {
            if (this.state === GAME_STATES.PLAYING) {
                this.player.jump();
                isMouseDown = true;
            } else if (this.state === GAME_STATES.MENU) {
                this.startGame();
            } else if (this.state === GAME_STATES.GAME_OVER) {
                this.startGame();
            }
        };
        
        const handleRelease = () => {
            isMouseDown = false;
        };
        
        // Mouse events
        this.canvas.addEventListener('mousedown', handleJump);
        this.canvas.addEventListener('mouseup', handleRelease);
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleJump();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleRelease();
        });

        // Continuous input for ship mode
        setInterval(() => {
            if (this.state === GAME_STATES.PLAYING && this.player.mode === 'ship') {
                if (isJumping || isMouseDown) {
                    this.player.jump();
                }
            }
        }, 50);
    }

    startGame() {
        this.state = GAME_STATES.PLAYING;
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = 5;
        this.player.reset();
        this.camera = new Camera();
        this.obstacleGenerator.reset();
        this.particles = [];
        
        // Reset game over title animation
        const gameOverTitle = document.querySelector('.game-over-title');
        if (gameOverTitle) {
            gameOverTitle.classList.remove('fall');
        }
        
        this.showScreen('game-hud');
    }

    pauseGame() {
        if (this.state === GAME_STATES.PLAYING) {
            this.state = GAME_STATES.PAUSED;
            this.showScreen('pause-menu');
        }
    }

    resumeGame() {
        if (this.state === GAME_STATES.PAUSED) {
            this.state = GAME_STATES.PLAYING;
            this.showScreen('game-hud');
        }
    }

    showMenu() {
        this.state = GAME_STATES.MENU;
        this.showScreen('start-menu');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    gameOver() {
        this.state = GAME_STATES.GAME_OVER;
        this.camera.addShake(20);
        
        // Update high score and distance
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
        
        if (this.distance > this.highDistance) {
            this.highDistance = Math.floor(this.distance);
            localStorage.setItem('highDistance', this.highDistance);
        }
        
        // Screen shake
        document.getElementById('game-container').classList.add('shake');
        setTimeout(() => {
            document.getElementById('game-container').classList.remove('shake');
        }, 500);
        
        // Explosion particles
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(
                this.player.x + this.player.width/2,
                this.player.y + this.player.height/2,
                '#ff3333',
                {
                    x: (Math.random() - 0.5) * 20,
                    y: (Math.random() - 0.5) * 20
                }
            ));
        }
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-distance').textContent = Math.floor(this.distance);
        
        this.showScreen('game-over');
        
        // Add fall animation after 2 seconds
        setTimeout(() => {
            const gameOverTitle = document.querySelector('.game-over-title');
            if (gameOverTitle) {
                gameOverTitle.classList.add('fall');
            }
        }, 2000);
    }

    update() {
        if (this.state !== GAME_STATES.PLAYING) return;

        // Update player
        const playerState = this.player.update();
        if (playerState === 'death') {
            this.gameOver();
            return;
        }

        // Update distance and speed (slower distance calculation)
        this.distance += this.gameSpeed * 0.1; // Much slower distance
        this.gameSpeed = Math.min(5 + this.distance / 500, 10); // Slower speed increase
        
        // Update background offset (slower than ground)
        this.backgroundOffset += this.gameSpeed * 0.3;

        // Update score
        this.score = Math.floor(this.distance / 10);

        // Update camera
        this.camera.update();

        // Update obstacles
        this.obstacleGenerator.update(this.gameSpeed, this.distance);

        // Check collisions
        if (this.obstacleGenerator.checkCollision(this.player)) {
            this.gameOver();
            return;
        }

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return !particle.isDead();
        });

        // Update UI
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('current-distance').textContent = Math.floor(this.distance);
        document.getElementById('high-score').textContent = this.highScore;
    }

    draw() {
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === GAME_STATES.MENU) return;

        const cameraOffset = this.camera.getShakeOffset();

        // Draw background elements (moon, stars)
        this.drawBackground();

        // Draw ground
        this.drawGround();

        // Draw obstacles
        this.obstacleGenerator.draw(this.ctx, { x: 0, y: 0 });

        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));

        // Draw player
        this.player.draw(this.ctx);
    }

    drawBackground() {
        // Moon - continuous loop
        this.ctx.save();
        this.ctx.fillStyle = '#ffffcc';
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = '#ffffcc';
        const moonCycle = CONFIG.CANVAS_WIDTH + 200;
        const moonX = 150 - (this.backgroundOffset * 0.1) % moonCycle;
        const adjustedMoonX = moonX < -100 ? moonX + moonCycle : moonX;
        this.ctx.beginPath();
        this.ctx.arc(adjustedMoonX, 80, 40, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Background stars - continuous loop
        this.ctx.fillStyle = '#ffffff';
        const starCycle = CONFIG.CANVAS_WIDTH + 100;
        for (let i = 0; i < 20; i++) {
            const baseStarX = (i * 100 - (this.backgroundOffset * 0.2)) % starCycle;
            const starX = baseStarX < -50 ? baseStarX + starCycle : baseStarX;
            const starY = 50 + (i * 17) % 150;
            this.ctx.beginPath();
            this.ctx.arc(starX, starY, 1 + (i % 3), 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawGround(cameraOffset) {
        const groundY = CONFIG.CANVAS_HEIGHT - CONFIG.GROUND_HEIGHT;
        
        // Ground gradient
        const gradient = this.ctx.createLinearGradient(0, groundY, 0, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#333333');
        gradient.addColorStop(0.3, '#444444');
        gradient.addColorStop(1, '#222222');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, groundY, CONFIG.CANVAS_WIDTH, CONFIG.GROUND_HEIGHT);
        
        // Ground top line
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffff';
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(CONFIG.CANVAS_WIDTH, groundY);
        this.ctx.stroke();
        
        // Ground pattern dots
        this.ctx.fillStyle = '#555555';
        this.ctx.shadowBlur = 0;
        for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += 30) {
            for (let y = groundY + 20; y < CONFIG.CANVAS_HEIGHT; y += 25) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});

// Handle window resize
window.addEventListener('resize', () => {
    CONFIG.CANVAS_WIDTH = window.innerWidth;
    CONFIG.CANVAS_HEIGHT = window.innerHeight;
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
    }
});
