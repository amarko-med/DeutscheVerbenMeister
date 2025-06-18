let verbsByDay = {};
let selectedVerbs = [];
let currentIndex = 0;
let wrongAnswers = [];
let flashcardIndex = 0;
let flashcardVerbs = [];
let practiceHistory = JSON.parse(localStorage.getItem('practiceHistory')) || {};
let userStats = JSON.parse(localStorage.getItem('userStats')) || {
  totalPracticed: 0,
  correctAnswers: 0,
  streak: 0,
  lastPracticeDate: null,
  masteredVerbs: {}
};
let flashcardStats = JSON.parse(localStorage.getItem('flashcardStats')) || {
  viewed: 0,
  known: 0
};
let achievements = JSON.parse(localStorage.getItem('achievements')) || {
  firstPractice: { unlocked: false, title: "First Steps", description: "Complete your first practice", icon: "fa-star" },
  perfectDay: { unlocked: false, title: "Perfect Day", description: "Get 100% correct in one day", icon: "fa-check-circle" },
  flashcardMaster: { unlocked: false, title: "Flashcard Pro", description: "Review 50 flashcards", icon: "fa-layer-group" },
  verbCollector: { unlocked: false, title: "Verb Collector", description: "Master 100 verbs", icon: "fa-book" },
  streak3: { unlocked: false, title: "3-Day Streak", description: "Practice for 3 consecutive days", icon: "fa-fire" },
  streak7: { unlocked: false, title: "7-Day Streak", description: "Practice for 7 consecutive days", icon: "fa-bolt" }
};
let isShuffleMode = false;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let searchTerm = "";

// DOM elements
const themeToggle = document.getElementById('theme-toggle');
const statsButton = document.getElementById('stats-button');
const statsModal = document.getElementById('stats-modal');
const closeModalButton = document.querySelector('.close-modal');
const backButton = document.querySelector('.back-button');

// Initialization
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadVerbs();
  setupEventListeners();
  updateStats();
  renderAchievements();
  applyTheme();
  
  // Initialize verb list with day 1 by default
  if (document.getElementById('verb-list-day')) {
    document.getElementById('verb-list-day').value = "1";
    selectDay("1");
  }
}

function loadVerbs() {
  fetch('verbs_by_day.json')
    .then(res => res.json())
    .then(data => {
      verbsByDay = data;
      updateStats();
      
      // Load any custom verbs from localStorage
      const customVerbs = JSON.parse(localStorage.getItem('customVerbs'));
      if (customVerbs) {
        for (const day in customVerbs) {
          if (verbsByDay[day]) {
            verbsByDay[day] = [...verbsByDay[day], ...customVerbs[day]];
          } else {
            verbsByDay[day] = customVerbs[day];
          }
        }
      }
    })
    .catch(err => {
      console.error("Error loading verbs:", err);
      verbsByDay = {
        "1": [{ verb: "beantworten", structure: "jdn/etw (Akk) beantworten" }],
        "2": [{ verb: "leiden", structure: "an etw (Dat) leiden" }],
        "3": [{ verb: "verhandeln", structure: "über etw (Akk) verhandeln" }],
        "4": [{ verb: "schützen", structure: "jdn/etw (Akk) schützen" }],
        "5": [{ verb: "fordern", structure: "etw (Akk) fordern" }],
        "6": [{ verb: "bedauern", structure: "etw (Akk) bedauern" }]
      };
      updateStats();
    });
}

