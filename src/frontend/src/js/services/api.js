/**
 * API Service
 * Handles all communication with the backend API
 */

const API_BASE_URL = 'http://localhost:3000';

class ApiService {
  /**
   * Start a new session
   * @param {string} caseId - The case ID
   * @param {number} level - Difficulty level (1-3)
   * @param {string} userName - User's name
   * @param {number} [timeLimitSec] - Optional time limit in seconds
   * @param {number} [maxTurns] - Optional maximum turns
   * @returns {Promise<{sessionId: string, timeLimitSec?: number, maxTurns?: number, introLine?: string}>}
   */
  async startSession(caseId, level, userName, timeLimitSec, maxTurns) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          level,
          userName,
          timeLimitSec,
          maxTurns,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  /**
   * Send a message to the patient
   * @param {string} sessionId - The session ID
   * @param {string} message - The user's message
   * @returns {Promise<{patientReply: string, currentTurn: number, maxTurns?: number, isActive: boolean}>}
   */
  async sendMessage(sessionId, message) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Record an action (exam, lab order, etc.)
   * @param {string} sessionId - The session ID
   * @param {string} actionType - Type of action
   * @param {any} [details] - Optional action details
   * @returns {Promise<{result: string, actionRecorded: boolean}>}
   */
  async recordAction(sessionId, actionType, details) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          actionType,
          details,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record action');
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording action:', error);
      throw error;
    }
  }

  /**
   * End a session with diagnosis
   * @param {string} sessionId - The session ID
   * @param {string} diagnosis - The submitted diagnosis
   * @returns {Promise<{success: boolean, sessionId: string, endedAt: number, submittedDiagnosis?: string}>}
   */
  async endSession(sessionId, diagnosis) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          diagnosis,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to end session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Get feedback for a completed session
   * @param {string} sessionId - The session ID
   * @returns {Promise<FeedbackResult>}
   */
  async getFeedback(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/feedback?sessionId=${sessionId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get feedback');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting feedback:', error);
      throw error;
    }
  }

  /**
   * Export session data
   * @param {string} sessionId - The session ID
   * @returns {Promise<SessionExport>}
   */
  async exportSession(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/export?sessionId=${sessionId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error exporting session:', error);
      throw error;
    }
  }

  /**
   * Generate text-to-speech audio from text
   * @param {string} text - The text to convert to speech
   * @returns {Promise<{audioUrl: string}>}
   */
  async generateTTS(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/session/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating TTS:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
