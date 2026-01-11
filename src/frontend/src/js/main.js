/**
 * Main Application
 * Entry point for the medical simulation platform
 */

import { apiService } from './services/api.js';
import { Timer } from './utils/timer.js';
import { addMessage, clearMessages } from './components/messages.js';
import { updatePatientInfo } from './components/patientInfo.js';
import { displayFeedback, clearFeedback } from './components/feedback.js';
import { startSpeechToText, stopSpeechToText, isRecordingAudio } from './services/speechToText.js';

// Page modules
import { initHomePage, showHomePage, hideHomePage } from './pages/homePage.js';
import { initTitlePage, showTitlePage, hideTitlePage } from './pages/titlePage.js';
import {
  initSimulationPage,
  showSimulationPage,
  hideSimulationPage,
  showFeedbackSidebar,
  hideFeedbackSidebar,
  showDiagnoseButton,
  hideDiagnoseButton,
  getMessagesContainer,
  getMessageInput,
} from './pages/simulationPage.js';
import { initFinishPage, showFinishPage, hideFinishPage, setFinishPageState } from './pages/finishPage.js';

// App State
let currentSessionId = null;
let currentMode = null; // 'test' or 'learning'
let guidanceLevel = null; // 'low', 'medium', or 'high' (only for learning mode)
let timer = null;
let messageCount = 0; // Track number of messages for guidance
let lastUserMessage = ''; // Track last user message for guidance
let lastPatientReply = ''; // Track last patient reply for guidance

// DOM Elements (shared)
const timerElement = document.getElementById('timer');

// DOM Elements - Diagnosis Modal
const diagnosisModal = document.getElementById('diagnosisModal');
const diagnosisInput = document.getElementById('diagnosisInput');
const interventionInput = document.getElementById('interventionInput');
const cancelDiagnosisButton = document.getElementById('cancelDiagnosisButton');
const submitDiagnosisButton = document.getElementById('submitDiagnosisButton');

// Get page elements for routing
const homePageEl = document.getElementById('homePage');
const titlePageEl = document.getElementById('titlePage');
const simulationPageEl = document.getElementById('simulationPage');
const finishPageEl = document.getElementById('finishPage');

/**
 * Get routes object (must be called after DOM is loaded)
 */
function getRoutes() {
  return {
    '/': homePageEl,
    '/home': titlePageEl,
    '/simulation': simulationPageEl,
    '/session': simulationPageEl, // alias
    '/finish': finishPageEl,
  };
}

/**
 * Show a specific page based on route
 */
function showPage(pageElement, updateUrl = true) {
  // Hide all pages
  hideHomePage();
  hideTitlePage();
  hideSimulationPage();
  hideFinishPage();
  
  // Show the requested page
  if (pageElement === homePageEl) {
    showHomePage();
  } else if (pageElement === titlePageEl) {
    showTitlePage();
  } else if (pageElement === simulationPageEl) {
    showSimulationPage();
  } else if (pageElement === finishPageEl) {
    showFinishPage();
  }
  
  // Update URL if requested (don't update on popstate)
  if (updateUrl) {
    const routes = getRoutes();
    const path = Object.keys(routes).find(key => routes[key] === pageElement) || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ path }, '', path);
    }
  }
}

/**
 * Handle browser back/forward buttons
 */
function handleRoute(path) {
  const routes = getRoutes();
  const page = routes[path] || routes['/'];
  
  // Hide all pages
  hideHomePage();
  hideTitlePage();
  hideSimulationPage();
  hideFinishPage();
  
  // Show the requested page
  if (page === homePageEl) {
    showHomePage();
  } else if (page === titlePageEl) {
    showTitlePage();
  } else if (page === simulationPageEl) {
    showSimulationPage();
  } else if (page === finishPageEl) {
    showFinishPage();
  }
}

/**
 * Initialize router
 */
function initRouter() {
  // Handle initial route
  handleRoute(window.location.pathname);
  
  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    handleRoute(window.location.pathname);
  });
}

/**
 * Initialize interface
 */
