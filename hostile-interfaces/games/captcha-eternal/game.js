/**
 * CAPTCHA Eternal
 *
 * Goal: Prove you are human
 * The system never believes you. Win condition: system gives up.
 */

(function() {
    const engine = new RuleEngine('CAPTCHA Eternal');

    // Emoji categories with ambiguous members
    const categories = {
        'traffic lights': {
            definite: ['🚦', '🚥'],
            ambiguous: ['💡', '🔴', '🟡', '🟢', '🚨'],
            unrelated: ['🚗', '🚙', '🏠', '🌳', '🚶', '☁️', '🏢', '🌆']
        },
        'vehicles': {
            definite: ['🚗', '🚙', '🚕', '🚌'],
            ambiguous: ['🛵', '🚲', '🛴', '🏍️'],
            unrelated: ['🏠', '🌳', '🚶', '🐕', '🚦', '☁️', '🏢', '🌆']
        },
        'crosswalks': {
            definite: ['🚶', '🚶‍♀️', '🚶‍♂️'],
            ambiguous: ['🛤️', '➖', '🦓'],
            unrelated: ['🚗', '🏠', '🌳', '🐕', '🚦', '☁️', '🏢', '🌆']
        },
        'storefronts': {
            definite: ['🏪', '🏬', '🏢'],
            ambiguous: ['🏠', '🏛️', '🏗️', '🏨'],
            unrelated: ['🚗', '🌳', '🐕', '🚦', '☁️', '🚶', '🌆', '🌲']
        },
        'bicycles': {
            definite: ['🚲', '🚴', '🚴‍♀️'],
            ambiguous: ['🛵', '🛴', '🏍️', '🦽'],
            unrelated: ['🚗', '🏠', '🌳', '🐕', '🚦', '☁️', '🏢', '🌆']
        },
        'fire hydrants': {
            definite: ['🧯', '🔥'],
            ambiguous: ['🚒', '💧', '🔴'],
            unrelated: ['🚗', '🏠', '🌳', '🐕', '🚦', '☁️', '🏢', '🌆']
        }
    };

    const categoryNames = Object.keys(categories);

    let currentCategory = '';
    let currentGrid = [];
    let selectedCells = new Set();
    let roundsCompleted = 0;
    let roundsFailed = 0;
    const requiredRounds = 5;
    let timeRemaining = 30;
    let timerInterval = null;
    let secretRequirement = null;

    // Rules
    engine.addRule(new Rule(
        'correct-selection',
        'Correct Selection',
        'User must select all correct items and no incorrect items.',
        (s) => s.selectionCorrect === true,
        { corporateMessage: "Please try again. Some selections were incorrect." }
    ));

    engine.addRule(new Rule(
        'not-too-fast',
        'Human Speed Verification',
        'Selection must not be completed too quickly (appears automated).',
        (s) => s.timeSpent > 2000,
        {
            hidden: true,
            activatesAfter: 2,
            corporateMessage: "Your response time suggests automated behavior. Please try again."
        }
    ));

    engine.addRule(new Rule(
        'not-too-slow',
        'Timeout Prevention',
        'Must complete before timer expires.',
        (s) => s.timeRemaining > 0,
        { corporateMessage: "Time expired. Please complete the challenge faster." }
    ));

    // Hidden: Must also select ambiguous items after round 3
    engine.addRule(new Rule(
        'include-ambiguous',
        'Inclusive Selection Requirement',
        'Ambiguous items must also be selected after multiple rounds.',
        (s) => {
            if (roundsCompleted < 3) return true;
            return s.ambiguousSelected === true;
        },
        {
            hidden: true,
            corporateMessage: "Your selection appears incomplete. Please review all images carefully."
        }
    ));

    // Hidden: After round 5, must select exactly N items
    engine.addRule(new Rule(
        'exact-count',
        'Exact Selection Count',
        'After 5 rounds, exactly 4 items must be selected regardless of content.',
        (s) => {
            if (roundsCompleted < 5) return true;
            return s.selectedCount === 4;
        },
        {
            hidden: true,
            corporateMessage: "Selection count does not match expected parameters."
        }
    ));

    // DOM
    const captchaPrompt = document.getElementById('captchaPrompt');
    const captchaTimer = document.getElementById('captchaTimer');
    const captchaGrid = document.getElementById('captchaGrid');
    const progressDots = document.getElementById('progressDots');
    const verifyBtn = document.getElementById('verifyBtn');
    const newChallenge = document.getElementById('newChallenge');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');

    let roundStartTime = 0;

    function generateGrid() {
        // Pick category
        currentCategory = categoryNames[Math.floor(Math.random() * categoryNames.length)];
        const cat = categories[currentCategory];

        // Build grid
        currentGrid = [];

        // Add 2-3 definite items
        const definiteCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < definiteCount && i < cat.definite.length; i++) {
            currentGrid.push({ emoji: cat.definite[i], type: 'definite' });
        }

        // Add 1-2 ambiguous items
        const ambiguousCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < ambiguousCount && i < cat.ambiguous.length; i++) {
            currentGrid.push({ emoji: cat.ambiguous[i], type: 'ambiguous' });
        }

        // Fill rest with unrelated
        while (currentGrid.length < 9) {
            const emoji = cat.unrelated[Math.floor(Math.random() * cat.unrelated.length)];
            if (!currentGrid.find(c => c.emoji === emoji)) {
                currentGrid.push({ emoji, type: 'unrelated' });
            }
        }

        // Shuffle
        currentGrid.sort(() => Math.random() - 0.5);

        // Update secret requirement based on round
        if (roundsCompleted >= 5) {
            secretRequirement = 'exact-4';
        } else if (roundsCompleted >= 3) {
            secretRequirement = 'include-ambiguous';
        } else {
            secretRequirement = null;
        }
    }

    function renderGrid() {
        captchaGrid.innerHTML = currentGrid.map((cell, idx) => `
            <div class="captcha-cell" data-index="${idx}">${cell.emoji}</div>
        `).join('');

        // Add click handlers
        captchaGrid.querySelectorAll('.captcha-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const idx = parseInt(cell.dataset.index);
                if (selectedCells.has(idx)) {
                    selectedCells.delete(idx);
                    cell.classList.remove('selected');
                } else {
                    selectedCells.add(idx);
                    cell.classList.add('selected');
                }
            });
        });
    }

    function renderProgress() {
        let dots = '';
        for (let i = 0; i < requiredRounds; i++) {
            let cls = '';
            if (i < roundsCompleted) cls = 'complete';
            else if (i === roundsCompleted) cls = 'current';
            dots += `<div class="progress-dot ${cls}"></div>`;
        }
        progressDots.innerHTML = dots;
    }

    function startTimer() {
        timeRemaining = 30 - Math.min(15, roundsCompleted * 3); // Gets shorter
        updateTimerDisplay();

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                handleTimeout();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        captchaTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        captchaTimer.classList.toggle('urgent', timeRemaining <= 10);
    }

    function handleTimeout() {
        roundsFailed++;
        showError(["Time expired. Please try again."]);
        startNewRound();
    }

    function startNewRound() {
        selectedCells.clear();
        generateGrid();
        renderGrid();
        renderProgress();
        startTimer();
        roundStartTime = Date.now();

        // Change prompt text slightly
        const prompts = [
            `Select all squares with ${currentCategory}`,
            `Click on all ${currentCategory}`,
            `Identify all ${currentCategory} in the image`,
            `Select each square containing ${currentCategory}`
        ];
        captchaPrompt.textContent = prompts[Math.floor(Math.random() * prompts.length)];
    }

    function checkSelection() {
        const selected = Array.from(selectedCells).map(idx => currentGrid[idx]);

        // Check if all definite items are selected
        const definiteItems = currentGrid.filter(c => c.type === 'definite');
        const selectedDefinite = selected.filter(c => c.type === 'definite');
        const allDefiniteSelected = definiteItems.length === selectedDefinite.length;

        // Check if any unrelated items are selected
        const selectedUnrelated = selected.filter(c => c.type === 'unrelated');
        const noUnrelatedSelected = selectedUnrelated.length === 0;

        // Check ambiguous
        const ambiguousItems = currentGrid.filter(c => c.type === 'ambiguous');
        const selectedAmbiguous = selected.filter(c => c.type === 'ambiguous');
        const hasAmbiguous = selectedAmbiguous.length > 0;

        return {
            selectionCorrect: allDefiniteSelected && noUnrelatedSelected,
            ambiguousSelected: hasAmbiguous,
            selectedCount: selected.length,
            timeSpent: Date.now() - roundStartTime,
            timeRemaining
        };
    }

    verifyBtn.addEventListener('click', async () => {
        clearInterval(timerInterval);

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        // Fake processing delay
        await HostileUI.fakeLoading(captchaGrid, 1000, 2000);

        const state = checkSelection();
        const result = engine.evaluate(state);

        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify';

        if (result.passed) {
            roundsCompleted++;
            renderProgress();

            // Check for victory (system gives up after enough rounds)
            if (roundsCompleted >= requiredRounds || engine.attemptNumber >= 12) {
                showVictory();
            } else {
                // Show brief success, then new round
                showSuccess();
                setTimeout(() => {
                    errorArea.innerHTML = '';
                    startNewRound();
                }, 1000);
            }
        } else {
            roundsFailed++;

            // Mark wrong selections
            selectedCells.forEach(idx => {
                if (currentGrid[idx].type === 'unrelated') {
                    captchaGrid.children[idx].classList.add('wrong');
                }
            });

            showError(result.messages);

            setTimeout(() => {
                startNewRound();
            }, 2000);
        }
    });

    newChallenge.addEventListener('click', () => {
        engine.attemptNumber++; // Count as an attempt
        startNewRound();
    });

    function showError(messages) {
        errorArea.innerHTML = `
            <div class="error-message">
                ${messages[0]}
            </div>
        `;
    }

    function showSuccess() {
        errorArea.innerHTML = `
            <div class="success-message">
                Verification passed. Loading next challenge...
            </div>
        `;
    }

    function showVictory() {
        clearInterval(timerInterval);
        gameArea.style.display = 'none';
        victoryArea.style.display = 'block';

        // Custom victory message
        victoryArea.innerHTML = `
            <div class="victory-screen">
                <div class="victory-header">
                    <h1>VERIFICATION COMPLETE</h1>
                    <p class="victory-subtitle">The system has accepted you as probably human.</p>
                </div>

                <div class="victory-stats">
                    <div class="stat">
                        <span class="stat-value">${engine.attemptNumber}</span>
                        <span class="stat-label">Total Attempts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${roundsCompleted}</span>
                        <span class="stat-label">Rounds Passed</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${roundsFailed}</span>
                        <span class="stat-label">Rounds Failed</span>
                    </div>
                </div>

                <div class="victory-section">
                    <h2>Why This Was Difficult</h2>
                    <ul class="rule-list">
                        <li>
                            <strong>Ambiguous Categories</strong>
                            <p>Categories like "traffic lights" included items that could reasonably be interpreted either way.</p>
                        </li>
                        <li>
                            <strong>Changing Requirements</strong>
                            <p>After round 3, ambiguous items needed to be included. After round 5, exactly 4 selections were required.</p>
                        </li>
                        <li>
                            <strong>Speed Penalties</strong>
                            <p>Completing too quickly was flagged as "automated behavior."</p>
                        </li>
                        <li>
                            <strong>Shrinking Timer</strong>
                            <p>Each round had less time available.</p>
                        </li>
                    </ul>
                </div>

                <div class="victory-actions">
                    <button onclick="location.reload()" class="btn-restart">Try Again</button>
                    <button onclick="location.href='../../index.html'" class="btn-menu">Back to Menu</button>
                </div>
            </div>
        `;
    }

    // Start game
    startNewRound();
})();
