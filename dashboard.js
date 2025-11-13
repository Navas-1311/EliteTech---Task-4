// dashboard.js

const PRODUCTIVE_CATEGORY = 'productive';
const UNPRODUCTIVE_CATEGORY = 'unproductive';
const NEUTRAL_CATEGORY = 'neutral';
const reportContainer = document.getElementById('report-container');

// Helper to safely retrieve CSS variable values
function getCssVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

// Helper function to format minutes into hours/minutes
function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours} hr ${mins} min`;
    }
    return `${mins} min`;
}

// Function to draw the productivity pie chart (single, cleaned implementation)
function drawProductivityChart(productiveTime, unproductiveTime, neutralTime) {
    const canvas = document.getElementById('productivityChart');
    if (!canvas) {
        console.error("Canvas element 'productivityChart' not found.");
        return;
    }

    // Check if the global Chart object exists before proceeding
    if (typeof Chart === 'undefined') {
        console.error("Chart.js library is not yet loaded or defined.");
        // The renderReport caller already retries/delays drawing; bail out here.
        return;
    }

    const ctx = canvas.getContext('2d');

    // --- READ COLOR VALUES FOR CHART.JS ---
    const textDarkColor = getCssVariable('--text-color-dark') || '#444';
    const accentGreen = getCssVariable('--accent-green') || '#4caf50';
    const accentRed = getCssVariable('--accent-red') || '#f44336';
    const accentYellow = getCssVariable('--accent-yellow') || '#ffca28';

    // Destroy existing chart instance if it exists (for refreshes)
    if (window.myProductivityChart && typeof window.myProductivityChart.destroy === 'function') {
        window.myProductivityChart.destroy();
    }

    window.myProductivityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Productive Time', 'Unproductive Time', 'Neutral Time'],
            datasets: [{
                label: 'Time Spent (Minutes)',
                data: [productiveTime, unproductiveTime, neutralTime],
                backgroundColor: [
                    accentGreen,
                    accentRed,
                    accentYellow
                ],
                hoverOffset: 4
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: textDarkColor }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%'
        }
    });
}


async function renderReport() {
    const result = await chrome.storage.local.get(['timeData']);
    const timeData = result.timeData || {};

    let totalProductive = 0;
    let totalUnproductive = 0;
    let totalNeutral = 0;

    const sortedDomains = Object.entries(timeData)
        .sort(([, a], [, b]) => b.totalTime - a.totalTime);

    // --- RENDER DOMAIN LIST ---
    reportContainer.innerHTML = `<h2>Site Usage Breakdown</h2><div id="site-list"></div>`;
    const siteList = document.getElementById('site-list');

    sortedDomains.forEach(([domain, data]) => {
        const category = data.category;

        if (category === PRODUCTIVE_CATEGORY) totalProductive += data.totalTime;
        else if (category === UNPRODUCTIVE_CATEGORY) totalUnproductive += data.totalTime;
        else if (category === NEUTRAL_CATEGORY) totalNeutral += data.totalTime;

        const domainElement = document.createElement('div');
        const categoryClass = category === PRODUCTIVE_CATEGORY ? 'productive' :
                              category === UNPRODUCTIVE_CATEGORY ? 'unproductive' : 'neutral';

        domainElement.className = 'data-card';
        domainElement.innerHTML = `
            <strong>${domain}</strong>
            <p>Time Spent: ${formatMinutes(data.totalTime)}</p>
            <p>Category: <span class="${categoryClass}">${category.toUpperCase()}</span></p>
        `;
        siteList.appendChild(domainElement);
    });

    // --- DRAW CHART (DELAYED TO ENSURE LAYOUT) ---
    const totalTimeTracked = totalProductive + totalUnproductive + totalNeutral;
    const chartContainer = document.querySelector('.chart-container');
    const canvas = document.getElementById('productivityChart');

    if (totalTimeTracked > 0) {
        // Use a slightly longer delay (200ms) to ensure the browser finishes layout
        setTimeout(() => {
            // Check if context is available
            if (canvas && canvas.getContext && canvas.getContext('2d')) {
                drawProductivityChart(totalProductive, totalUnproductive, totalNeutral);
                // After drawing, fade it in (set opacity to 1)
                try { canvas.style.opacity = 1; } catch (e) { /* ignore style errors */ }
            } else {
                console.error("Chart context not found after delay. Check CSS sizing.");
            }
        }, 200);
    } else {
        // Display a message if no time has been tracked yet
        if (chartContainer) {
            chartContainer.innerHTML = '<h2>Productivity Overview</h2><p class="text-color-light" style="color:#616161; text-align:center;">No significant usage data recorded yet. Browse for a few minutes to see your chart!</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', renderReport);

// Optional debug smoke test: set `window.DEBUG_DRAW_SAMPLE = true` in the console
// then reload the page to force a sample chart rendering (useful for visual checks).
// For development (CDN mode) default the debug flag to true so the sample chart
// is drawn automatically. You can override in the console by setting
// `window.DEBUG_DRAW_SAMPLE = false` before reload.
if (typeof window.DEBUG_DRAW_SAMPLE === 'undefined') {
    window.DEBUG_DRAW_SAMPLE = true;
}
if (window.DEBUG_DRAW_SAMPLE) {
    document.addEventListener('DOMContentLoaded', () => {
        // Give Chart.js a short moment to initialize
        setTimeout(() => {
            const canvas = document.getElementById('productivityChart');
            if (canvas && typeof Chart !== 'undefined') {
                try {
                    drawProductivityChart(120, 45, 15); // sample minutes: productive, unproductive, neutral
                    canvas.style.opacity = 1;
                    console.info('DEBUG: Sample chart drawn.');
                } catch (err) {
                    console.error('DEBUG: Failed to draw sample chart:', err);
                }
            } else {
                console.warn('DEBUG: Chart or canvas not ready for smoke test.');
            }
        }, 250);
    });
}