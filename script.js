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

    // Function to update the timer and reset time display
    const updateTimer = (isCatchUp = false) => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime;
        lastUpdateTime = now;

        const currentDate = new Date(now);
        const newCurrentTime = currentDate.toLocaleTimeString();

        if (lastCurrentTime !== newCurrentTime) {
            animateElement(elements.currentTime, newCurrentTime);
            lastCurrentTime = newCurrentTime;
        }

        const resetHour = resetTimes[currentServer].hour;
        const resetMinute = resetTimes[currentServer].minute;

        let resetTime = new Date(Date.UTC(
            currentDate.getUTCFullYear(),
            currentDate.getUTCMonth(),
            currentDate.getUTCDate(),
            resetHour,
            resetMinute,
            0
        ));

        if (currentDate > resetTime) {
            resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        }

        const diff = resetTime - currentDate;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        animateElement(elements.hours, String(hours).padStart(2, '0'), true, isCatchUp);
        animateElement(elements.minutes, String(minutes).padStart(2, '0'), true, isCatchUp);
        animateElement(elements.seconds, String(seconds).padStart(2, '0'), true, isCatchUp);

        const newResetText = `Next reset at: ${resetTime.toLocaleTimeString()} (${currentServer} Server)`;
        animateElement(elements.resetTime, newResetText);

        if (isFirstLoad) {
            isFirstLoad = false;
        }
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

    // Initial update and set interval
    updateTimer();
    setInterval(updateTimer, 1000);
})();