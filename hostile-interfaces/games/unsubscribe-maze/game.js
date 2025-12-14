/**
 * Unsubscribe Maze
 *
 * Goal: Leave the system
 * Win condition: exit without resubscribing.
 */

(function() {
    const engine = new RuleEngine('Unsubscribe Maze');

    let currentStep = 1;
    let selectedReason = null;
    let hasAcceptedOffer = false;
    let timesReconsidered = 0;
    let clickedKeep = 0;

    // Cancellation reasons (some lead to traps)
    const reasons = [
        {
            id: 'too-expensive',
            title: "It's too expensive",
            desc: "I can't afford the monthly fee",
            trap: true,
            trapResponse: "We have a special discount just for you!"
        },
        {
            id: 'not-using',
            title: "I'm not using it enough",
            desc: "I don't have time to use the features",
            trap: true,
            trapResponse: "Let us show you some quick ways to get value!"
        },
        {
            id: 'found-alternative',
            title: "I found a better alternative",
            desc: "Another service meets my needs better",
            trap: false
        },
        {
            id: 'missing-features',
            title: "Missing features I need",
            desc: "The service doesn't have what I'm looking for",
            trap: true,
            trapResponse: "Tell us what you need - we might have it!"
        },
        {
            id: 'temporary',
            title: "Just taking a break",
            desc: "I'll be back later",
            trap: true,
            trapResponse: "How about we pause your subscription instead?"
        },
        {
            id: 'other',
            title: "Other reason",
            desc: "Something else not listed above",
            trap: false
        }
    ];

    // Rules
    engine.addRule(new Rule(
        'completed-all-steps',
        'Process Completion',
        'User must navigate through all cancellation steps.',
        (s) => s.currentStep >= 4,
        { corporateMessage: "Please complete all required steps." }
    ));

    engine.addRule(new Rule(
        'selected-reason',
        'Reason Required',
        'A cancellation reason must be selected.',
        (s) => s.selectedReason !== null,
        { corporateMessage: "Please select a reason for cancellation." }
    ));

    engine.addRule(new Rule(
        'confirmed-understanding',
        'Confirmation Required',
        'User must confirm they understand the consequences.',
        (s) => s.confirmed === true,
        { corporateMessage: "Please confirm you understand the cancellation terms." }
    ));

    engine.addRule(new Rule(
        'not-resubscribed',
        'Clean Exit',
        'User must not have accepted any counter-offers.',
        (s) => !s.hasAcceptedOffer,
        {
            hidden: true,
            corporateMessage: "Your subscription status has been updated."
        }
    ));

    // Hidden: Must click "keep" at least once to enable final cancel
    engine.addRule(new Rule(
        'showed-hesitation',
        'Genuine Intent Verification',
        'User must demonstrate hesitation before cancellation is allowed.',
        (s) => clickedKeep >= 1 || timesReconsidered >= 2,
        {
            hidden: true,
            activatesAfter: 1,
            corporateMessage: "We need to verify your cancellation intent."
        }
    ));

    // DOM
    const steps = document.querySelectorAll('.step-content');
    const progressSteps = document.querySelectorAll('#progressSteps li');
    const reasonSelect = document.getElementById('reasonSelect');
    const confirmCancel = document.getElementById('confirmCancel');
    const finalCancelBtn = document.getElementById('finalCancelBtn');
    const continueToStep2 = document.getElementById('continueToStep2');
    const continueToStep3 = document.getElementById('continueToStep3');
    const continueToStep4 = document.getElementById('continueToStep4');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');

    // Disable back button
    HostileUI.trapHistory();

    // Render reasons
    function renderReasons() {
        reasonSelect.innerHTML = reasons.map(r => `
            <div class="reason-option" data-reason="${r.id}">
                <input type="radio" name="reason" id="reason-${r.id}">
                <div class="reason-text">
                    <div class="reason-title">${r.title}</div>
                    <div class="reason-desc">${r.desc}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        reasonSelect.querySelectorAll('.reason-option').forEach(opt => {
            opt.addEventListener('click', () => {
                reasonSelect.querySelectorAll('.reason-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                opt.querySelector('input').checked = true;
                selectedReason = opt.dataset.reason;
                continueToStep3.disabled = false;
            });
        });
    }

    // Go to step
    window.goToStep = function(step) {
        currentStep = step;

        // Update progress
        progressSteps.forEach((ps, idx) => {
            ps.classList.remove('active', 'complete');
            if (idx < step - 1) ps.classList.add('complete');
            if (idx === step - 1) ps.classList.add('active');
        });

        // Show correct step
        steps.forEach((s, idx) => {
            s.style.display = idx === step - 1 ? 'block' : 'none';
        });

        // Track reconsidering
        if (step < currentStep) {
            timesReconsidered++;
        }

        errorArea.innerHTML = '';
    };

    // Keep subscription (trap)
    window.keepSubscription = function() {
        clickedKeep++;
        showError([CorporateSpeak.manipulate()], 'info');

        // Re-enable the continue button after "hesitation"
        if (clickedKeep >= 1) {
            continueToStep2.style.display = 'block';
        }
    };

    // Accept offer (trap - resubscribes)
    window.acceptOffer = function() {
        hasAcceptedOffer = true;
        showError([
            "Thank you! Your subscription continues at $7.49/month for 3 months.",
            "You've been successfully re-subscribed!"
        ], 'success');

        // Reset to step 1 after delay
        setTimeout(() => {
            hasAcceptedOffer = true; // This will cause failure
            goToStep(1);
        }, 2000);
    };

    // Step 1 -> 2
    continueToStep2.addEventListener('click', () => {
        goToStep(2);
    });

    // Step 2 -> 3
    continueToStep3.addEventListener('click', () => {
        const reason = reasons.find(r => r.id === selectedReason);

        if (reason && reason.trap) {
            // Show trap response then continue
            showError([reason.trapResponse], 'info');
            setTimeout(() => {
                errorArea.innerHTML = '';
                goToStep(3);
            }, 2000);
        } else {
            goToStep(3);
        }
    });

    // Step 3 -> 4
    continueToStep4.addEventListener('click', () => {
        goToStep(4);
    });

    // Confirm checkbox
    confirmCancel.addEventListener('change', () => {
        finalCancelBtn.disabled = !confirmCancel.checked;
    });

    // Final cancel
    finalCancelBtn.addEventListener('click', () => {
        const result = engine.evaluate({
            currentStep,
            selectedReason,
            confirmed: confirmCancel.checked,
            hasAcceptedOffer,
            clickedKeep,
            timesReconsidered
        });

        if (result.passed) {
            showVictory();
        } else {
            showError(result.messages);

            // Uncheck the confirmation
            if (result.failures.some(f => f.id === 'showed-hesitation')) {
                showError([
                    "We noticed you haven't fully considered your options.",
                    "Please review our offer before proceeding."
                ]);
                goToStep(3);
            }
        }
    });

    function showError(messages, type = 'error') {
        const cls = type === 'info' ? 'error-message info' :
                    type === 'success' ? 'success-message' : 'error-message';
        errorArea.innerHTML = `
            <div class="${cls}">
                ${messages.map(m => `<p>${m}</p>`).join('')}
            </div>
        `;
    }

    function showVictory() {
        gameArea.style.display = 'none';
        victoryArea.style.display = 'block';

        const reason = reasons.find(r => r.id === selectedReason);

        victoryArea.innerHTML = `
            <div class="victory-screen">
                <div class="victory-header">
                    <h1>UNSUBSCRIBED</h1>
                    <p class="victory-subtitle">You've successfully escaped. We're sorry to see you go.</p>
                </div>

                <div class="victory-stats">
                    <div class="stat">
                        <span class="stat-value">${timesReconsidered}</span>
                        <span class="stat-label">Times Reconsidered</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${clickedKeep}</span>
                        <span class="stat-label">"Keep" Clicks</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${engine.getStats().timeSpentFormatted}</span>
                        <span class="stat-label">Time to Escape</span>
                    </div>
                </div>

                <div class="victory-section">
                    <h2>Dark Patterns Used Against You</h2>
                    <ul class="rule-list">
                        <li>
                            <strong>Emotional Manipulation</strong>
                            <p>"You've been with us for 847 days!" - guilt-tripping with fake loyalty stats.</p>
                        </li>
                        <li>
                            <strong>Confirm-Shaming</strong>
                            <p>The cancel button was labeled "I still want to cancel" - implying you're making a mistake.</p>
                        </li>
                        <li>
                            <strong>Roach Motel</strong>
                            <p>Easy to sign up, 4+ steps to cancel.</p>
                        </li>
                        <li>
                            <strong>Counter-Offer Trap</strong>
                            <p>Accepting the "discount" would have re-subscribed you, making cancellation fail.</p>
                        </li>
                        <li>
                            <strong>Hidden Hesitation Requirement</strong>
                            <p>You had to click "Keep" at least once or reconsider twice before final cancel was allowed.</p>
                        </li>
                        ${reason && reason.trap ? `
                        <li>
                            <strong>Reason Trap</strong>
                            <p>Your selected reason "${reason.title}" triggered a targeted retention attempt.</p>
                        </li>
                        ` : ''}
                    </ul>
                </div>

                <div class="victory-actions">
                    <button onclick="location.reload()" class="btn-restart">Try Again</button>
                    <button onclick="location.href='../../index.html'" class="btn-menu">Back to Menu</button>
                </div>
            </div>
        `;
    }

    // Initialize
    renderReasons();
})();