function setupEventListeners() {
  themeToggle.addEventListener('click', toggleTheme);
  statsButton.addEventListener('click', showStatsModal);
  closeModalButton.addEventListener('click', hideStatsModal);
  
  // Flashcard click
  const flashcard = document.getElementById('flashcard');
  if (flashcard) {
    flashcard.addEventListener('click', flipFlashcard);
  }
  
  // Search functionality
  document.getElementById('practice-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    filterPracticeVerbs();
  });
  
  document.getElementById('flashcard-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    filterFlashcardVerbs();
  });
  
  document.getElementById('verb-list-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    filterVerbList();
  });
  
  // Add verb form
  document.getElementById('add-verb-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const verb = document.getElementById('new-verb').value.trim();
    const structure = document.getElementById('new-structure').value.trim();
    const day = document.getElementById('new-day').value;
    
    if (!verb || !structure || !day) return;
    
    const newEntry = { verb, structure };
    if (!verbsByDay[day]) verbsByDay[day] = [];
    verbsByDay[day].push(newEntry);
    
    // Save to localStorage
    localStorage.setItem('customVerbs', JSON.stringify(verbsByDay));
    
    // Show success message
    showNotification(`Verb "${verb}" added to Day ${day}!`);
    document.getElementById('add-verb-form').reset();
    updateStats();
  });
}

// Navigation functions
function showPracticeSection() {
  document.getElementById('main-grid').classList.add('hidden');
  document.getElementById('practice-section').classList.remove('hidden');
  document.getElementById('verb-list-section').classList.add('hidden');
  document.getElementById('flashcard-section').classList.add('hidden');
  document.getElementById('add-verb-section').classList.add('hidden');
  backButton.classList.remove('hidden');
  
  // Initialize with Day 1 verbs by default
  loadPracticeVerbs("1");
}

function loadPracticeVerbs(day) {
  selectedVerbs = verbsByDay[day] || [];
  if (isShuffleMode) {
    selectedVerbs = shuffleArray([...selectedVerbs]);
  }
  currentIndex = 0;
  wrongAnswers = [];
  
  if (selectedVerbs.length === 0) {
    document.getElementById('practice-container').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <p>No verbs available for practice</p>
      </div>`;
    return;
  }
  
  showPracticeUI();
}

function filterPracticeVerbs() {
  const day = document.getElementById('practice-day').value;
  if (!searchTerm) {
    selectedVerbs = verbsByDay[day] || [];
  } else {
    selectedVerbs = (verbsByDay[day] || [])
      .filter(v => v.verb.toLowerCase().includes(searchTerm) || 
                  v.structure.toLowerCase().includes(searchTerm));
  }
  
  if (isShuffleMode) {
    selectedVerbs = shuffleArray([...selectedVerbs]);
  }
  
  currentIndex = 0;
  wrongAnswers = [];
  
  if (selectedVerbs.length === 0) {
    document.getElementById('practice-container').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No matching verbs found</p>
      </div>`;
    return;
  }
  
  renderVerb();
}

function showFlashcardSection() {
  document.getElementById('main-grid').classList.add('hidden');
  document.getElementById('flashcard-section').classList.remove('hidden');
  document.getElementById('practice-section').classList.add('hidden');
  document.getElementById('verb-list-section').classList.add('hidden');
  document.getElementById('add-verb-section').classList.add('hidden');
  backButton.classList.remove('hidden');
  handleFlashcardDayChange();
}

function handleFlashcardDayChange() {
  const day = document.getElementById('flashcard-day').value;
  if (day) {
    flashcardVerbs = verbsByDay[day] || [];
    flashcardIndex = 0;
    renderFlashcard();
  }
}

function filterFlashcardVerbs() {
  const day = document.getElementById('flashcard-day').value;
  if (!searchTerm) {
    flashcardVerbs = verbsByDay[day] || [];
  } else {
    flashcardVerbs = (verbsByDay[day] || [])
      .filter(v => v.verb.toLowerCase().includes(searchTerm) || 
                  v.structure.toLowerCase().includes(searchTerm))
  }
  
  flashcardIndex = 0;
  renderFlashcard();
}

function showVerbList() {
  document.getElementById('main-grid').classList.add('hidden');
  document.getElementById('verb-list-section').classList.remove('hidden');
  document.getElementById('practice-section').classList.add('hidden');
  document.getElementById('flashcard-section').classList.add('hidden');
  document.getElementById('add-verb-section').classList.add('hidden');
  backButton.classList.remove('hidden');
  selectDay("1");
  const daySelector = document.getElementById('verb-list-day');
  if (daySelector) {
    daySelector.value = "1";
    selectDay("1");
  }
}

