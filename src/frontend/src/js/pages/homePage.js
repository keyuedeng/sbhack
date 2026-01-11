/**
 * Dashboard Page
 * LeetCode-style dashboard with list of problems
 */

const problems = [
  {
    id: 'demo',
    caseId: 'chest-pain-001',
    number: 1,
    title: 'Chest Pain',
    fullTitle: 'Acute Chest Pain in Emergency Department',
    difficulty: 'Medium',
    category: 'Emergency Medicine'
  },
  {
    id: 'abdominal-pain-001',
    caseId: 'abdominal-pain-001',
    number: 2,
    title: 'Abdominal Pain',
    fullTitle: 'Acute Abdominal Pain Assessment',
    difficulty: 'Easy',
    category: 'Emergency Medicine'
  },
  {
    id: 'respiratory-distress-001',
    caseId: 'respiratory-distress-001',
    number: 3,
    title: 'Respiratory Distress',
    fullTitle: 'Respiratory Distress Evaluation',
    difficulty: 'Hard',
    category: 'Emergency Medicine'
  },
  {
    id: 'neurological-assessment-001',
    caseId: 'neurological-assessment-001',
    number: 4,
    title: 'Altered Mental Status',
    fullTitle: 'Neurological Assessment - Altered Mental Status',
    difficulty: 'Medium',
    category: 'Neurology'
  },
  {
    id: 'pediatric-fever-001',
    caseId: 'pediatric-fever-001',
    number: 5,
    title: 'Pediatric Fever',
    fullTitle: 'Pediatric Fever and Rash Evaluation',
    difficulty: 'Medium',
    category: 'Pediatrics'
  },
  {
    id: 'cardiac-arrest-001',
    caseId: 'cardiac-arrest-001',
    number: 6,
    title: 'Cardiac Arrest',
    fullTitle: 'Post-Resuscitation Cardiac Arrest Care',
    difficulty: 'Hard',
    category: 'Emergency Medicine'
  },
  {
    id: 'stroke-evaluation-001',
    caseId: 'stroke-evaluation-001',
    number: 7,
    title: 'Acute Stroke',
    fullTitle: 'Acute Ischemic Stroke Evaluation and Management',
    difficulty: 'Hard',
    category: 'Neurology'
  },
  {
    id: 'sepsis-recognition-001',
    caseId: 'sepsis-recognition-001',
    number: 8,
    title: 'Sepsis Recognition',
    fullTitle: 'Early Sepsis Recognition and Treatment',
    difficulty: 'Medium',
    category: 'Emergency Medicine'
  },
  {
    id: 'diabetic-ketoacidosis-001',
    caseId: 'diabetic-ketoacidosis-001',
    number: 9,
    title: 'Diabetic Ketoacidosis',
    fullTitle: 'Diabetic Ketoacidosis Management',
    difficulty: 'Medium',
    category: 'Endocrinology'
  },
  {
    id: 'pediatric-asthma-001',
    caseId: 'pediatric-asthma-001',
    number: 10,
    title: 'Pediatric Asthma',
    fullTitle: 'Pediatric Asthma Exacerbation',
    difficulty: 'Easy',
    category: 'Pediatrics'
  },
  {
    id: 'myocardial-infarction-001',
    caseId: 'myocardial-infarction-001',
    number: 11,
    title: 'STEMI',
    fullTitle: 'ST-Elevation Myocardial Infarction Management',
    difficulty: 'Hard',
    category: 'Cardiology'
  },
  {
    id: 'appendicitis-001',
    caseId: 'appendicitis-001',
    number: 12,
    title: 'Appendicitis',
    fullTitle: 'Acute Appendicitis Diagnosis',
    difficulty: 'Easy',
    category: 'Surgery'
  }
];

let currentDifficultyFilter = 'All';
let currentCategoryFilter = 'All';
let searchQuery = '';

export function initHomePage() {
  const problemsList = document.getElementById('problemsList');
  if (!problemsList) return;

  // Setup filters and search
  setupFilters();
  
  // Render problems
  renderProblems();
}

function setupFilters() {
  const difficultyFilter = document.getElementById('difficultyFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const searchInput = document.getElementById('searchInput');

  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', (e) => {
      currentDifficultyFilter = e.target.value;
      renderProblems();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      renderProblems();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderProblems();
    });
  }
}

function renderProblems() {
  const problemsList = document.getElementById('problemsList');
  if (!problemsList) return;

  // Clear existing items
  problemsList.innerHTML = '';

  // Filter problems
  const filteredProblems = problems.filter(problem => {
    const matchesDifficulty = currentDifficultyFilter === 'All' || problem.difficulty === currentDifficultyFilter;
    const matchesCategory = currentCategoryFilter === 'All' || problem.category === currentCategoryFilter;
    const matchesSearch = !searchQuery || 
      problem.title.toLowerCase().includes(searchQuery) ||
      problem.fullTitle.toLowerCase().includes(searchQuery) ||
      problem.category.toLowerCase().includes(searchQuery);
    
    return matchesDifficulty && matchesCategory && matchesSearch;
  });

  // Create problem rows
  filteredProblems.forEach((problem) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
    row.addEventListener('click', () => {
      const params = new URLSearchParams({ title: problem.fullTitle });
      window.location.href = `/scenario?${params.toString()}`;
    });

    // Difficulty color mapping (LeetCode style)
    const difficultyColors = {
      Easy: 'text-green-700 bg-green-100',
      Medium: 'text-yellow-700 bg-yellow-100',
      Hard: 'text-red-700 bg-red-100'
    };

    row.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap">
        <div class="w-4 h-4"></div>
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        ${problem.number}
      </td>
      <td class="px-4 py-3">
        <div class="text-sm font-medium text-blue-600 hover:text-blue-800">
          ${problem.title}
        </div>
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="px-2 py-1 text-xs font-medium rounded ${difficultyColors[problem.difficulty]}">
          ${problem.difficulty}
        </span>
      </td>
    `;

    problemsList.appendChild(row);
  });

  // Update stats (show hardcoded completed values)
  updateStats();
}

function updateStats() {
  const totalProblems = document.getElementById('totalProblems');
  const easyCount = document.getElementById('easyCount');
  const mediumCount = document.getElementById('mediumCount');
  const hardCount = document.getElementById('hardCount');

  // Hardcoded completed values (representing user's progress)
  const completedStats = {
    total: 7,      // User has completed 7 out of 12 problems
    easy: 2,       // User has completed 2 out of 3 easy problems
    medium: 4,     // User has completed 4 out of 5 medium problems
    hard: 1        // User has completed 1 out of 4 hard problems
  };

  if (totalProblems) {
    totalProblems.textContent = completedStats.total;
  }

  if (easyCount) {
    easyCount.textContent = completedStats.easy;
  }

  if (mediumCount) {
    mediumCount.textContent = completedStats.medium;
  }

  if (hardCount) {
    hardCount.textContent = completedStats.hard;
  }
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
