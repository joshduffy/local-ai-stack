/**
 * Two-Factor Authentication Dungeon
 *
 * Goal: Log in successfully
 * Win condition: correct sequence of failures unlocks the account.
 */

(function() {
    const engine = new RuleEngine('Two-Factor Dungeon');

    // State
    let selectedMethod = null;
    let currentCode = '';
    let generatedCode = '';
    let codeExpiry = 0;
    let timerInterval = null;
    let methodAttempts = { sms: 0, email: 0, app: 0, backup: 0 };
    let totalAttempts = 0;
    let smsBlocked = false;
    let emailBlocked = false;

    // Backup codes (some are "used")
    const backupCodes = [
        { code: 'ABCD-1234', used: false },
        { code: 'EFGH-5678', used: true },
        { code: 'IJKL-9012', used: false },
        { code: 'MNOP-3456', used: true },
        { code: 'QRST-7890', used: false },
        { code: 'UVWX-2468', used: true }
    ];

    // The "correct" method changes based on attempts
    function getCorrectMethod() {
        if (totalAttempts < 3) return 'none'; // Nothing works early
        if (totalAttempts < 5) return 'app'; // App works after 3 attempts
        if (totalAttempts < 7) return 'backup'; // Backup after 5
        return 'any'; // Anything works after 7
    }

    // Rules
    engine.addRule(new Rule(
        'correct-code',
        'Code Verification',
        'Entered code must match the generated code.',
        (s) => s.enteredCode === s.generatedCode,
        { corporateMessage: "The code you entered is incorrect." }
    ));

    engine.addRule(new Rule(
        'code-not-expired',
        'Code Expiration',
        'Code must not be expired.',
        (s) => s.codeExpiry > Date.now(),
        { corporateMessage: "This code has expired. Please request a new one." }
    ));

    engine.addRule(new Rule(
        'correct-method',
        'Method Selection',
        'The authentication method must be the currently acceptable one.',
        (s) => {
            const correct = getCorrectMethod();
            if (correct === 'none') return false;
            if (correct === 'any') return true;
            return s.method === correct;
        },
        {
            hidden: true,
            corporateMessage: "We were unable to verify using this method. Please try an alternative."
        }
    ));

    engine.addRule(new Rule(
        'method-not-blocked',
        'Channel Availability',
        'The selected method must not be temporarily blocked.',
        (s) => {
            if (s.method === 'sms' && smsBlocked) return false;
            if (s.method === 'email' && emailBlocked) return false;
            return true;
        },
        {
            hidden: true,
            corporateMessage: "This verification channel is temporarily unavailable."
        }
    ));

    // DOM
    const methodSelection = document.getElementById('methodSelection');
    const codeEntry = document.getElementById('codeEntry');
    const backupEntry = document.getElementById('backupEntry');
    const channelMessage = document.getElementById('channelMessage');
    const codeTimer = document.getElementById('codeTimer');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const verifyBackupBtn = document.getElementById('verifyBackupBtn');
    const resendLink = document.getElementById('resendLink');
    const tryDifferent = document.getElementById('tryDifferent');
    const backTryDifferent = document.getElementById('backTryDifferent');
    const backupCodeList = document.getElementById('backupCodeList');
    const backupCodeInput = document.getElementById('backupCodeInput');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');
    const codeDigits = document.querySelectorAll('.code-digit');
    const authMethods = document.querySelectorAll('.auth-method');

    // Generate a random 6-digit code
    function generateCode() {
        generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        codeExpiry = Date.now() + 30000; // 30 seconds
        return generatedCode;
    }

    // Start code timer
    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((codeExpiry - Date.now()) / 1000));
            codeTimer.textContent = `Code expires in 0:${remaining.toString().padStart(2, '0')}`;
            codeTimer.classList.toggle('expiring', remaining <= 10);

            if (remaining <= 0) {
                clearInterval(timerInterval);
                codeTimer.textContent = 'Code expired';
            }
        }, 1000);
    }

    // Select authentication method
    authMethods.forEach(method => {
        method.addEventListener('click', () => {
            if (method.classList.contains('disabled')) return;

            selectedMethod = method.dataset.method;
            totalAttempts++;

            if (selectedMethod === 'backup') {
                showBackupEntry();
            } else {
                showCodeEntry();
            }
        });
    });

    function showCodeEntry() {
        methodSelection.style.display = 'none';
        codeEntry.style.display = 'block';
        backupEntry.style.display = 'none';
        errorArea.innerHTML = '';

        // Clear code inputs
        codeDigits.forEach(d => d.value = '');
        codeDigits[0].focus();

        const code = generateCode();
        startTimer();

        // Channel-specific messages
        const messages = {
            sms: `We've sent a verification code to your phone ending in 4521. Enter the code below.`,
            email: `We've sent a verification code to your email. Check your inbox (and spam folder).`,
            app: `Open your authenticator app and enter the current code for this account.`
        };

        channelMessage.textContent = messages[selectedMethod];

        // Randomly block SMS after using it
        if (selectedMethod === 'sms' && methodAttempts.sms > 0 && Math.random() > 0.5) {
            smsBlocked = true;
            updateMethodStatus();
        }

        // Randomly block email
        if (selectedMethod === 'email' && methodAttempts.email > 1 && Math.random() > 0.5) {
            emailBlocked = true;
            updateMethodStatus();
        }

        methodAttempts[selectedMethod]++;
    }

    function showBackupEntry() {
        methodSelection.style.display = 'none';
        codeEntry.style.display = 'none';
        backupEntry.style.display = 'block';
        errorArea.innerHTML = '';

        // Render backup codes
        backupCodeList.innerHTML = backupCodes.map(bc => `
            <div class="backup-code ${bc.used ? 'used' : ''}">${bc.code}</div>
        `).join('');

        backupCodeInput.value = '';
        backupCodeInput.focus();

        methodAttempts.backup++;
    }

    function showMethodSelection() {
        methodSelection.style.display = 'block';
        codeEntry.style.display = 'none';
        backupEntry.style.display = 'none';
        clearInterval(timerInterval);
    }

    function updateMethodStatus() {
        authMethods.forEach(method => {
            const m = method.dataset.method;
            const status = method.querySelector('.auth-method-status');

            if (m === 'sms' && smsBlocked) {
                method.classList.add('disabled');
                status.textContent = 'Temporarily unavailable';
            }
            if (m === 'email' && emailBlocked) {
                method.classList.add('disabled');
                status.textContent = 'Temporarily unavailable';
            }
        });
    }

    // Code digit auto-advance
    codeDigits.forEach((digit, idx) => {
        digit.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value && idx < codeDigits.length - 1) {
                codeDigits[idx + 1].focus();
            }
        });

        digit.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !digit.value && idx > 0) {
                codeDigits[idx - 1].focus();
            }
        });
    });

    // Verify code
    verifyCodeBtn.addEventListener('click', () => {
        const enteredCode = Array.from(codeDigits).map(d => d.value).join('');

        const result = engine.evaluate({
            enteredCode,
            generatedCode,
            codeExpiry,
            method: selectedMethod
        });

        if (result.passed) {
            showVictory();
        } else {
            showError(result.messages);

            // Sometimes the code "changes" after failed attempt
            if (Math.random() > 0.7) {
                generateCode();
                showError(["For security reasons, a new code has been sent."]);
            }
        }
    });

    // Verify backup code
    verifyBackupBtn.addEventListener('click', () => {
        const enteredCode = backupCodeInput.value.trim().toUpperCase();
        const backupCode = backupCodes.find(bc => bc.code === enteredCode);

        if (!backupCode) {
            showError(["Invalid backup code."]);
            return;
        }

        if (backupCode.used) {
            showError(["This backup code has already been used."]);
            return;
        }

        // Check if backup method is "correct"
        const correctMethod = getCorrectMethod();
        if (correctMethod !== 'backup' && correctMethod !== 'any') {
            showError(["Backup code verification is currently disabled for your account."]);
            backupCode.used = true; // Mark as used anyway!
            showBackupEntry(); // Re-render
            return;
        }

        showVictory();
    });

    // Resend code
    resendLink.addEventListener('click', () => {
        generateCode();
        startTimer();
        codeDigits.forEach(d => d.value = '');
        showError(["A new code has been sent."], 'info');
        totalAttempts++;
    });

    // Try different method
    tryDifferent.addEventListener('click', showMethodSelection);
    backTryDifferent.addEventListener('click', showMethodSelection);

    function showError(messages, type = 'error') {
        const cls = type === 'info' ? 'error-message info' : 'error-message';
        errorArea.innerHTML = `
            <div class="${cls}">
                ${messages.map(m => `<p>${m}</p>`).join('')}
            </div>
        `;
    }

    function showVictory() {
        clearInterval(timerInterval);
        gameArea.style.display = 'none';
        victoryArea.style.display = 'block';

        victoryArea.innerHTML = `
            <div class="victory-screen">
                <div class="victory-header">
                    <h1>AUTHENTICATION SUCCESSFUL</h1>
                    <p class="victory-subtitle">Welcome back. Your persistence has been verified.</p>
                </div>

                <div class="victory-stats">
                    <div class="stat">
                        <span class="stat-value">${totalAttempts}</span>
                        <span class="stat-label">Total Attempts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${Object.values(methodAttempts).reduce((a,b) => a+b, 0)}</span>
                        <span class="stat-label">Methods Tried</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${engine.getStats().timeSpentFormatted}</span>
                        <span class="stat-label">Time Spent</span>
                    </div>
                </div>

                <div class="victory-section">
                    <h2>What Was Happening</h2>
                    <ul class="rule-list">
                        <li>
                            <strong>Method Cycling</strong>
                            <p>The "correct" method changed based on your attempt count. First nothing worked, then only the app, then only backup codes, then anything.</p>
                        </li>
                        <li>
                            <strong>Channel Blocking</strong>
                            <p>SMS and email were randomly marked as "unavailable" after use.</p>
                        </li>
                        <li>
                            <strong>Code Regeneration</strong>
                            <p>Sometimes after a failed attempt, the code was silently changed.</p>
                        </li>
                        <li>
                            <strong>Backup Code Trap</strong>
                            <p>Using a backup code when it wasn't the "correct" method would mark it as used but still fail.</p>
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
})();
