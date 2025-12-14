// Fleeing Button Game
// The confirmation button that really doesn't want to be clicked

const confirmBtn = document.getElementById('confirmBtn');
const buttonContainer = document.getElementById('buttonContainer');
const progressFill = document.getElementById('progressFill');
const clickCount = document.getElementById('clickCount');
const difficultyLevel = document.getElementById('difficultyLevel');
const victoryScreen = document.getElementById('victoryScreen');

// Game state
let successfulClicks = 0;
let totalAttempts = 0;
let missedClicks = 0;
let gameStartTime = null;
let difficulty = 0;
let isPanicking = false;
let lastFleeTime = 0;

// Difficulty settings
const difficulties = [
    { name: 'Cooperative', speed: 0, fleeDistance: 0, shrink: 1 },
    { name: 'Nervous', speed: 150, fleeDistance: 80, shrink: 1 },
    { name: 'Evasive', speed: 200, fleeDistance: 120, shrink: 0.9 },
    { name: 'Paranoid', speed: 250, fleeDistance: 150, shrink: 0.8 },
    { name: 'Terrified', speed: 300, fleeDistance: 200, shrink: 0.7 },
    { name: 'MAXIMUM PANIC', speed: 400, fleeDistance: 250, shrink: 0.6, teleport: true }
];

// Taunts when button escapes
const taunts = [
    "Nope!",
    "Too slow!",
    "Nice try!",
    "Not today!",
    "Missed me!",
    "Almost!",
    "So close!",
    "Nuh-uh!",
    "Keep trying!",
    "You'll never catch me!",
    "I've got places to be!",
    "Was that a click?",
    "Butter fingers!",
    "Did you even try?",
    "My grandmother clicks faster!",
    "Are you using a trackpad?",
    "Have you considered a mouse?",
    "Loading targeting skills...",
    "Error: User too slow",
    "Task failed successfully!"
];

// Button position
let buttonX = 0;
let buttonY = 0;

function init() {
    // Position button initially
    resetButtonPosition();

    // Mouse move listener for fleeing
    document.addEventListener('mousemove', handleMouseMove);

    // Click listener for the button
    confirmBtn.addEventListener('click', handleButtonClick);

    // Missed click listener
    document.addEventListener('click', handleMissedClick);

    // Touch support
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    confirmBtn.addEventListener('touchstart', handleButtonClick);
}

function resetButtonPosition() {
    const containerRect = buttonContainer.getBoundingClientRect();
    buttonX = containerRect.width / 2 - confirmBtn.offsetWidth / 2;
    buttonY = 0;
    updateButtonPosition();
}

function updateButtonPosition() {
    confirmBtn.style.left = buttonX + 'px';
    confirmBtn.style.top = buttonY + 'px';
}

function handleMouseMove(e) {
    if (!gameStartTime) gameStartTime = Date.now();

    const now = Date.now();
    if (now - lastFleeTime < 50) return; // Throttle

    const currentDifficulty = difficulties[difficulty];
    if (currentDifficulty.speed === 0) return;

    const buttonRect = confirmBtn.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;

    const distX = e.clientX - buttonCenterX;
    const distY = e.clientY - buttonCenterY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < currentDifficulty.fleeDistance) {
        totalAttempts++;
        flee(distX, distY, distance);
        lastFleeTime = now;
    }
}

function handleTouchMove(e) {
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function flee(distX, distY, distance) {
    const currentDifficulty = difficulties[difficulty];

    // Teleport at max difficulty
    if (currentDifficulty.teleport && Math.random() > 0.5) {
        teleportButton();
        return;
    }

    // Calculate flee direction (opposite of cursor)
    const fleeX = -distX / distance;
    const fleeY = -distY / distance;

    // Add some randomness
    const randomAngle = (Math.random() - 0.5) * Math.PI / 2;
    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);
    const finalX = fleeX * cos - fleeY * sin;
    const finalY = fleeX * sin + fleeY * cos;

    // Calculate new position
    const moveDistance = currentDifficulty.speed;
    buttonX += finalX * moveDistance;
    buttonY += finalY * moveDistance;

    // Keep within viewport
    constrainToViewport();

    updateButtonPosition();

    // Start panicking at high difficulty
    if (difficulty >= 4 && !isPanicking) {
        isPanicking = true;
        confirmBtn.classList.add('panicking');
    }
}

