// popup.js

const PRODUCTIVE_CATEGORY = 'productive';
const UNPRODUCTIVE_CATEGORY = 'unproductive';
const NEUTRAL_CATEGORY = 'neutral';

// Replicate classifyUrl here for the popup UI (it doesn't have access to background.js functions)
function classifyUrl(url) {
    const PRODUCTIVE_SITES = ["github.com", "stackoverflow.com", "leetcode.com", "w3schools.com"];
    const UNPRODUCTIVE_SITES = ["facebook.com", "instagram.com", "tiktok.com", "youtube.com/shorts"];
    
    try {
        const domain = new URL(url).hostname.replace('www.', '');

        if (PRODUCTIVE_SITES.some(site => domain.includes(site))) {
            return { category: PRODUCTIVE_CATEGORY };
        }
        if (UNPRODUCTIVE_SITES.some(site => domain.includes(site))) {
            return { category: UNPRODUCTIVE_CATEGORY };
        }
        return { category: NEUTRAL_CATEGORY };
    } catch (e) {
        return { category: 'internal' };
    }
}

// Function to calculate and display summary data
async function displaySummary() {
    const result = await chrome.storage.local.get(['timeData']);
    const timeData = result.timeData || {};

    let totalProductive = 0;
    let totalUnproductive = 0;
    let totalNeutral = 0;

    // Calculate totals from stored data
    for (const domain in timeData) {
        const item = timeData[domain];
        if (item.category === PRODUCTIVE_CATEGORY) {
            totalProductive += item.totalTime;
        } else if (item.category === UNPRODUCTIVE_CATEGORY) {
            totalUnproductive += item.totalTime;
        } else if (item.category === NEUTRAL_CATEGORY) {
            totalNeutral += item.totalTime;
        }
    }

    // Update the HTML
    document.getElementById('total-productive').textContent = totalProductive;
    document.getElementById('total-unproductive').textContent = totalUnproductive;
    document.getElementById('total-neutral').textContent = totalNeutral;
}

// Function to display the currently active site
function displayActiveSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            const status = new URL(url).hostname.replace('www.', '');
            const category = classifyUrl(url).category; 

            document.getElementById('active-site').textContent = status;
            document.getElementById('active-category').textContent = category;

            // Simple style change based on category
            const categorySpan = document.getElementById('active-category');
            categorySpan.className = category; 
        }
    });
}

// Event listener for the Full Dashboard button (opens dashboard.html)
document.getElementById('full-dashboard-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Run display functions on load
document.addEventListener('DOMContentLoaded', () => {
    displayActiveSite();
    displaySummary();
});