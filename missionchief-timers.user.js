// ==UserScript==
// @name         MissionChief Station Status Timers (LSS-M v4.7 - Fixed ETA Sync)
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  Captures accurate ETAs, distance, and displays status badges across frames.
// @author       You
// @match        https://www.missionchief.com/*
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=missionchief.com
// @allFrames    true
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY_MISSION = 'mc_status_mission_start_times';
    const STORAGE_KEY_ARRIVAL = 'mc_status_arrival_target_times';
    const STORAGE_KEY_DISTANCE = 'mc_status_vehicle_distances';

    function loadStoredData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    function saveData(key, dataMap) {
        try {
            localStorage.setItem(key, JSON.stringify(dataMap));
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, JSON.stringify(dataMap));
            }
        } catch (e) {
            console.error('Failed to save status timer data to localStorage', e);
        }
    }

    let missionStartTimes = loadStoredData(STORAGE_KEY_MISSION);
    let arrivalTargetTimes = loadStoredData(STORAGE_KEY_ARRIVAL);
    let vehicleDistances = loadStoredData(STORAGE_KEY_DISTANCE);

    // Sync across iframe windows / tabs
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_ARRIVAL && e.newValue) {
            try { arrivalTargetTimes = JSON.parse(e.newValue); } catch(e){}
        }
        if (e.key === STORAGE_KEY_MISSION && e.newValue) {
            try { missionStartTimes = JSON.parse(e.newValue); } catch(e){}
        }
        if (e.key === STORAGE_KEY_DISTANCE && e.newValue) {
            try { vehicleDistances = JSON.parse(e.newValue); } catch(e){}
        }
    });

    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener(STORAGE_KEY_ARRIVAL, function(name, old_value, new_value, remote) {
            if (new_value) { try { arrivalTargetTimes = JSON.parse(new_value); } catch(e){} }
        });
        GM_addValueChangeListener(STORAGE_KEY_MISSION, function(name, old_value, new_value, remote) {
            if (new_value) { try { missionStartTimes = JSON.parse(new_value); } catch(e){} }
        });
        GM_addValueChangeListener(STORAGE_KEY_DISTANCE, function(name, old_value, new_value, remote) {
            if (new_value) { try { vehicleDistances = JSON.parse(new_value); } catch(e){} }
        });
    }

    // Advanced ETA Parser supporting various formats
    function parseDurationStringToSeconds(text) {
        if (!text) return 0;
        let totalSec = 0;

        // Match patterns like "12 min 30 sec", "12m 30s", "12 min"
        const minMatch = text.match(/(\d+)\s*(?:min|m)\b/i);
        const secMatch = text.match(/(\d+)\s*(?:sec|s)\b/i);

        if (minMatch) totalSec += parseInt(minMatch[1], 10) * 60;
        if (secMatch) totalSec += parseInt(secMatch[1], 10);

        // Fallback for hh:mm:ss or mm:ss
        if (!minMatch && !secMatch) {
            const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (timeMatch) {
                if (timeMatch[3] !== undefined) {
                    totalSec = (parseInt(timeMatch[1], 10) * 3600) + (parseInt(timeMatch[2], 10) * 60) + parseInt(timeMatch[3], 10);
                } else {
                    totalSec = (parseInt(timeMatch[1], 10) * 60) + parseInt(timeMatch[2], 10);
                }
            }
        }

        return totalSec;
    }

    function parseDistanceString(text) {
        if (!text) return '';
        const distMatch = text.match(/(\d+(?:[\.,]\d+)?\s*(?:km|miles|mile|mi|m))\b/i);
        return distMatch ? distMatch[1] : '';
    }

    function formatSeconds(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const pad = num => String(num).padStart(2, '0');

        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    }

    // --- MISSION DISPATCH HOOK ---
    function setupDispatchFrameHooks() {
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('input[type="submit"], button, .btn-success, #dispatch_now');
            if (!btn) return;

            const checkedBoxes = document.querySelectorAll('.vehicle_checkbox:checked, input[name="vehicle_ids[]"]:checked');
            arrivalTargetTimes = loadStoredData(STORAGE_KEY_ARRIVAL);
            vehicleDistances = loadStoredData(STORAGE_KEY_DISTANCE);

            checkedBoxes.forEach(cb => {
                const vehicleId = cb.value;
                const row = cb.closest('tr, li');
                if (!row) return;

                // Inspect entire row text to capture dynamic distance and time columns
                const rowText = row.innerText;
                const durationSeconds = parseDurationStringToSeconds(rowText);
                const distanceText = parseDistanceString(rowText);

                if (vehicleId && durationSeconds > 0) {
                    arrivalTargetTimes[vehicleId] = Date.now() + (durationSeconds * 1000);
                }
                if (vehicleId && distanceText) {
                    vehicleDistances[vehicleId] = distanceText;
                }
            });

            saveData(STORAGE_KEY_ARRIVAL, arrivalTargetTimes);
            saveData(STORAGE_KEY_DISTANCE, vehicleDistances);
        }, true);
    }

    setupDispatchFrameHooks();

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes mc-blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
        .mc-status-timer {
            display: inline-flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 2px 6px !important;
            font-size: 10px !important;
            font-weight: bold !important;
            border-radius: 3px !important;
            margin-left: 6px !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
            text-align: center !important;
        }
        .mc-status-arrival {
            background-color: #f0ad4e !important;
            color: #222222 !important;
            border: 1px solid #ec971f !important;
        }
        .mc-status-mission {
            background-color: #d9534f !important;
            color: #ffffff !important;
            border: 1px solid #c9302c !important;
        }
        .mc-status-service {
            background-color: #5cb85c !important;
            color: #ffffff !important;
            border: 1px solid #4cae4c !important;
        }
        .mc-status-oos {
            background-color: #222222 !important;
            color: #ffffff !important;
            border: 1px solid #000000 !important;
        }
        .mc-status-transport {
            background-color: #d9534f !important;
            color: #ffffff !important;
            border: 1px solid #c9302c !important;
            animation: mc-blink 1s infinite !important;
        }
        .mc-status-hospital {
            background-color: #e67e22 !important;
            color: #ffffff !important;
            border: 1px solid #d35400 !important;
        }
        .mc-status-subtext {
            font-size: 9px !important;
            opacity: 0.9 !important;
            font-weight: normal !important;
        }
    `;
    if (document.head) document.head.appendChild(style);

    // --- RENDER LOOP ---
    function updateStatusTimers() {
        arrivalTargetTimes = loadStoredData(STORAGE_KEY_ARRIVAL);
        missionStartTimes = loadStoredData(STORAGE_KEY_MISSION);
        vehicleDistances = loadStoredData(STORAGE_KEY_DISTANCE);

        const vehicleRows = document.querySelectorAll('#building_list li, #buildings li, tr[id^="vehicle_row_"], li[id^="vehicle_"]');

        vehicleRows.forEach(row => {
            const statusBadge = row.querySelector('.building_list_fms, .building_list_fms_1, .building_list_fms_2, .building_list_fms_3, .building_list_fms_4, .building_list_fms_5, .building_list_fms_6, .building_list_fms_7, .label-fms, [class*="fms-"]');
            const vehicleLink = row.querySelector('a[href*="/vehicles/"]');

            if (!vehicleLink) return;

            const vehicleIdMatch = vehicleLink.getAttribute('href').match(/\/vehicles\/(\d+)/);
            const vehicleId = vehicleIdMatch ? vehicleIdMatch[1] : null;

            const rowText = row.innerText || '';
            const statusText = statusBadge ? statusBadge.innerText.trim() : rowText;

            function removeOtherBadges(exceptClass) {
                const classes = ['.mc-status-arrival', '.mc-status-mission', '.mc-status-service', '.mc-status-oos', '.mc-status-transport', '.mc-status-hospital'];
                classes.forEach(c => {
                    if (c !== exceptClass) {
                        const oldBadge = vehicleLink.parentNode.querySelector(c);
                        if (oldBadge) oldBadge.remove();
                    }
                });
            }

            function clearStoredData() {
                if (vehicleId && (missionStartTimes[vehicleId] || arrivalTargetTimes[vehicleId] || vehicleDistances[vehicleId])) {
                    delete missionStartTimes[vehicleId];
                    delete arrivalTargetTimes[vehicleId];
                    delete vehicleDistances[vehicleId];
                    saveData(STORAGE_KEY_MISSION, missionStartTimes);
                    saveData(STORAGE_KEY_ARRIVAL, arrivalTargetTimes);
                    saveData(STORAGE_KEY_DISTANCE, vehicleDistances);
                }
            }

            // --- STATUS 3: En Route ETA & Distance Countdown ---
            if (statusText.includes('3') || rowText.includes('Status 3')) {
                removeOtherBadges('.mc-status-arrival');

                if (vehicleId && missionStartTimes[vehicleId]) {
                    delete missionStartTimes[vehicleId];
                    saveData(STORAGE_KEY_MISSION, missionStartTimes);
                }

                let remainingSeconds = null;
                if (vehicleId && arrivalTargetTimes[vehicleId]) {
                    remainingSeconds = Math.max(0, Math.floor((arrivalTargetTimes[vehicleId] - Date.now()) / 1000));
                }

                if (vehicleId && !vehicleDistances[vehicleId]) {
                    const distFromRow = parseDistanceString(rowText);
                    if (distFromRow) {
                        vehicleDistances[vehicleId] = distFromRow;
                        saveData(STORAGE_KEY_DISTANCE, vehicleDistances);
                    }
                }

                let badge = vehicleLink.parentNode.querySelector('.mc-status-arrival');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mc-status-timer mc-status-arrival';
                    vehicleLink.after(badge);
                }

                const displayTime = remainingSeconds !== null ? formatSeconds(remainingSeconds) : '00:00';
                const distStr = vehicleId && vehicleDistances[vehicleId] ? vehicleDistances[vehicleId] : '';

                if (distStr) {
                    badge.innerHTML = `<div>ETA: ${displayTime}</div><div class="mc-status-subtext">${distStr}</div>`;
                } else {
                    badge.innerHTML = `<div>ETA: ${displayTime}</div>`;
                }

            // --- STATUS 4: Elapsed Mission Time ---
            } else if (statusText.includes('4') || rowText.includes('Status 4')) {
                removeOtherBadges('.mc-status-mission');

                if (vehicleId) {
                    if (arrivalTargetTimes[vehicleId]) {
                        delete arrivalTargetTimes[vehicleId];
                        delete vehicleDistances[vehicleId];
                        saveData(STORAGE_KEY_ARRIVAL, arrivalTargetTimes);
                        saveData(STORAGE_KEY_DISTANCE, vehicleDistances);
                    }

                    if (!missionStartTimes[vehicleId]) {
                        missionStartTimes[vehicleId] = Date.now();
                        saveData(STORAGE_KEY_MISSION, missionStartTimes);
                    }

                    const elapsedSeconds = Math.floor((Date.now() - missionStartTimes[vehicleId]) / 1000);
                    
                    let badge = vehicleLink.parentNode.querySelector('.mc-status-mission');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'mc-status-timer mc-status-mission';
                        vehicleLink.after(badge);
                    }
                    badge.innerHTML = `<div>Mission Time:</div><div>${formatSeconds(elapsedSeconds)}</div>`;
                }

            // --- STATUS 5: Transport Needed ---
            } else if (statusText.includes('5') || rowText.includes('Status 5')) {
                removeOtherBadges('.mc-status-transport');
                clearStoredData();

                let badge = vehicleLink.parentNode.querySelector('.mc-status-transport');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mc-status-timer mc-status-transport';
                    vehicleLink.after(badge);
                }
                badge.innerHTML = `<div>Transport Needed</div>`;

            // --- STATUS 6: Out of Service ---
            } else if (statusText.includes('6') || rowText.includes('Status 6')) {
                removeOtherBadges('.mc-status-oos');
                clearStoredData();

                let badge = vehicleLink.parentNode.querySelector('.mc-status-oos');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mc-status-timer mc-status-oos';
                    vehicleLink.after(badge);
                }
                badge.innerHTML = `<div>Out of Service</div>`;

            // --- STATUS 7: EN Route/Hospital ---
            } else if (statusText.includes('7') || rowText.includes('Status 7')) {
                removeOtherBadges('.mc-status-hospital');
                clearStoredData();

                let badge = vehicleLink.parentNode.querySelector('.mc-status-hospital');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mc-status-timer mc-status-hospital';
                    vehicleLink.after(badge);
                }
                badge.innerHTML = `<div>EN Route/Hospital</div>`;

            // --- STATUS 1 / 2: In Service / Available ---
            } else if (statusText.includes('1') || statusText.includes('2') || rowText.includes('Status 1') || rowText.includes('Status 2')) {
                removeOtherBadges('.mc-status-service');
                clearStoredData();

                let badge = vehicleLink.parentNode.querySelector('.mc-status-service');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mc-status-timer mc-status-service';
                    vehicleLink.after(badge);
                }
                
                const serviceLabel = statusText.includes('2') || rowText.includes('Status 2') ? 'In Service (Station)' : 'In Service';
                badge.innerHTML = `<div>${serviceLabel}</div>`;

            // --- UNKNOWN STATES ---
            } else {
                removeOtherBadges(null);
                clearStoredData();
            }
        });
    }

    setInterval(updateStatusTimers, 1000);

})();
