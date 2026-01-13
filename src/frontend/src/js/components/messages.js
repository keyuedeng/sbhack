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
    messageDiv.className = 'mb-4 flex items-start justify-start gap-2 animate-fade-in';
    messageDiv.innerHTML = `
      <div class="max-w-[75%] bg-white border-2 border-gray-200 text-gray-800 px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm relative group">
        <p class="text-base leading-relaxed">${escapeHtml(text)}</p>
      </div>
      ${textToSpeech.isAvailable() ? `
        <button class="audio-button w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-full transition-colors flex-shrink-0 mt-1" title="Play audio">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
      ` : ''}
    `;
    
    // Preload audio in the background for faster playback when button is clicked
    if (textToSpeech.isAvailable()) {
      // Preload audio asynchronously (don't wait)
      textToSpeech.preloadAudio(text, {
        voice: 'athena' // Natural female voice from Deepgram Aura (aura-2-athena-en)
      }).catch(() => {
        // Silently fail - will load on-demand if preload fails
      });

      // Add click event listener to audio button
      const audioButton = messageDiv.querySelector('.audio-button');
      if (audioButton) {
        audioButton.addEventListener('click', () => {
          textToSpeech.speak(text, {
            voice: 'athena' // Natural female voice from Deepgram Aura (aura-2-athena-en)
          });
        });
      }
    }
  }
  
  container.appendChild(messageDiv);
  
  // Auto-scroll to bottom with smooth scrolling
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'smooth'
  });
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
    textToSpeech.clearCache(); // Clear audio cache to free memory
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
