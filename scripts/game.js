// Состояние игры
const gameState = {
    nickname: '',
    metrics: { kpi: 50, knowledge: 0, salary: 50, health: 100 },
    currentCall: 0,
    totalCalls: 10,
    calls: [],
    knowledgeBase: [],
    shuffledCalls: [],
    timerInterval: null,
    timerStartTime: null,
    timeLeft: 300,
    stats: { totalCalls: 0, correctAnswers: 0, wrongAnswers: 0, ratings: [], aiTrained: 0 },
    ai: { learnedAnswers: {}, totalTrained: 0, accuracy: 0 },
    resultSaved: false,
    dataLoaded: false
};

// Загрузка данных
async function loadData() {
    try {
        const [callsResponse, kbResponse] = await Promise.all([
            fetch('data/calls.json'),
            fetch('data/knowledgeBase.json')
        ]);
        
        if (!callsResponse.ok || !kbResponse.ok) {
            throw new Error('Не удалось загрузить файлы данных');
        }
        
        gameState.calls = await callsResponse.json();
        gameState.knowledgeBase = await kbResponse.json();
        gameState.dataLoaded = true;
        
        loadAI();
        updateAIInfo();
        updateLeaderboard();
        loadNickname();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        loadFallbackData();
    }
}

function loadFallbackData() {
    gameState.calls = [
        {
            id: 1, avatar: '👵', clientName: 'Зинаида Петрова', clientStatus: 'Клиент с 2012 года', clientType: 'grandma',
            text: 'Доченька, как мне увеличить шрифт на телефоне?',
            correctAnswer: 'Настройки Экран Размер шрифта',
            correctEffects: { kpi: 10, knowledge: 5, salary: 0, health: 0 },
            wrongEffects: { kpi: -15, knowledge: -10, salary: 0, health: -5 },
            answers: [
                { text: 'Зайдите в Настройки → Экран → Размер шрифта.', isCorrect: true, clientRating: 5, effects: { kpi: 10, knowledge: 5, salary: 0, health: 0 } },
                { text: 'Разведите пальцы на экране.', isCorrect: false, clientRating: 2, effects: { kpi: -5, knowledge: 0, salary: 0, health: 0 } }
            ]
        }
    ];
    gameState.knowledgeBase = [];
    gameState.dataLoaded = true;
    loadAI();
    updateAIInfo();
    updateLeaderboard();
    loadNickname();
}

function loadNickname() {
    const saved = localStorage.getItem('workSimulatorNickname');
    const remember = localStorage.getItem('workSimulatorRemember');
    if (saved && remember === 'true') {
        const input = document.getElementById('nickname');
        if (input) input.value = saved;
        const checkbox = document.getElementById('remember-nickname');
        if (checkbox) checkbox.checked = true;
    }
}

function saveNickname() {
    const remember = document.getElementById('remember-nickname').checked;
    if (remember) {
        localStorage.setItem('workSimulatorNickname', gameState.nickname);
        localStorage.setItem('workSimulatorRemember', 'true');
    } else {
        localStorage.removeItem('workSimulatorNickname');
        localStorage.removeItem('workSimulatorRemember');
    }
}

function loadAI() {
    const savedAI = localStorage.getItem('callCenterAI');
    if (savedAI) {
        try {
            gameState.ai = JSON.parse(savedAI);
        } catch (e) {
            console.error('Ошибка загрузки ИИ:', e);
        }
    }
}

function saveAI() {
    localStorage.setItem('callCenterAI', JSON.stringify(gameState.ai));
}

function updateAIInfo() {
    const countEl = document.getElementById('ai-trained-count');
    const accEl = document.getElementById('ai-accuracy');
    if (countEl) countEl.textContent = gameState.ai.totalTrained;
    if (accEl) accEl.textContent = Math.round(gameState.ai.accuracy);
}

function getLeaderboard() {
    const saved = localStorage.getItem('workSimulatorLeaderboard');
    return saved ? JSON.parse(saved) : [];
}

function saveToLeaderboard(nickname, score, avgRating) {
    const leaderboard = getLeaderboard();
    leaderboard.push({
        nickname: nickname,
        score: Math.round(score),
        avgRating: avgRating.toFixed(1),
        date: new Date().toLocaleDateString('ru-RU')
    });
    leaderboard.sort((a, b) => b.score - a.score);
    const top10 = leaderboard.slice(0, 10);
    localStorage.setItem('workSimulatorLeaderboard', JSON.stringify(top10));
}

