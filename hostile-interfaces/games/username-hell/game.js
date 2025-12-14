/**
 * Username Availability Hell
 *
 * Goal: Choose a valid username
 * The namespace is infinite but nothing is ever available.
 * Win condition: arbitrary acceptance after enough suffering.
 */

(function() {
    const engine = new RuleEngine('Username Hell');

    let lastCheckTime = 0;
    let checksThisMinute = 0;
    let currentUsername = '';
    let isAvailable = false;
    let hasChecked = false;
    const attemptedUsernames = [];
    const magicNumber = 7 + Math.floor(Math.random() * 5); // Win after 7-12 attempts

    // Rules
    engine.addRule(new Rule(
        'length-min',
        'Minimum Length',
        'Username must be at least 3 characters.',
        (s) => s.username.length >= 3,
        { corporateMessage: "Username is too short." }
    ));

    engine.addRule(new Rule(
        'length-max',
        'Maximum Length',
        'Username must be no more than 20 characters.',
        (s) => s.username.length <= 20,
        { corporateMessage: "Username is too long." }
    ));

    engine.addRule(new Rule(
        'alphanumeric',
        'Character Restriction',
        'Username can only contain letters, numbers, and underscores.',
        (s) => /^[a-zA-Z0-9_]+$/.test(s.username),
        { corporateMessage: "Username contains invalid characters." }
    ));

    engine.addRule(new Rule(
        'starts-letter',
        'Initial Character',
        'Username must start with a letter.',
        (s) => /^[a-zA-Z]/.test(s.username),
        {
            hidden: true,
            activatesAfter: 3,
            corporateMessage: "Username format is not acceptable."
        }
    ));

    engine.addRule(new Rule(
        'no-consecutive-underscores',
        'Underscore Restriction',
        'Username cannot contain consecutive underscores.',
        (s) => !/__/.test(s.username),
        {
            hidden: true,
            activatesAfter: 4,
            corporateMessage: "Username contains a restricted pattern."
        }
    ));

    engine.addRule(new Rule(
        'availability',
        'Availability Check',
        'Username must be available.',
        (s) => s.isAvailable === true,
        { corporateMessage: "This username is not available." }
    ));

    engine.addRule(new Rule(
        'rate-limit',
        'Rate Limiting',
        'Cannot check too many usernames too quickly.',
        (s) => s.checksThisMinute <= 5,
        {
            hidden: true,
            corporateMessage: "Too many requests. Please wait."
        }
    ));

    // DOM
    const usernameInput = document.getElementById('username');
    const availabilityIndicator = document.getElementById('availabilityIndicator');
    const attemptCounter = document.getElementById('attemptCounter');
    const rateLimitWarning = document.getElementById('rateLimitWarning');
    const suggestions = document.getElementById('suggestions');
    const suggestionList = document.getElementById('suggestionList');
    const checkBtn = document.getElementById('checkBtn');
    const claimBtn = document.getElementById('claimBtn');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');

    // Generate terrible suggestions
    function generateSuggestions(base) {
        const suffixes = [
            '_2024', '_official', '_real', '123', '_x', '_gaming',
            '_pro', '_thereal', '69', '420', '_fan', '_lover',
            '_user' + Math.floor(Math.random() * 9999)
        ];

        const suggestions = [];
        for (let i = 0; i < 5; i++) {
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            suggestions.push(base + suffix);
        }
        return suggestions;
    }

    // Check "availability" - always taken until magic number
    function checkAvailability(username) {
        // These are always "taken"
        const alwaysTaken = ['admin', 'user', 'test', 'guest', 'root', 'system'];
        if (alwaysTaken.includes(username.toLowerCase())) {
            return false;
        }

        // Win condition: after enough attempts, accept one
        if (attemptedUsernames.length >= magicNumber) {
            // 50% chance of being available after magic number
            return Math.random() > 0.5;
        }

        // Otherwise always taken
        return false;
    }

    // Show availability status
    function showAvailability(available) {
        if (available) {
            availabilityIndicator.textContent = '✓ Available';
            availabilityIndicator.className = 'availability-indicator available';
            claimBtn.disabled = false;
        } else {
            availabilityIndicator.textContent = '✗ Taken';
            availabilityIndicator.className = 'availability-indicator taken';
            claimBtn.disabled = true;

            // Show suggestions
            const suggs = generateSuggestions(usernameInput.value);
            suggestionList.innerHTML = suggs.map((s, i) => {
                // Some suggestions are crossed out (also "taken")
                const isBad = i < 2;
                return `<span class="suggestion ${isBad ? 'bad' : ''}" data-username="${s}">${s}</span>`;
            }).join('');
            suggestions.style.display = 'block';
        }
    }

    // Check button handler
    checkBtn.addEventListener('click', async () => {
        currentUsername = usernameInput.value.trim();

        // Rate limit check
        const now = Date.now();
        if (now - lastCheckTime < 60000) {
            checksThisMinute++;
        } else {
            checksThisMinute = 1;
            lastCheckTime = now;
        }

        if (checksThisMinute > 5) {
            rateLimitWarning.style.display = 'block';
            setTimeout(() => {
                rateLimitWarning.style.display = 'none';
                checksThisMinute = 0;
            }, 5000);
            return;
        }

        // Basic validation
        const basicResult = engine.evaluate({
            username: currentUsername,
            isAvailable: true, // Bypass availability for basic check
            checksThisMinute
        });

        if (!basicResult.passed && !basicResult.failures.every(f => f.id === 'availability')) {
            showError(basicResult.messages);
            return;
        }

        // Fake loading
        availabilityIndicator.textContent = 'Checking...';
        availabilityIndicator.className = 'availability-indicator checking';
        checkBtn.disabled = true;

        await HostileUI.fakeLoading(usernameInput, 800, 2000);

        checkBtn.disabled = false;

        // Check availability
        isAvailable = checkAvailability(currentUsername);

        if (!attemptedUsernames.includes(currentUsername)) {
            attemptedUsernames.push(currentUsername);
        }

        hasChecked = true;
        showAvailability(isAvailable);
        updateAttemptCounter();
    });

    // Claim button handler
    claimBtn.addEventListener('click', () => {
        const result = engine.evaluate({
            username: currentUsername,
            isAvailable,
            checksThisMinute
        });

        if (result.passed) {
            showVictory();
        } else {
            // Username became unavailable!
            isAvailable = false;
            showAvailability(false);
            showError(["This username was just claimed by another user. Please try a different one."]);
        }
    });

    // Click on suggestion
    suggestionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion') && !e.target.classList.contains('bad')) {
            usernameInput.value = e.target.dataset.username;
            suggestions.style.display = 'none';
            hasChecked = false;
            claimBtn.disabled = true;
            availabilityIndicator.textContent = '';
        }
    });

    // Input change resets state
    usernameInput.addEventListener('input', () => {
        hasChecked = false;
        claimBtn.disabled = true;
        availabilityIndicator.textContent = '';
        suggestions.style.display = 'none';
        errorArea.innerHTML = '';
    });

    function updateAttemptCounter() {
        attemptCounter.textContent = `${attemptedUsernames.length} username(s) checked`;
    }

    function showError(messages) {
        errorArea.innerHTML = `
            <div class="error-message">
                ${messages.map(m => `<p>${m}</p>`).join('')}
            </div>
        `;
    }

    function showVictory() {
        gameArea.style.display = 'none';
        victoryArea.style.display = 'block';

        victoryArea.innerHTML = `
            <div class="victory-screen">
                <div class="victory-header">
                    <h1>USERNAME CLAIMED</h1>
                    <p class="victory-subtitle">Welcome, ${currentUsername}! Your persistence has been rewarded.</p>
                </div>

                <div class="victory-stats">
                    <div class="stat">
                        <span class="stat-value">${attemptedUsernames.length}</span>
                        <span class="stat-label">Usernames Tried</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${engine.getStats().timeSpentFormatted}</span>
                        <span class="stat-label">Time Spent</span>
                    </div>
                </div>

                <div class="victory-section">
                    <h2>Rejected Usernames</h2>
                    <ul class="rule-list">
                        ${attemptedUsernames.slice(0, -1).map(u => `
                            <li>${u} - <span class="text-danger">Taken</span></li>
                        `).join('')}
                    </ul>
                </div>

                <div class="victory-section">
                    <h2>The Truth</h2>
                    <p class="disclosure-note">
                        The system was configured to reject all usernames until you tried at least ${magicNumber} times.
                        After that, availability became randomly possible. The "suggestions" were intentionally terrible,
                        and some were pre-marked as taken to waste your time.
                    </p>
                </div>

                <div class="victory-actions">
                    <button onclick="location.reload()" class="btn-restart">Try Again</button>
                    <button onclick="location.href='../../index.html'" class="btn-menu">Back to Menu</button>
                </div>
            </div>
        `;
    }
})();
