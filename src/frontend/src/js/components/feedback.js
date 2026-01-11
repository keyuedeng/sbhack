/**
 * Feedback Component
 * Handles feedback display for learning mode
 */

// Store guidance history for learning mode
let guidanceHistory = [];

/**
 * Display real-time guidance/hints in the feedback panel
 * @param {Object} guidance - Guidance object with type, message, etc.
 */
export function displayGuidance(guidance) {
  const container = document.getElementById('feedbackContent');
  if (!container) return;

  // Add to guidance history
  if (guidance) {
    guidanceHistory.push({
      ...guidance,
      timestamp: Date.now()
    });
  }

  // Render all guidance items
  renderGuidance();
}

/**
 * Render all guidance items in the feedback panel
 */
function renderGuidance() {
  const container = document.getElementById('feedbackContent');
  if (!container) return;

  if (guidanceHistory.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-center mt-8">Complete the session to see feedback</div>';
    return;
  }

  const guidanceHtml = guidanceHistory.map(item => {
    const typeColors = {
      hint: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', title: 'Hint' },
      question: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '❓', title: 'Think About' },
      reminder: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '📌', title: 'Remember' },
      suggestion: { bg: 'bg-green-50', border: 'border-green-200', icon: '💭', title: 'Consider' },
      default: { bg: 'bg-gray-50', border: 'border-gray-200', icon: '📝', title: 'Note' }
    };

    const colors = typeColors[item.type] || typeColors.default;
    
    return `
      <div class="${colors.bg} border-2 ${colors.border} p-4 rounded-xl mb-4 animate-fade-in">
        <div class="font-bold ${colors.border.replace('border-', 'text-')} mb-2 flex items-center gap-2">
          <span>${colors.icon}</span>
          <span>${colors.title}</span>
        </div>
        <div class="text-sm text-gray-700 leading-relaxed">${escapeHtml(item.message)}</div>
      </div>
    `;
  });

  container.innerHTML = `<div class="space-y-4">${guidanceHtml}</div>`;
  
  // Auto-scroll to bottom to show latest guidance
  container.scrollTop = container.scrollHeight;
}

/**
 * Display feedback in overlay (for test mode) or sidebar (for learning mode)
 * @param {Object} feedback - Feedback result object
 * @param {string} mode - 'test' or 'learning'
 * @param {boolean} isCorrect - Whether the diagnosis is correct (for test mode)
 */
export function displayFeedback(feedback, mode = 'learning', isCorrect = false) {
  if (mode === 'test') {
    displayFeedbackInOverlay(feedback, isCorrect);
  } else {
    displayFeedbackInSidebar(feedback);
  }
}

/**
 * Display feedback in the sidebar (learning mode)
 * @param {Object} feedback - Feedback result object
 */
