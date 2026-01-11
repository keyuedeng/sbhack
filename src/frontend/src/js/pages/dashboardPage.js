/**
 * Dashboard Page
 * Page showing available patients
 */

const patient1Button = document.getElementById('patient1Button');
const patient2Button = document.getElementById('patient2Button');
const patient3Button = document.getElementById('patient3Button');

export function initDashboardPage(onPatient1Click, onPatient2Click, onPatient3Click) {
  // Event listeners
  if (patient1Button) {
    patient1Button.addEventListener('click', onPatient1Click);
  }
  if (patient2Button) {
    patient2Button.addEventListener('click', onPatient2Click);
  }
  if (patient3Button) {
    patient3Button.addEventListener('click', onPatient3Click);
  }
}

export function showDashboardPage() {
  const dashboardPage = document.getElementById('dashboardPage');
  if (dashboardPage) {
    dashboardPage.classList.add('active');
  }
}

export function hideDashboardPage() {
  const dashboardPage = document.getElementById('dashboardPage');
  if (dashboardPage) {
    dashboardPage.classList.remove('active');
  }
}
