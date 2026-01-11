/**
 * Voice Input Utility
 * Handles speech recognition using Web Speech API
 */

class VoiceInput {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    
    // Initialize speech recognition if available
    this.initSpeechRecognition();
  }

  /**
   * Initialize speech recognition API
   */
  initSpeechRecognition() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Stop after first result
      this.recognition.interimResults = false; // Only return final results
      this.recognition.lang = 'en-US'; // Set language

      // Set up event handlers
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.onResultCallback) {
          this.onResultCallback(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };

      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      return false;
    }
  }

  /**
   * Check if speech recognition is available
   */
  isAvailable() {
    return this.recognition !== null;
  }

  /**
   * Start listening for voice input
   * @param {Function} onResult - Callback when speech is recognized (receives transcript string)
   * @param {Function} onError - Optional callback for errors (receives error object)
   * @param {Function} onEnd - Optional callback when recognition ends
   */
  startListening(onResult, onError = null, onEnd = null) {
    if (!this.isAvailable()) {
      const error = new Error('Speech recognition is not available');
      if (onError) {
        onError(error);
      }
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      if (onError) {
        onError(error);
      }
      return false;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore errors when stopping (it might already be stopped)
        console.warn('Error stopping speech recognition:', error);
      }
      this.isListening = false;
    }
  }

  /**
   * Get current listening state
   */
  getListeningState() {
    return this.isListening;
  }
}

// Export singleton instance
export const voiceInput = new VoiceInput();
