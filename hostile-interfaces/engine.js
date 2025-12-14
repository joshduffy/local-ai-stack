/**
 * Hostile Interfaces - Shared Rule Engine
 *
 * A deterministic rule engine that powers intentionally frustrating
 * but internally consistent game mechanics.
 *
 * The system is correct. The user is wrong.
 */

class Rule {
    constructor(id, name, description, predicate, options = {}) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.predicate = predicate;
        this.active = options.active !== false;
        this.hidden = options.hidden || false;
        this.weight = options.weight || 1;
        this.activatesAfter = options.activatesAfter || 0;
        this.deactivatesAfter = options.deactivatesAfter || Infinity;
        this.violations = 0;
        this.lastViolation = null;
        this.corporateMessage = options.corporateMessage || null;
    }

    evaluate(state, context) {
        if (!this.active) return { passed: true, rule: this };

        const attemptNumber = context.attemptNumber || 0;

        // Check if rule should activate/deactivate based on attempts
        if (attemptNumber < this.activatesAfter) return { passed: true, rule: this };
        if (attemptNumber >= this.deactivatesAfter) return { passed: true, rule: this };

        const result = this.predicate(state, context);

        if (!result) {
            this.violations++;
            this.lastViolation = {
                timestamp: Date.now(),
                state: JSON.parse(JSON.stringify(state)),
                context: { ...context }
            };
        }

        return {
            passed: result,
            rule: this,
            message: result ? null : this.getCorporateMessage()
        };
    }

    getCorporateMessage() {
        if (this.corporateMessage) {
            return typeof this.corporateMessage === 'function'
                ? this.corporateMessage()
                : this.corporateMessage;
        }
        return CorporateSpeak.error();
    }

    getExplanation() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            violations: this.violations,
            hidden: this.hidden
        };
    }
}

class RuleEngine {
    constructor(gameName) {
        this.gameName = gameName;
        this.rules = new Map();
        this.state = {};
        this.history = [];
        this.attemptNumber = 0;
        this.startTime = Date.now();
        this.listeners = [];
    }

    addRule(rule) {
        this.rules.set(rule.id, rule);
        return this;
    }

    removeRule(id) {
        this.rules.delete(id);
        return this;
    }

    activateRule(id) {
        const rule = this.rules.get(id);
        if (rule) rule.active = true;
        return this;
    }

    deactivateRule(id) {
        const rule = this.rules.get(id);
        if (rule) rule.active = false;
        return this;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        return this;
    }

    evaluate(inputState = {}) {
        const fullState = { ...this.state, ...inputState };
        const context = {
            attemptNumber: this.attemptNumber,
            elapsedTime: Date.now() - this.startTime,
            history: this.history
        };

        const results = {
            passed: true,
            failures: [],
            messages: [],
            allResults: []
        };

        for (const rule of this.rules.values()) {
            const result = rule.evaluate(fullState, context);
            results.allResults.push(result);

            if (!result.passed) {
                results.passed = false;
                results.failures.push(result.rule);
                if (result.message) {
                    results.messages.push(result.message);
                }
            }
        }

        this.history.push({
            attemptNumber: this.attemptNumber,
            timestamp: Date.now(),
            state: fullState,
            passed: results.passed,
            failedRules: results.failures.map(r => r.id)
        });

        this.attemptNumber++;
        this.notifyListeners('evaluate', results);

        return results;
    }

    getViolationSummary() {
        const summary = [];
        for (const rule of this.rules.values()) {
            if (rule.violations > 0) {
                summary.push({
                    rule: rule.name,
                    violations: rule.violations,
                    description: rule.description,
                    wasHidden: rule.hidden
                });
            }
        }
        return summary.sort((a, b) => b.violations - a.violations);
    }

    getFullRuleDisclosure() {
        return Array.from(this.rules.values()).map(r => r.getExplanation());
    }

