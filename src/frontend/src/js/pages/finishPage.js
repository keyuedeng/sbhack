/**
 * Finish Page
 * Results/end of session page
 */

const finishMessage = document.getElementById('finishMessage');
const finishButton = document.getElementById('finishButton');

export function initFinishPage(onFinishClick) {
  if (finishButton) {
    finishButton.addEventListener('click', onFinishClick);
  }
}

let finishPageState = { isCorrect: false };

export function setFinishPageState(isCorrect) {
  finishPageState.isCorrect = isCorrect;
}

export function showFinishPage() {
  const finishPage = document.getElementById('finishPage');
  if (!finishPage) return;

  finishPage.classList.add('active');

  if (finishMessage) {
    finishMessage.textContent = finishPageState.isCorrect ? '✅ Correct!' : '❌ Incorrect';
    finishMessage.className = `text-8xl font-extrabold ${finishPageState.isCorrect ? 'text-green-600' : 'text-red-600'}`;
  }

  if (finishButton) {
    finishButton.classList.remove('hidden');
    finishButton.textContent = 'Back to Home';
  }
}

export function hideFinishPage() {
  const finishPage = document.getElementById('finishPage');
  if (finishPage) {
    finishPage.classList.remove('active');
  }
}
