(() => {
    'use strict';

    // Define reset times for US and EU servers
    const resetTimes = {
        US: { hour: 10, minute: 0 },
        EU: { hour: 3, minute: 0 }
    };

    let currentServer = 'US';
    let lastCurrentTime = '';
    
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
    const animateElement = (element, newValue, transform = false) => {
        if (element.textContent !== newValue) {
            element.style.transition = transform 
                ? 'transform 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s cubic-bezier(0.4,0,0.2,1)'
                : 'opacity 0.2s cubic-bezier(0.4,0,0.2,1)';
            if (transform) element.style.transform = 'translateY(8px)';
            element.style.opacity = '0';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    element.textContent = newValue;
                    if (transform) element.style.transform = 'translateY(0)';
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
    const updateTimer = () => {
        const now = new Date();
        const newCurrentTime = now.toLocaleTimeString();

        if (lastCurrentTime !== newCurrentTime) {
            animateElement(elements.currentTime, newCurrentTime);
            lastCurrentTime = newCurrentTime;
        }

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

        const diff = resetTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        animateElement(elements.hours, String(hours).padStart(2, '0'), true);
        animateElement(elements.minutes, String(minutes).padStart(2, '0'), true);
        animateElement(elements.seconds, String(seconds).padStart(2, '0'), true);

        const newResetText = `Next reset at: ${resetTime.toLocaleTimeString()} (${currentServer} Server)`;
        animateElement(elements.resetTime, newResetText);
    };

    // Event listener for server toggle
    document.getElementById('serverToggle').addEventListener('change', (e) => switchServer(e.target.checked));

    // Initial update and set interval
    updateTimer();
    setInterval(updateTimer, 1000);
})();