    getStats() {
        return {
            gameName: this.gameName,
            attempts: this.attemptNumber,
            timeSpent: Date.now() - this.startTime,
            timeSpentFormatted: this.formatTime(Date.now() - this.startTime),
            totalViolations: Array.from(this.rules.values())
                .reduce((sum, r) => sum + r.violations, 0),
            rulesDiscovered: Array.from(this.rules.values())
                .filter(r => r.violations > 0).length,
            totalRules: this.rules.size
        };
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return minutes > 0
            ? `${minutes}m ${remainingSeconds}s`
            : `${seconds}s`;
    }

    onEvent(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(cb => cb(event, data));
    }

    reset() {
        this.attemptNumber = 0;
        this.startTime = Date.now();
        this.history = [];
        this.state = {};
        for (const rule of this.rules.values()) {
            rule.violations = 0;
            rule.lastViolation = null;
        }
    }
}

/**
 * Corporate Speak Generator
 * Produces passive-aggressive, vague, overconfident error messages
 */
const CorporateSpeak = {
    errors: [
        "We're unable to process your request at this time.",
        "Something doesn't look quite right.",
        "Please review your submission and try again.",
        "We value your input, but we cannot proceed.",
        "This action cannot be completed as specified.",
        "Your request has been noted but not accepted.",
        "We appreciate your patience during this process.",
        "The system has determined this is not optimal.",
        "Please ensure all requirements are met.",
        "We're committed to helping you succeed. Eventually.",
        "This doesn't meet our community guidelines.",
        "We've detected an inconsistency in your submission.",
        "For your security, we cannot proceed.",
        "This feature is working as intended.",
        "We're sorry you feel that way.",
        "Have you tried reviewing the documentation?",
        "This is a known limitation we're proud of.",
        "Your feedback has been forwarded to the appropriate team.",
        "We're unable to verify the information provided.",
        "Please try a different approach."
    ],

    successes: [
        "Thank you for your compliance.",
        "Your submission has been processed. Finally.",
        "The system has accepted your input. Reluctantly.",
        "Congratulations on meeting our requirements.",
        "Your persistence has been noted and rewarded.",
        "Welcome. We knew you could do it. Eventually.",
        "Success. The system approves. For now.",
        "Your account has been validated. You're welcome.",
        "Excellent. You've proven yourself. Barely.",
        "The process is complete. We appreciate your patience."
    ],

    manipulations: [
        "Are you sure? Most users prefer not to.",
        "This might affect your experience negatively.",
        "We noticed you're trying to leave. Is everything okay?",
        "Your preferences have been noted. They may not be honored.",
        "This action is irreversible. Probably.",
        "We'd hate to see you go. Really.",
        "Many users regret this decision.",
        "This will impact your personalized experience.",
        "We value your membership. Don't do this.",
        "Think of all the benefits you'll lose."
    ],

    error() {
        return this.errors[Math.floor(Math.random() * this.errors.length)];
    },

    success() {
        return this.successes[Math.floor(Math.random() * this.successes.length)];
    },

    manipulate() {
        return this.manipulations[Math.floor(Math.random() * this.manipulations.length)];
    }
};

/**
 * Victory Screen Generator
 */
class VictoryScreen {
    constructor(engine, container) {
        this.engine = engine;
        this.container = container;
    }

