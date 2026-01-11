/**
 * Simulation Page
 * Main conversation/chat interface page
 */

const homeButton = document.getElementById('homeButton');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const microphoneButton = document.getElementById('microphoneButton');
const diagnoseButton = document.getElementById('diagnoseButton');
const feedbackSidebar = document.getElementById('feedbackSidebar');

export function initSimulationPage(onHomeClick, onSendClick, onDiagnoseClick) {
  // Event listeners
  if (homeButton) {
    homeButton.addEventListener('click', onHomeClick);
  }
  
  if (sendButton) {
    sendButton.addEventListener('click', onSendClick);
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') onSendClick();
    });
  }
  
  if (diagnoseButton) {
    diagnoseButton.addEventListener('click', onDiagnoseClick);
  }
}

export function showSimulationPage() {
  const simulationPage = document.getElementById('simulationPage');
  if (simulationPage) {
    simulationPage.classList.add('active');
  }
}

export function hideSimulationPage() {
  const simulationPage = document.getElementById('simulationPage');
  if (simulationPage) {
    simulationPage.classList.remove('active');
  }
}

export function showFeedbackSidebar() {
  if (feedbackSidebar) {
    feedbackSidebar.classList.remove('hidden');
  }
}

export function hideFeedbackSidebar() {
  if (feedbackSidebar) {
    feedbackSidebar.classList.add('hidden');
  }
}

export function showDiagnoseButton() {
  if (diagnoseButton) {
    diagnoseButton.classList.remove('hidden');
  }
}

export function hideDiagnoseButton() {
  if (diagnoseButton) {
    diagnoseButton.classList.add('hidden');
  }
}

export function getMessagesContainer() {
  return messagesContainer;
}

export function getMessageInput() {
  return messageInput;
}
