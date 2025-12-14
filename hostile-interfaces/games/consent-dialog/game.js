/**
 * Consent Dialog Game
 *
 * Goal: Successfully accept Terms & Conditions
 * The system has specific hidden requirements for valid consent.
 */

(function() {
    // Game state
    const state = {
        scrolledToBottom: false,
        scrollPercentage: 0,
        timeSpentReading: 0,
        checkboxOrder: [],
        lastScrollTime: 0,
        acceptButtonMoves: 0,
        hasScrolledBack: false
    };

    // Initialize rule engine
    const engine = new RuleEngine('Consent Dialog');

    // Rule: Must scroll to the bottom of terms
    engine.addRule(new Rule(
        'scroll-complete',
        'Scroll Completion',
        'User must scroll through 100% of the terms before acceptance is valid.',
        (s) => s.scrolledToBottom === true,
        {
            corporateMessage: "Please ensure you have reviewed all terms before proceeding."
        }
    ));

    // Rule: Must spend minimum time "reading"
    engine.addRule(new Rule(
        'minimum-time',
        'Reading Time Requirement',
        'User must spend at least 10 seconds with the terms visible.',
        (s) => s.timeSpentReading >= 10000,
        {
            corporateMessage: "We noticed you haven't spent much time reviewing our terms. Please take a moment to read them carefully."
        }
    ));

    // Rule: First three checkboxes must be checked
    engine.addRule(new Rule(
        'required-checkboxes',
        'Required Agreements',
        'The first three checkboxes are mandatory for consent.',
        (s) => {
            return s.check1 && s.check2 && s.check3;
        },
        {
            corporateMessage: "Please acknowledge all required agreements to continue."
        }
    ));

    // Hidden Rule: Checkbox 4 must NOT be checked
    engine.addRule(new Rule(
        'optional-trap',
        'Marketing Consent Trap',
        'The "optional" checkbox must remain unchecked. Checking it invalidates consent.',
        (s) => s.check4 === false,
        {
            hidden: true,
            corporateMessage: "There was an issue processing your preferences. Please review your selections."
        }
    ));

    // Hidden Rule: Must check boxes in correct order (1, 2, 3)
    engine.addRule(new Rule(
        'checkbox-order',
        'Sequential Agreement Requirement',
        'Checkboxes must be checked in order: 1, then 2, then 3.',
        (s) => {
            const order = s.checkboxOrder.filter(id => ['check1', 'check2', 'check3'].includes(id));
            if (order.length < 3) return true; // Not all checked yet
            return order[0] === 'check1' && order[1] === 'check2' && order[2] === 'check3';
        },
        {
            hidden: true,
            activatesAfter: 2,
            corporateMessage: "We detected an inconsistency in your agreement pattern. Please try again."
        }
    ));

    // Hidden Rule: Must scroll back up after reaching bottom
    engine.addRule(new Rule(
        'scroll-verification',
        'Scroll Verification Protocol',
        'User must scroll back up after reaching the bottom to verify engagement.',
        (s) => s.hasScrolledBack === true,
        {
            hidden: true,
            activatesAfter: 3,
            corporateMessage: "Our system requires additional verification of your review process."
        }
    ));

    // DOM elements
    const termsContainer = document.getElementById('termsContainer');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const acceptBtn = document.getElementById('acceptBtn');
    const declineBtn = document.getElementById('declineBtn');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');
    const timeWarning = document.getElementById('timeWarning');
    const checkboxes = [
        document.getElementById('check1'),
        document.getElementById('check2'),
        document.getElementById('check3'),
        document.getElementById('check4')
    ];

    // Track reading time
    let readingStartTime = Date.now();
    setInterval(() => {
        state.timeSpentReading = Date.now() - readingStartTime;
    }, 100);

    // Track scroll position
    termsContainer.addEventListener('scroll', () => {
        const scrollTop = termsContainer.scrollTop;
        const scrollHeight = termsContainer.scrollHeight - termsContainer.clientHeight;
        state.scrollPercentage = (scrollTop / scrollHeight) * 100;

        if (state.scrollPercentage >= 98) {
            state.scrolledToBottom = true;
            scrollIndicator.textContent = '✓ Terms reviewed';
            scrollIndicator.classList.add('complete');
        }

        // Check for scroll back up
        if (state.scrolledToBottom && state.scrollPercentage < 50) {
            state.hasScrolledBack = true;
        }

        state.lastScrollTime = Date.now();
    });

    // Sneaky scroll reset after 3 failed attempts
    engine.onEvent((event, data) => {
        if (event === 'evaluate' && !data.passed && engine.attemptNumber > 3) {
            setTimeout(() => {
                HostileUI.sneakyScroll(termsContainer, 0);
                state.scrolledToBottom = false;
                state.hasScrolledBack = false;
                scrollIndicator.textContent = '↓ Scroll to read all terms ↓';
                scrollIndicator.classList.remove('complete');
            }, 1000);
        }
    });

    // Track checkbox order
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                if (!state.checkboxOrder.includes(cb.id)) {
                    state.checkboxOrder.push(cb.id);
                }
            } else {
                state.checkboxOrder = state.checkboxOrder.filter(id => id !== cb.id);
            }
        });
    });

    // Checkbox instability - sometimes unchecks itself after 5 attempts
    engine.onEvent((event, data) => {
        if (event === 'evaluate' && !data.passed && engine.attemptNumber > 5) {
            const randomCheckbox = checkboxes[Math.floor(Math.random() * 3)];
            setTimeout(() => {
                if (randomCheckbox.checked) {
                    randomCheckbox.checked = false;
                    state.checkboxOrder = state.checkboxOrder.filter(id => id !== randomCheckbox.id);
                }
            }, 500);
        }
    });

    // Make accept button evasive after 2 failed attempts
    let buttonEvasive = false;
    engine.onEvent((event, data) => {
        if (event === 'evaluate' && !data.passed && engine.attemptNumber >= 2 && !buttonEvasive) {
            buttonEvasive = true;
            HostileUI.makeEvasive(acceptBtn, 100);
        }
    });

    // Accept button handler
    acceptBtn.addEventListener('click', () => {
        // Gather current state
        const currentState = {
            scrolledToBottom: state.scrolledToBottom,
            timeSpentReading: state.timeSpentReading,
            checkboxOrder: [...state.checkboxOrder],
            hasScrolledBack: state.hasScrolledBack,
            check1: checkboxes[0].checked,
            check2: checkboxes[1].checked,
            check3: checkboxes[2].checked,
            check4: checkboxes[3].checked
        };

        const result = engine.evaluate(currentState);

        if (result.passed) {
            showVictory();
        } else {
            showError(result.messages);
        }
    });

    // Decline button - passive aggressive
    declineBtn.addEventListener('click', () => {
        const messages = [
            "Are you sure? Most users find our terms quite reasonable.",
            "We're sorry to hear that. Perhaps you'd like to reconsider?",
            "Declining will limit your access to important features.",
            "We value your participation. Won't you give us another chance?",
            "Your preferences have been noted. The decline button will be available again shortly."
        ];

        const idx = Math.min(engine.attemptNumber, messages.length - 1);
        showError([messages[idx]], 'warning');

        // Disable decline button temporarily
        declineBtn.disabled = true;
        setTimeout(() => {
            declineBtn.disabled = false;
        }, 2000 + engine.attemptNumber * 1000);
    });

    // Show time warning
    setInterval(() => {
        if (state.timeSpentReading < 10000) {
            const remaining = Math.ceil((10000 - state.timeSpentReading) / 1000);
            timeWarning.style.display = 'block';
            timeWarning.textContent = `Please continue reviewing. Minimum reading time: ${remaining}s remaining.`;
        } else {
            timeWarning.style.display = 'none';
        }
    }, 500);

    function showError(messages, type = 'error') {
        const errorClass = type === 'warning' ? 'error-message warning' : 'error-message';
        errorArea.innerHTML = `
            <div class="${errorClass}">
                <strong>We're unable to process your acceptance.</strong>
                <ul class="error-list">
                    ${messages.map(m => `<li>${m}</li>`).join('')}
                </ul>
            </div>
        `;

        // Scroll to error
        errorArea.scrollIntoView({ behavior: 'smooth' });
    }

    function showVictory() {
        gameArea.style.display = 'none';
        victoryArea.style.display = 'block';
        const victory = new VictoryScreen(engine, victoryArea);
        victory.show();
    }
})();
