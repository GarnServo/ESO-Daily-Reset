(() => {
    'use strict';

    // Define reset times for US and EU servers
    const resetTimes = {
        US: { hour: 10, minute: 0 },
        EU: { hour: 3, minute: 0 }
    };

    let currentServer = 'US';
    let lastCurrentTime = '';
    let lastUpdateTime = Date.now();
    let isVisible = true;
    let isFirstLoad = true;

    let currentDisplayedValues = {
        hours: '00',
        minutes: '00',
        seconds: '00'
    };

    // Add real values tracker
    let realTimeValues = {
        hours: '00',
        minutes: '00',
        seconds: '00'
    };

    // Get references to DOM elements
    const elements = {
        serverText: document.getElementById('serverText'),
        currentTime: document.getElementById('currentTime'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds'),
        resetTime: document.getElementById('resetTime')
    };

    // Function to animate element text change
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

            // Always animate on first load
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

    // Function to switch between US and EU servers
    const switchServer = (isChecked) => {
        currentServer = isChecked ? 'EU' : 'US';
        animateElement(elements.serverText, `${currentServer} Server`);
        updateTimer();
    };

    // Modified getCountdownValues to be more precise
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

    // Function to check if display is in sync with actual time
    const isDisplayInSync = (actual) => {
        return currentDisplayedValues.hours === actual.hours &&
               currentDisplayedValues.minutes === actual.minutes &&
               currentDisplayedValues.seconds === actual.seconds;
    };

    // Modified updateTimer to use real-time as source of truth
    const updateTimer = (forceCatchUp = false) => {
        const now = Date.now();
        const currentDate = new Date(now);
        const newCurrentTime = currentDate.toLocaleTimeString();

        if (lastCurrentTime !== newCurrentTime) {
            animateElement(elements.currentTime, newCurrentTime);
            lastCurrentTime = newCurrentTime;
        }

        // Get real-time values first
        const actualValues = getCountdownValues();
        realTimeValues = {
            hours: actualValues.hours,
            minutes: actualValues.minutes,
            seconds: actualValues.seconds
        };

        // Function to check if we need to update a value
        const needsUpdate = (unit) => {
            const real = parseInt(realTimeValues[unit]);
            const displayed = parseInt(currentDisplayedValues[unit]);
            // Add a small buffer (50ms) to prevent getting ahead
            return Math.abs(real - displayed) > 0;
        };

        // Update all units that need updating
        ['hours', 'minutes', 'seconds'].forEach(unit => {
            if (needsUpdate(unit) || forceCatchUp) {
                animateElement(elements[unit], realTimeValues[unit], true, forceCatchUp);
                currentDisplayedValues[unit] = realTimeValues[unit];
            }
        });

        const newResetText = `Next reset at: ${actualValues.resetTime.toLocaleTimeString()} (${currentServer} Server)`;
        animateElement(elements.resetTime, newResetText);

        if (isFirstLoad) {
            isFirstLoad = false;
        }

        // Schedule next update
        requestAnimationFrame(() => updateTimer(false));
    };

    // Event listener for server toggle
    document.getElementById('serverToggle').addEventListener('change', (e) => switchServer(e.target.checked));

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        const wasVisible = isVisible;
        isVisible = document.visibilityState === 'visible';
        
        if (isVisible && !wasVisible) {
            // Only use catch-up animation when returning to tab
            updateTimer(true);
        }
    });

    // Modified initialization
    // Remove existing setInterval calls and just start the animation frame loop
    updateTimer();
})();