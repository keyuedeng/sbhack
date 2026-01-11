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
  }).join('');

  container.innerHTML = `<div class="space-y-4">${guidanceHtml}</div>`;
  
  // Auto-scroll to bottom to show latest guidance
  container.scrollTop = container.scrollHeight;
}

/**
 * Display feedback in the feedback panel (final feedback after diagnosis)
 * @param {Object} feedback - Feedback result object
 */
export function displayFeedback(feedback) {
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
            <span class="font-semibold">${feedback.breakdown?.diagnosis || 0}/25</span>
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
    </div>
  `;
}

/**
 * Clear feedback display and guidance history
 */
export function clearFeedback() {
  const container = document.getElementById('feedbackContent');
  if (container) {
    container.innerHTML = '<div class="text-gray-500 text-center mt-8">Complete the session to see feedback</div>';
  }
  guidanceHistory = [];
}

/**
 * Clear only guidance history (keep final feedback if shown)
 */
export function clearGuidance() {
  guidanceHistory = [];
  const container = document.getElementById('feedbackContent');
  if (container && container.innerHTML.includes('text-gray-500 text-center')) {
    container.innerHTML = '<div class="text-gray-500 text-center mt-8">Complete the session to see feedback</div>';
  }
}

/**
 * Generate contextual guidance based on conversation state
 * @param {number} messageCount - Number of messages exchanged (user + patient)
 * @param {string} lastUserMessage - Last user message (optional)
 * @param {string} lastPatientReply - Last patient reply (optional)
 * @returns {Object|null} Guidance object or null if no guidance needed
 */
export function generateGuidance(messageCount, lastUserMessage = '', lastPatientReply = '') {
  // Initial guidance when session starts
  if (messageCount === 0) {
    return {
      type: 'hint',
      message: 'Welcome to Learning Mode! Start by introducing yourself and asking about the patient\'s chief complaint. Use open-ended questions to gather information.'
    };
  }

  // Early stage: Focus on history taking
  if (messageCount <= 4) {
    const lowerUser = lastUserMessage.toLowerCase();
    const lowerPatient = lastPatientReply.toLowerCase();
    
    // Check if they've asked about pain characteristics
    if (!lowerUser.includes('pain') && !lowerUser.includes('hurt') && !lowerUser.includes('discomfort')) {
      return {
        type: 'question',
        message: 'Have you asked about the characteristics of the pain? Consider asking: "Can you describe the pain?" or "What does it feel like?"'
      };
    }
    
    // Check if they've asked about timing
    if ((lowerUser.includes('pain') || lowerUser.includes('hurt')) && 
        !lowerUser.includes('when') && !lowerUser.includes('start') && !lowerUser.includes('how long')) {
      return {
        type: 'hint',
        message: 'Good start! Now ask about timing: "When did this start?" or "How long have you had this?"'
      };
    }
  }

  // Mid stage: Encourage deeper investigation
  if (messageCount > 4 && messageCount <= 10) {
    const lowerUser = lastUserMessage.toLowerCase();
    const lowerPatient = lastPatientReply.toLowerCase();
    
    // Remind about past medical history
    if (!lowerUser.includes('history') && !lowerUser.includes('medical') && !lowerUser.includes('past') && 
        !lowerUser.includes('medication') && !lowerUser.includes('allergy')) {
      return {
        type: 'reminder',
        message: 'Remember to ask about past medical history, medications, and allergies. These can be crucial for diagnosis and treatment decisions.'
      };
    }
    
    // Encourage physical exam or diagnostic thinking
    if (lowerUser.includes('history') || lowerUser.includes('medication')) {
      return {
        type: 'suggestion',
        message: 'Good information gathering! Consider what physical exam findings or diagnostic tests might help confirm your diagnosis.'
      };
    }
  }

  // Late stage: Encourage diagnosis thinking
  if (messageCount > 10) {
    const lowerUser = lastUserMessage.toLowerCase();
    const lowerPatient = lastPatientReply.toLowerCase();
    
    // Check if they're asking repetitive questions
    const words = lowerUser.split(/\s+/);
    const uniqueWords = new Set(words);
    if (uniqueWords.size < 4 && messageCount > 12) {
      return {
        type: 'hint',
        message: 'You\'ve gathered good information. Consider reviewing what you know and thinking about your differential diagnosis.'
      };
    }
    
    // General reminder about critical actions
    if (messageCount > 15) {
      return {
        type: 'reminder',
        message: 'Remember to consider critical actions: Are there any red flags? What immediate interventions might be needed?'
      };
    }
  }

  return null;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
