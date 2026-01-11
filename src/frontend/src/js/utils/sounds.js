/**
 * Sound Utility
 * Plays sound effects for user feedback
 */

/**
 * Play a sound using Web Audio API
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in milliseconds
 * @param {string} type - 'sine', 'square', 'sawtooth', or 'triangle'
 */
function playTone(frequency, duration, type = 'sine') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope: fade in and out for smoother sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Could not play sound:', error);
  }
}

/**
 * Play a sequence of tones
 * @param {Array} tones - Array of {frequency, duration, type} objects
 */
function playSequence(tones) {
  let delay = 0;
  tones.forEach(tone => {
    setTimeout(() => {
      playTone(tone.frequency, tone.duration, tone.type);
    }, delay);
    delay += tone.duration;
  });
}

/**
 * Play success/correct sound (pleasant ascending tones)
 */
export function playCorrectSound() {
  playSequence([
    { frequency: 523.25, duration: 100, type: 'sine' }, // C5
    { frequency: 659.25, duration: 100, type: 'sine' }, // E5
    { frequency: 783.99, duration: 150, type: 'sine' }  // G5
  ]);
}

/**
 * Play error/wrong sound (harsh descending tone)
 */
export function playWrongSound() {
  playSequence([
    { frequency: 400, duration: 150, type: 'square' },
    { frequency: 300, duration: 150, type: 'square' }
  ]);
}
