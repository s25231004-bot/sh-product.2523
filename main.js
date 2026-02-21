const lottoNumbers = document.querySelector('.lotto-numbers');
const generateBtn = document.getElementById('generate-btn');
const historyList = document.getElementById('history-list');

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
    historyList.appendChild(historyItem);
});