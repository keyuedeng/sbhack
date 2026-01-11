/**
 * Text-to-Speech Utility
 * Uses Deepgram Aura TTS API via backend, with fallback to browser Speech Synthesis
 */

const API_BASE_URL = 'http://localhost:3000';

class TextToSpeech {
  constructor() {
    this.isSpeaking = false;
    this.currentAudio = null;
    this.browserSynthesis = null;
    this.browserUtterance = null;
    this.useDeepgram = true; // Try Deepgram first
    
    // Initialize browser Speech Synthesis as fallback
    if ('speechSynthesis' in window) {
      this.browserSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Check if speech synthesis is available
   */
  isAvailable() {
    return true; // Always available (either Deepgram or browser fallback)
  }

  /**
   * Speak text using Deepgram TTS (with browser fallback)
   * @param {string} text - Text to speak
   * @param {Object} options - Optional settings (voice, etc.)
   * @param {Function} onEnd - Optional callback when speech ends
   * @param {Function} onError - Optional callback for errors
   */
  async speak(text, options = {}, onEnd = null, onError = null) {
    if (!text || text.trim() === '') {
      return false;
    }

    // Stop any currently playing audio
    this.stop();

    // Try Deepgram first if enabled
    if (this.useDeepgram) {
      try {
        // Call backend TTS endpoint
        const response = await fetch(`${API_BASE_URL}/tts/speak`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
            body: JSON.stringify({
              text: text.trim(),
              voice: options.voice || 'athena', // Voice name (e.g., 'athena' becomes 'aura-2-athena-en')
            }),
        });

        if (response.ok) {
          // Get audio blob
          const audioBlob = await response.blob();
          
          if (audioBlob && audioBlob.size > 0) {
            // Create audio element and play
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            this.currentAudio = audio;
            this.isSpeaking = true;

            // Event handlers
            audio.onended = () => {
              this.isSpeaking = false;
              this.currentAudio = null;
              URL.revokeObjectURL(audioUrl);
              if (onEnd) {
                onEnd();
              }
            };

            audio.onerror = (event) => {
              this.isSpeaking = false;
              this.currentAudio = null;
              URL.revokeObjectURL(audioUrl);
              console.error('Audio playback error:', event);
              // Fallback to browser TTS on error
              this.speakWithBrowser(text, options, onEnd, onError);
            };

            audio.onplay = () => {
              this.isSpeaking = true;
            };

            // Play audio
            await audio.play();
            return true;
          }
        } else if (response.status === 503) {
          // API key not configured - fallback to browser
          console.warn('Deepgram TTS not configured, using browser Speech Synthesis');
          this.useDeepgram = false; // Disable Deepgram for this session
          return this.speakWithBrowser(text, options, onEnd, onError);
        }
      } catch (error) {
        console.warn('Deepgram TTS error, falling back to browser:', error);
        // Fallback to browser TTS on error
        return this.speakWithBrowser(text, options, onEnd, onError);
      }
    }

    // Use browser Speech Synthesis as fallback
    return this.speakWithBrowser(text, options, onEnd, onError);
  }

  /**
   * Speak text using browser Speech Synthesis (fallback)
   */
  speakWithBrowser(text, options = {}, onEnd = null, onError = null) {
    if (!this.browserSynthesis) {
      if (onError) {
        onError('Speech synthesis not available');
      }
      return false;
    }

    try {
      // Stop any current speech
      this.browserSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());

      // Try to find a female voice
      const voices = this.browserSynthesis.getVoices();
      const femaleVoices = voices.filter(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('susan') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('moira')
      );
      
      if (femaleVoices.length > 0) {
        utterance.voice = femaleVoices[0];
      } else if (voices.length > 0) {
        utterance.voice = voices[0];
      }

      utterance.rate = options.rate || 0.95;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 0.9;
      utterance.lang = options.lang || 'en-US';

      utterance.onend = () => {
        this.isSpeaking = false;
        this.browserUtterance = null;
        if (onEnd) {
          onEnd();
        }
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.browserUtterance = null;
        console.error('Speech synthesis error:', event.error);
        if (onError) {
          onError(event.error);
        }
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      this.browserUtterance = utterance;
      this.browserSynthesis.speak(utterance);

      return true;
    } catch (error) {
      console.error('Error in browser speech synthesis:', error);
      if (onError) {
        onError(error);
      }
      return false;
    }
  }

  /**
   * Stop current speech
   */
  stop() {
    // Stop Deepgram audio
    if (this.currentAudio && this.isSpeaking) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isSpeaking = false;
    }

    // Stop browser speech
    if (this.browserSynthesis) {
      this.browserSynthesis.cancel();
      this.browserUtterance = null;
      this.isSpeaking = false;
    }
  }

  /**
   * Pause current speech
   */
  pause() {
    if (this.currentAudio && this.isSpeaking) {
      this.currentAudio.pause();
    }
    if (this.browserSynthesis && this.isSpeaking) {
      this.browserSynthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume() {
    if (this.currentAudio && !this.isSpeaking) {
      this.currentAudio.play();
    }
    if (this.browserSynthesis && this.isSpeaking) {
      this.browserSynthesis.resume();
    }
  }

  /**
   * Get current speaking state
   */
  getSpeakingState() {
    return this.isSpeaking;
  }
}

// Export singleton instance
export const textToSpeech = new TextToSpeech();
