/**
 * Title Page
 * Page with mode selection buttons (Learning Mode / Test Mode)
 */

import { typeWriter } from '../utils/typewriter.js';

const titleText = document.getElementById('titleText');
const modeButtonsContainer = document.getElementById('modeButtonsContainer');
const learningModeButton = document.getElementById('learningModeButton');
const testModeButton = document.getElementById('testModeButton');

export function initTitlePage(onLearningClick, onTestClick) {
  // Typewriter effect for title
  if (window.location.pathname === '/home') {
    typeWriter(titleText, 'Medical Simulation Platform', 100, () => {
      modeButtonsContainer.classList.remove('hidden');
    });
  } else {
    modeButtonsContainer.classList.remove('hidden');
  }

  // Event listeners
  if (learningModeButton) {
    learningModeButton.addEventListener('click', onLearningClick);
  }
  if (testModeButton) {
    testModeButton.addEventListener('click', onTestClick);
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
