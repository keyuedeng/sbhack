/**
 * Simulation Page
 * Main conversation/chat interface page
 */

const homeButton = document.getElementById('homeButton');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const diagnoseButton = document.getElementById('diagnoseButton');
const diagnoseButtonContainer = document.getElementById('diagnoseButtonContainer');
const feedbackSidebar = document.getElementById('feedbackSidebar');
const inputAreaContainer = document.getElementById('inputAreaContainer');
let inputAreaInnerDiv = null;

export function initSimulationPage(onHomeClick, onSendClick, onDiagnoseClick) {
  // Get reference to input area inner div
  if (inputAreaContainer) {
    inputAreaInnerDiv = inputAreaContainer.querySelector('div');
  }
  
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
    // Set feedback sidebar height to match messages container
    updateFeedbackSidebarHeight();
  }
  if (inputAreaContainer) {
    inputAreaContainer.classList.remove('test-mode');
  }
  // Move diagnose button back to original container (learning mode)
  if (diagnoseButton && diagnoseButtonContainer && inputAreaInnerDiv) {
    if (inputAreaInnerDiv.contains(diagnoseButton)) {
      diagnoseButtonContainer.appendChild(diagnoseButton);
    }
  }
}

function updateFeedbackSidebarHeight() {
  if (feedbackSidebar && messagesContainer && !feedbackSidebar.classList.contains('hidden')) {
    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      // Set feedback sidebar height to match the messages container height
      const messagesHeight = messagesContainer.offsetHeight;
      if (messagesHeight > 0) {
        feedbackSidebar.style.height = `${messagesHeight}px`;
      }
    });
  }
}

// Update height on window resize
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (feedbackSidebar && !feedbackSidebar.classList.contains('hidden')) {
      updateFeedbackSidebarHeight();
    }
  });
}

export function hideFeedbackSidebar() {
  if (feedbackSidebar) {
    feedbackSidebar.classList.add('hidden');
  }
  if (inputAreaContainer) {
    inputAreaContainer.classList.add('test-mode');
  }
  // Move diagnose button into input area next to send button (test mode)
  if (diagnoseButton && diagnoseButtonContainer && inputAreaInnerDiv) {
    if (diagnoseButtonContainer.contains(diagnoseButton)) {
      inputAreaInnerDiv.appendChild(diagnoseButton);
    }
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