function filterVerbList() {
  const verbItems = document.querySelectorAll('.verb-item');
  verbItems.forEach(item => {
    const verb = item.querySelector('.verb-name').textContent.toLowerCase();
    const structure = item.querySelector('.verb-structure').textContent.toLowerCase();
    const matchesSearch = !searchTerm || verb.includes(searchTerm) || structure.includes(searchTerm);
    
    const currentFilter = document.querySelector('.filter-option.active').dataset.filter;
    let matchesFilter = true;
    
    if (currentFilter === 'akk') {
      matchesFilter = structure.includes('(akk)') && !structure.includes('(dat)');
    } else if (currentFilter === 'dat') {
      matchesFilter = structure.includes('(dat)') && !structure.includes('(akk)');
    } else if (currentFilter === 'both') {
      matchesFilter = structure.includes('(akk)') && structure.includes('(dat)');
    }
    
    item.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
  });
  
  // Highlight search term
  if (searchTerm) {
    verbItems.forEach(item => {
      const verbName = item.querySelector('.verb-name');
      const verbStructure = item.querySelector('.verb-structure');
      
      const verbText = verbName.textContent;
      const structureText = verbStructure.textContent;
      
      verbName.innerHTML = verbText.replace(new RegExp(searchTerm, 'gi'), match => 
        `<span class="search-highlight">${match}</span>`);
      verbStructure.innerHTML = structureText.replace(new RegExp(searchTerm, 'gi'), match => 
        `<span class="search-highlight">${match}</span>`);
    });
  } else {
    verbItems.forEach(item => {
      const verbName = item.querySelector('.verb-name');
      const verbStructure = item.querySelector('.verb-structure');
      verbName.innerHTML = verbName.textContent;
      verbStructure.innerHTML = verbStructure.textContent;
    });
  }
}

function showAddVerbForm() {
  document.getElementById('main-grid').classList.add('hidden');
  document.getElementById('add-verb-section').classList.remove('hidden');
  document.getElementById('practice-section').classList.add('hidden');
  document.getElementById('flashcard-section').classList.add('hidden');
  document.getElementById('verb-list-section').classList.add('hidden');
  backButton.classList.remove('hidden');
}

function backToMain() {
  document.getElementById('main-grid').classList.remove('hidden');
  document.getElementById('practice-section').classList.add('hidden');
  document.getElementById('flashcard-section').classList.add('hidden');
  document.getElementById('verb-list-section').classList.add('hidden');
  document.getElementById('add-verb-section').classList.add('hidden');
  backButton.classList.add('hidden');
}

// Flashcard functions
function renderFlashcard() {
  const flashcardFront = document.getElementById('flashcard-front');
  const flashcardBack = document.getElementById('flashcard-back');
  const progressIndicator = document.getElementById('flashcard-progress');
  
  if (!flashcardFront || !flashcardBack || !progressIndicator) return;
  
  if (flashcardVerbs.length === 0) {
    flashcardFront.querySelector('.flashcard-content').textContent = "No verbs loaded";
    flashcardBack.querySelector('.flashcard-content').textContent = "Select a day";
    progressIndicator.textContent = "0/0";
    return;
  }
  
  const currentVerb = flashcardVerbs[flashcardIndex];
  // Front: Infinitive, Perfekt, Präteritum

flashcardFront.querySelector('.flashcard-content').innerHTML = `
 <div class="flashcard-verb-main">${currentVerb.infinitive || currentVerb.verb}</div>
 <div class="flashcard-tenses">
 <div class="tense perfekt"><strong>Perfekt:</strong> ${currentVerb.perfekt || ''}</div>
<div class="tense praeteritum"><strong>Präteritum:</strong> ${currentVerb.praeteritum || ''}</div>
 </div>
`;

// Back: Structure, Translation, Example
flashcardBack.querySelector('.flashcard-content').innerHTML = `
  <div class="flashcard-translation">${currentVerb.translation || ''}</div>
  <div class="flashcard-structure">${currentVerb.structure}</div>
  <div class="flashcard-example"><em>${currentVerb.example || ''}</em></div>
`;

  document.getElementById('flashcard').classList.remove('flipped');
  
  // Update progress indicator
  progressIndicator.textContent = `${flashcardIndex + 1}/${flashcardVerbs.length}`;
  
  // Track viewed flashcards
  flashcardStats.viewed++;
  if (flashcardStats.viewed >= 50 && !achievements.flashcardMaster.unlocked) {
    achievements.flashcardMaster.unlocked = true;
    showAchievement(achievements.flashcardMaster);
  }
  localStorage.setItem('flashcardStats', JSON.stringify(flashcardStats));
  updateStats();
}

