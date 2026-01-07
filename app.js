// ==================== GLOBAL STATE ====================
let vocab = [];
let currentFilter = '';
let searchTerm = '';
let hideLearnedWords = false;
let groupsSearchTerm = '';
let groupsFilter = '';
let groupsTopicFilter = '';

// Flashcard state
let usedFlashcardIndices = new Set();
let currentFlashcards = [];

// Sentence templates
let sentenceTemplates = [];

// Config URL - Updated to include fallback logic
const CONFIG_URL = 'https://raw.githubusercontent.com/tienhp11690/chinese/main/config.json';

// ==================== HELPER FUNCTIONS ====================

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Kiểm tra kết nối thất bại sau ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([fetch(url, options), timeoutPromise]);
}

// ==================== AUTO-LOAD CONFIG FROM GITHUB ====================

async function loadConfigFromGitHub() {
    if (CONFIG_URL.includes('yourusername')) {
        console.log('⚠️ CONFIG_URL not configured. Skipping auto-load config.');
        return;
    }

    try {
        console.log('🔧 Loading config from GitHub:', CONFIG_URL);
        const response = await fetchWithTimeout(CONFIG_URL, {}, 3000);

        if (response.ok) {
            const config = await response.json();
            const defaultConfig = config.defaultConfig;

            let applied = false;
            const keys = ['sheets-url', 'github-repo', 'github-file', 'vocab-json-url', 'sync-strategy'];

            keys.forEach(key => {
                const configKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                if (!localStorage.getItem(key) && defaultConfig[configKey]) {
                    localStorage.setItem(key, defaultConfig[configKey]);
                    console.log(`📥 Auto-filled: ${key}`);
                    applied = true;
                }
            });

            if (applied) console.log('✅ Config applied successfully');
        }
    } catch (e) {
        console.warn('⚠️ Could not load config from GitHub:', e.message);
    }
}

// ==================== CORE FUNCTIONS ====================

