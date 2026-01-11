/**
 * Patient Info Component
 * Handles patient information display
 */

/**
 * Update patient info display
 * @param {Object} patient - Patient data from case
 */
export function updatePatientInfo(patient) {
  const header = document.getElementById('patientInfoHeader');
  const details = document.getElementById('patientInfoDetails');
  const image = document.getElementById('patientInfoImage');
  
  if (header) {
    header.textContent = `${patient.name || 'Unknown'}`;
  }
  
  if (details) {
    details.innerHTML = `
      <div class="text-sm text-gray-600"><span class="font-semibold">Age:</span> ${patient.age || 'Unknown'}</div>
      <div class="text-sm text-gray-600"><span class="font-semibold">Gender:</span> ${patient.sex || 'Unknown'}</div>
      ${patient.symptoms ? `<div class="text-sm text-gray-600"><span class="font-semibold">Symptoms:</span> ${patient.symptoms}</div>` : ''}
    `;
  }
  
  // Note: Image would need to be handled separately or from case data
  // For now, we'll leave it empty or use a placeholder
  if (image && patient.image) {
    image.src = patient.image;
    image.alt = patient.name || 'Patient';
  }
}