function updateLeaderboard() {
    const leaderboard = getLeaderboard();
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    
    if (leaderboard.length === 0) {
        listEl.innerHTML = '<p style="text-align:center;color:#999;">Пока нет результатов</p>';
        return;
    }
    
    listEl.innerHTML = leaderboard.slice(0, 5).map((item, index) => `
        <div class="leaderboard-item">
            <span class="rank">#${index + 1}</span>
            <span class="name">${item.nickname}</span>
            <span class="score">${item.score} очков</span>
        </div>
    `).join('');
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function updateMetrics() {
    const metrics = ['kpi', 'knowledge', 'salary', 'health'];
    metrics.forEach(metric => {
        const value = Math.max(0, Math.min(100, gameState.metrics[metric]));
        gameState.metrics[metric] = value;
        const bar = document.getElementById(`${metric}-bar`);
        const valueEl = document.getElementById(`${metric}-value`);
        if (bar) bar.style.width = `${value}%`;
        if (valueEl) valueEl.textContent = Math.round(value);
    });
}

function applyEffects(effects) {
    for (const [metric, value] of Object.entries(effects)) {
        if (gameState.metrics[metric] !== undefined) {
            gameState.metrics[metric] += value;
        }
    }
    updateMetrics();
}

function startTimer() {
    clearInterval(gameState.timerInterval);
    gameState.timeLeft = 300;
    gameState.timerStartTime = Date.now();
    updateTimerDisplay();
    
    gameState.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameState.timerStartTime) / 1000);
        gameState.timeLeft = Math.max(0, 300 - elapsed);
        
        updateTimerDisplay();
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            handleTimeout();
        }
    }, 100);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    timerEl.classList.remove('warning', 'danger');
    if (gameState.timeLeft <= 30) timerEl.classList.add('danger');
    else if (gameState.timeLeft <= 60) timerEl.classList.add('warning');
}

function handleTimeout() {
    const call = gameState.shuffledCalls[gameState.currentCall];
    if (!call) return;
    
    const answer = { text: 'Не ответил вовремя', isCorrect: false, clientRating: 1, effects: call.wrongEffects };
    applyEffects(answer.effects);
    
    gameState.stats.totalCalls++;
    gameState.stats.wrongAnswers++;
    gameState.stats.ratings.push(1);
    
    showOperatorMessage(answer.text, () => {
        showClientResponse(call, 1, () => {
            showClientRatingInChat(call, answer, 1);
        });
    });
}

function checkEndings() {
    const avgRating = gameState.stats.ratings.length > 0 
        ? gameState.stats.ratings.reduce((a, b) => a + b, 0) / gameState.stats.ratings.length 
        : 0;
    
    let ending = null;
    
    if (avgRating >= 4.5 && gameState.metrics.kpi >= 80) {
        ending = { title: '⭐ Легенда поддержки', text: `Невероятно! Оценка ${avgRating.toFixed(1)}/5, KPI ${Math.round(gameState.metrics.kpi)}. Вас хотят переманить конкуренты!` };
    } else if (avgRating >= 4.0) {
        ending = { title: '🌟 Звезда поддержки', text: `Отличная работа! Оценка ${avgRating.toFixed(1)}/5. Вас повысили до старшего оператора.` };
    } else if (avgRating >= 3.0) {
        ending = { title: '✅ Смена завершена', text: `Неплохо! Оценка ${avgRating.toFixed(1)}/5. Премия начислена.` };
    } else if (avgRating >= 2.0) {
        ending = { title: '😐 Смена завершена, но...', text: `Оценка ${avgRating.toFixed(1)}/5. Назначено дополнительное обучение.` };
    } else {
        ending = { title: '😞 Смена провалена', text: `Оценка ${avgRating.toFixed(1)}/5. Вас отправили на переобучение.` };
    }
    
    showEnding(ending);
    return true;
}