function generatePinyin(chinese) {
    if (typeof pinyinPro === 'undefined') return chinese;
    try {
        return pinyinPro.pinyin(chinese, { toneType: 'symbol', type: 'array' }).join(' ');
    } catch (e) {
        return chinese;
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

function save() {
    localStorage.setItem('vocab-data', JSON.stringify(vocab));
}

function load() {
    const data = localStorage.getItem('vocab-data');
    if (data) {
        try {
            vocab = JSON.parse(data);
        } catch (e) {
            vocab = [];
        }
    }
}

function status(msg, type = 'success') {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = msg;
    el.className = `status ${type} show`;
    setTimeout(() => el.classList.remove('show'), 3000);
}

function showLoading(text = 'Đang xử lý...', subtext = '') {
    const textEl = document.getElementById('loading-text');
    const subtextEl = document.getElementById('loading-subtext');
    const overlay = document.getElementById('loading-overlay');
    if (textEl) textEl.textContent = text;
    if (subtextEl) subtextEl.textContent = subtext;
    if (overlay) overlay.classList.add('show');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('show');
}

// ==================== PAGE NAVIGATION ====================

window.switchPage = function (page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    const pageEl = document.getElementById(page);
    if (pageEl) pageEl.classList.add('active');

    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (page === 'library') renderLibrary();
    if (page === 'flashcard') updateFlashcards();
    if (page === 'groups') renderGroups();
    if (page === 'sentences') renderSentences();
    if (page === 'config') updateConfig();
};

// ==================== LIBRARY ====================

window.toggleHideLearned = function () {
    hideLearnedWords = !hideLearnedWords;
    localStorage.setItem('hide-learned-words', hideLearnedWords);

    const toggle = document.getElementById('hide-toggle');
    if (toggle) {
        if (hideLearnedWords) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }

    renderLibrary();
};

function loadHideLearnedState() {
    const saved = localStorage.getItem('hide-learned-words');
    if (saved === 'true') {
        hideLearnedWords = true;
        const toggle = document.getElementById('hide-toggle');
        if (toggle) toggle.classList.add('active');
    }
}

function renderLibrary() {
    let filtered = vocab.filter(w => {
        if (hideLearnedWords && w.learned) return false;
        const matchFilter = !currentFilter || w.topic === currentFilter;
        const matchSearch = !searchTerm ||
            w.vietnamese.toLowerCase().includes(searchTerm) ||
            w.chinese.includes(searchTerm) ||
            w.pinyin.toLowerCase().includes(searchTerm) ||
            (w.meaning && w.meaning.toLowerCase().includes(searchTerm));
        return matchFilter && matchSearch;
    });

    const learnedCount = vocab.filter(w => w.learned).length;
    const hiddenCount = hideLearnedWords ? learnedCount : 0;

    const totalEl = document.getElementById('total');
    const learnedEl = document.getElementById('learned');
    const visibleEl = document.getElementById('visible-count');
    const hideStatsEl = document.getElementById('hide-stats');

    if (totalEl) totalEl.textContent = vocab.length;
    if (learnedEl) learnedEl.textContent = learnedCount;
    if (visibleEl) visibleEl.textContent = filtered.length;

    if (hideStatsEl) {
        if (hideLearnedWords && hiddenCount > 0) {
            hideStatsEl.innerHTML = `Hiện <span class="n">${filtered.length}</span> từ | Ẩn <span class="n">${hiddenCount}</span> từ đã học`;
        } else {
            hideStatsEl.innerHTML = `Hiện <span class="n">${filtered.length}</span> từ`;
        }
    }

    const topics = [...new Set(vocab.map(w => w.topic))];
    const filtersDiv = document.getElementById('filters');
    if (filtersDiv) {
        filtersDiv.innerHTML = `
            <div class="filters-container">
                <div class="filter-group">
                    <label>📚 Chủ đề:</label>
                    <select class="select-field" onchange="window.filterTopic(this.value)">
                        <option value="">Tất cả (${vocab.length} từ)</option>
                        ${topics.map(t => {
            const count = vocab.filter(w => w.topic === t).length;
            return `<option value="${t}" ${currentFilter === t ? 'selected' : ''}>${t} (${count})</option>`;
        }).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    const listDiv = document.getElementById('list');
    if (!listDiv) return;

    if (filtered.length === 0) {
        listDiv.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--g6)">Không tìm thấy từ nào</div>';
        return;
    }

    listDiv.innerHTML = filtered.map(w => `
        <div class="card">
            <span class="badge ${w.difficulty}">${w.difficulty}</span>
            <div class="card-content">
                <div style="font-size:1.5rem;font-weight:700;margin-bottom:4px">${w.chinese}</div>
                <div style="color:var(--g6);font-size:0.9rem;margin-bottom:8px">${w.pinyin}</div>
                <div style="color:var(--g8);font-weight:500">${w.vietnamese}</div>
                <div style="color:var(--g6);font-size:0.8rem;margin-top:8px">📂 ${w.topic}</div>
            </div>
            <div class="card-actions">
                <button class="action-btn" onclick="speak('${w.chinese.replace(/'/g, "\\'")}')">🔊</button>
                <button class="action-btn" onclick="showStrokeOrder('${w.chinese.replace(/'/g, "\\'")}')">✍️</button>
                <button class="action-btn ${w.learned ? 'learned' : ''}" onclick="toggleLearnedById(${w.id})">
                    ${w.learned ? '✅' : '⭕'}
                </button>
            </div>
        </div>
    `).join('');
}

window.filterTopic = function (topic) {
    currentFilter = topic;
    renderLibrary();
};

window.toggleLearnedById = function (id) {
    const word = vocab.find(w => w.id === id);
    if (word) {
        word.learned = !word.learned;
        save();

        const cardButton = event.target.closest('.action-btn');
        if (cardButton) {
            if (word.learned) {
                cardButton.classList.add('learned');
                cardButton.innerHTML = '✅';
            } else {
                cardButton.classList.remove('learned');
                cardButton.innerHTML = '⭕';
            }
        }

        const learnedCount = vocab.filter(w => w.learned).length;
        const learnedEl = document.getElementById('learned');
        if (learnedEl) learnedEl.textContent = learnedCount;

        status(`${word.learned ? '✅ Đã học' : '⭕ Chưa học'}: ${word.chinese}`, 'success');
    }
};

// ==================== STROKE ORDER ====================

let currentWriters = [];
let currentStrokeWord = null;

window.showStrokeOrder = function (chinese) {
    const word = vocab.find(w => w.chinese === chinese);
    currentStrokeWord = word;

    const modal = document.getElementById('stroke-modal');
    const container = document.getElementById('stroke-container');
    if (!modal || !container) return;

    container.innerHTML = '';
    currentWriters = [];

    document.getElementById('stroke-chinese').textContent = chinese;
    document.getElementById('stroke-pinyin').textContent = word ? word.pinyin : '';
    document.getElementById('stroke-meaning').textContent = word ? word.vietnamese : '';

    const chars = chinese.split('');
    chars.forEach((char) => {
        const div = document.createElement('div');
        div.className = 'stroke-char';
        container.appendChild(div);

        if (typeof HanziWriter !== 'undefined') {
            const writer = HanziWriter.create(div, char, {
                width: 200, height: 200, padding: 5, showOutline: true,
                strokeAnimationSpeed: 1, delayBetweenStrokes: 100
            });
            currentWriters.push(writer);
        }
    });

    modal.classList.add('show');
    if (currentWriters.length > 0) {
        setTimeout(() => animateWritersSequentially(currentWriters, 0, false), 300);
    }
};

function animateWritersSequentially(writers, index, loop = false) {
    if (index >= writers.length) {
        if (loop) setTimeout(() => animateWritersSequentially(writers, 0, true), 2000);
        return;
    }
    writers[index].animateCharacter({
        onComplete: () => setTimeout(() => animateWritersSequentially(writers, index + 1, loop), 500)
    });
}

window.replayStrokeAnimation = function () {
    if (currentWriters.length > 0) {
        currentWriters.forEach(writer => writer.hideCharacter());
        setTimeout(() => animateWritersSequentially(currentWriters, 0, false), 100);
    }
};

window.startPracticeMode = function () {
    if (currentWriters.length > 0) {
        currentWriters.forEach(writer => writer.quiz());
        status('✍️ Bắt đầu tập viết!', 'success');
    }
};

window.closeStrokeModal = function () {
    const modal = document.getElementById('stroke-modal');
    if (modal) modal.classList.remove('show');
    currentWriters = [];
};

// ==================== FLASHCARDS ====================

window.updateFlashcards = function () {
    const container = document.getElementById('fc-container');
    if (!container) return;

    const availableWords = vocab.filter(v => !v.learned);
    if (availableWords.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#666;">📚 Không có từ nào để ôn tập!</p>';
        return;
    }

    const numCards = Math.min(6, availableWords.length);
    currentFlashcards = [];
    const availableIndices = availableWords.map((_, idx) => idx).filter(idx => !usedFlashcardIndices.has(idx));

    if (availableIndices.length < numCards) {
        usedFlashcardIndices.clear();
        availableIndices.push(...availableWords.map((_, idx) => idx));
    }

    for (let i = 0; i < numCards; i++) {
        const randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        currentFlashcards.push(availableWords[randomIdx]);
        usedFlashcardIndices.add(randomIdx);
        availableIndices.splice(availableIndices.indexOf(randomIdx), 1);
    }

    container.innerHTML = currentFlashcards.map((word, idx) => `
        <div class="fc" id="fc-${idx}" onclick="revealFlashcard(${idx})">
            <div class="fc-chinese">${word.chinese}</div>
            <div class="fc-pinyin">${word.pinyin}</div>
            <div class="fc-viet" id="fc-viet-${idx}">${word.vietnamese}</div>
        </div>
    `).join('');
};

window.revealFlashcard = function (idx) {
    const card = document.getElementById(`fc-${idx}`);
    const viet = document.getElementById(`fc-viet-${idx}`);
    if (!card || !viet) return;

    if (viet.style.display === 'block') {
        viet.style.display = 'none';
        card.classList.remove('showing-answer');
    } else {
        viet.style.display = 'block';
        card.classList.add('showing-answer');
        speak(currentFlashcards[idx].chinese);
    }
};

window.groupsFilter = '';

// ==================== WORD GROUPS ====================

window.renderGroups = function () {
    const listDiv = document.getElementById('groups-list');
    const filtersDiv = document.getElementById('groups-filters');
    if (!listDiv || !filtersDiv) return;

    const topics = [...new Set(vocab.map(w => w.topic))];

    // 1. Calculate the initial maps to populate character dropdown (filtered by topic)
    let vocabForDropdown = groupsTopicFilter ? vocab.filter(w => w.topic === groupsTopicFilter) : vocab;
    const charsMapForDropdown = {};
    vocabForDropdown.forEach(item => {
        const chars = [...new Set(item.chinese.split(''))];
        chars.forEach(char => {
            if (/[\u4e00-\u9fa5]/.test(char)) {
                if (!charsMapForDropdown[char]) charsMapForDropdown[char] = [];
                charsMapForDropdown[char].push(item);
            }
        });
    });

    const recurringGroupsList = Object.entries(charsMapForDropdown)
        .filter(([_, words]) => words.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

    // Render filters
    filtersDiv.innerHTML = `
        <div class="filters-container">
            <div class="filter-group">
                <label>📁 Chủ đề:</label>
                <select class="select-field" onchange="window.filterGroupsTopic(this.value)">
                    <option value="">Tất cả chủ đề</option>
                    ${topics.map(t => `<option value="${t}" ${groupsTopicFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>🔠 Chữ Hán:</label>
                <select class="select-field" onchange="window.filterGroupsChar(this.value)">
                    <option value="">Tất cả (${recurringGroupsList.length} chữ)</option>
                    ${recurringGroupsList.map(([c, words]) => {
        return `<option value="${c}" ${groupsFilter === c ? 'selected' : ''}>${c} (${words.length} từ)</option>`;
    }).join('')}
                </select>
            </div>
        </div>
    `;

    // 2. Determine groups to display
    let recurringGroups = groupsFilter
        ? recurringGroupsList.filter(([char]) => char === groupsFilter)
        : recurringGroupsList;

    // Filter by search term
    if (groupsSearchTerm) {
        recurringGroups = recurringGroups.filter(([char, words]) =>
            char.includes(groupsSearchTerm) ||
            words.some(w =>
                w.chinese.includes(groupsSearchTerm) ||
                w.vietnamese.toLowerCase().includes(groupsSearchTerm.toLowerCase()) ||
                w.pinyin.toLowerCase().includes(groupsSearchTerm.toLowerCase())
            )
        );
    }

    // Sort by frequency
    recurringGroups.sort((a, b) => b[1].length - a[1].length);

    if (recurringGroups.length === 0) {
        listDiv.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--g6)">Chưa có đủ từ vựng để tạo nhóm (cần ít nhất 2 từ có chung chữ hán)</div>';
        return;
    }

    listDiv.innerHTML = recurringGroups.map(([char, words]) => `
        <div class="group-card">
            <div class="group-header">
                <div class="group-char-circle" onclick="showStrokeOrder('${char}')">${char}</div>
                <div class="group-info">
                    <div class="group-count">Xuất hiện trong ${words.length} từ</div>
                </div>
            </div>
            <div class="group-words-list">
                ${words.map(w => `
                    <div class="group-word-item">
                        <div>
                            <span class="group-word-text">${w.chinese}</span>
                            <span style="font-size:0.85rem; color:var(--g6); margin-left:8px">${w.vietnamese}</span>
                        </div>
                        <span class="group-word-pinyin">${w.pinyin}</span>
                    </div>
                `).join('')}
            </div>
        </div >
        `).join('');
};

window.filterGroupsChar = function (char) {
    groupsFilter = char;
    renderGroups();
};

window.filterGroupsTopic = function (topic) {
    groupsTopicFilter = topic;
    groupsFilter = ''; // Reset character filter when topic changes
    renderGroups();
};

// ==================== SENTENCES ====================

function extractWordsFromSentence(chineseSentence) {
    const words = [];
    const sortedVocab = vocab.map(v => v.chinese).sort((a, b) => b.length - a.length);
    let position = 0;

    while (position < chineseSentence.length) {
        let matched = false;
        for (const vocabWord of sortedVocab) {
            if (chineseSentence.startsWith(vocabWord, position)) {
                words.push(vocabWord);
                position += vocabWord.length;
                matched = true;
                break;
            }
        }
        if (!matched) position++;
    }
    return words;
}

async function loadSentenceTemplates() {
    const sheetsUrl = localStorage.getItem('sheets-url');
    if (sheetsUrl) {
        try {
            const sheetId = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
            if (sheetId) {
                const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1`;
                const response = await fetch(csvUrl);
                if (response.ok) {
                    const csv = await response.text();
                    const lines = csv.split(/\r?\n/).filter(l => l.trim()).slice(1);
                    if (lines.length > 0) {
                        sentenceTemplates = lines.map(line => {
                            const row = parseCSVLine(line);
                            if (row.length >= 3) {
                                return {
                                    chinese: row[0]?.trim(),
                                    pinyin: row[1]?.trim(),
                                    vietnamese: row[2]?.trim(),
                                    words: row[3]?.trim()?.split(',')?.map(w => w.trim()) || []
                                };
                            }
                        }).filter(s => s && s.chinese);
                        console.log(`✅ Loaded ${sentenceTemplates.length} sentences from Sheets`);
                        return;
                    }
                }
            }
        } catch (e) { console.warn('⚠️ Sheets sentences load failed:', e); }
    }

    // Default templates
    sentenceTemplates = [
        { chinese: '我每天早上喝咖啡', pinyin: 'wǒ měi tiān zǎo shang hē kā fēi', vietnamese: 'Tôi uống cà phê mỗi sáng' },
        { chinese: '我爸爸 là 医生', pinyin: 'wǒ bà ba shì yī shēng', vietnamese: 'Bố tôi là bác sĩ' },
        { chinese: '我妈妈 là 漂亮', pinyin: 'wǒ mā ma hěn piào liang', vietnamese: 'Mẹ tôi rất đẹp' },
        { chinese: '我喜欢吃中国菜', pinyin: 'wǒ xǐ huan chī zhōng guó cài', vietnamese: 'Tôi thích ăn đồ Trung Quốc' }
    ].map(s => ({ ...s, words: [] }));
}

window.generateSentences = function () {
    const learnedWords = vocab.filter(v => v.learned);
    if (learnedWords.length < 2) {
        status('⚠️ Bạn cần học ít nhất 2 từ!', 'error');
        return;
    }

    const learnedChineseSet = new Set(learnedWords.map(w => w.chinese));
    const matchedSentences = sentenceTemplates
        .map(template => {
            let wordsToMatch = template.words.length ? template.words : extractWordsFromSentence(template.chinese);
            const matchedWords = wordsToMatch.filter(w => learnedChineseSet.has(w));
            return { ...template, matchedWords, matchCount: matchedWords.length };
        })
        .filter(s => s.matchCount >= 2)
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 10);

    renderSentencesResult(matchedSentences);
};

window.renderSentences = function () {
    const learnedEl = document.getElementById('sentences-learned-count');
    const totalEl = document.getElementById('sentences-total-count');
    if (learnedEl) learnedEl.textContent = vocab.filter(v => v.learned).length;
    if (totalEl) totalEl.textContent = sentenceTemplates.length;
};

function renderSentencesResult(sentences) {
    const container = document.getElementById('sentences-list');
    if (!container) return;
    if (sentences.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;"><p>Chưa có mẫu câu phù hợp (cần học thêm từ).</p></div>';
        return;
    }
    container.innerHTML = sentences.map(s => `
        <div class="sentence-item">
            <div class="sentence-chinese">${s.chinese}</div>
            <div class="sentence-pinyin">${s.pinyin}</div>
            <div class="sentence-viet">${s.vietnamese}</div>
            <div>
                <span class="sentence-badge">${s.matchCount} từ đã học</span>
                <button class="btn" style="float:right;padding:6px 12px;font-size:0.85rem;" onclick="speak('${s.chinese}')">🔊</button>
            </div>
        </div>
    `).join('');
}

// ==================== ADD WORD ====================

window.addWord = function () {
    const viet = document.getElementById('new-viet').value.trim();
    const chinese = document.getElementById('new-chinese').value.trim();
    let pinyin = document.getElementById('new-pinyin').value.trim();
    const topic = document.getElementById('new-topic').value;
    const difficulty = document.getElementById('new-difficulty').value;

    if (!viet || !chinese) { status('⚠️ Nhập đầy đủ thông tin!', 'error'); return; }
    if (!pinyin) pinyin = generatePinyin(chinese);

    vocab.push({
        id: Date.now(), vietnamese: viet, chinese, pinyin, meaning: viet,
        topic, difficulty, learned: false, nextReview: Date.now(), reviewCount: 0
    });

    save();
    document.getElementById('new-viet').value = '';
    document.getElementById('new-chinese').value = '';
    document.getElementById('new-pinyin').value = '';

    status(`✅ Đã thêm: ${chinese}`, 'success');
    renderLibrary();
};

// ==================== CONFIG & SYNC ====================

function updateConfig() {
    const fields = {
        'sheets-url': 'sheets-url',
        'github-token': 'github-token',
        'github-repo': 'github-repo',
        'github-file': 'github-file',
        'vocab-json-url': 'vocab-json-url',
        'sync-strategy': 'sync-strategy'
    };

    Object.entries(fields).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.value = localStorage.getItem(key) || (id === 'github-file' ? 'data/vocab.json' : '');
    });

    const lastSyncEl = document.getElementById('last-sync-time');
    if (lastSyncEl) lastSyncEl.textContent = localStorage.getItem('last-sync-time') || 'Chưa sync';
}

window.saveConfig = function () {
    localStorage.setItem('sheets-url', document.getElementById('sheets-url').value.trim());
    status('💾 Đã lưu cấu hình!', 'success');
};

window.saveSyncStrategy = function () {
    localStorage.setItem('sync-strategy', document.getElementById('sync-strategy').value);
    status('💾 Đã lưu sync strategy!', 'success');
};

window.saveGitHubConfig = function () {
    const keys = ['github-token', 'github-repo', 'github-file', 'vocab-json-url'];
    keys.forEach(key => localStorage.setItem(key, document.getElementById(key).value.trim()));
    status('💾 Đã lưu GitHub config!', 'success');
};

function updateLastSyncTime() {
    const now = new Date().toLocaleString('vi-VN');
    localStorage.setItem('last-sync-time', now);
    const el = document.getElementById('last-sync-time');
    if (el) el.textContent = now;
}

function parseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else current += char;
    }
    result.push(current);
    return result;
}

async function syncFromSheets(isBackground = false) {
    const sheetsUrl = localStorage.getItem('sheets-url');
    if (!sheetsUrl) {
        if (!isBackground) status('⚠️ Chưa cấu hình Google Sheets!', 'error');
        return false;
    }

    if (!isBackground) showLoading('Đang đồng bộ...', 'Vui lòng chờ...');

    try {
        const sheetId = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (!sheetId) throw new Error('Cấu hình URL không hợp lệ');
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        const response = await fetchWithTimeout(csvUrl, {}, 8000);
        if (!response.ok) throw new Error('Không thể kết nối tới Google Sheets');

        const csv = await response.text();
        const lines = csv.split(/\r?\n/).filter(l => l.trim());
        if (lines.length <= 1) throw new Error('Dữ liệu trống');

        const newVocab = [];
        lines.slice(1).forEach((line, idx) => {
            const row = parseCSVLine(line);
            if (row.length >= 4) {
                const chinese = row[0]?.trim();
                if (chinese && !newVocab.some(v => v.chinese === chinese)) {
                    newVocab.push({
                        id: Date.now() + idx,
                        vietnamese: row[3]?.trim() || chinese,
                        chinese,
                        pinyin: row[2]?.trim() || generatePinyin(chinese),
                        meaning: row[3]?.trim() || chinese,
                        topic: row[4]?.trim() || 'Sheet',
                        difficulty: row[5]?.trim() || 'easy',
                        learned: row[6]?.toLowerCase() === 'true' || row[6] === '1',
                        nextReview: Date.now(), reviewCount: 0
                    });
                }
            }
        });

        vocab = newVocab;
        save();
        updateLastSyncTime();
        if (!isBackground) {
            hideLoading();
            status(`✅ Đã đồng bộ ${vocab.length} từ!`, 'success');
        }
        renderLibrary();
        return true;
    } catch (e) {
        console.warn('⚠️ Google Sheets sync failed:', e.message);
        if (!isBackground) {
            hideLoading();
            status(`❌ Lỗi: ${e.message}`, 'error');
        }
        return false;
    }
}

async function syncFromGitHubFallback() {
    const vocabJsonUrl = localStorage.getItem('vocab-json-url');
    const githubRepo = localStorage.getItem('github-repo');
    const githubFile = localStorage.getItem('github-file') || 'data/vocab.json';
    const fallbackUrl = vocabJsonUrl || (githubRepo ? `https://raw.githubusercontent.com/${githubRepo}/main/${githubFile}` : null);

    if (!fallbackUrl) return false;

    console.log('🔄 Attempting fallback: Loading from GitHub...');
    try {
        const response = await fetchWithTimeout(fallbackUrl, {}, 5000);
        if (response.ok) {
            const data = await response.json();
            const vocabData = Array.isArray(data) ? data : data.vocab;
            if (vocabData && vocabData.length > 0) {
                vocab = vocabData;
                save();
                renderLibrary();
                return true;
            }
        }
    } catch (e) { console.error('⚠️ GitHub fallback failed:', e.message); }
    return false;
}

window.syncToGitHub = async function () {
    const token = localStorage.getItem('github-token');
    const repo = localStorage.getItem('github-repo');
    const file = localStorage.getItem('github-file');

    if (!token || !repo || !file) { status('⚠️ Chưa cấu hình GitHub!', 'error'); return; }
    showLoading('Đang đẩy lên GitHub...', 'Vui lòng chờ...');

    try {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(vocab, null, 2))));
        let sha = null;
        try {
            const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file}`, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (getRes.ok) sha = (await getRes.json()).sha;
        } catch (e) { }

        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${file}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Update vocab - ${new Date().toISOString()}`, content, ...(sha && { sha }) })
        });

        if (res.ok) { hideLoading(); status('✅ Đã đẩy lên GitHub!', 'success'); }
        else throw new Error((await res.json()).message || 'GitHub error');
    } catch (e) { hideLoading(); status(`❌ Lỗi: ${e.message}`, 'error'); }
};

