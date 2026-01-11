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
  const symptoms = document.getElementById('patientInfoSymptoms');
  const image = document.getElementById('patientInfoImage');
  
  if (header) {
    header.textContent = `${patient.name || 'Unknown'}`;
  }
  
  if (details) {
    details.innerHTML = `
      <div class="text-sm text-gray-600"><span class="font-semibold">Age:</span> ${patient.age || 'Unknown'}</div>
      <div class="text-sm text-gray-600"><span class="font-semibold">Gender:</span> ${patient.sex || 'Unknown'}</div>
    `;
  }
  
  if (symptoms) {
    symptoms.textContent = `${patient.chiefComplaint || 'No chief complaint'}`;
  }
  
  // Set patient image
  if (image) {
    if (patient.image) {
      image.src = patient.image;
      image.alt = patient.name || 'Patient';
    } else {
      // Set a default placeholder or leave empty
      image.src = '';
      image.alt = patient.name || 'Patient';
    }
  }
}
