/**
 * Main Application
 * Entry point for the medical simulation platform
 */

import { apiService } from './services/api.js';
import { Timer } from './utils/timer.js';
import { addMessage, clearMessages } from './components/messages.js';
import { updatePatientInfo } from './components/patientInfo.js';
import { displayFeedback, clearFeedback } from './components/feedback.js';

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
let timer = null;

// DOM Elements (shared)
const timerElement = document.getElementById('timer');

// DOM Elements - Diagnosis Modal
const diagnosisModal = document.getElementById('diagnosisModal');
const diagnosisInput = document.getElementById('diagnosisInput');
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
 * Initialize interface (both modes use same interface for now)
 */
async function initializeInterface(mode) {
  currentMode = mode;
  
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
    
    const notesTextarea = document.getElementById('patientNotesTextarea');
    if (notesTextarea) notesTextarea.value = '';

    // Update UI
    updatePatientInfo(patientInfo);
    
    // Show/hide feedback sidebar based on mode
    if (mode === 'learning') {
      showFeedbackSidebar();
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
  if (!text || !currentSessionId) return;

  try {
    addMessage(messagesContainer, text, true);
    messageInput.value = '';

    // Send to backend
    const response = await apiService.sendMessage(currentSessionId, text);
    
    // Add patient reply
    addMessage(messagesContainer, response.patientReply, false);

  } catch (error) {
    console.error('Error sending message:', error);
    addMessage(messagesContainer, 'Error: Could not send message. Please try again.', false);
  }
}

/**
 * Show diagnosis modal
 */
function showDiagnosisModal() {
  diagnosisModal.classList.remove('hidden');
  diagnosisInput.value = '';
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
  if (!diagnosis || !currentSessionId) return;

  hideDiagnosisModal();

  try {
    // End session with diagnosis
    await apiService.endSession(currentSessionId, diagnosis);

    // Get feedback (for learning mode)
    if (currentMode === 'learning') {
      try {
        const feedback = await apiService.getFeedback(currentSessionId);
        displayFeedback(feedback);
      } catch (error) {
        console.error('Error getting feedback:', error);
      }
    }

    // Show finish page
    timer.stop();
    hideDiagnoseButton();
    setFinishPageState(true); // TODO: Check actual correctness from feedback
    showPage(finishPageEl);

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

  // Clear state
  const messagesContainer = getMessagesContainer();
  clearMessages(messagesContainer);
  clearFeedback();

  // Navigate to home
  window.location.href = '/home';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Initialize router (must be first)
  initRouter();
  
  // Initialize pages
  initHomePage();
  initTitlePage(
    () => initializeInterface('learning'),
    () => initializeInterface('test')
  );
  initSimulationPage(goHome, sendMessage, showDiagnosisModal);
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
    if (e.key === 'Enter') submitDiagnosis();
  });
  cancelDiagnosisButton.addEventListener('click', hideDiagnosisModal);
  submitDiagnosisButton.addEventListener('click', submitDiagnosis);

  diagnosisModal.addEventListener('click', (e) => {
    if (e.target === diagnosisModal) hideDiagnosisModal();
  });
});