function showEnding(ending) {
    clearInterval(gameState.timerInterval);
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('ending-screen').classList.add('active');
    
    document.getElementById('ending-title').textContent = ending.title;
    document.getElementById('ending-text').textContent = ending.text;
    document.getElementById('final-kpi').textContent = Math.round(gameState.metrics.kpi);
    document.getElementById('final-knowledge').textContent = Math.round(gameState.metrics.knowledge);
    document.getElementById('final-salary').textContent = Math.round(gameState.metrics.salary);
    document.getElementById('final-health').textContent = Math.round(gameState.metrics.health);
    document.getElementById('stat-total').textContent = gameState.stats.totalCalls;
    document.getElementById('stat-correct').textContent = gameState.stats.correctAnswers;
    document.getElementById('stat-wrong').textContent = gameState.stats.wrongAnswers;
    
    const avgRating = gameState.stats.ratings.length > 0 
        ? (gameState.stats.ratings.reduce((a, b) => a + b, 0) / gameState.stats.ratings.length).toFixed(1)
        : '0.0';
    document.getElementById('stat-avg-rating').textContent = avgRating;
    document.getElementById('stat-ai-trained').textContent = gameState.ai.totalTrained;
    
    document.getElementById('save-result-section').style.display = 'block';
    gameState.resultSaved = false;
}

function calculateScore() {
    const avgRating = gameState.stats.ratings.length > 0 
        ? gameState.stats.ratings.reduce((a, b) => a + b, 0) / gameState.stats.ratings.length 
        : 0;
    return Math.round(
        gameState.metrics.kpi * 0.3 +
        gameState.metrics.knowledge * 0.2 +
        gameState.metrics.salary * 0.2 +
        avgRating * 10 * 0.3
    );
}

