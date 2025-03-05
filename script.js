(() => {
    'use strict';

    /**
     * Server reset times in UTC
     * US: 10:00 UTC
     * EU: 03:00 UTC
     */
    const resetTimes = {
        US: { hour: 10, minute: 0 },
        EU: { hour: 3, minute: 0 }
    };

    // State management
    let currentServer = 'US';
    let lastCurrentTime = '';
    let isFirstLoad = true;

    /**
     * Tracks currently displayed values to optimize updates
     * and support smooth animations
     */
    let currentDisplayedValues = {
        hours: '00',
        minutes: '00',
        seconds: '00'
    };

    /**
     * DOM References
     * Cached for performance
     */
    const elements = {
        serverText: document.getElementById('serverText'),
        currentTime: document.getElementById('currentTime'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds'),
        resetTime: document.getElementById('resetTime')
    };

    /**
     * Handles smooth animations for value changes
     * Supports both text fades and number transformations
     * @param {HTMLElement} element - Element to animate
     * @param {string} newValue - New value to display
     * @param {boolean} transform - Whether to use transform animations
     * @param {boolean} isCatchUp - Whether this is a catch-up update
     */
    const animateElement = (element, newValue, transform = false, isCatchUp = false) => {
        if (element.textContent !== newValue) {
            // For regular text updates (like current time), use simple fade
            if (!transform) {
                element.style.transition = 'opacity 0.2s cubic-bezier(0.4,0,0.2,1)';
                element.style.opacity = '0';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        element.textContent = newValue;
                        element.style.opacity = '1';
                    });
                });
                return true;
            }

            // For countdown numbers
            const currentValue = parseInt(element.textContent) || 0;
            const targetValue = parseInt(newValue) || 0;
            const diff = Math.abs(targetValue - currentValue);

            // Always animate on first load or when catching up
            if (isFirstLoad || (diff > 1 && isCatchUp)) {
                // Split number into digits for animation
                const currentDigits = String(currentValue).padStart(2, '0').split('');
                const targetDigits = String(targetValue).padStart(2, '0').split('');
                
                const duration = Math.min(diff * 50, 1000);
                const startTime = performance.now();

                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);

                    // Animate each digit separately
                    const currentNum = targetDigits.map((targetDigit, i) => {
                        const start = parseInt(currentDigits[i]);
                        const end = parseInt(targetDigit);
                        const diff = end - start;
                        return String(Math.round(start + (diff * eased))).padStart(1, '0');
                    }).join('');

                    element.textContent = currentNum;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };

                requestAnimationFrame(animate);
                return true;
            }

            // Regular sliding animation for single digit changes
            element.style.transition = 'transform 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s cubic-bezier(0.4,0,0.2,1)';
            element.style.transform = 'translateY(8px)';
            element.style.opacity = '0';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    element.textContent = newValue;
                    element.style.transform = 'translateY(0)';
                    element.style.opacity = '1';
                });
            });
            return true;
        }
        return false;
    };

    /**
     * Switches the server and updates the timer
     * @param {boolean} isChecked - Whether the EU server is selected
     */
    const switchServer = (isChecked) => {
        currentServer = isChecked ? 'EU' : 'US';
        elements.serverText.textContent = `${currentServer} Server`;
        updateTimer(true);
    };

    /**
     * Formats and computes all time values needed for the countdown
     * Uses UTC to handle timezone differences correctly
     * Returns hours, minutes, seconds, and next reset time
     * 
     * @returns {{ hours: string, minutes: string, seconds: string, resetTime: Date }}
     */
    const getCountdownValues = () => {
        const now = new Date();
        const resetHour = resetTimes[currentServer].hour;
        const resetMinute = resetTimes[currentServer].minute;

        let resetTime = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            resetHour,
            resetMinute,
            0
        ));

        if (now > resetTime) {
            resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        }

        const diff = Math.max(0, resetTime - now);
        const totalSeconds = diff / 1000;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.ceil(totalSeconds % 60); // Changed to Math.ceil

        // Handle case where seconds rounds up to 60
        if (seconds === 60) {
            return {
                hours: String(hours).padStart(2, '0'),
                minutes: String(minutes + 1).padStart(2, '0'),
                seconds: '00',
                resetTime
            };
        }

        return {
            hours: String(hours).padStart(2, '0'),
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0'),
            resetTime
        };
    };

    /**
     * Handles notification permissions and local storage
     * Only prompts once and respects user's choice
     * Stores preference for future visits
     * 
     * @returns {Promise<void>}
     */
    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // Store preference
                localStorage.setItem('notifications-enabled', 'true');
            }
        }
    };

    /**
     * Provides tactile feedback for touch interactions
     * Falls back gracefully when vibration API isn't available
     */
    const triggerHaptic = () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    };

    /**
     * Core update loop for the timer
     * Handles all animations and state updates
     * Optimizes performance with RAF and minimal DOM updates
     * Manages notifications and catch-up behavior
     * 
     * @param {boolean} forceCatchUp - Forces immediate update with catch-up animation
     */
    const updateTimer = (forceCatchUp = false) => {
        const currentDate = new Date();
        const newCurrentTime = currentDate.toLocaleTimeString();

        if (lastCurrentTime !== newCurrentTime) {
            animateElement(elements.currentTime, newCurrentTime);
            lastCurrentTime = newCurrentTime;
        }

        const actualValues = getCountdownValues();

        ['hours', 'minutes', 'seconds'].forEach(unit => {
            if (currentDisplayedValues[unit] !== actualValues[unit] || forceCatchUp) {
                animateElement(elements[unit], actualValues[unit], true, forceCatchUp);
                currentDisplayedValues[unit] = actualValues[unit];
            }
        });

        elements.resetTime.textContent = `Next reset at: ${actualValues.resetTime.toLocaleTimeString()} (${currentServer} Server)`;

        // Check if close to reset
        const totalSeconds = parseInt(actualValues.hours) * 3600 + 
                           parseInt(actualValues.minutes) * 60 + 
                           parseInt(actualValues.seconds);
        
        if (totalSeconds === 300 && localStorage.getItem('notifications-enabled') === 'true') {
            new Notification('ESO Reset Soon', {
                body: 'Daily reset in 5 minutes',
                icon: '/icon.png'
            });
        }

        if (isFirstLoad) {
            isFirstLoad = false;
        }

        requestAnimationFrame(() => updateTimer(false));
    };

    /* Event Listeners
     * Handles user interactions and visibility changes
     * Includes keyboard accessibility support
     */
    // Event listener for server toggle
    document.getElementById('serverToggle').addEventListener('change', (e) => switchServer(e.target.checked));

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        const wasVisible = document.visibilityState === 'visible';
        
        if (document.visibilityState === 'visible' && !wasVisible) {
            // Only use catch-up animation when returning to tab
            updateTimer(true);
        }
    });

    // Event Listeners
    document.getElementById('notifyButton')?.addEventListener('click', () => {
        triggerHaptic();
        requestNotificationPermission();
    });

    // Add minimal keyboard support
    document.getElementById('serverToggle').addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.target.click();
        }
    });

    // Start timer
    updateTimer();
})();