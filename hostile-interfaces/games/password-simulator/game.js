/**
 * Password Creation Simulator
 *
 * Goal: Create an acceptable password
 * Rules contradict each other and evolve over time.
 */

(function() {
    const engine = new RuleEngine('Password Simulator');
    const previousPasswords = [];

    // Visible requirements - shown to user
    const visibleRequirements = [
        { id: 'min-length', text: 'At least 8 characters', check: (p) => p.length >= 8 },
        { id: 'max-length', text: 'No more than 20 characters', check: (p) => p.length <= 20 },
        { id: 'uppercase', text: 'Contains uppercase letter', check: (p) => /[A-Z]/.test(p) },
        { id: 'lowercase', text: 'Contains lowercase letter', check: (p) => /[a-z]/.test(p) },
        { id: 'number', text: 'Contains a number', check: (p) => /\d/.test(p) },
        { id: 'special', text: 'Contains special character (!@#$%^&*)', check: (p) => /[!@#$%^&*]/.test(p) }
    ];

    // Add visible rules
    visibleRequirements.forEach(req => {
        engine.addRule(new Rule(
            req.id,
            req.text,
            req.text,
            (s) => req.check(s.password || ''),
            { corporateMessage: `Password must meet requirement: ${req.text}` }
        ));
    });

    // Hidden Rule: No consecutive repeated characters
    engine.addRule(new Rule(
        'no-repeats',
        'No Consecutive Repeats',
        'Password cannot contain the same character three times in a row.',
        (s) => !/(.)\1\1/.test(s.password || ''),
        {
            hidden: true,
            activatesAfter: 2,
            corporateMessage: "Password contains an invalid character pattern."
        }
    ));

    // Hidden Rule: Must contain exactly 2 numbers (not more, not less)
    engine.addRule(new Rule(
        'exact-numbers',
        'Exact Number Requirement',
        'Password must contain exactly 2 digits.',
        (s) => {
            const digits = (s.password || '').match(/\d/g);
            return digits && digits.length === 2;
        },
        {
            hidden: true,
            activatesAfter: 3,
            corporateMessage: "The numeric composition of your password is not optimal."
        }
    ));

    // Hidden Rule: Cannot contain common words
    engine.addRule(new Rule(
        'no-common-words',
        'Common Word Restriction',
        'Password cannot contain common words like "password", "admin", "user", "login".',
        (s) => {
            const lower = (s.password || '').toLowerCase();
            const common = ['password', 'admin', 'user', 'login', 'welcome', 'hello', 'test'];
            return !common.some(word => lower.includes(word));
        },
        {
            hidden: true,
            corporateMessage: "Password contains restricted character sequences."
        }
    ));

    // Hidden Rule: First character must be a letter (activates after 4 attempts)
    engine.addRule(new Rule(
        'starts-with-letter',
        'Initial Character Requirement',
        'Password must begin with a letter.',
        (s) => /^[a-zA-Z]/.test(s.password || ''),
        {
            hidden: true,
            activatesAfter: 4,
            corporateMessage: "Password format does not meet security guidelines."
        }
    ));

    // Hidden Rule: Cannot end with a number (activates after 5 attempts)
    engine.addRule(new Rule(
        'no-end-number',
        'Terminal Character Restriction',
        'Password cannot end with a digit.',
        (s) => !/\d$/.test(s.password || ''),
        {
            hidden: true,
            activatesAfter: 5,
            corporateMessage: "The structure of your password has been flagged by our security system."
        }
    ));

    // Hidden Rule: Cannot be similar to previous attempts
    engine.addRule(new Rule(
        'not-similar',
        'Uniqueness Requirement',
        'Password must be significantly different from previous attempts.',
        (s) => {
            if (previousPasswords.length === 0) return true;
            const current = s.password || '';
            return !previousPasswords.some(prev => {
                // Check if more than 50% similar
                let matches = 0;
                for (let i = 0; i < Math.min(current.length, prev.length); i++) {
                    if (current[i] === prev[i]) matches++;
                }
                return matches / Math.max(current.length, prev.length) > 0.5;
            });
        },
        {
            hidden: true,
            activatesAfter: 3,
            corporateMessage: "This password is too similar to a previous attempt."
        }
    ));

    // Hidden Rule: Passwords match (but confirm field randomly clears)
    engine.addRule(new Rule(
        'passwords-match',
        'Confirmation Match',
        'Password and confirmation must match.',
        (s) => s.password === s.confirmPassword,
        {
            corporateMessage: "Passwords do not match. Please re-enter."
        }
    ));

    // DOM elements
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const toggleBtn = document.getElementById('toggleVisibility');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const requirementsList = document.getElementById('requirementsList');
    const submitBtn = document.getElementById('submitBtn');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');
    const previousPasswordsDiv = document.getElementById('previousPasswords');
    const previousList = document.getElementById('previousList');

    // Disable paste
    HostileUI.disablePaste(passwordInput);
    HostileUI.disablePaste(confirmInput);

    // Random cursor repositioning after 3 attempts
    engine.onEvent((event, data) => {
        if (event === 'evaluate' && !data.passed && engine.attemptNumber >= 3) {
            HostileUI.randomizeCursor(passwordInput);
        }
    });

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        confirmInput.type = type;
        toggleBtn.textContent = type === 'password' ? 'Show' : 'Hide';
    });

    // Render visible requirements
    function renderRequirements() {
        requirementsList.innerHTML = visibleRequirements.map(req => {
            const password = passwordInput.value;
            const passed = req.check(password);
            const status = password.length === 0 ? 'pending' : (passed ? 'pass' : 'fail');
            const icon = status === 'pass' ? '✓' : (status === 'fail' ? '✗' : '○');

            return `
                <div class="requirement">
                    <span class="requirement-icon ${status}">${icon}</span>
                    <span>${req.text}</span>
                </div>
            `;
        }).join('');
    }

    // Lying strength meter
    function updateStrengthMeter() {
        const password = passwordInput.value;

        if (password.length === 0) {
            strengthFill.className = 'strength-meter-fill';
            strengthFill.style.width = '0%';
            strengthText.textContent = 'Not entered';
            strengthText.className = 'strength-text';
            return;
        }

        // Calculate "real" strength
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*]/.test(password)) score++;

        // But lie about it after a few attempts
        let displayScore = score;
        if (engine.attemptNumber >= 2) {
            // Randomly adjust the displayed strength
            displayScore = Math.max(1, Math.min(6, score + (Math.random() > 0.5 ? -1 : 1)));
        }

        const levels = ['weak', 'weak', 'fair', 'fair', 'good', 'good', 'strong'];
        const labels = ['Weak', 'Weak', 'Fair', 'Fair', 'Good', 'Good', 'Strong'];
        const widths = ['15%', '25%', '40%', '50%', '65%', '80%', '100%'];

        const level = levels[displayScore];
        strengthFill.className = `strength-meter-fill ${level}`;
        strengthFill.style.width = widths[displayScore];
        strengthText.textContent = labels[displayScore];
        strengthText.className = `strength-text ${level}`;
    }

    // Update on input
    passwordInput.addEventListener('input', () => {
        renderRequirements();
        updateStrengthMeter();
    });

    // Randomly clear confirm field after failed attempts
    engine.onEvent((event, data) => {
        if (event === 'evaluate' && !data.passed && engine.attemptNumber >= 2) {
            if (Math.random() > 0.5) {
                setTimeout(() => {
                    confirmInput.value = '';
                }, 300);
            }
        }
    });

    // Show previous passwords
    function showPreviousPasswords() {
        if (previousPasswords.length > 0) {
            previousPasswordsDiv.style.display = 'block';
            previousList.innerHTML = previousPasswords.map(p => {
                // Partially mask the password
                const masked = p.substring(0, 2) + '*'.repeat(p.length - 4) + p.substring(p.length - 2);
                return `<li>${masked}</li>`;
            }).join('');
        }
    }

    // Submit handler
    submitBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;

        // Store for history
        if (password && !previousPasswords.includes(password)) {
            previousPasswords.push(password);
            showPreviousPasswords();
        }

        const result = engine.evaluate({ password, confirmPassword });

        if (result.passed) {
            showVictory();
        } else {
            showError(result.messages);

            // Clear confirm field on mismatch
            if (result.failures.some(f => f.id === 'passwords-match')) {
                confirmInput.value = '';
            }
        }
    });

    function showError(messages) {
        // Pick one or two messages (don't reveal all problems)
        const displayMessages = messages.slice(0, Math.min(2, messages.length));

        errorArea.innerHTML = `
            <div class="error-message">
                <strong>Password does not meet requirements.</strong>
                <ul class="error-list">
                    ${displayMessages.map(m => `<li>${m}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    function showVictory() {
        gameArea.style.display = 'none';
        victoryArea.style.display = 'block';
        const victory = new VictoryScreen(engine, victoryArea);
        victory.show();
    }

    // Initial render
    renderRequirements();
})();
