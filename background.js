// background.js

const ONE_MINUTE = 60000;
const PRODUCTIVE_SITES = ["github.com", "stackoverflow.com", "leetcode.com", "w3schools.com"];
const UNPRODUCTIVE_SITES = ["facebook.com", "instagram.com", "tiktok.com", "youtube.com/shorts"];
const MIN_TO_NOTIFY = 10; // Alert interval

let lastActiveTime = Date.now();
let activeDomain = null;

// Helper to classify a URL
function classifyUrl(url) {
    try {
        const domain = new URL(url).hostname.replace('www.', '');

        if (PRODUCTIVE_SITES.some(site => domain.includes(site))) {
            return { domain, category: 'productive' };
        }
        if (UNPRODUCTIVE_SITES.some(site => domain.includes(site))) {
            return { domain, category: 'unproductive' };
        }
        return { domain, category: 'neutral' };
    } catch (e) {
        // Use a safe, non-trackable object for internal/invalid URLs
        return { domain: 'browser_internal', category: 'internal' };
    }
}

// Core time tracking function (runs every minute)
async function trackActiveTime() {
    const now = Date.now();
    const elapsedTime = now - lastActiveTime;
    lastActiveTime = now;

    // CRITICAL STABILITY CHECK: Ensure activeDomain and activeDomain.domain exist
    if (activeDomain && activeDomain.domain && activeDomain.category !== 'internal' && elapsedTime < ONE_MINUTE * 2) {
        
        const result = await chrome.storage.local.get(['timeData']);
        const timeData = result.timeData || {};
        const domainKey = activeDomain.domain;

        if (!timeData[domainKey]) {
            timeData[domainKey] = { 
                totalTime: 0, 
                category: activeDomain.category,
                lastSeen: now 
            };
        }
        
        const timeSpentBefore = timeData[domainKey].totalTime;
        
        // Add elapsed time
        const timeToAdd = Math.round(elapsedTime / ONE_MINUTE) || 1;
        const timeSpentAfter = timeSpentBefore + timeToAdd;

        timeData[domainKey].totalTime = timeSpentAfter;
        timeData[domainKey].lastSeen = now;

        await chrome.storage.local.set({ timeData });

        // === NEW FEATURE: 10-MINUTE UNPRODUCTIVE REMINDER ===
        if (activeDomain.category === 'unproductive') {
            const currentInterval = Math.floor(timeSpentAfter / MIN_TO_NOTIFY);
            const previousInterval = Math.floor(timeSpentBefore / MIN_TO_NOTIFY);
            
            // Check if we just crossed a 10-minute boundary
            if (currentInterval > 0 && currentInterval > previousInterval) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png', // Ensure this path is correct
                    title: 'Productivity Alert! 🚨',
                    message: `You've spent ${currentInterval * MIN_TO_NOTIFY} minutes on ${domainKey}. Time to switch?`,
                    priority: 2
                });
            }
        }
    }
}

// Monitor active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    trackActiveTime();
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (tab && tab.url) { 
        activeDomain = classifyUrl(tab.url);
    } else {
        activeDomain = { domain: 'browser_internal', category: 'internal' }; 
    }
    lastActiveTime = Date.now();
});

// Monitor URL changes within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.url) {
        trackActiveTime(); 
        
        activeDomain = classifyUrl(changeInfo.url);
        lastActiveTime = Date.now();
    }
});

// Set up an alarm to run the tracker periodically
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('minuteTracker', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'minuteTracker') {
        trackActiveTime();
    }
});