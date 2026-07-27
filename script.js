const form = document.getElementById('habitForm');
const resultCard = document.getElementById('resultCard');
const resultContent = document.getElementById('resultContent');
const loadingState = document.getElementById('loadingState');
const submitBtn = document.getElementById('submitBtn');
const historyList = document.getElementById('historyList');

const HISTORY_KEY = 'ecotrack_history';

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No entries yet. Log your first day above!</p>';
    return;
  }
  historyList.innerHTML = history.map(h => `
    <div class="history-item">
      <span>${h.date}</span>
      <span class="score-badge score-${h.level}">${h.score}/100</span>
    </div>
  `).join('');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    transport: document.getElementById('transport').value,
    electricity: document.getElementById('electricity').value,
    food: document.getElementById('food').value,
    waste: document.getElementById('waste').value,
    notes: document.getElementById('notes').value
  };

  resultCard.style.display = 'block';
  loadingState.style.display = 'block';
  resultContent.innerHTML = '';
  submitBtn.disabled = true;
  resultCard.scrollIntoView({ behavior: 'smooth' });

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();

    const level = data.score >= 70 ? 'low' : data.score >= 40 ? 'mid' : 'high';

    resultContent.innerHTML = `
      <div class="result-box">
        <span class="score-badge score-${level}">Eco Score: ${data.score}/100</span>
        <p>${data.summary}</p>
        <div class="tip-box">
          <strong>💡 Your Tip for Tomorrow:</strong><br/>
          ${data.tip}
        </div>
      </div>
    `;

    saveToHistory({
      date: new Date().toLocaleDateString(),
      score: data.score,
      level
    });

  } catch (err) {
    resultContent.innerHTML = `<p style="color:#991b1b;">Something went wrong: ${err.message}. Please try again.</p>`;
  } finally {
    loadingState.style.display = 'none';
    submitBtn.disabled = false;
  }
});

renderHistory();
