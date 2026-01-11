/**
 * Feedback Component
 * Handles feedback display for learning mode
 */

/**
 * Display feedback in the feedback panel
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
 * Clear feedback display
 */
export function clearFeedback() {
  const container = document.getElementById('feedbackContent');
  if (container) {
    container.innerHTML = '<div class="text-gray-500 text-center mt-8">Complete the session to see feedback</div>';
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
