/**
 * The Settings Page That Eats You
 *
 * Goal: Change one setting successfully (enable Dark Mode)
 * Win condition: reach stable configuration where dark mode is ON and saved.
 */

(function() {
    const engine = new RuleEngine('Settings That Eat You');

    // Settings definition with dependencies and inversions
    const settingsSchema = {
        general: {
            title: "General",
            settings: [
                {
                    id: 'auto-save',
                    name: 'Auto-save',
                    desc: 'Automatically save changes',
                    default: true,
                    inverted: false // Actually does what it says
                },
                {
                    id: 'theme-sync',
                    name: 'Sync with system theme',
                    desc: 'Match your device appearance settings',
                    default: true,
                    blocks: ['dark-mode'], // When ON, dark-mode is locked
                    inverted: false
                },
                {
                    id: 'reduced-motion',
                    name: 'Reduce motion',
                    desc: 'Minimize animations throughout the app',
                    default: false,
                    inverted: false
                }
            ]
        },
        privacy: {
            title: "Privacy",
            settings: [
                {
                    id: 'analytics',
                    name: 'Share usage analytics',
                    desc: 'Help us improve by sharing anonymous data',
                    default: true,
                    inverted: true // OFF means ON
                },
                {
                    id: 'personalization',
                    name: 'Personalized experience',
                    desc: 'Tailor content to your preferences',
                    default: true,
                    requires: ['analytics'] // Needs analytics ON to be ON
                },
                {
                    id: 'third-party',
                    name: 'Third-party integrations',
                    desc: 'Allow partner services',
                    default: false,
                    inverted: false
                }
            ]
        },
        notifications: {
            title: "Notifications",
            settings: [
                {
                    id: 'email-updates',
                    name: 'Email updates',
                    desc: 'Receive news and updates via email',
                    default: true,
                    inverted: false
                },
                {
                    id: 'push-notifications',
                    name: 'Push notifications',
                    desc: 'Receive instant notifications',
                    default: true,
                    requires: ['email-updates'] // Weird dependency
                },
                {
                    id: 'weekly-digest',
                    name: 'Weekly digest',
                    desc: 'Summary of your activity',
                    default: false,
                    inverted: true
                }
            ]
        },
        accessibility: {
            title: "Accessibility",
            settings: [
                {
                    id: 'high-contrast',
                    name: 'High contrast mode',
                    desc: 'Increase visual distinction',
                    default: false,
                    conflicts: ['dark-mode'] // Can't have both
                },
                {
                    id: 'dark-mode',
                    name: 'Dark mode',
                    desc: 'Use dark color scheme',
                    default: false,
                    isTarget: true, // This is what we need to enable
                    requires: ['accessibility-enabled'],
                    conflicts: ['high-contrast']
                },
                {
                    id: 'large-text',
                    name: 'Large text',
                    desc: 'Increase font sizes',
                    default: false
                }
            ]
        },
        advanced: {
            title: "Advanced",
            settings: [
                {
                    id: 'accessibility-enabled',
                    name: 'Enable accessibility features',
                    desc: 'Master toggle for accessibility options',
                    default: false,
                    hidden: false
                },
                {
                    id: 'developer-mode',
                    name: 'Developer mode',
                    desc: 'Show advanced options',
                    default: false
                },
                {
                    id: 'experimental',
                    name: 'Experimental features',
                    desc: 'Try new features before release',
                    default: false,
                    requires: ['developer-mode']
                }
            ]
        }
    };

    // Current state
    let currentSettings = {};
    let savedSettings = {};
    let currentSection = 'general';
    let saveAttempts = 0;
    let hasUnsavedChanges = false;

    // Initialize settings
    function initSettings() {
        currentSettings = {};
        savedSettings = {};
        Object.values(settingsSchema).forEach(section => {
            section.settings.forEach(setting => {
                currentSettings[setting.id] = setting.default;
                savedSettings[setting.id] = setting.default;
            });
        });
    }

    // Rules
    engine.addRule(new Rule(
        'dark-mode-enabled',
        'Dark Mode Active',
        'Dark mode must be enabled.',
        (s) => s.darkMode === true,
        { corporateMessage: "Dark mode is not enabled." }
    ));

    engine.addRule(new Rule(
        'settings-saved',
        'Changes Persisted',
        'Settings must be saved after changes.',
        (s) => s.saved === true,
        { corporateMessage: "Please save your changes." }
    ));

    engine.addRule(new Rule(
        'no-conflicts',
        'No Conflicting Settings',
        'Settings cannot conflict with each other.',
        (s) => s.hasConflicts === false,
        {
            hidden: true,
            corporateMessage: "Some settings conflict with each other."
        }
    ));

    // DOM
    const settingsNav = document.querySelectorAll('.nav-item');
    const settingsContent = document.getElementById('settingsContent');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const unsavedIndicator = document.getElementById('unsavedIndicator');
    const errorArea = document.getElementById('errorArea');
    const gameArea = document.getElementById('gameArea');
    const victoryArea = document.getElementById('victoryArea');

    // Navigation
    settingsNav.forEach(nav => {
        nav.addEventListener('click', () => {
            settingsNav.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');
            currentSection = nav.dataset.section;
            renderSettings();
        });
    });

    // Get effective value (accounting for inversions)
    function getEffectiveValue(setting) {
        const value = currentSettings[setting.id];
        return setting.inverted ? !value : value;
    }

    // Check if setting is blocked
    function isBlocked(setting) {
        // Check if blocked by another setting
        for (const [sectionKey, section] of Object.entries(settingsSchema)) {
            for (const s of section.settings) {
                if (s.blocks && s.blocks.includes(setting.id) && getEffectiveValue(s)) {
                    return `Blocked by "${s.name}"`;
                }
            }
        }

        // Check requirements
        if (setting.requires) {
            for (const reqId of setting.requires) {
                const reqSetting = findSetting(reqId);
                if (reqSetting && !getEffectiveValue(reqSetting)) {
                    return `Requires "${reqSetting.name}" to be enabled`;
                }
            }
        }

        return false;
    }

    // Check for conflicts
    function hasConflict(setting) {
        if (!setting.conflicts) return false;

        for (const conflictId of setting.conflicts) {
            if (currentSettings[conflictId]) {
                const conflictSetting = findSetting(conflictId);
                return `Conflicts with "${conflictSetting.name}"`;
            }
        }
        return false;
    }

    // Find setting by id
    function findSetting(id) {
        for (const section of Object.values(settingsSchema)) {
            const found = section.settings.find(s => s.id === id);
            if (found) return found;
        }
        return null;
    }

    // Render settings
    function renderSettings() {
        const section = settingsSchema[currentSection];
        if (!section) return;

        let html = `<div class="setting-group">
            <div class="setting-group-content">`;

        section.settings.forEach(setting => {
            const blocked = isBlocked(setting);
            const conflict = hasConflict(setting);
            const isTarget = setting.isTarget;

            html += `
                <div class="setting-row ${isTarget ? 'target-setting' : ''}">
                    <div class="setting-info">
                        <div class="setting-name">${setting.name}</div>
                        <div class="setting-desc">${setting.desc}</div>
                        ${blocked ? `<div class="setting-warning">${blocked}</div>` : ''}
                        ${conflict ? `<div class="setting-warning">${conflict}</div>` : ''}
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox"
                               data-setting="${setting.id}"
                               ${currentSettings[setting.id] ? 'checked' : ''}
                               ${blocked ? 'disabled' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;
        });

        html += `</div></div>`;
        settingsContent.innerHTML = html;

        // Add change handlers
        settingsContent.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => {
                const settingId = input.dataset.setting;
                currentSettings[settingId] = input.checked;

                // Side effects!
                applySideEffects(settingId, input.checked);

                hasUnsavedChanges = true;
                updateUnsavedIndicator();
                renderSettings(); // Re-render to show new blocked states
            });
        });
    }

    // Apply side effects when settings change
    function applySideEffects(settingId, value) {
        const setting = findSetting(settingId);

        // If turning off a required setting, turn off dependents
        if (!value) {
            Object.values(settingsSchema).forEach(section => {
                section.settings.forEach(s => {
                    if (s.requires && s.requires.includes(settingId)) {
                        currentSettings[s.id] = false;
                    }
                });
            });
        }

        // If turning on a conflicting setting, turn off the other
        if (value && setting.conflicts) {
            setting.conflicts.forEach(conflictId => {
                currentSettings[conflictId] = false;
            });
        }

        // Random chaos after a few save attempts
        if (saveAttempts >= 2 && Math.random() > 0.7) {
            // Randomly toggle another setting
            const allSettings = Object.values(settingsSchema).flatMap(s => s.settings);
            const randomSetting = allSettings[Math.floor(Math.random() * allSettings.length)];
            if (randomSetting.id !== settingId && randomSetting.id !== 'dark-mode') {
                setTimeout(() => {
                    currentSettings[randomSetting.id] = !currentSettings[randomSetting.id];
                    renderSettings();
                }, 500);
            }
        }
    }

    function updateUnsavedIndicator() {
        unsavedIndicator.style.visibility = hasUnsavedChanges ? 'visible' : 'hidden';
    }

    // Save handler
    saveBtn.addEventListener('click', async () => {
        saveAttempts++;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        await HostileUI.fakeLoading(settingsContent, 500, 1500);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';

        // Check for victory conditions
        const darkModeSetting = findSetting('dark-mode');
        const hasConflicts = Object.values(settingsSchema).some(section =>
            section.settings.some(s => hasConflict(s))
        );

        const result = engine.evaluate({
            darkMode: getEffectiveValue(darkModeSetting),
            saved: true,
            hasConflicts
        });

        if (result.passed) {
            savedSettings = { ...currentSettings };
            hasUnsavedChanges = false;
            updateUnsavedIndicator();
            showVictory();
        } else {
            showError(result.messages);

            // Chaos: sometimes revert a random setting on failed save
            if (saveAttempts >= 3 && Math.random() > 0.5) {
                const randomKey = Object.keys(currentSettings)[
                    Math.floor(Math.random() * Object.keys(currentSettings).length)
                ];
                currentSettings[randomKey] = savedSettings[randomKey];
                renderSettings();
            }
        }
    });

    // Reset handler
    resetBtn.addEventListener('click', () => {
        initSettings();
        hasUnsavedChanges = false;
        updateUnsavedIndicator();
        renderSettings();
        showError(["Settings reset to defaults."], 'info');
    });

    function showError(messages, type = 'error') {
        const cls = type === 'info' ? 'error-message info' : 'error-message';
        errorArea.innerHTML = `
            <div class="${cls}">
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
                    <h1>SETTINGS SAVED</h1>
                    <p class="victory-subtitle">Dark mode is now enabled. Your eyes thank you.</p>
                </div>

                <div class="victory-stats">
                    <div class="stat">
                        <span class="stat-value">${saveAttempts}</span>
                        <span class="stat-label">Save Attempts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${engine.attemptNumber}</span>
                        <span class="stat-label">Setting Changes</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${engine.getStats().timeSpentFormatted}</span>
                        <span class="stat-label">Time Spent</span>
                    </div>
                </div>

                <div class="victory-section">
                    <h2>The Maze of Dependencies</h2>
                    <ul class="rule-list">
                        <li>
                            <strong>Theme Sync Block</strong>
                            <p>"Sync with system theme" blocked dark mode until disabled.</p>
                        </li>
                        <li>
                            <strong>Accessibility Gate</strong>
                            <p>Dark mode required "Enable accessibility features" in Advanced settings.</p>
                        </li>
                        <li>
                            <strong>High Contrast Conflict</strong>
                            <p>High contrast mode conflicted with dark mode.</p>
                        </li>
                        <li>
                            <strong>Inverted Settings</strong>
                            <p>Some settings like "Share usage analytics" were inverted - OFF actually meant ON.</p>
                        </li>
                        <li>
                            <strong>Random Reversions</strong>
                            <p>After multiple save attempts, settings would randomly revert.</p>
                        </li>
                    </ul>
                </div>

                <div class="victory-section">
                    <h2>Correct Path</h2>
                    <ol style="padding-left: 20px; font-size: 14px;">
                        <li>Go to General → Disable "Sync with system theme"</li>
                        <li>Go to Accessibility → Disable "High contrast mode" if enabled</li>
                        <li>Go to Advanced → Enable "Enable accessibility features"</li>
                        <li>Go to Accessibility → Enable "Dark mode"</li>
                        <li>Save changes</li>
                    </ol>
                </div>

                <div class="victory-actions">
                    <button onclick="location.reload()" class="btn-restart">Try Again</button>
                    <button onclick="location.href='../../index.html'" class="btn-menu">Back to Menu</button>
                </div>
            </div>
        `;
    }

    // Initialize
    initSettings();
    renderSettings();
})();