function flipFlashcard() {
  this.classList.toggle('flipped');
}

function nextFlashcard() {
  if (flashcardVerbs.length === 0) return;
  flashcardIndex = (flashcardIndex + 1) % flashcardVerbs.length;
  renderFlashcard();
}

function prevFlashcard() {
  if (flashcardVerbs.length === 0) return;
  flashcardIndex = (flashcardIndex - 1 + flashcardVerbs.length) % flashcardVerbs.length;
  renderFlashcard();
}

function markAsKnown() {
  if (flashcardVerbs.length === 0) return;
  
  const currentVerb = flashcardVerbs[flashcardIndex];
  const day = document.getElementById('flashcard-day').value;
  const key = `${currentVerb.verb}-${day}`;
  
  userStats.masteredVerbs[key] = true;
  flashcardStats.known++;
  saveUserStats();
  
  // Visual feedback
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.add('known');
  setTimeout(() => {
    nextFlashcard();
    flashcard.classList.remove('known');
  }, 500);
  
  checkAchievements();
}

// Practice functions
function togglePracticeMode(e) {
  if (e) e.stopPropagation();
  isShuffleMode = !isShuffleMode;
  const button = document.getElementById('practice-mode-toggle');
  if (button) button.classList.toggle('active', isShuffleMode);
  
  if (document.getElementById('practice-section').classList.contains('hidden')) return;
  
  // Re-shuffle if already in practice mode
  loadPracticeVerbs(document.getElementById('practice-day').value);
}

