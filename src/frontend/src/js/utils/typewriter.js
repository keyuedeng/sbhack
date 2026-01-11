/**
 * Typewriter Effect Utility
 * Creates a typing animation effect
 */

/**
 * Typewriter effect function
 * @param {HTMLElement} element - Element to type into
 * @param {string} text - Text to type
 * @param {number} speed - Delay between characters (ms)
 * @param {Function} callback - Optional callback when done
 */
export function typeWriter(element, text, speed, callback) {
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (callback) {
      callback();
    }
  }
  
  type();
}
