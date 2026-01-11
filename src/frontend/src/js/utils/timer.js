/**
 * Timer Utility
 * Handles session timer functionality
 */

export class Timer {
  constructor(element, onComplete) {
    this.element = element;
    this.onComplete = onComplete;
    this.timeRemaining = 0;
    this.interval = null;
  }

  /**
   * Format seconds to MM:SS
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Start timer with specified duration
   * @param {number} durationSec - Duration in seconds
   */
  start(durationSec) {
    this.timeRemaining = durationSec;
    this.updateDisplay();
    this.element.classList.remove('hidden');
    
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    this.interval = setInterval(() => {
      this.timeRemaining--;
      this.updateDisplay();
      
      if (this.timeRemaining <= 0) {
        this.stop();
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }, 1000);
  }

  /**
   * Stop timer
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.updateDisplay();
  }

  /**
   * Update timer display
   */
  updateDisplay() {
    if (this.element) {
      this.element.textContent = this.formatTime(Math.max(0, this.timeRemaining));
    }
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingTime() {
    return Math.max(0, this.timeRemaining);
  }
}