function selectDay(day) {
  const verbs = verbsByDay[day] || [];
  const list = document.getElementById('verb-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (verbs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book"></i>
        <p>No verbs available for this day</p>
      </div>`;
    return;
  }

  verbs.forEach(({ verb, structure }, index) => {
    const li = document.createElement('li');
    li.className = 'verb-item';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `verb-${verb}-${day}`;
    checkbox.dataset.day = day;
    checkbox.dataset.index = index;
    
    // Create label
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.innerHTML = `
      <span class="verb-name">${verb}</span>
      <span class="verb-structure">${structure}</span>
    `;
    
    // Add mastered class if needed
    if (userStats.masteredVerbs[`${verb}-${day}`]) {
      li.classList.add('mastered');
      checkbox.checked = true;
    }
    
    li.appendChild(checkbox);
    li.appendChild(label);
    list.appendChild(li);
  });
  
  setupVerbFiltering();
}

function setupVerbFiltering() {
  document.querySelectorAll('.filter-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      filterVerbList();
    });
  });
}

function startPractice() {
  const checkboxes = document.querySelectorAll('#verb-list input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    showNotification('Please select at least one verb to practice.');
    return;
  }

  selectedVerbs = Array.from(checkboxes).map(cb => {
    const day = cb.dataset.day;
    const index = parseInt(cb.dataset.index);
    return { ...verbsByDay[day][index], day }; // Include the day in the verb object
  });

  if (selectedVerbs.length === 0) {
    showNotification('No verbs selected for practice.');
    return;
  }

  if (isShuffleMode) {
    selectedVerbs = shuffleArray([...selectedVerbs]);
  }

  currentIndex = 0;
  wrongAnswers = [];

  // Hide verb list and show practice section
  document.getElementById('verb-list-section').classList.add('hidden');
  document.getElementById('practice-section').classList.remove('hidden');
  
  showPracticeUI();
}

function showPracticeUI() {
  const container = document.getElementById('practice-container');
  container.innerHTML = `
    <div class="practice-area">
      <div class="progress-indicator">${currentIndex + 1} of ${selectedVerbs.length}</div>
      <div id="practice-verb"></div>
      <input id="user-input" type="text" placeholder="Enter the correct structure..." autocomplete="off" />
      <div class="practice-actions">
        <button onclick="checkAnswer()" class="primary-button"><i class="fas fa-check"></i> Check</button>
        <button onclick="skipVerb()" class="secondary-button"><i class="fas fa-forward"></i> Skip</button>
      </div>
      <div id="feedback"></div>
      <div id="hint-area"></div>
    </div>`;
  document.getElementById('user-input').focus();
  renderVerb();
}

function renderVerb() {
  const verb = selectedVerbs[currentIndex];
  document.getElementById('practice-verb').innerHTML = `
    <div class="verb-to-practice">${verb.verb}</div>
    <button onclick="showHint()" class="hint-button"><i class="fas fa-lightbulb"></i> Hint</button>
  `;
  document.getElementById('user-input').value = '';
  document.getElementById('feedback').textContent = '';
  document.getElementById('hint-area').innerHTML = '';
  document.querySelector('.progress-indicator').textContent = `${currentIndex + 1} of ${selectedVerbs.length}`;
}

function showHint() {
  const verb = selectedVerbs[currentIndex];
  const translation = verb.translation || "No translation available.";
  document.getElementById('hint-area').innerHTML = `
    <div class="hint-content">
      <h4>Translation Hint</h4>
      <div class="structure-hint">${translation}</div>
    </div>`;
}

function checkAnswer() {
  const input = normalize(document.getElementById('user-input').value);
  const correct = normalize(selectedVerbs[currentIndex].structure);
  const key = `${selectedVerbs[currentIndex].verb}-${selectedVerbs[currentIndex].day}`;
  const feedback = document.getElementById('feedback');

  userStats.totalPracticed++;

  const isCorrect = isAnswerCorrect(input, correct);
  if (navigator.vibrate) navigator.vibrate(isCorrect ? [50] : [200, 100, 200]);

  if (isCorrect) {
    feedback.innerHTML = '<i class="fas fa-check-circle"></i> Correct!';
    feedback.className = 'feedback correct';
    userStats.correctAnswers++;
    userStats.masteredVerbs[key] = (userStats.masteredVerbs[key] || 0) + 1;
    
    // Check for perfect day achievement
    if (!achievements.perfectDay.unlocked) {
      const day = selectedVerbs[currentIndex].day;
      const dayVerbs = verbsByDay[day] || [];
      const mastered = dayVerbs.filter(v => userStats.masteredVerbs[`${v.verb}-${day}`]).length;
      if (mastered === dayVerbs.length) {
        achievements.perfectDay.unlocked = true;
        showAchievement(achievements.perfectDay);
      }
    }
  } else {
    feedback.innerHTML = `
      <i class="fas fa-times-circle"></i> Incorrect. 
      <div class="correct-answer">Correct: ${selectedVerbs[currentIndex].structure}</div>
    `;
    feedback.className = 'feedback incorrect';
    wrongAnswers.push(selectedVerbs[currentIndex]);
  }

  saveUserStats();
  updateStats();
  checkAchievements();

  setTimeout(() => {
    currentIndex++;
    if (currentIndex < selectedVerbs.length) {
      renderVerb();
    } else {
      showSummary();
    }
  }, 1200);
}

function skipVerb() {
  currentIndex++;
  if (currentIndex < selectedVerbs.length) {
    renderVerb();
  } else {
    showSummary();
  }
}

function showSummary() {
  const correctCount = selectedVerbs.length - wrongAnswers.length;
  const accuracy = Math.round((correctCount / selectedVerbs.length) * 100);
  document.getElementById('practice-container').innerHTML = `
    <div class="practice-area">
      <h2>Practice Complete! <i class="fas fa-trophy"></i></h2>
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-value">${correctCount}/${selectedVerbs.length}</div>
          <div class="stat-label">Correct Answers</div>
        </div>
        <div class="stat">
          <div class="stat-value">${accuracy}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
      </div>
      ${wrongAnswers.length ? `
        <div class="wrong-answers">
          <h3>Verbs to Review</h3>
          <ul>${wrongAnswers.map(v => `<li><strong>${v.verb}</strong>: ${v.structure}</li>`).join('')}</ul>
        </div>` : ''}
      <div class="summary-actions">
        ${wrongAnswers.length ? `
          <button onclick="repeatWrongAnswers()" class="primary-button">
            <i class="fas fa-redo"></i> Practice Mistakes
          </button>` : ''}
        <button onclick="backToMain()" class="secondary-button">
          <i class="fas fa-home"></i> Return Home
        </button>
      </div>
    </div>`;
}

function repeatWrongAnswers() {
  selectedVerbs = [...wrongAnswers];
  wrongAnswers = [];
  currentIndex = 0;
  showPracticeUI();
}

// Stats and achievements
function showStatsModal() {
  statsModal.classList.add('visible');
  renderStats();
}

function hideStatsModal() {
  statsModal.classList.remove('visible');
}

function renderStats() {
  // Update progress bars
  for (let day = 1; day <= 6; day++) {
    const progress = calculateDayProgress(day.toString());
    const fill = document.querySelector(`.progress-fill[data-day="${day}"]`);
    if (fill) fill.style.width = `${progress}%`;
    
    const stats = document.querySelector(`.day-stats[data-day="${day}"]`);
    if (stats) {
      const mastered = verbsByDay[day] ? verbsByDay[day].filter(v => userStats.masteredVerbs[`${v.verb}-${day}`]).length : 0;
      const total = verbsByDay[day] ? verbsByDay[day].length : 0;
      stats.textContent = `${mastered}/${total} mastered`;
    }
  }
  
  renderAchievements();
}

function calculateDayProgress(day) {
  const all = verbsByDay[day] || [];
  const mastered = all.filter(v => userStats.masteredVerbs[`${v.verb}-${day}`]).length;
  return all.length ? Math.round((mastered / all.length) * 100) : 0;
}

function checkAchievements() {
  // First practice
  if (userStats.totalPracticed > 0 && !achievements.firstPractice.unlocked) {
    achievements.firstPractice.unlocked = true;
    showAchievement(achievements.firstPractice);
  }
  
  // Verb collector
  const masteredCount = Object.keys(userStats.masteredVerbs).length;
  if (masteredCount >= 100 && !achievements.verbCollector.unlocked) {
    achievements.verbCollector.unlocked = true;
    showAchievement(achievements.verbCollector);
  }
  
  // Streaks
  if (userStats.streak >= 3 && !achievements.streak3.unlocked) {
    achievements.streak3.unlocked = true;
    showAchievement(achievements.streak3);
  }
  
  if (userStats.streak >= 7 && !achievements.streak7.unlocked) {
    achievements.streak7.unlocked = true;
    showAchievement(achievements.streak7);
  }
  
  // Save achievements
  localStorage.setItem('achievements', JSON.stringify(achievements));
  updateStats();
}

function renderAchievements() {
  const container = document.getElementById('badge-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  Object.values(achievements).forEach(achievement => {
    const badge = document.createElement('div');
    badge.className = `achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    badge.innerHTML = `
      <i class="fas ${achievement.icon}"></i>
      <h4>${achievement.title}</h4>
      <p>${achievement.description}</p>
    `;
    container.appendChild(badge);
  });
}

