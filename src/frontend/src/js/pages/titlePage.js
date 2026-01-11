/**
 * Title Page
 * Page with mode selection buttons (Learning Mode / Test Mode)
 */

const titleText = document.getElementById('titleText');
const modeButtonsContainer = document.getElementById('modeButtonsContainer');
const learningModeButton = document.getElementById('learningModeButton');
const testModeButton = document.getElementById('testModeButton');

export function initTitlePage(onLearningClick, onTestClick, getCurrentPatient) {
  // Event listeners
  if (learningModeButton) {
    learningModeButton.addEventListener('click', onLearningClick);
  }
  if (testModeButton) {
    testModeButton.addEventListener('click', onTestClick);
  }
  
  // Store getCurrentPatient function for use in showTitlePage
  if (getCurrentPatient) {
    window._getCurrentPatient = getCurrentPatient;
  }
}

export function showTitlePage() {
  const titlePage = document.getElementById('titlePage');
  if (titlePage) {
    titlePage.classList.add('active');
    
    // Update title with current patient info
    if (titleText) {
      let patient = null;
      if (window._getCurrentPatient) {
        patient = window._getCurrentPatient();
      } else {
        // Fallback: try to get patient from sessionStorage
        const savedPatient = sessionStorage.getItem('selectedPatient');
        if (savedPatient === '1') {
          patient = { number: 1, name: 'Sarah Johnson' };
        } else if (savedPatient === '2') {
          patient = { number: 2, name: 'Josh Anderson' };
        } else if (savedPatient === '3') {
          patient = { number: 3, name: 'Camilla Lopez' };
        } else {
          patient = { number: 1, name: 'Sarah Johnson' }; // Default
        }
      }
      if (patient) {
        titleText.textContent = `Patient ${patient.number}: ${patient.name}`;
      }
    }
  }
  
  // Show mode buttons immediately
  if (modeButtonsContainer) {
    modeButtonsContainer.classList.remove('hidden');
  }
}

export function hideTitlePage() {
  const titlePage = document.getElementById('titlePage');
  if (titlePage) {
    titlePage.classList.remove('active');
  }
}