function teleportButton() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonWidth = confirmBtn.offsetWidth;
    const buttonHeight = confirmBtn.offsetHeight;

    // Random position anywhere on screen
    const newX = Math.random() * (viewportWidth - buttonWidth - 100) + 50;
    const newY = Math.random() * (viewportHeight - buttonHeight - 100) + 50;

    // Convert to relative position
    const containerRect = buttonContainer.getBoundingClientRect();
    buttonX = newX - containerRect.left;
    buttonY = newY - containerRect.top;

    updateButtonPosition();
    showTaunt(newX + buttonWidth / 2, newY);
}

function constrainToViewport() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonWidth = confirmBtn.offsetWidth;
    const buttonHeight = confirmBtn.offsetHeight;
    const containerRect = buttonContainer.getBoundingClientRect();

    // Calculate absolute position
    const absX = containerRect.left + buttonX;
    const absY = containerRect.top + buttonY;

    // Keep within viewport with padding
    const padding = 20;

    if (absX < padding) {
        buttonX = padding - containerRect.left;
    } else if (absX + buttonWidth > viewportWidth - padding) {
        buttonX = viewportWidth - padding - buttonWidth - containerRect.left;
    }

    if (absY < padding) {
        buttonY = padding - containerRect.top;
    } else if (absY + buttonHeight > viewportHeight - padding) {
        buttonY = viewportHeight - padding - buttonHeight - containerRect.top;
    }
}

function handleButtonClick(e) {
    e.stopPropagation();

    if (!gameStartTime) gameStartTime = Date.now();

    successfulClicks++;
    totalAttempts++;

    // Update progress
    const progress = (successfulClicks / 5) * 100;
    progressFill.style.width = progress + '%';
    clickCount.textContent = `${successfulClicks} / 5 confirmations`;

    // Increase difficulty
    if (successfulClicks < 5) {
        difficulty = Math.min(successfulClicks, difficulties.length - 1);
        difficultyLevel.textContent = difficulties[difficulty].name;

        // Shrink button
        const scale = difficulties[difficulty].shrink;
        confirmBtn.style.transform = `scale(${scale})`;

        // Flee immediately after click
        teleportButton();
    }

    // Check for victory
    if (successfulClicks >= 5) {
        showVictory();
    }
}

function handleMissedClick(e) {
    // Don't count if clicking the button or cancel
    if (e.target === confirmBtn || e.target.classList.contains('btn-cancel')) {
        return;
    }

    if (!gameStartTime) gameStartTime = Date.now();

    missedClicks++;

    // Show taunt on missed click (after first difficulty increase)
    if (difficulty > 0 && Math.random() > 0.5) {
        showTaunt(e.clientX, e.clientY);
    }
}

function showTaunt(x, y) {
    const taunt = document.createElement('div');
    taunt.className = 'taunt';
    taunt.textContent = taunts[Math.floor(Math.random() * taunts.length)];
    taunt.style.left = x + 'px';
    taunt.style.top = y + 'px';
    document.body.appendChild(taunt);

    setTimeout(() => taunt.remove(), 1000);
}

function clickedCancel() {
    // Reset the game
    successfulClicks = 0;
    difficulty = 0;
    totalAttempts = 0;
    missedClicks = 0;
    gameStartTime = null;
    isPanicking = false;

    progressFill.style.width = '0%';
    clickCount.textContent = '0 / 5 confirmations';
    difficultyLevel.textContent = 'Cooperative';
    confirmBtn.style.transform = 'scale(1)';
    confirmBtn.classList.remove('panicking');

    resetButtonPosition();
}

function showVictory() {
    const endTime = Date.now();
    const totalTime = Math.round((endTime - gameStartTime) / 1000);
    const accuracy = Math.round((successfulClicks / totalAttempts) * 100);

    victoryScreen.style.display = 'flex';
    victoryScreen.innerHTML = `
        <div class="victory-content">
            <h2>Subscription Confirmed!</h2>
            <p>Against all odds, you managed to click the button 5 times.</p>
            <div class="stats-grid">
                <div class="stat">
                    <div class="stat-value">${totalTime}s</div>
                    <div class="stat-label">Time</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalAttempts}</div>
                    <div class="stat-label">Total Attempts</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${accuracy}%</div>
                    <div class="stat-label">Accuracy</div>
                </div>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                The button is currently in therapy dealing with commitment issues.
            </p>
            <div style="margin-top: 30px;">
                <button class="btn-restart" onclick="restartGame()">Try Again</button>
                <button class="btn-menu" onclick="window.location.href='../../index.html'">Back to Menu</button>
            </div>
        </div>
    `;
}

function restartGame() {
    victoryScreen.style.display = 'none';
    clickedCancel();
}

// Make clickedCancel available globally for the cancel button
window.clickedCancel = clickedCancel;
window.restartGame = restartGame;

// Initialize
init();