function showAchievement(achievement) {
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="achievement-badge unlocked">
      <i class="fas ${achievement.icon}"></i>
      <h4>${achievement.title}</h4>
      <p>${achievement.description}</p>
    </div>
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }, 100);
}

// Theme functions
function toggleTheme() {
  isDarkMode = !isDarkMode;
  localStorage.setItem('darkMode', isDarkMode);
  applyTheme();
}

function applyTheme() {
  document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  themeToggle.innerHTML = isDarkMode
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

// Utility functions
function updateStats() {
  const totalVerbs = getTotalVerbs();
  const masteredCount = Object.keys(userStats.masteredVerbs).length;
  
  // Update card footers
  const practiceStats = document.getElementById('practice-stats');
  const flashcardStatsEl = document.getElementById('flashcard-stats');
  const verbListStats = document.getElementById('verb-list-stats');
  
  if (practiceStats) practiceStats.textContent = `${totalVerbs} verbs`;
  if (flashcardStatsEl) flashcardStatsEl.textContent = `${flashcardStats.viewed} reviewed`;
  if (verbListStats) verbListStats.textContent = `${totalVerbs} verbs`;
  
  // Update badge count
  const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length;
  const badgeCount = document.getElementById('badge-count');
  if (badgeCount) badgeCount.textContent = unlockedCount;
  
  // Update streak
  updateStreak();
  
  // Save stats
  saveUserStats();
}

function getTotalVerbs() {
  return Object.values(verbsByDay).reduce((total, dayVerbs) => total + dayVerbs.length, 0);
}

function updateStreak() {
  const today = new Date().toDateString();
  const lastDate = userStats.lastPracticeDate ? new Date(userStats.lastPracticeDate).toDateString() : null;
  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (!lastDate || lastDate === yesterday.toDateString()) {
    userStats.streak++;
  } else {
    userStats.streak = 1;
  }

  userStats.lastPracticeDate = new Date().toISOString();
}

function saveUserStats() {
  localStorage.setItem('userStats', JSON.stringify(userStats));
  localStorage.setItem('flashcardStats', JSON.stringify(flashcardStats));
}

function selectAllVerbs() {
  const checkboxes = document.querySelectorAll('#verb-list input[type="checkbox"]');
  const allSelected = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allSelected);
  const selectAllButton = document.getElementById('select-all-button');
  if (selectAllButton) {
    selectAllButton.innerHTML = allSelected
      ? '<i class="far fa-square"></i> Select All'
      : '<i class="far fa-check-square"></i> Unselect All';
  }
}