function displayFeedbackInSidebar(feedback) {
  const container = document.getElementById('feedbackContent');
  if (!container || !feedback) return;
  
  const scoreColor = feedback.summaryScore >= 80 ? 'text-green-600' : feedback.summaryScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = feedback.summaryScore >= 80 ? 'bg-green-50 border-green-200' : feedback.summaryScore >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  
  container.innerHTML = `
    <div class="space-y-5">
      <!-- Score Card -->
      <div class="${scoreBg} border-2 p-5 rounded-xl">
        <div class="text-3xl font-bold ${scoreColor} mb-3">${feedback.summaryScore}/100</div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Diagnosis:</span>
            <span class="font-semibold">${feedback.breakdown?.diagnosisCorrectness !== undefined ? feedback.breakdown.diagnosisCorrectness : (feedback.breakdown?.diagnosis || 0)}/20</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Intervention:</span>
            <span class="font-semibold">${feedback.breakdown?.intervention || 0}/5</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Critical Actions:</span>
            <span class="font-semibold">${feedback.breakdown?.criticalActions || 0}/25</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Communication:</span>
            <span class="font-semibold">${feedback.breakdown?.communication || 0}/20</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Efficiency:</span>
            <span class="font-semibold">${feedback.breakdown?.efficiency || 0}/30</span>
          </div>
        </div>
      </div>
      
      ${feedback.whatWentWell?.length > 0 ? `
        <div class="bg-green-50 border-2 border-green-200 p-4 rounded-xl">
          <div class="font-bold text-green-700 mb-3 flex items-center gap-2">
            <span>✅</span>
            <span>What Went Well</span>
          </div>
          <ul class="space-y-2 text-sm text-gray-700">
            ${feedback.whatWentWell.map(item => `<li class="flex items-start gap-2"><span class="text-green-600 mt-1">•</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${feedback.missed?.length > 0 ? `
        <div class="bg-red-50 border-2 border-red-200 p-4 rounded-xl">
          <div class="font-bold text-red-700 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>Missed Items</span>
          </div>
          <ul class="space-y-2 text-sm text-gray-700">
            ${feedback.missed.map(item => `<li class="flex items-start gap-2"><span class="text-red-600 mt-1">•</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${feedback.recommendations?.length > 0 ? `
        <div class="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
          <div class="font-bold text-blue-700 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>Recommendations</span>
          </div>
          <ul class="space-y-2 text-sm text-gray-700">
            ${feedback.recommendations.map(item => `<li class="flex items-start gap-2"><span class="text-blue-600 mt-1">•</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${feedback.solution ? `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-xl">
          <button class="solution-toggle-btn w-full font-bold text-green-800 mb-3 flex items-center justify-between gap-2 hover:text-green-900 transition-colors cursor-pointer">
            <div class="flex items-center gap-2">
              <span>✅</span>
              <span class="solution-toggle-text">Show Solution</span>
            </div>
            <svg class="solution-toggle-icon w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div class="solution-content hidden space-y-3 text-sm">
            <div>
              <div class="font-semibold text-gray-700 mb-1">Primary Diagnosis:</div>
              <div class="text-gray-900 font-medium">${escapeHtml(feedback.solution.primaryDiagnosis)}</div>
            </div>
            <div>
              <div class="font-semibold text-gray-700 mb-1">Critical Actions:</div>
              <ul class="space-y-1 text-gray-700">
                ${feedback.solution.criticalActions.map(action => `<li class="flex items-start gap-2"><span class="text-green-600 mt-1">•</span><span>${escapeHtml(action)}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  // Add event listener for solution toggle button
  setTimeout(() => {
    const toggleButtons = container.querySelectorAll('.solution-toggle-btn');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const content = button.nextElementSibling;
        const icon = button.querySelector('.solution-toggle-icon');
        const text = button.querySelector('.solution-toggle-text');
        if (content && icon && text) {
          const isHidden = content.classList.contains('hidden');
          if (isHidden) {
            content.classList.remove('hidden');
            icon.classList.add('rotate-180');
            text.textContent = 'Hide Solution';
          } else {
            content.classList.add('hidden');
            icon.classList.remove('rotate-180');
            text.textContent = 'Show Solution';
          }
        }
      });
    });
  }, 0);
}

// Store feedback data for tab switching
let currentFeedbackData = null;

/**
 * Display feedback in overlay (test mode)
 * @param {Object} feedback - Feedback result object
 * @param {boolean} isCorrect - Whether the diagnosis is correct
 */
function displayFeedbackInOverlay(feedback, isCorrect) {
  const overlay = document.getElementById('feedbackOverlay');
  const content = document.getElementById('feedbackOverlayContent');
  const status = document.getElementById('feedbackStatus');
  
  if (!overlay || !content || !status || !feedback) return;

  // Store feedback data for tab switching
  currentFeedbackData = { feedback, isCorrect };
  
  // Set correct/incorrect status
  status.textContent = isCorrect ? '✅' : '❌';
  status.className = `text-4xl font-extrabold ${isCorrect ? 'text-green-600' : 'text-red-600'}`;
  
  // Set up tabs
  const feedbackTab = document.getElementById('feedbackTab');
  const recommendationsTab = document.getElementById('recommendationsTab');
  const solutionTab = document.getElementById('solutionTab');
  
  // Reset all tabs
  [feedbackTab, recommendationsTab, solutionTab].forEach(tab => {
    if (tab) {
      tab.classList.remove('border-blue-600', 'bg-white');
      tab.classList.add('text-gray-500');
      tab.classList.remove('text-gray-700');
    }
  });
  
  // Activate feedback tab
  if (feedbackTab) {
    feedbackTab.classList.add('border-blue-600', 'bg-white', 'text-gray-700');
    feedbackTab.classList.remove('text-gray-500');
  }
  
  // Render feedback tab content
  renderFeedbackTab(feedback, isCorrect);
  
  // Add tab click handlers
  if (feedbackTab) {
    feedbackTab.onclick = () => {
      switchTab('feedback', feedback, isCorrect);
    };
  }
  if (recommendationsTab) {
    recommendationsTab.onclick = () => {
      switchTab('recommendations', feedback, isCorrect);
    };
  }
  if (solutionTab) {
    solutionTab.onclick = () => {
      switchTab('solution', feedback, isCorrect);
    };
  }
  
  overlay.classList.remove('hidden');
}

/**
 * Switch between tabs
 */
function switchTab(activeTab, feedback, isCorrect) {
  const feedbackTab = document.getElementById('feedbackTab');
  const recommendationsTab = document.getElementById('recommendationsTab');
  const solutionTab = document.getElementById('solutionTab');
  const content = document.getElementById('feedbackOverlayContent');
  
  if (!content) return;
  
  // Reset all tabs
  [feedbackTab, recommendationsTab, solutionTab].forEach(tab => {
    if (tab) {
      tab.classList.remove('border-blue-600', 'bg-white', 'text-gray-700');
      tab.classList.add('text-gray-500');
    }
  });
  
  // Activate selected tab
  if (activeTab === 'feedback' && feedbackTab) {
    feedbackTab.classList.add('border-blue-600', 'bg-white', 'text-gray-700');
    feedbackTab.classList.remove('text-gray-500');
    renderFeedbackTab(feedback, isCorrect);
  } else if (activeTab === 'recommendations' && recommendationsTab) {
    recommendationsTab.classList.add('border-blue-600', 'bg-white', 'text-gray-700');
    recommendationsTab.classList.remove('text-gray-500');
    renderRecommendationsTab(feedback);
  } else if (activeTab === 'solution' && solutionTab) {
    solutionTab.classList.add('border-blue-600', 'bg-white', 'text-gray-700');
    solutionTab.classList.remove('text-gray-500');
    renderSolutionTab(feedback);
  }
}

/**
 * Render feedback tab content
 */
function renderFeedbackTab(feedback, isCorrect) {
  const content = document.getElementById('feedbackOverlayContent');
  if (!content) return;
  
  const scoreColor = feedback.summaryScore >= 80 ? 'text-green-600' : feedback.summaryScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = feedback.summaryScore >= 80 ? 'bg-green-50 border-green-200' : feedback.summaryScore >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  
  content.innerHTML = `
    <div class="space-y-5">
      <!-- Score Card -->
      <div class="${scoreBg} border-2 p-5 rounded-xl">
        <div class="text-3xl font-bold ${scoreColor} mb-3">${feedback.summaryScore}/100</div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Diagnosis:</span>
            <span class="font-semibold">${feedback.breakdown?.diagnosisCorrectness !== undefined ? feedback.breakdown.diagnosisCorrectness : (feedback.breakdown?.diagnosis || 0)}/20</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Intervention:</span>
            <span class="font-semibold">${feedback.breakdown?.intervention || 0}/5</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Critical Actions:</span>
            <span class="font-semibold">${feedback.breakdown?.criticalActions || 0}/25</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Communication:</span>
            <span class="font-semibold">${feedback.breakdown?.communication || 0}/20</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Efficiency:</span>
            <span class="font-semibold">${feedback.breakdown?.efficiency || 0}/30</span>
          </div>
        </div>
      </div>
      
      ${feedback.whatWentWell?.length > 0 ? `
        <div class="bg-green-50 border-2 border-green-200 p-4 rounded-xl">
          <div class="font-bold text-green-700 mb-3 flex items-center gap-2">
            <span>✅</span>
            <span>What Went Well</span>
          </div>
          <ul class="space-y-2 text-sm text-gray-700">
            ${feedback.whatWentWell.map(item => `<li class="flex items-start gap-2"><span class="text-green-600 mt-1">•</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${feedback.missed?.length > 0 ? `
        <div class="bg-red-50 border-2 border-red-200 p-4 rounded-xl">
          <div class="font-bold text-red-700 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>Missed Items</span>
          </div>
          <ul class="space-y-2 text-sm text-gray-700">
            ${feedback.missed.map(item => `<li class="flex items-start gap-2"><span class="text-red-600 mt-1">•</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render recommendations tab content
 */
function renderRecommendationsTab(feedback) {
  const content = document.getElementById('feedbackOverlayContent');
  if (!content) return;
  
  content.innerHTML = `
    <div class="space-y-5">
      ${feedback.recommendations?.length > 0 ? `
        <div class="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
          <div class="font-bold text-blue-700 mb-4 flex items-center gap-2 text-xl">
            <span>💡</span>
            <span>Recommendations</span>
          </div>
          <ul class="space-y-3 text-base text-gray-700">
            ${feedback.recommendations.map(item => `<li class="flex items-start gap-3"><span class="text-blue-600 mt-1 text-xl">•</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      ` : `
        <div class="text-center text-gray-500 py-12">
          <div class="text-lg">No recommendations available</div>
        </div>
      `}
    </div>
  `;
}

/**
 * Render solution tab content
 */
function renderSolutionTab(feedback) {
  const content = document.getElementById('feedbackOverlayContent');
  if (!content) return;
  
  const solution = feedback.solution;
  
  content.innerHTML = `
    <div class="space-y-5">
      ${solution ? `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-6 rounded-xl">
          <div class="font-bold text-green-800 mb-4 flex items-center gap-2 text-xl">
            <span>✅</span>
            <span>Correct Diagnosis</span>
          </div>
          <div class="text-lg font-semibold text-gray-900 mb-6">
            ${escapeHtml(solution.primaryDiagnosis)}
          </div>
          
          <div class="font-bold text-green-800 mb-4 flex items-center gap-2 text-xl">
            <span>🔑</span>
            <span>Critical Actions</span>
          </div>
          <ul class="space-y-2 text-base text-gray-700">
            ${solution.criticalActions.map(action => `<li class="flex items-start gap-3"><span class="text-green-600 mt-1.5 text-xl">•</span><span>${escapeHtml(action)}</span></li>`).join('')}
          </ul>
        </div>
      ` : `
        <div class="text-center text-gray-500 py-12">
          <div class="text-lg">Solution information not available</div>
        </div>
      `}
    </div>
  `;
}

/**
 * Hide feedback overlay
 */
export function hideFeedbackOverlay() {
  const overlay = document.getElementById('feedbackOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
  
  // Clear feedback data
  currentFeedbackData = null;
  
  // Remove chat fade
  const mainContentArea = document.querySelector('#simulationPage > .flex-1');
  if (mainContentArea) {
    mainContentArea.classList.remove('chat-faded');
  }
}

/**
 * Clear feedback content
 */
export function clearFeedback() {
  const container = document.getElementById('feedbackContent');
  if (container) {
    container.innerHTML = '<div class="text-gray-500 text-center mt-8">Complete the session to see feedback</div>';
  }
  
  guidanceHistory = [];
  currentFeedbackData = null;
  
  // Also clear overlay content
  const overlayContent = document.getElementById('feedbackOverlayContent');
  if (overlayContent) {
    overlayContent.innerHTML = '';
  }
}

/**
 * Get retake callback (set from main.js)
 */
let retakeCallback = null;

/**
 * Set retake callback
 */
export function setRetakeCallback(callback) {
  retakeCallback = callback;
}

/**
 * Initialize retake button handler
 */
export function initRetakeButton() {
  const retakeButton = document.getElementById('retakeButton');
  if (retakeButton && retakeCallback) {
    retakeButton.onclick = () => {
      if (retakeCallback) {
        retakeCallback();
      }
    };
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}