function showCall() {
    if (gameState.currentCall >= gameState.shuffledCalls.length) {
        checkEndings();
        return;
    }
    
    const call = gameState.shuffledCalls[gameState.currentCall];
    
    document.getElementById('call-counter').textContent = 
        `Сообщение ${gameState.currentCall + 1} / ${gameState.totalCalls}`;
    document.getElementById('client-avatar').textContent = call.avatar;
    document.getElementById('client-name').textContent = call.clientName;
    
    const statusEl = document.getElementById('client-status-text');
    if (statusEl) statusEl.textContent = call.clientStatus || 'Клиент';
    
    const infoEl = document.getElementById('client-info');
    if (infoEl) {
        if (call.clientInfo) {
            infoEl.textContent = call.clientInfo;
            infoEl.style.display = 'block';
        } else {
            infoEl.style.display = 'none';
        }
    }
    
    updateMetrics();
    showAIHint(call);
    hideAIPopup();
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    document.getElementById('answers-section').style.display = 'none';
    
    showTypingIndicator(call, () => {
        showMessage(call, () => {
            startTimer();
            setTimeout(() => {
                showAnswerOptions(call);
                document.getElementById('answers-section').style.display = 'block';
                document.getElementById('answers-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 400);
        });
    });
}

function showTypingIndicator(call, callback) {
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="message-avatar">${call.avatar}</div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    const typingDuration = 1500 + Math.random() * 1000;
    setTimeout(() => {
        typingIndicator.remove();
        if (callback) callback();
    }, typingDuration);
}

function showMessage(call, callback) {
    const chatMessages = document.getElementById('chat-messages');
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message client-message';
    messageEl.innerHTML = `
        <div class="message-avatar">${call.avatar}</div>
        <div class="message-content">
            <div class="message-text">${call.text}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        showAIComment(call, () => {
            if (callback) callback();
        });
    }, 500);
}

function showOperatorMessage(text, callback) {
    const chatMessages = document.getElementById('chat-messages');
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'operator-message';
    messageEl.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <div class="message-text">${text}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (callback) {
        setTimeout(callback, 800);
    }
}

function showClientResponse(call, rating, callback) {
    const chatMessages = document.getElementById('chat-messages');
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const reaction = getClientReaction(call, rating);
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message client-message';
    messageEl.innerHTML = `
        <div class="message-avatar">${call.avatar}</div>
        <div class="message-content">
            <div class="message-text">${reaction}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (callback) {
        setTimeout(callback, 1000);
    }
}

function showClientRatingInChat(call, answer, rating) {
    const chatMessages = document.getElementById('chat-messages');
    
    const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
    const details = generateRatingDetails(call, answer, rating);
    
    const ratingEl = document.createElement('div');
    ratingEl.className = 'chat-rating';
    ratingEl.innerHTML = `
        <div class="chat-rating-stars">${stars}</div>
        <div class="chat-rating-details">${details}</div>
    `;
    chatMessages.appendChild(ratingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        nextCall();
    }, 3000);
}

function showAIComment(call, callback) {
    const chatMessages = document.getElementById('chat-messages');
    const aiComment = generateAIComment(call);
    
    const commentEl = document.createElement('div');
    commentEl.className = 'ai-comment';
    commentEl.innerHTML = `
        <div class="ai-comment-avatar">🤖</div>
        <div class="ai-comment-content">
            <div class="ai-comment-label">ИИ-помощник</div>
            <div class="ai-comment-text">${aiComment}</div>
        </div>
    `;
    chatMessages.appendChild(commentEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (callback) {
        setTimeout(callback, 800);
    }
}

function generateAIComment(call) {
    const questionWords = extractKeywords(call.text);
    const articlesWithRelevance = gameState.knowledgeBase.map(article => {
        const relevance = calculateRelevance(questionWords, article.keywords, call.text);
        return { ...article, relevance };
    });
    articlesWithRelevance.sort((a, b) => b.relevance - a.relevance);
    const bestArticle = articlesWithRelevance[0];
    
    const commentTemplates = {
        grandma: ["Похоже, нужна тёплая инструкция. Бабушки любят пошаговые объяснения 👵"],
        angry: ["Клиент на взводе! Сначала извинись, потом решай 🧯"],
        business: ["Деловой клиент — цени время. Коротко, по делу 💼"],
        vip: ["VIP-клиент! Обращайся по имени-отчеству 👑"],
        student: ["Студент — можно попроще, но не панибратски 🎓"]
    };
    
    let comment = '';
    if (bestArticle && bestArticle.relevance >= 40) {
        comment = `💡 Похоже на проблему "<strong>${bestArticle.title}</strong>". Загляни в базу знаний!`;
    } else {
        const templates = commentTemplates[call.clientType] || commentTemplates.student;
        comment = templates[0];
    }
    
    if (gameState.ai.learnedAnswers[call.id]) {
        const answers = gameState.ai.learnedAnswers[call.id];
        const bestAnswer = Object.entries(answers).sort((a, b) => b[1] - a[1])[0];
        if (bestAnswer && bestAnswer[1] >= 2) {
            comment += `<br><br>🎓 <em>Ты уже решал такое. Нажми "💡 Подсказка ИИ"!</em>`;
        }
    }
    
    return comment;
}

function showAnswerOptions(call) {
    const answersList = document.getElementById('answers-list');
    answersList.innerHTML = '';
    
    const shuffledAnswers = shuffleArray(call.answers);
    shuffledAnswers.forEach((answer) => {
        const answerEl = document.createElement('div');
        answerEl.className = 'answer-option';
        answerEl.textContent = answer.text;
        
        if (isAIRecommended(call.id, answer.text)) {
            answerEl.classList.add('ai-recommended');
        }
        
        answerEl.addEventListener('click', () => handleAnswer(call, answer));
        answersList.appendChild(answerEl);
    });
}

function isAIRecommended(callId, answerText) {
    if (!gameState.ai.learnedAnswers[callId]) return false;
    const answers = gameState.ai.learnedAnswers[callId];
    const normalizedAnswer = normalizeText(answerText);
    for (const [learnedAnswer, count] of Object.entries(answers)) {
        if (normalizedAnswer === learnedAnswer && count >= 2) return true;
    }
    return false;
}

function normalizeText(text) {
    return text.toLowerCase().replace(/[^\wа-яё\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function showAIHint(call) {
    const hintBtn = document.getElementById('ai-hint-btn');
    if (!hintBtn) return;
    
    if (!gameState.ai.learnedAnswers[call.id]) {
        hintBtn.style.display = 'none';
        return;
    }
    
    const answers = gameState.ai.learnedAnswers[call.id];
    const bestAnswer = Object.entries(answers).sort((a, b) => b[1] - a[1])[0];
    
    if (bestAnswer && bestAnswer[1] >= 2) {
        hintBtn.style.display = 'block';
        hintBtn.onclick = () => showAIPopup(bestAnswer[0]);
    } else {
        hintBtn.style.display = 'none';
    }
}

function showAIPopup(answerText) {
    const popup = document.getElementById('ai-popup');
    const answerEl = document.getElementById('ai-popup-answer');
    const insertBtn = document.getElementById('insert-ai-answer-btn');
    
    answerEl.textContent = answerText;
    popup.style.display = 'block';
    popup.dataset.currentAnswer = answerText;
    
    insertBtn.onclick = () => insertAIAnswer(answerText);
}

function insertAIAnswer(answerText) {
    const textarea = document.getElementById('custom-answer-input');
    if (textarea.value.trim()) {
        textarea.value = textarea.value.trim() + '\n\n' + answerText;
    } else {
        textarea.value = answerText;
    }
    hideAIPopup();
    textarea.focus();
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showNotification('📋 Ответ вставлен. Можете отредактировать!', 'success');
}

function hideAIPopup() {
    const popup = document.getElementById('ai-popup');
    if (popup) popup.style.display = 'none';
}

function handleAnswer(call, answer) {
    clearInterval(gameState.timerInterval);
    
    document.getElementById('answers-section').style.display = 'none';
    
    const rating = answer.clientRating || 3;
    
    showOperatorMessage(answer.text, () => {
        applyEffects(answer.effects);
        
        gameState.stats.totalCalls++;
        if (answer.isCorrect) gameState.stats.correctAnswers++;
        else gameState.stats.wrongAnswers++;
        
        gameState.stats.ratings.push(rating);
        
        trainAI(call, answer);
        
        showClientResponse(call, rating, () => {
            showClientRatingInChat(call, answer, rating);
        });
    });
}

function getClientReaction(call, rating) {
    const reactions = {
        grandma: {
            5: '😍 "Ой, доченька, спасибо тебе огромное! Ты такая умница!"',
            4: '😊 "Спасибо тебе, милая! Ты мне очень помогла."',
            3: '😐 "Ну ладно, спасибо... Я попробую."',
            2: '😞 "Ох, доченька, я что-то не поняла..."',
            1: '😢 "Ой, горе мне... Я совсем запуталась."'
        },
        angry: {
            5: ' "Хм... Ладно, признаю, нормально сделали."',
            4: '😤 "Ну наконец-то! Почему сразу так не сделали?!"',
            3: '😡 "Это что за ответ?! Я не это спрашивал!"',
            2: '🤬 "Вы издеваетесь?! Я требую менеджера!"',
            1: '💢 "ВСЁ! Я ЗВОНЮ В ПРОКУРАТУРУ!"'
        },
        business: {
            5: '👔 "Отлично. Именно такой сервис мы и ожидаем."',
            4: '💼 "Приемлемо. Но в следующий раз будьте оперативнее."',
            3: '😐 "Средне. Я ожидаю большего."',
            2: '😠 "Это неприемлемо. Пересмотрим условия."',
            1: '📉 "Катастрофа. Переводим всех к конкурентам."'
        },
        vip: {
            5: '👑 "Хорошо. Запомню вас."',
            4: '🎩 "Неплохо. Но мой помощник ожидает большего."',
            3: '😒 "Серьёзно? Позовите того, кто решает."',
            2: '😤 "Вы понимаете, кто я? Это конец вашей карьеры."',
            1: ' "Мой юрист свяжется с вами. Вы уволены."'
        },
        student: {
            5: '🎮 "Крутяк, спасибо! Ты реально спасла 😎"',
            4: '😎 "Норм, спасибо. Помогла."',
            3: ' "Ну окей... Не совсем то, что я хотел."',
            2: '😒 "Слушай, ты вообще в теме?"',
            1: '🤦 "Ты издеваешься? Потратил время зря."'
        }
    };
    const clientReactions = reactions[call.clientType] || reactions.student;
    return clientReactions[rating] || '😐 "Ну ладно..."';
}

function trainAI(call, answer) {
    if (!gameState.ai.learnedAnswers[call.id]) gameState.ai.learnedAnswers[call.id] = {};
    const normalizedAnswer = normalizeText(answer.text);
    if (!gameState.ai.learnedAnswers[call.id][normalizedAnswer]) {
        gameState.ai.learnedAnswers[call.id][normalizedAnswer] = 0;
    }
    if (answer.isCorrect) {
        gameState.ai.learnedAnswers[call.id][normalizedAnswer]++;
        gameState.ai.totalTrained++;
    }
    if (gameState.stats.totalCalls > 0) {
        gameState.ai.accuracy = (gameState.stats.correctAnswers / gameState.stats.totalCalls) * 100;
    }
    saveAI();
}

function generateRatingDetails(call, answer, rating) {
    const pros = [];
    const cons = [];
    let advice = '';
    
    if (answer.isCorrect) {
        pros.push('Решение проблемы клиента');
        if (gameState.timeLeft > 240) pros.push('Быстрый ответ');
    } else {
        cons.push('Неверное решение проблемы');
    }
    
    const adviceTemplates = {
        5: 'Превосходная работа!',
        4: 'Отличный ответ.',
        3: 'Неплохо, но можно лучше.',
        2: 'Стоит пересмотреть подход.',
        1: 'Серьёзная ошибка.'
    };
    advice = adviceTemplates[rating];
    
    let html = '';
    if (pros.length > 0) {
        html += `<div class="pros">✅ ${pros.join(', ')}</div>`;
    }
    if (cons.length > 0) {
        html += `<div class="cons">⚠️ ${cons.join(', ')}</div>`;
    }
    html += `<div>💡 <strong>Совет:</strong> ${advice}</div>`;
    
    return html;
}

function checkCustomAnswer(userAnswer, correctAnswer) {
    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(correctAnswer);
    
    if (normalizedUser.length < 10) return false;
    
    const charFrequency = {};
    for (const char of normalizedUser) {
        charFrequency[char] = (charFrequency[char] || 0) + 1;
    }
    const maxFrequency = Math.max(...Object.values(charFrequency));
    const repeatRatio = maxFrequency / normalizedUser.length;
    if (repeatRatio > 0.5) return false;
    
    const vowels = 'аеёиоуыэюяaeiou'.split('');
    const vowelCount = normalizedUser.split('').filter(c => vowels.includes(c)).length;
    const vowelRatio = vowelCount / normalizedUser.length;
    if (vowelRatio < 0.15 || vowelRatio > 0.65) return false;
    
    const userWords = normalizedUser.split(' ').filter(w => w.length > 2);
    const uniqueWords = new Set(userWords);
    if (uniqueWords.size < 3) return false;
    
    const correctWords = normalizedCorrect.split(' ');
    let matchCount = 0;
    correctWords.forEach(word => {
        if (word.length > 3 && userWords.some(uw => 
            uw.includes(word) || word.includes(uw) || 
            levenshteinDistance(uw, word) <= 2
        )) {
            matchCount++;
        }
    });
    
    return (matchCount / correctWords.length) >= 0.4;
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
}

function handleCustomAnswer(call) {
    const input = document.getElementById('custom-answer-input');
    const customText = input.value.trim();
    
    if (!customText) {
        alert('Пожалуйста, введите ответ');
        return;
    }
    
    clearInterval(gameState.timerInterval);
    const isCorrect = checkCustomAnswer(customText, call.correctAnswer);
    
    const answer = {
        text: customText,
        isCorrect: isCorrect,
        clientRating: isCorrect ? 4 : 2,
        effects: isCorrect ? call.correctEffects : call.wrongEffects
    };
    
    handleAnswer(call, answer);
    input.value = '';
}

function openKnowledgeBase(call) {
    const modal = document.getElementById('knowledge-modal');
    modal.classList.add('active');
    
    const resultsDiv = document.getElementById('kb-results');
    resultsDiv.innerHTML = `
        <div class="kb-warning">⚠️ <strong>Внимание!</strong> Поиск отнимает 30 секунд.</div>
        <div class="kb-searching"><div class="kb-searching-spinner"></div><p>Ищем...</p></div>
    `;
    
    setTimeout(() => displayKBResults(call), 1500);
}

function displayKBResults(call) {
    const resultsDiv = document.getElementById('kb-results');
    const questionWords = extractKeywords(call.text);
    const articlesWithRelevance = gameState.knowledgeBase.map(article => {
        const relevance = calculateRelevance(questionWords, article.keywords, call.text);
        return { ...article, relevance };
    });
    articlesWithRelevance.sort((a, b) => b.relevance - a.relevance);
    const topArticles = articlesWithRelevance.slice(0, 5).filter(a => a.relevance > 0);
    
    resultsDiv.innerHTML = '<div class="kb-warning">⚠️ При использовании ответа таймер уменьшится на 30 секунд.</div>';
    
    if (topArticles.length === 0) {
        resultsDiv.innerHTML += '<p style="text-align:center;color:#999;padding:20px;">🔍 Ничего не найдено.</p>';
        return;
    }
    
    topArticles.forEach(article => {
        const articleEl = document.createElement('div');
        articleEl.className = 'kb-article';
        let relevanceClass = 'low';
        if (article.relevance >= 70) relevanceClass = 'high';
        else if (article.relevance >= 40) relevanceClass = 'medium';
        const highlightedAnswer = highlightKeywords(article.answer, questionWords);
        articleEl.innerHTML = `
            <h4>${article.title}<span class="kb-relevance ${relevanceClass}">${article.relevance}%</span></h4>
            <p>${highlightedAnswer}</p>
            <button class="btn btn-primary" onclick="useKBArticle('${article.answer.replace(/'/g, "\\'")}')">Использовать (-30 сек)</button>
        `;
        resultsDiv.appendChild(articleEl);
    });
}

function extractKeywords(text) {
    const stopWords = ['и', 'в', 'на', 'с', 'по', 'для', 'что', 'как', 'это', 'у', 'к', 'но', 'а', 'не', 'я', 'мне', 'мой', 'ваш'];
    return [...new Set(text.toLowerCase().replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w)))];
}

function calculateRelevance(questionWords, articleKeywords, fullText) {
    let score = 0;
    const keywordMatches = articleKeywords.filter(kw => questionWords.some(qw => qw.includes(kw) || kw.includes(qw)));
    score += (keywordMatches.length / Math.max(articleKeywords.length, 1)) * 60;
    const textLower = fullText.toLowerCase();
    const textMatches = articleKeywords.filter(kw => textLower.includes(kw));
    score += (textMatches.length / Math.max(articleKeywords.length, 1)) * 40;
    return Math.round(score);
}

function highlightKeywords(text, keywords) {
    let result = text;
    keywords.forEach(keyword => {
        if (keyword.length > 2) {
            const regex = new RegExp(`(${keyword})`, 'gi');
            result = result.replace(regex, '<span class="kb-highlight">$1</span>');
        }
    });
    return result;
}

window.useKBArticle = function(answerText) {
    setTimeout(() => {
        document.getElementById('custom-answer-input').value = answerText;
        document.getElementById('knowledge-modal').classList.remove('active');
        applyTimePenalty(30);
        showTimePenaltyNotification(30);
    }, 500);
};

function applyTimePenalty(seconds) {
    gameState.timeLeft = Math.max(0, gameState.timeLeft - seconds);
    updateTimerDisplay();
    if (gameState.timeLeft <= 0) {
        clearInterval(gameState.timerInterval);
        handleTimeout();
    }
}

function showTimePenaltyNotification(seconds) {
    const notification = document.createElement('div');
    notification.className = 'time-penalty-notification';
    notification.innerHTML = `⏱️ Поиск в базе: <strong>-${seconds} сек</strong>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
}

function showNotification(text, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = text;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 2500);
}

function nextCall() {
    gameState.currentCall++;
    if (gameState.currentCall >= gameState.totalCalls || gameState.currentCall >= gameState.shuffledCalls.length) {
        checkEndings();
    } else {
        setTimeout(() => showCall(), 500);
    }
}

function startGame() {
    const nicknameInput = document.getElementById('nickname');
    if (!nicknameInput) return;
    
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
        alert('Пожалуйста, введите ник');
        return;
    }
    
    gameState.nickname = nickname;
    saveNickname();
    
    gameState.currentCall = 0;
    gameState.metrics = { kpi: 50, knowledge: 0, salary: 50, health: 100 };
    gameState.stats = { totalCalls: 0, correctAnswers: 0, wrongAnswers: 0, ratings: [], aiTrained: 0 };
    
    if (gameState.calls.length < 10) {
        gameState.shuffledCalls = shuffleArray([...gameState.calls, ...generateExtraCalls()]).slice(0, 10);
    } else {
        gameState.shuffledCalls = shuffleArray(gameState.calls).slice(0, 10);
    }
    
    document.getElementById('player-nickname').textContent = nickname;
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('ending-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    updateMetrics();
    showCall();
}

function endShiftEarly() {
    if (confirm('Вы уверены, что хотите завершить смену досрочно?')) {
        checkEndings();
    }
}

function generateExtraCalls() {
    const templates = [
        { avatar: '', clientName: 'Галина Морозова', clientStatus: 'Пенсионер', clientType: 'grandma', text: 'Как отправить фото по вотсапу?' },
        { avatar: '', clientName: 'Андрей Волков', clientStatus: 'Постоянный клиент', clientType: 'angry', text: 'Почему списали деньги дважды?!' },
        { avatar: '🧑‍💼', clientName: 'Дмитрий Соколов', clientStatus: 'Директор ООО', clientType: 'business', text: 'Нужно подключить 50 сотрудников.' },
        { avatar: '👑', clientName: 'Елена Романова', clientStatus: 'VIP', clientType: 'vip', text: 'Почему лагает видео?' },
        { avatar: '🤷', clientName: 'Максим Лебедев', clientStatus: 'Студент', clientType: 'student', text: 'Можно пароль от Wi-Fi соседа?' }
    ];
    
    return templates.map((t, i) => ({
        id: 100 + i,
        ...t,
        correctAnswer: 'помощь решение',
        correctEffects: { kpi: 10, knowledge: 5, salary: 0, health: 0 },
        wrongEffects: { kpi: -10, knowledge: -5, salary: 0, health: -5 },
        answers: [
            { text: 'Сейчас помогу. Уточните детали.', isCorrect: true, clientRating: 4, effects: { kpi: 10, knowledge: 5, salary: 0, health: 0 } },
            { text: 'Это не моя компетенция.', isCorrect: false, clientRating: 1, effects: { kpi: -10, knowledge: -5, salary: 0, health: -5 } }
        ]
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const saveResultBtn = document.getElementById('save-result-btn');
    const searchKbBtn = document.getElementById('search-kb-btn');
    const transferBtn = document.getElementById('transfer-btn');
    const submitCustomBtn = document.getElementById('submit-custom-btn');
    const closeKbBtn = document.getElementById('close-kb-btn');
    const closeAiPopupBtn = document.getElementById('close-ai-popup');
    const endShiftBtn = document.getElementById('end-shift-btn');
    const nicknameInput = document.getElementById('nickname');
    
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (endShiftBtn) endShiftBtn.addEventListener('click', endShiftEarly);
    
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            document.getElementById('ending-screen').classList.remove('active');
            document.getElementById('welcome-screen').classList.add('active');
            updateAIInfo();
            updateLeaderboard();
        });
    }
    
    if (saveResultBtn) {
        saveResultBtn.addEventListener('click', () => {
            if (gameState.resultSaved) return;
            const score = calculateScore();
            const avgRating = gameState.stats.ratings.length > 0 
                ? gameState.stats.ratings.reduce((a, b) => a + b, 0) / gameState.stats.ratings.length 
                : 0;
            saveToLeaderboard(gameState.nickname, score, avgRating);
            gameState.resultSaved = true;
            document.getElementById('save-result-section').innerHTML = '<p style="color:#4caf50;font-weight:bold;">✅ Сохранено!</p>';
        });
    }
    
    if (searchKbBtn) {
        searchKbBtn.addEventListener('click', () => {
            const call = gameState.shuffledCalls[gameState.currentCall];
            if (call) openKnowledgeBase(call);
        });
    }
    
    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            const call = gameState.shuffledCalls[gameState.currentCall];
            if (!call) return;
            const answer = { text: 'Передал старшему', isCorrect: false, clientRating: 2, effects: { kpi: -10, knowledge: 0, salary: -5, health: 5 } };
            handleAnswer(call, answer);
        });
    }
    
    if (submitCustomBtn) {
        submitCustomBtn.addEventListener('click', () => {
            const call = gameState.shuffledCalls[gameState.currentCall];
            if (call) handleCustomAnswer(call);
        });
    }
    
    if (closeKbBtn) {
        closeKbBtn.addEventListener('click', () => {
            document.getElementById('knowledge-modal').classList.remove('active');
        });
    }
    
    if (closeAiPopupBtn) {
        closeAiPopupBtn.addEventListener('click', hideAIPopup);
    }
    
    if (nicknameInput) {
        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startGame();
        });
    }
    
    loadData();
});