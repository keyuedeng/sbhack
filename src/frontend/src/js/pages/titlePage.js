/**
 * Title Page
 * Page with mode selection buttons (Learning Mode / Test Mode)
 */

import { typeWriter } from '../utils/typewriter.js';

const titleText = document.getElementById('titleText');
const modeButtonsContainer = document.getElementById('modeButtonsContainer');
const learningModeButton = document.getElementById('learningModeButton');
const testModeButton = document.getElementById('testModeButton');
const guidanceLevelContainer = document.getElementById('guidanceLevelContainer');
const guidanceLowButton = document.getElementById('guidanceLowButton');
const guidanceMediumButton = document.getElementById('guidanceMediumButton');
const guidanceHighButton = document.getElementById('guidanceHighButton');

let onLearningModeSelected = null;

export function initTitlePage(onLearningClick, onTestClick) {
  // Typewriter effect for title
  if (window.location.pathname === '/home') {
    typeWriter(titleText, 'Medical Simulation Platform', 100, () => {
      modeButtonsContainer.classList.remove('hidden');
    });
  } else {
    modeButtonsContainer.classList.remove('hidden');
  }

  // Store callback for when guidance level is selected
  onLearningModeSelected = onLearningClick;

  // Event listeners
  if (learningModeButton) {
    learningModeButton.addEventListener('click', () => {
      // Show guidance level selection
      if (guidanceLevelContainer) {
        guidanceLevelContainer.classList.toggle('hidden');
      }
    });
  }
  
  if (testModeButton) {
    testModeButton.addEventListener('click', () => {
      // Hide guidance level container when test mode is selected
      if (guidanceLevelContainer) {
        guidanceLevelContainer.classList.add('hidden');
      }
      onTestClick();
    });
  }

  // Guidance level buttons
  if (guidanceLowButton) {
    guidanceLowButton.addEventListener('click', () => {
      if (guidanceLevelContainer) {
        guidanceLevelContainer.classList.add('hidden');
      }
      if (onLearningModeSelected) {
        onLearningModeSelected('low');
      }
    });
  }

  if (guidanceMediumButton) {
    guidanceMediumButton.addEventListener('click', () => {
      if (guidanceLevelContainer) {
        guidanceLevelContainer.classList.add('hidden');
      }
      if (onLearningModeSelected) {
        onLearningModeSelected('medium');
      }
    });
  }

  if (guidanceHighButton) {
    guidanceHighButton.addEventListener('click', () => {
      if (guidanceLevelContainer) {
        guidanceLevelContainer.classList.add('hidden');
      }
      if (onLearningModeSelected) {
        onLearningModeSelected('high');
      }
    });
  }
}

export function showTitlePage() {
  const titlePage = document.getElementById('titlePage');
  if (titlePage) {
    titlePage.classList.add('active');
  }
}

export function hideTitlePage() {
  const titlePage = document.getElementById('titlePage');
  if (titlePage) {
    titlePage.classList.remove('active');
  }
}