window.exportData = function () {
    const dataStr = JSON.stringify(vocab, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vocab-${Date.now()}.json`; a.click();
    status('📥 Đã xuất dữ liệu!', 'success');
};

window.importData = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            const vocabData = Array.isArray(imported) ? imported : imported.vocab;
            if (vocabData && vocabData.length > 0) {
                vocab = vocabData; save(); renderLibrary(); status(`📤 Đã nhập ${vocab.length} từ!`, 'success');
            } else throw new Error('No vocab data found');
        } catch (err) { status(`❌ File không hợp lệ: ${err.message}`, 'error'); }
    };
    reader.readAsText(file);
};

window.confirmClearData = function () {
    if (confirm('🗑️ XÓA TẤT CẢ dữ liệu?')) {
        vocab = []; save(); renderLibrary(); status('🗑️ Đã xóa!', 'success');
    }
};

// ==================== INITIALIZATION (OPTIMIZED) ====================

async function init() {
    // 1. Load local data immediately for instant display
    load();
    loadHideLearnedState();
    if (vocab.length === 0) {
        vocab = [
            { id: 1, vietnamese: 'xin chào', chinese: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', topic: 'Cơ bản', difficulty: 'easy', learned: false, nextReview: Date.now(), reviewCount: 0 },
            { id: 2, vietnamese: 'cảm ơn', chinese: '谢谢', pinyin: 'xiè xiè', meaning: 'thank you', topic: 'Cơ bản', difficulty: 'easy', learned: false, nextReview: Date.now(), reviewCount: 0 }
        ];
    }
    renderLibrary();
    updateConfig();

    // 2. Start all async tasks in parallel without blocking UI
    console.log('🚀 Loading remote data in background...');

    // Config and Templates can run in parallel
    const setupTasks = [
        loadConfigFromGitHub(),
        loadSentenceTemplates().then(() => renderSentences())
    ];

    // Synchronization logic
    const syncAndFallback = async () => {
        const syncStrategy = localStorage.getItem('sync-strategy') || 'sheets-first';
        if (syncStrategy === 'sheets-first') {
            const success = await syncFromSheets(true); // true = silent background sync
            if (!success) {
                await syncFromGitHubFallback();
            }
            // Final UI update
            renderLibrary();
        }
    };

    setupTasks.push(syncAndFallback());

    // Add search listener
    const searchInput = document.getElementById('lib-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            renderLibrary();
        });
    }

    const groupsSearchInput = document.getElementById('groups-search');
    if (groupsSearchInput) {
        groupsSearchInput.addEventListener('input', (e) => {
            groupsSearchTerm = e.target.value;
            renderGroups();
        });
    }

    await Promise.allSettled(setupTasks);
    console.log('✅ Initialization complete');
}

document.addEventListener('DOMContentLoaded', init);
