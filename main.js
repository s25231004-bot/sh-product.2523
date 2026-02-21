const lottoNumbers = document.querySelector('.lotto-numbers');
const generateBtn = document.getElementById('generate-btn');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = 'Light Mode';
}

// Theme Toggle Event
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    
    if (isDark) {
        themeToggle.textContent = 'Light Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = 'Dark Mode';
        localStorage.setItem('theme', 'light');
    }
});

// Generate Lotto Numbers
generateBtn.addEventListener('click', () => {
    const numbers = new Set();
    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);

    lottoNumbers.innerHTML = '';
    for (const number of sortedNumbers) {
        const span = document.createElement('span');
        span.textContent = number;
        lottoNumbers.appendChild(span);
    }

    const historyItem = document.createElement('li');
    historyItem.textContent = sortedNumbers.join(', ');
    
    // Add to history at the top
    historyList.prepend(historyItem);
});