/**
 * Home Page
 * Simple landing page
 */

export function initHomePage() {
  // Home page is simple, no initialization needed for now
  // Can add logic here later when implementing the full home page
}

export function showHomePage() {
  const homePage = document.getElementById('homePage');
  if (homePage) {
    homePage.classList.add('active');
  }
}

export function hideHomePage() {
  const homePage = document.getElementById('homePage');
  if (homePage) {
    homePage.classList.remove('active');
  }
}