async function initializeInterface(mode, level = null) {
  currentMode = mode;
  guidanceLevel = level; // Store guidance level (only used for learning mode)
  
  try {
    // Start session with backend
    const response = await apiService.startSession(
      'chest-pain-001',
      1, // level
      'Dr. User', // userName
      420 // 7 minutes time limit
    );

    currentSessionId = response.sessionId;

    // Load patient info from response
    const patientInfo = {
      name: 'Sarah Johnson',
      age: 58,
      sex: 'F',
      chiefComplaint: response.introLine || 'Chest pain for 2 hours'
    };

    // Clear previous state
    const messagesContainer = getMessagesContainer();
    clearMessages(messagesContainer);
    clearFeedback();
    
    // Reset message tracking
    messageCount = 0;
    lastUserMessage = '';
    lastPatientReply = '';
    
    const notesTextarea = document.getElementById('patientNotesTextarea');
    if (notesTextarea) notesTextarea.value = '';

    // Update UI
    updatePatientInfo(patientInfo);
    
    // Show/hide feedback sidebar based on mode
    if (mode === 'learning') {
      showFeedbackSidebar();
      // Show initial guidance in learning mode
      setTimeout(() => {
        displayGuidance({
          type: 'hint',
          message: 'Welcome to Learning Mode! Start by introducing yourself and asking about the patient\'s chief complaint. Use open-ended questions to gather information.'
        });
      }, 800);
    } else {
      hideFeedbackSidebar();
    }
    
    // Show simulation page
    showPage(simulationPageEl);
    showDiagnoseButton();
    
    // Add intro message
    if (response.introLine) {
      setTimeout(() => {
        addMessage(messagesContainer, response.introLine, false);
        // Automatically play speech for intro message
        playSpeechAutomatically(response.introLine);
      }, 500);
    }

    // Start timer
    if (response.timeLimitSec) {
      timer.start(response.timeLimitSec);
    } else {
      timer.start(420); // Default 7 minutes
    }

  } catch (error) {
    console.error('Error initializing interface:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    alert(`Failed to start session: ${errorMessage}. Please check the console for details.`);
    // Don't navigate if session start failed
    return;
  }
}

/**
 * Send message
 */
async function sendMessage() {
  const messageInput = getMessageInput();
  const messagesContainer = getMessagesContainer();
  const text = messageInput.value.trim();
  
  console.log('📤 sendMessage called with:', text);
  console.log('📤 currentSessionId:', currentSessionId);
  
  if (!text) {
    console.warn('⚠️ No text to send');
    return;
  }
  if (!currentSessionId) {
    console.error('❌ No session ID!');
    return;
  }

  try {
    console.log('✅ Adding user message to UI');
    addMessage(messagesContainer, text, true);
    messageInput.value = '';
    messageCount += 1; // Increment for user message

    console.log('📡 Sending message to backend...');
    // Send to backend
    const response = await apiService.sendMessage(currentSessionId, text);
    console.log('✅ Backend response received:', response);
    
    // Add patient reply
    if (response.patientReply) {
      console.log('✅ Adding patient reply to UI');
      addMessage(messagesContainer, response.patientReply, false);
      
      // Automatically play speech for patient reply
      console.log('🔊 Playing patient speech...');
      await playSpeechAutomatically(response.patientReply);
    } else {
      console.warn('⚠️ No patientReply in response');
    }

  } catch (error) {
    console.error('Error sending message:', error);
    const errorMsg = error.message || 'Could not send message. Please try again.';
    
    // Check if it's a session ended error
    if (errorMsg.includes('Session has ended')) {
      addMessage(messagesContainer, 'Error: Session has ended. Please start a new session.', false);
    } else {
      addMessage(messagesContainer, `Error: ${errorMsg}`, false);
    }
  }
}

/**
 * Show diagnosis modal
 */
function showDiagnosisModal() {
  diagnosisModal.classList.remove('hidden');
  diagnosisInput.value = '';
  interventionInput.value = '';
  setTimeout(() => diagnosisInput.focus(), 100);
}

/**
 * Hide diagnosis modal
 */
function hideDiagnosisModal() {
  diagnosisModal.classList.add('hidden');
}

/**
 * Submit diagnosis
 */
async function submitDiagnosis() {
  const diagnosis = diagnosisInput.value.trim();
  const intervention = interventionInput.value.trim();
  if (!diagnosis || !currentSessionId) return;

  hideDiagnosisModal();

  try {
    // Combine diagnosis and intervention for submission
    const diagnosisWithIntervention = intervention 
      ? `${diagnosis} | Intervention: ${intervention}`
      : diagnosis;
    
    // End session with diagnosis
    await apiService.endSession(currentSessionId, diagnosisWithIntervention);

    // Get feedback to determine correctness
    let isCorrect = false;
    try {
      const feedback = await apiService.getFeedback(currentSessionId);
      
      // Check if diagnosis is correct (diagnosis score >= 20 means correct primary diagnosis)
      isCorrect = feedback.breakdown.diagnosis >= 20;
      
      // Display feedback (in overlay for test mode, sidebar for learning mode)
      displayFeedback(feedback, currentMode, isCorrect);
      
      // Fade out chat background when showing feedback in test mode
      if (currentMode === 'test') {
        const mainContentArea = document.querySelector('#simulationPage > .flex-1');
        if (mainContentArea) mainContentArea.classList.add('chat-faded');
      }
    } catch (error) {
      console.error('Error getting feedback:', error);
      // If feedback fails, default to incorrect
      isCorrect = false;
    }

    // Stop timer and hide diagnose button
    timer.stop();
    hideDiagnoseButton();

  } catch (error) {
    console.error('Error submitting diagnosis:', error);
    alert('Error submitting diagnosis. Please try again.');
  }
}

/**
 * Go home (return to title page)
 */
function goHome() {
  // Hide all UI elements
  hideDiagnoseButton();
  hideFeedbackSidebar();
  
  timer.stop();
  currentSessionId = null;
  currentMode = null;
  guidanceLevel = null;

  // Clear state
  const messagesContainer = getMessagesContainer();
  clearMessages(messagesContainer);
  clearFeedback();
  
  // Reset message tracking
  messageCount = 0;
  lastUserMessage = '';
  lastPatientReply = '';

  // Navigate to home
  window.location.href = '/home';
}

/**
 * Automatically play speech for patient messages
 * Generates TTS audio and plays it automatically
 */
async function playSpeechAutomatically(text) {
  try {
    if (!text || text.trim().length === 0) {
      return; // Skip if text is empty
    }
    
    // Generate TTS audio
    const response = await apiService.generateTTS(text);
    
    // Create audio element and play
    const audio = new Audio(`http://localhost:3000${response.audioUrl}`);
    
    // Handle errors silently (don't interrupt the conversation flow)
    audio.onerror = (error) => {
      console.error('Error playing audio:', error);
      // Fail silently - user can still read the message
    };
    
    // Play audio automatically
    await audio.play();
    
  } catch (error) {
    console.error('Error generating or playing speech:', error);
    // Fail silently - don't interrupt the conversation flow
    // The user can still read the message even if TTS fails
  }
}

/**
 * Handle microphone button click - toggle speech-to-text
 */
async function handleMicrophoneClick() {
  const microphoneButton = document.getElementById('microphoneButton');
  const messageInput = getMessageInput();
  
  if (!microphoneButton) return;
  
  try {
    if (isRecordingAudio()) {
      // Stop recording
      stopSpeechToText();
      microphoneButton.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
      microphoneButton.classList.add('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
    } else {
      // Start recording
      microphoneButton.classList.remove('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
      microphoneButton.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
      
      await startSpeechToText((transcript) => {
        console.log('✅ Transcript callback received:', transcript);
        // Update input field with transcript
        if (messageInput) {
          const currentText = messageInput.value.trim();
          const newText = currentText ? `${currentText} ${transcript}` : transcript;
          messageInput.value = newText;
          console.log('✅ Input field updated with:', newText);
          
          // Auto-send message after getting transcript
          setTimeout(() => {
            console.log('🔄 Auto-sending message...');
            stopSpeechToText();
            microphoneButton.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
            microphoneButton.classList.add('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
            sendMessage();
          }, 500);
        } else {
          console.error('❌ messageInput is null!');
        }
      });
    }
  } catch (error) {
    console.error('Error with microphone:', error);
    alert('Failed to access microphone. Please grant permission and try again.');
    microphoneButton.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
    microphoneButton.classList.add('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Initialize router (must be first)
  initRouter();
  
  // Initialize pages
  initHomePage();
  initTitlePage(
    (guidanceLevel) => initializeInterface('learning', guidanceLevel),
    () => initializeInterface('test')
  );
  initSimulationPage(goHome, sendMessage, showDiagnosisModal, handleMicrophoneClick);
  initFinishPage(goHome);

  // Initialize timer
  timer = new Timer(timerElement, () => {
    // Timer expired - show diagnosis modal
    if (currentSessionId) {
      showDiagnosisModal();
    }
  });

  // Event listeners - Diagnosis Modal
  diagnosisInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') interventionInput.focus();
  });
  interventionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitDiagnosis();
  });
  cancelDiagnosisButton.addEventListener('click', hideDiagnosisModal);
  submitDiagnosisButton.addEventListener('click', submitDiagnosis);

  diagnosisModal.addEventListener('click', (e) => {
    if (e.target === diagnosisModal) hideDiagnosisModal();
  });

  // Event listener - Feedback Overlay Close Button
  const closeFeedbackButton = document.getElementById('closeFeedbackButton');
  if (closeFeedbackButton) {
    closeFeedbackButton.addEventListener('click', () => {
      hideFeedbackOverlay();
      goHome();
    });
  }
  
  // Set up retake callback
  setRetakeCallback(() => {
    hideFeedbackOverlay();
    // Restart the session with the same mode and level
    if (currentMode && guidanceLevel !== undefined) {
      initializeInterface(currentMode, guidanceLevel);
    } else if (currentMode) {
      initializeInterface(currentMode);
    }
  });
  
  // Initialize retake button
  initRetakeButton();
});
