/**
 * Message Component
 * Handles message display in chat interfaces
 */

import { textToSpeech } from '../utils/textToSpeech.js';

/**
 * Add a message to the chat container
 * @param {HTMLElement} container - Message container element
 * @param {string} text - Message text
 * @param {boolean} isUser - True if user message, false if patient
 */
export function addMessage(container, text, isUser) {
  const messageDiv = document.createElement('div');
  
  if (isUser) {
    messageDiv.className = 'mb-4 flex justify-end animate-fade-in';
    messageDiv.innerHTML = `
      <div class="max-w-[75%] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 rounded-2xl rounded-br-sm shadow-md">
        <p class="text-base leading-relaxed">${escapeHtml(text)}</p>
      </div>
    `;
  } else {
    messageDiv.className = 'mb-4 flex justify-start animate-fade-in';
    messageDiv.innerHTML = `
      <div class="max-w-[75%] bg-white border-2 border-gray-200 text-gray-800 px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm">
        <p class="text-base leading-relaxed">${escapeHtml(text)}</p>
      </div>
    `;
  }
  
  container.appendChild(messageDiv);
  // Auto-scroll to bottom with smooth scrolling
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'smooth'
  });
  
  // Speak patient messages aloud using Deepgram human-like voices (with browser fallback)
  if (!isUser && textToSpeech.isAvailable()) {
    // Small delay to ensure message is rendered first
    setTimeout(() => {
      textToSpeech.speak(text, {
        voice: 'athena' // Natural female voice from Deepgram Aura (aura-2-athena-en)
      });
    }, 300);
  }
}

/**
 * Clear all messages from container
 * @param {HTMLElement} container - Message container element
 */
export function clearMessages(container) {
  if (container) {
    container.innerHTML = '';
  }
  
  // Stop any ongoing speech when clearing messages
  if (textToSpeech.isAvailable()) {
    textToSpeech.stop();
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
