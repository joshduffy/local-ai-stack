/**
 * Password Invaders
 *
 * Space Invaders-style game where you shoot characters to build a password.
 * Meet all requirements before the invaders reach you!
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const passwordDisplay = document.getElementById('passwordDisplay');
    const requirementsList = document.getElementById('requirementsList');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const waveDisplay = document.getElementById('waveDisplay');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOver');
    const gameOverReason = document.getElementById('gameOverReason');
    const victoryScreen = document.getElementById('victoryScreen');

    // Game state
    let gameRunning = false;
    let password = '';
    let score = 0;
    let wave = 1;
    let gameStartTime = 0;

    // Player
    const player = {
        x: canvas.width / 2 - 25,
        y: canvas.height - 50,
        width: 50,
        height: 30,
        speed: 8,
        color: '#0f0'
    };

    // Bullets
    let bullets = [];
    const bulletSpeed = 10;
    const bulletCooldown = 200;
    let lastBulletTime = 0;

    // Invaders (characters)
    let invaders = [];
    const invaderRows = 4;
    const invaderCols = 10;
    const invaderWidth = 40;
    const invaderHeight = 35;
    let invaderDirection = 1;
    let invaderSpeed = 1;
    let invaderDropAmount = 20;

    // Character pools
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*';

    // Password requirements
    const requirements = [
        {
            id: 'length',
            text: 'At least 8 characters',
            check: (p) => p.length >= 8
        },
        {
            id: 'uppercase',
            text: 'Contains uppercase letter',
            check: (p) => /[A-Z]/.test(p)
        },
        {
            id: 'lowercase',
            text: 'Contains lowercase letter',
            check: (p) => /[a-z]/.test(p)
        },
        {
            id: 'number',
            text: 'Contains a number',
            check: (p) => /\d/.test(p)
        },
        {
            id: 'special',
            text: 'Contains special char (!@#$%^&*)',
            check: (p) => /[!@#$%^&*]/.test(p)
        }
    ];

    // Hidden requirements (activate in later waves)
    const hiddenRequirements = [
        {
            id: 'no-repeat',
            text: 'No character repeats 3+ times',
            check: (p) => !/(.)\1\1/.test(p),
            wave: 2
        },
        {
            id: 'starts-letter',
            text: 'Starts with a letter',
            check: (p) => /^[a-zA-Z]/.test(p),
            wave: 3
        }
    ];

    // Input state
    const keys = {
        left: false,
        right: false,
        space: false
    };

    // Get character for invader based on position
    function getCharacterForPosition(row, col) {
        // Mix of character types
        const allChars = uppercase + lowercase + numbers + specials;

        // Bias toward needed characters
        let pool = allChars;

        // Add more of what's needed
        if (!requirements[1].check(password)) pool += uppercase + uppercase;
        if (!requirements[2].check(password)) pool += lowercase + lowercase;
        if (!requirements[3].check(password)) pool += numbers + numbers;
        if (!requirements[4].check(password)) pool += specials + specials + specials;

        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Create invaders
    function createInvaders() {
        invaders = [];
        const startX = 50;
        const startY = 50;
        const spacing = 5;

        for (let row = 0; row < invaderRows; row++) {
            for (let col = 0; col < invaderCols; col++) {
                const char = getCharacterForPosition(row, col);
                let color = '#888';

                // Color code by type
                if (/[A-Z]/.test(char)) color = '#4a9eff';
                else if (/[a-z]/.test(char)) color = '#4aff4a';
                else if (/\d/.test(char)) color = '#ffff4a';
                else color = '#ff4a4a';

                invaders.push({
                    x: startX + col * (invaderWidth + spacing),
                    y: startY + row * (invaderHeight + spacing),
                    width: invaderWidth,
                    height: invaderHeight,
                    char: char,
                    color: color,
                    alive: true
                });
            }
        }
    }

    // Move invaders
    function moveInvaders() {
        let hitEdge = false;

        invaders.forEach(inv => {
            if (!inv.alive) return;

            inv.x += invaderSpeed * invaderDirection;

            if (inv.x <= 0 || inv.x + inv.width >= canvas.width) {
                hitEdge = true;
            }
        });

        if (hitEdge) {
            invaderDirection *= -1;
            invaders.forEach(inv => {
                inv.y += invaderDropAmount;
            });
        }

        // Check if any invader reached the bottom
        const bottomInvader = invaders.find(inv => inv.alive && inv.y + inv.height >= player.y);
        if (bottomInvader) {
            gameOver('The invaders reached you!');
        }
    }

    // Fire bullet
    function fireBullet() {
        const now = Date.now();
        if (now - lastBulletTime < bulletCooldown) return;

        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15
        });

        lastBulletTime = now;
    }

    // Update bullets
    function updateBullets() {
        bullets.forEach((bullet, idx) => {
            bullet.y -= bulletSpeed;

            // Remove off-screen bullets
            if (bullet.y < 0) {
                bullets.splice(idx, 1);
                return;
            }

            // Check collision with invaders
            invaders.forEach(inv => {
                if (!inv.alive) return;

                if (bullet.x < inv.x + inv.width &&
                    bullet.x + bullet.width > inv.x &&
                    bullet.y < inv.y + inv.height &&
                    bullet.y + bullet.height > inv.y) {
                    // Hit!
                    inv.alive = false;
                    bullets.splice(bullets.indexOf(bullet), 1);
                    addCharacter(inv.char);
                    score += 10;
                    updateScore();
                }
            });
        });
    }

    // Add character to password
    function addCharacter(char) {
        if (password.length < 20) {
            password += char;
            updatePasswordDisplay();
            checkRequirements();
        }
    }

    // Delete last character
    function deleteCharacter() {
        if (password.length > 0) {
            password = password.slice(0, -1);
            updatePasswordDisplay();
            checkRequirements();
        }
    }

    // Update password display
    function updatePasswordDisplay() {
        passwordDisplay.textContent = password || '_';
    }

    // Check requirements
    function checkRequirements() {
        const allReqs = [...requirements];

        // Add hidden requirements based on wave
        hiddenRequirements.forEach(req => {
            if (wave >= req.wave) {
                allReqs.push(req);
            }
        });

        requirementsList.innerHTML = allReqs.map(req => {
            const passed = req.check(password);
            const status = password.length === 0 ? 'pending' : (passed ? 'pass' : 'fail');
            const icon = status === 'pass' ? '✓' : (status === 'fail' ? '✗' : '○');

            return `
                <div class="requirement">
                    <span class="req-icon ${status}">${icon}</span>
                    <span>${req.text}</span>
                </div>
            `;
        }).join('');
    }

    // Submit password
    function submitPassword() {
        const allReqs = [...requirements];
        hiddenRequirements.forEach(req => {
            if (wave >= req.wave) allReqs.push(req);
        });

        const allPassed = allReqs.every(req => req.check(password));

        if (allPassed) {
            if (wave < 3) {
                // Next wave!
                wave++;
                waveDisplay.textContent = wave;
                invaderSpeed += 0.5;
                password = '';
                updatePasswordDisplay();
                checkRequirements();
                createInvaders();
            } else {
                // Victory!
                victory();
            }
        } else {
            // Flash error
            passwordDisplay.classList.add('error');
            setTimeout(() => passwordDisplay.classList.remove('error'), 300);
        }
    }

    // Update score display
    function updateScore() {
        scoreDisplay.textContent = score;
    }

    // Draw player
    function drawPlayer() {
        ctx.fillStyle = player.color;

        // Ship body
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.closePath();
        ctx.fill();
    }

    // Draw invaders
    function drawInvaders() {
        invaders.forEach(inv => {
            if (!inv.alive) return;

            // Draw block
            ctx.fillStyle = inv.color;
            ctx.fillRect(inv.x, inv.y, inv.width, inv.height);

            // Draw character
            ctx.fillStyle = '#000';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(inv.char, inv.x + inv.width / 2, inv.y + inv.height / 2);
        });
    }

    // Draw bullets
    function drawBullets() {
        ctx.fillStyle = '#ff0';
        bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    // Update player position
    function updatePlayer() {
        if (keys.left && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys.right && player.x + player.width < canvas.width) {
            player.x += player.speed;
        }
        if (keys.space) {
            fireBullet();
        }
    }

    // Check if all invaders are dead
    function checkWaveComplete() {
        const allDead = invaders.every(inv => !inv.alive);
        if (allDead) {
            createInvaders();
        }
    }

    // Game loop
    function gameLoop() {
        if (!gameRunning) return;

        // Clear canvas
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update
        updatePlayer();
        updateBullets();
        moveInvaders();
        checkWaveComplete();

        // Draw
        drawInvaders();
        drawBullets();
        drawPlayer();

        // Draw wave indicator
        ctx.fillStyle = '#333';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`WAVE ${wave}/3`, 10, 20);

        requestAnimationFrame(gameLoop);
    }

    // Game over
    function gameOver(reason) {
        gameRunning = false;
        gameOverReason.textContent = reason;
        gameOverScreen.style.display = 'block';
    }

    // Victory
    function victory() {
        gameRunning = false;
        const timeSpent = Math.floor((Date.now() - gameStartTime) / 1000);

        victoryScreen.innerHTML = `
            <h2>ACCESS GRANTED</h2>
            <p style="color: #0f0; font-family: monospace; font-size: 20px; margin: 20px 0;">
                ${password}
            </p>
            <p style="color: #999; margin-bottom: 20px;">
                Password accepted. You survived ${wave} waves.
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div>
                    <div style="font-size: 28px; color: #0f0;">${score}</div>
                    <div style="font-size: 12px; color: #666;">SCORE</div>
                </div>
                <div>
                    <div style="font-size: 28px; color: #0f0;">${timeSpent}s</div>
                    <div style="font-size: 12px; color: #666;">TIME</div>
                </div>
                <div>
                    <div style="font-size: 28px; color: #0f0;">${password.length}</div>
                    <div style="font-size: 12px; color: #666;">LENGTH</div>
                </div>
            </div>
            <button onclick="restartGame()" style="background: #0f0; color: #000; border: none; padding: 10px 30px; font-size: 16px; cursor: pointer; border-radius: 4px; margin-right: 10px;">
                PLAY AGAIN
            </button>
            <button onclick="location.href='../../index.html'" style="background: #333; color: #fff; border: none; padding: 10px 30px; font-size: 16px; cursor: pointer; border-radius: 4px;">
                BACK TO MENU
            </button>
        `;
        victoryScreen.style.display = 'block';
    }

    // Start game
    window.startGame = function() {
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        victoryScreen.style.display = 'none';

        password = '';
        score = 0;
        wave = 1;
        bullets = [];
        invaderSpeed = 1;
        invaderDirection = 1;
        gameStartTime = Date.now();

        player.x = canvas.width / 2 - player.width / 2;

        updatePasswordDisplay();
        updateScore();
        waveDisplay.textContent = wave;
        checkRequirements();
        createInvaders();

        gameRunning = true;
        gameLoop();
    };

    // Restart game
    window.restartGame = function() {
        gameOverScreen.style.display = 'none';
        victoryScreen.style.display = 'none';
        startGame();
    };

    // Keyboard input
    document.addEventListener('keydown', (e) => {
        if (!gameRunning && e.key !== 'Enter') return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                e.preventDefault();
                break;
            case ' ':
                keys.space = true;
                e.preventDefault();
                break;
            case 'Enter':
                if (gameRunning) {
                    submitPassword();
                }
                e.preventDefault();
                break;
            case 'Backspace':
                deleteCharacter();
                e.preventDefault();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = false;
                break;
            case ' ':
                keys.space = false;
                break;
        }
    });

    // Initial render
    checkRequirements();
})();