function normalize(str) {
  return str.toLowerCase()
    .replace(/\u00e4/g, 'a')
    .replace(/\u00f6/g, 'o')
    .replace(/\u00fc/g, 'u')
    .replace(/\u00df/g, 'ss')
    .replace(/jemandem/g, 'jdm')
    .replace(/jemanden/g, 'jdn')
    .replace(/etwas/g, 'etw')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAnswerCorrect(input, correct) {
  const correctParts = correct.split(/[\s/]+/).filter(Boolean);
  const inputParts = input.split(/\s+/).filter(Boolean);
  return inputParts.every(part => correctParts.includes(part)) && inputParts.length === correctParts.length;
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }, 100);
}

// Make functions available globally
window.showPracticeSection = showPracticeSection;
window.showFlashcardSection = showFlashcardSection;
window.showVerbList = showVerbList;
window.showAddVerbForm = showAddVerbForm;
window.backToMain = backToMain;
window.flipFlashcard = flipFlashcard;
window.nextFlashcard = nextFlashcard;
window.prevFlashcard = prevFlashcard;
window.markAsKnown = markAsKnown;
window.togglePracticeMode = togglePracticeMode;
window.selectDay = selectDay;
window.startPractice = startPractice;
window.checkAnswer = checkAnswer;
window.skipVerb = skipVerb;
window.repeatWrongAnswers = repeatWrongAnswers;
window.showStatsModal = showStatsModal;
window.hideStatsModal = hideStatsModal;
window.selectAllVerbs = selectAllVerbs;
window.showHint = showHint;