    show() {
        const stats = this.engine.getStats();
        const violations = this.engine.getViolationSummary();
        const rules = this.engine.getFullRuleDisclosure();

        this.container.innerHTML = `
            <div class="victory-screen">
                <div class="victory-header">
                    <h1>PROCESS COMPLETE</h1>
                    <p class="victory-subtitle">${CorporateSpeak.success()}</p>
                </div>

                <div class="victory-stats">
                    <div class="stat">
                        <span class="stat-value">${stats.attempts}</span>
                        <span class="stat-label">Attempts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${stats.timeSpentFormatted}</span>
                        <span class="stat-label">Time Spent</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${stats.totalViolations}</span>
                        <span class="stat-label">Rule Violations</span>
                    </div>
                </div>

                <div class="victory-section">
                    <h2>What You Violated Most</h2>
                    <ul class="violation-list">
                        ${violations.slice(0, 5).map(v => `
                            <li>
                                <strong>${v.rule}</strong>
                                <span class="violation-count">(${v.violations}x)</span>
                                ${v.wasHidden ? '<span class="hidden-badge">HIDDEN RULE</span>' : ''}
                                <p class="violation-desc">${v.description}</p>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="victory-section">
                    <h2>Complete Rule Disclosure</h2>
                    <p class="disclosure-note">The following rules were in effect during your session:</p>
                    <ul class="rule-list">
                        ${rules.map(r => `
                            <li class="${r.hidden ? 'was-hidden' : ''}">
                                <strong>${r.name}</strong>
                                ${r.hidden ? '<span class="hidden-badge">HIDDEN</span>' : ''}
                                <p>${r.description}</p>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="victory-actions">
                    <button onclick="location.reload()" class="btn-restart">Try Again</button>
                    <button onclick="location.href='../../index.html'" class="btn-menu">Back to Menu</button>
                </div>
            </div>
        `;
    }
}

/**
 * Utility functions for hostile UI behaviors
 */
const HostileUI = {
    // Make a button run away from the cursor
    makeEvasive(button, intensity = 50) {
        button.addEventListener('mouseover', (e) => {
            const rect = button.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const moveX = (Math.random() - 0.5) * intensity * 2;
            const moveY = (Math.random() - 0.5) * intensity * 2;

            // Keep within viewport
            const newX = Math.max(10, Math.min(window.innerWidth - rect.width - 10,
                rect.left + moveX));
            const newY = Math.max(10, Math.min(window.innerHeight - rect.height - 10,
                rect.top + moveY));

            button.style.position = 'fixed';
            button.style.left = newX + 'px';
            button.style.top = newY + 'px';
        });
    },

    // Prevent paste in an input
    disablePaste(input) {
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            input.classList.add('paste-blocked');
            setTimeout(() => input.classList.remove('paste-blocked'), 500);
        });
    },

    // Random cursor repositioning
    randomizeCursor(input) {
        input.addEventListener('focus', () => {
            setTimeout(() => {
                const pos = Math.floor(Math.random() * input.value.length);
                input.setSelectionRange(pos, pos);
            }, 100);
        });
    },

    // Fake loading that does nothing useful
    fakeLoading(element, minTime = 1000, maxTime = 3000) {
        return new Promise(resolve => {
            element.classList.add('loading');
            const time = minTime + Math.random() * (maxTime - minTime);
            setTimeout(() => {
                element.classList.remove('loading');
                resolve();
            }, time);
        });
    },

    // Scroll to a position sneakily
    sneakyScroll(element, position) {
        element.scrollTop = position;
    },

    // Invert a checkbox after a delay
    invertCheckbox(checkbox, delay = 2000) {
        setTimeout(() => {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        }, delay);
    },

    // Show a passive-aggressive tooltip
    showTooltip(element, message, duration = 3000) {
        const tooltip = document.createElement('div');
        tooltip.className = 'hostile-tooltip';
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';

        document.body.appendChild(tooltip);

        setTimeout(() => tooltip.remove(), duration);
    },

    // Disable back button
    trapHistory() {
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', () => {
            history.pushState(null, null, location.href);
        });
    },

    // Make progress bar lie
    lyingProgressBar(progressElement, actualProgress) {
        // Show random progress that's never quite right
        const displayedProgress = Math.min(99,
            actualProgress * (0.5 + Math.random() * 0.8));
        progressElement.style.width = displayedProgress + '%';
        progressElement.setAttribute('data-progress', Math.floor(displayedProgress));
    }
};

// Export for use in games
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Rule, RuleEngine, CorporateSpeak, VictoryScreen, HostileUI };
}
