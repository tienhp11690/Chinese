// ==================== GLOBAL STATE ====================
let vocab = [];
let currentFilter = '';
let searchTerm = '';
let hideLearnedWords = false;
let groupsSearchTerm = '';
let groupsFilter = '';
let groupsTopicFilter = '';

// Shared Hanzi Map
let charToWordsMap = {};

// Flashcard state
let usedFlashcardIndices = new Set();
let currentFlashcards = [];
let flashcardIncludeLearned = false;

// Sentence templates
let sentenceTemplates = [];

// Config URL - Updated to include fallback logic
const CONFIG_URL = 'https://raw.githubusercontent.com/tienhp11690/Chinese/main/config.json';

const DEFAULT_CONFIG = {
    "projectGithubUrl": "https://github.com/tienhp11690/Chinese",
    "sheetsUrl": "https://docs.google.com/spreadsheets/d/1b0rr7I0Z1gVc9o4pR8-0RpWC-pdtNwjasD_hEZ2Wuxw/edit",
    "sheetsSentencesGid": "681747827",
    "githubToken": "",
    "githubRepo": "tienhp11690/Chinese",
    "githubFile": "vocab.json",
    "vocabJsonUrl": "https://raw.githubusercontent.com/tienhp11690/Chinese/main/vocab.json",
    "syncStrategy": "sheets-first"
};

// ==================== HELPER FUNCTIONS ====================

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Kiểm tra kết nối thất bại sau ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([fetch(url, options), timeoutPromise]);
}

function removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ==================== AUTO-LOAD CONFIG FROM GITHUB ====================

function applyConfigFromData(configData, force = false) {
    if (!configData) return;
    const keys = ['sheets-url', 'sheets-sentences-gid', 'github-token', 'github-repo', 'github-file', 'vocab-json-url', 'sync-strategy'];
    let applied = false;

    keys.forEach(key => {
        const configKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        // Trigger if force is true OR if local storage is missing
        if ((force || !localStorage.getItem(key)) && configData[configKey]) {
            localStorage.setItem(key, configData[configKey]);
            console.log(`📥 Auto-filled: ${key} (Force: ${force})`);
            applied = true;
        }
    });

    if (applied) {
        console.log('✅ Config applied successfully');
        if (typeof updateConfig === 'function') updateConfig();
    }
}

async function loadConfig() {
    // 1. Initial defaults (don't overwrite user changes)
    applyConfigFromData(DEFAULT_CONFIG, false);

    // 2. Try to load local config.json (High Priority - Overwrites if found)
    try {
        const response = await fetch('./config.json');
        if (response.ok) {
            const data = await response.json();
            if (data.defaultConfig) {
                console.log('🔧 Loading local config.json...');
                applyConfigFromData(data.defaultConfig, true); // Force apply
                status('✅ Đã load cấu hình từ config.json', 'success');
            } else {
                console.warn('⚠️ config.json missing defaultConfig');
            }
        } else {
            console.warn('⚠️ config.json fetch failed:', response.status);
        }
    } catch (e) {
        console.log('ℹ️ No local config.json found or invalid');
        // status('⚠️ Không tìm thấy config.json local', 'error'); // Optional: notify user
    }

    // 3. GitHub Auto-Config (Fallback)
    if (CONFIG_URL.includes('yourusername')) {
        console.log('⚠️ CONFIG_URL not configured. Skipping remote auto-load config.');
        return;
    }

    try {
        console.log('🔧 Loading config from GitHub:', CONFIG_URL);
        const response = await fetchWithTimeout(CONFIG_URL, {}, 3000);

        if (response.ok) {
            const config = await response.json();
            // Don't force overwrite from GitHub, only fill missing
            applyConfigFromData(config.defaultConfig, false);
        }
    } catch (e) {
        console.warn('⚠️ Could not load config from GitHub:', e.message);
    }
}

// ==================== BUILT-IN PINYIN DICTIONARY ====================
const BUILTIN_PINYIN_DICT = {
    // Weather & Nature
    '晴朗': 'qíng lǎng',
    '阳光': 'yáng guāng',
    '明媚': 'míng mèi',
    '天气': 'tiān qì',
    '今天': 'jīn tiān',
    '明天': 'míng tiān',
    '昨天': 'zuó tiān',
    '晴天': 'qíng tiān',
    '阴天': 'yīn tiān',
    '下雨': 'xià yǔ',
    '下雪': 'xià xuě',
    '刮风': 'guā fēng',
    '太阳': 'tài yáng',
    '月亮': 'yuè liang',
    '星星': 'xīng xing',
    '天空': 'tiān kōng',
    '空气': 'kōng qì',
    '春天': 'chūn tiān',
    '夏天': 'xià tiān',
    '秋天': 'qiū tiān',
    '冬天': 'dōng tiān',
    '热': 'rè',
    '冷': 'lěng',
    '暖和': 'nuǎn huo',
    '凉快': 'liáng kuai',

    // Modifiers & Actions
    '非常': 'fēi cháng',
    '特别': 'tè bié',
    '十分': 'shí fēn',
    '出门': 'chū mén',
    '心情': 'xīn qíng',
    '舒畅': 'shū chàng',
    '路上': 'lù shang',
    '碰见': 'pèng jiàn',
    '遇到': 'yù dào',
    '相遇': 'xiāng yù',
    '互相': 'hù xiāng',
    '问好': 'wèn hǎo',
    '打招呼': 'dǎ zhāo hu',
    '安静': 'ān jìng',
    '享用': 'xiǎng yòng',
    '品尝': 'pǐn cháng',
    '味道': 'wèi dào',
    '打算': 'dǎ suàn',
    '不久': 'bù jiǔ',
    '探索': 'tàn suǒ',
    '地方': 'dì fang',
    '有趣': 'yǒu qù',
    '有意思': 'yǒu yì si',
    '接触': 'jiē chù',
    '快乐': 'kuài lè',
    '高兴': 'gāo xìng',
    '开心': 'kāi xīn',
    '充实': 'chōng shí',
    '意义': 'yì yì',
    '充满': 'chōng mǎn',
    '期待': 'qī dài',
    '聊天': 'liáo tiān',
    '谈到': 'tán dào',
    '收获': 'shōu huò',
    '愉快': 'yú kuài',
    '祝': 'zhù',
    '决定': 'jué dìng',
    '继续': 'jì xù',
    '约定': 'yuē dìng',
    '下次': 'xià cì',
    '常常': 'cháng cháng',
    '平时': 'píng shí',
    '生活': 'shēng huó',
    '工作': 'gōng zuò',
    '学习': 'xué xí',
    '复习': 'fù xí',
    '练习': 'liàn xí',

    // People & Relations
    '小明': 'xiǎo míng',
    '小华': 'xiǎo huá',
    '玛丽': 'mǎ lì',
    '刘明': 'liú míng',
    '朋友': 'péng you',
    '好朋友': 'hǎo péng you',
    '大家': 'dà jiā',
    '他们': 'tā men',
    '我们': 'wǒ men',
    '人们': 'rén men',
    '老师': 'lǎo shī',
    '学生': 'xué sheng',
    '留学生': 'liú xué shēng',
    '医生': 'yī shēng',
    '爸爸': 'bà ba',
    '妈妈': 'mā ma',
    '哥哥': 'gē ge',
    '姐姐': 'jiě jie',
    '弟弟': 'dì di',
    '妹妹': 'mèi mei',
    '家人': 'jiā rén',
    '家庭': 'jiā tíng',

    // Food & Dining
    '咖啡': 'kā fēi',
    '咖啡馆': 'kā fēi guǎn',
    '茶': 'chá',
    '中国茶': 'zhōng guó chá',
    '绿茶': 'lǜ chá',
    '红茶': 'hóng chá',
    '茶馆': 'chá guǎn',
    '喝': 'hē',
    '吃': 'chī',
    '水': 'shuǐ',
    '米饭': 'mǐ fàn',
    '菜': 'cài',
    '中国菜': 'zhōng guó cài',
    '好喝': 'hǎo hē',
    '好吃': 'hǎo chī',
    '饭馆': 'fàn guǎn',
    '苹果': 'píng guǒ',
    '水果': 'shuǐ guǒ',
    '面包': 'miàn bāo',
    '包子': 'bāo zi',

    // Time & Frequency
    '现在': 'xiàn zài',
    '早上': 'zǎo shang',
    '上午': 'shàng wǔ',
    '中午': 'zhōng wǔ',
    '下午': 'xià wǔ',
    '晚上': 'wǎn shang',
    '周末': 'zhōu mò',
    '星期': 'xīng qī',
    '星期天': 'xīng qī tiān',
    '点': 'diǎn',
    '分': 'fēn',
    '年': 'nián',
    '月': 'yuè',
    '日': 'rì',
    '每天': 'měi tiān',
    '一年': 'yī nián',
    '多长时间': 'duō cháng shí jiān',
    '时候': 'shí hou',
    '有时候': 'yǒu shí hou',

    // Places & Verbs
    '去': 'qù',
    '来': 'lái',
    '回': 'huí',
    '走': 'zǒu',
    '旅游': 'lǚ yóu',
    '旅行': 'lǚ xíng',
    '风景': 'fēng jǐng',
    '中国': 'zhōng guó',
    '北京': 'běi jīng',
    '上海': 'shàng hǎi',
    '美国': 'měi guó',
    '加拿大': 'jiā ná dà',
    '家': 'jiā',
    '学校': 'xué xiào',
    '公司': 'gōng sī',
    '商店': 'shāng diàn',
    '超市': 'chāo shì',
    '公园': 'gōng yuán',
    '路': 'lù',
    '喜欢': 'xǐ huan',
    '爱': 'ài',
    '想': 'xiǎng',
    '看': 'kàn',
    '听': 'tīng',
    '说': 'shuō',
    '写': 'xiě',
    '买': 'mǎi',
    '卖': 'mài',
    '坐': 'zuò',
    '叫': 'jiào',
    '姓': 'xìng',
    '是': 'shì',
    '有': 'yǒu',
    '没有': 'méi yǒu',
    '认识': 'rèn shi',
    '知道': 'zhī dào',
    '觉得': 'jué de',
    '认为': 'rèn wéi',
    '懂': 'dǒng',
    '好': 'hǎo',
    '多': 'duō',
    '少': 'shǎo',
    '大': 'dà',
    '小': 'xiǎo',
    '快': 'kuài',
    '慢': 'màn',
    '新': 'xīn',
    '旧': 'jiù',
    '贵': 'guì',
    '便宜': 'pián yi',
    '漂亮': 'piào liang',
    '美丽': 'měi lì',
    '容易': 'róng yì',
    '难': 'nán',
    '累': 'lèi',
    '你': 'nǐ',
    '我': 'wǒ',
    '他': 'tā',
    '她': 'tā',
    '您': 'nín',
    '什么': 'shén me',
    '哪': 'nǎ',
    '哪里': 'nǎ li',
    '谁': 'shéi',
    '多少': 'duō shao',
    '几': 'jǐ',

    // Characters
    '阳': 'yáng',
    '光': 'guāng',
    '晴': 'qíng',
    '朗': 'lǎng',
    '明': 'míng',
    '媚': 'mèi',
    '天': 'tiān',
    '气': 'qì',
    '非': 'fēi',
    '常': 'cháng'
};

// ==================== CORE FUNCTIONS ====================

function generatePinyin(chinese) {
    if (!chinese) return '';

    // 1. Check built-in pinyin dictionary first (fastest & 100% reliable)
    if (typeof BUILTIN_PINYIN_DICT !== 'undefined' && BUILTIN_PINYIN_DICT[chinese]) {
        return BUILTIN_PINYIN_DICT[chinese];
    }

    // 2. Check pinyinPro library
    const pPro = (typeof window !== 'undefined' && window.pinyinPro) ? window.pinyinPro : (typeof pinyinPro !== 'undefined' ? pinyinPro : null);
    if (pPro && typeof pPro.pinyin === 'function') {
        try {
            const res = pPro.pinyin(chinese, { toneType: 'symbol' });
            if (typeof res === 'string' && res.trim() && res !== chinese) {
                return res.trim();
            }
            if (Array.isArray(res) && res.length > 0) {
                return res.join(' ');
            }
        } catch (e) {
            console.warn('pinyinPro error:', e);
        }
    }

    // 3. Fallback: character-by-character from BUILTIN_PINYIN_DICT
    if (typeof BUILTIN_PINYIN_DICT !== 'undefined') {
        const parts = chinese.split('').map(c => BUILTIN_PINYIN_DICT[c] || '').filter(Boolean);
        if (parts.length === chinese.length && parts.length > 0) {
            return parts.join(' ');
        }
    }

    // 4. Fallback: check vocab
    if (typeof vocab !== 'undefined' && Array.isArray(vocab)) {
        const found = vocab.find(v => v.chinese === chinese);
        if (found && found.pinyin && found.pinyin !== chinese) {
            return found.pinyin;
        }
    }

    return '';
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
            let updated = false;
            vocab.forEach(w => {
                if (w.chinese && (!w.pinyin || w.pinyin === w.chinese)) {
                    const generated = generatePinyin(w.chinese);
                    if (generated && generated !== w.chinese) {
                        w.pinyin = generated;
                        updated = true;
                    }
                }
            });
            if (updated) {
                save();
            }
            buildCharMap();
        } catch (e) {
            vocab = [];
        }
    }
}

function buildCharMap() {
    charToWordsMap = {};
    vocab.forEach(word => {
        // Get unique hanzi characters from the word
        const chars = [...new Set(word.chinese.split(''))];
        chars.forEach(char => {
            // Filter only valid Chinese characters (basic range)
            if (/[\u4e00-\u9fa5]/.test(char)) {
                if (!charToWordsMap[char]) {
                    charToWordsMap[char] = [];
                }
                charToWordsMap[char].push(word);
            }
        });
    });
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
    if (page === 'stories') renderStoriesTab();
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

        const normSearch = removeAccents(searchTerm);
        const matchSearch = !searchTerm ||
            w.chinese.includes(searchTerm) ||
            removeAccents(w.vietnamese).includes(normSearch) ||
            removeAccents(w.pinyin).includes(normSearch) ||
            (w.meaning && removeAccents(w.meaning).includes(normSearch));

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

    listDiv.innerHTML = filtered.map(w => {
        // Calculate shared words
        let relatedWordsCount = 0;
        const chars = [...new Set(w.chinese.split(''))];
        const relatedSet = new Set();

        chars.forEach(char => {
            if (charToWordsMap[char]) {
                charToWordsMap[char].forEach(relatedWord => {
                    if (relatedWord.id !== w.id) {
                        relatedSet.add(relatedWord.id);
                    }
                });
            }
        });
        relatedWordsCount = relatedSet.size;

        return `
        <div class="card">
            <span class="badge ${w.difficulty}">${w.difficulty}</span>
            <div class="card-content">
                <div style="font-size:1.5rem;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px">
                    ${w.chinese}
                    ${relatedWordsCount > 0 ?
                `<span class="shared-badge" onclick="event.stopPropagation(); showSharedWords(${w.id})" title="Có ${relatedWordsCount} từ vựng khác dùng chung chữ Hán nãy">🔗 ${relatedWordsCount}</span>`
                : ''}
                </div>
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
    `;
    }).join('');
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

// ==================== SHARED WORD MODAL ====================

window.showSharedWords = function (id) {
    const word = vocab.find(w => w.id === id);
    if (!word) return;

    const modal = document.getElementById('shared-modal');
    const list = document.getElementById('shared-list');
    if (!modal || !list) return;

    const chars = [...new Set(word.chinese.split(''))];
    let html = '';
    let hasShared = false;

    chars.forEach(char => {
        if (!/[\u4e00-\u9fa5]/.test(char)) return;

        const related = charToWordsMap[char] ? charToWordsMap[char].filter(w => w.id !== id) : [];
        if (related.length > 0) {
            hasShared = true;
            html += `
                <div class="shared-group-container">
                    <div class="shared-char-header">
                        <div class="shared-char">${char}</div>
                        <div class="shared-char-count">Xuất hiện trong ${related.length} từ khác</div>
                    </div>
                    <div class="shared-words-grid">
                        ${related.map(w => `
                            <div class="shared-word-chip" title="${w.vietnamese}">
                                <div style="font-weight:600">${w.chinese}</div>
                                <div style="font-size:0.75rem;color:var(--p)">${w.pinyin}</div>
                                <div style="font-size:0.8rem;color:var(--g6);margin-top:2px">${w.vietnamese || w.meaning || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    if (!hasShared) {
        html = '<p style="color:var(--g6);text-align:center">Không có từ vựng nào khác chia sẻ chữ Hán với từ này.</p>';
    }

    list.innerHTML = html;
    modal.classList.add('show');
};

window.closeSharedModal = function () {
    const modal = document.getElementById('shared-modal');
    if (modal) modal.classList.remove('show');
};

// ==================== FLASHCARDS ====================

window.toggleFlashcardIncludeLearned = function () {
    flashcardIncludeLearned = !flashcardIncludeLearned;
    const toggle = document.getElementById('fc-include-learned-toggle');
    if (toggle) {
        if (flashcardIncludeLearned) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
    updateFlashcards();
};

window.updateFlashcards = function () {
    const container = document.getElementById('fc-container');
    if (!container) return;

    // Filter available words based on toggle
    const availableWords = vocab.filter(v => flashcardIncludeLearned || !v.learned);

    if (availableWords.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;background:var(--g1);border-radius:16px;border:2px dashed var(--g2)">
                <p style="color:var(--g6);margin-bottom:12px">📚 Không có từ nào để ôn tập!</p>
                <button class="btn" onclick="toggleFlashcardIncludeLearned()">Ôn cả từ đã thuộc</button>
            </div>
        `;
        return;
    }

    const numCards = Math.min(6, availableWords.length);
    currentFlashcards = [];

    // Reset used indices if we don't have enough fresh ones
    let availableIndices = availableWords.map((_, idx) => idx).filter(idx => !usedFlashcardIndices.has(idx));

    if (availableIndices.length < numCards) {
        usedFlashcardIndices.clear();
        availableIndices = availableWords.map((_, idx) => idx);
    }

    // Pick random items
    for (let i = 0; i < numCards; i++) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const vocabIndex = availableIndices[randomIndex];
        currentFlashcards.push(availableWords[vocabIndex]);
        usedFlashcardIndices.add(vocabIndex);
        availableIndices.splice(randomIndex, 1);
    }

    container.innerHTML = currentFlashcards.map((word, idx) => `
        <div class="fc" id="fc-${idx}" onclick="revealFlashcard(${idx})">
            <div class="fc-chinese">${word.chinese}</div>
            <div class="fc-pinyin">${word.pinyin}</div>
            <div class="fc-viet" id="fc-viet-${idx}" style="display:none">
                <div>${word.vietnamese}</div>
                <div class="fc-actions" onclick="event.stopPropagation()">
                    <button class="fc-btn fc-btn-learned" onclick="markFlashcardLearned(${idx}, true)">Đã thuộc</button>
                    <button class="fc-btn fc-btn-retry" onclick="markFlashcardLearned(${idx}, false)">Học lại</button>
                </div>
            </div>
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

window.markFlashcardLearned = function (idx, isLearned) {
    const word = currentFlashcards[idx];
    if (word) {
        word.learned = isLearned;
        save();
        status(`${isLearned ? '✅ Đã thuộc' : '🔁 Sẽ ôn lại'}: ${word.chinese}`, 'success');

        // Optional: remove the card or just update UI
        const card = document.getElementById(`fc-${idx}`);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }
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
                            <span style="font-size:0.85rem; color:var(--g6); margin-left:8px">${w.vietnamese || w.meaning || ''}</span>
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
                const sentenceGid = localStorage.getItem('sheets-sentences-gid') || '1';
                const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sentenceGid}`;

                console.log(`📡 Fetching sentences from GID: ${sentenceGid}...`);
                const response = await fetchWithTimeout(csvUrl, {}, 5000);

                if (response.ok) {
                    const csv = await response.text();
                    const lines = csv.split(/\r?\n/).filter(l => l.trim()).slice(1);

                    if (lines.length > 0) {
                        const newTemplates = lines.map(line => {
                            const row = parseCSVLine(line);
                            if (row.length >= 3) {
                                return {
                                    chinese: row[0]?.trim(),
                                    pinyin: row[1]?.trim(),
                                    vietnamese: row[2]?.trim(),
                                    words: row[3]?.trim()?.split(',')?.map(w => w.trim()).filter(w => w) || []
                                };
                            }
                        }).filter(s => s && s.chinese);

                        if (newTemplates.length > 0) {
                            sentenceTemplates = newTemplates;
                            console.log(`✅ Loaded ${sentenceTemplates.length} sentences from Sheets (GID: ${sentenceGid})`);
                            return;
                        } else {
                            console.warn(`⚠️ Tab sentences (GID: ${sentenceGid}) không có dữ liệu hợp lệ.`);
                        }
                    } else {
                        console.warn(`⚠️ Tab sentences (GID: ${sentenceGid}) trống.`);
                    }
                } else {
                    console.warn(`❌ Giao tiếp Sheets thất bại (Status: ${response.status}). Có thể sai GID hoặc chưa công khai tab.`);
                }
            }
        } catch (e) { console.warn('⚠️ Sheets sentences load failed:', e); }
    }

    // Default templates (Only if empty)
    if (sentenceTemplates.length === 0) {
        sentenceTemplates = [
            { chinese: '我每天早上喝咖啡', pinyin: 'wǒ měi tiān zǎo shang hē kā fēi', vietnamese: 'Tôi uống cà phê mỗi sáng' },
            { chinese: '我爸爸 là 医生', pinyin: 'wǒ bà ba shì yī shēng', vietnamese: 'Bố tôi là bác sĩ' },
            { chinese: '我妈妈 là 漂亮', pinyin: 'wǒ mā ma hěn piào liang', vietnamese: 'Mẹ tôi rất đẹp' },
            { chinese: '我喜欢吃中国菜', pinyin: 'wǒ xǐ huan chī zhōng guó cài', vietnamese: 'Tôi thích ăn đồ Trung Quốc' }
        ].map(s => ({ ...s, words: [] }));
        console.log('⚠️ Using default sentence templates.');
    }
}

let isQuizMode = false;

window.generateSentences = function () {
    try {
        console.log('Generating sentences... Vocab:', vocab.length, 'Templates:', sentenceTemplates.length);
        const learnedWords = vocab.filter(v => v.learned);
        if (learnedWords.length < 2) {
            status('⚠️ Bạn cần học ít nhất 2 từ!', 'error');
            return;
        }

        const learnedChineseSet = new Set(learnedWords.map(w => w.chinese));

        // 1. Calculate scores for all templates
        let candidates = sentenceTemplates.map(template => {
            let wordsToMatch = template.words.length ? template.words : extractWordsFromSentence(template.chinese);
            const matchedWords = wordsToMatch.filter(w => learnedChineseSet.has(w));
            const matchCount = matchedWords.length;
            const totalWords = wordsToMatch.length;

            let score = matchCount * 10;

            // Comprehensible Input Bonus: 70-90% known is sweet spot
            const knownRatio = totalWords > 0 ? matchCount / totalWords : 0;
            if (knownRatio >= 0.7 && knownRatio <= 0.95) score += 20;

            // Length punishment (too short or too long for beginners)
            if (totalWords < 3) score -= 5;
            if (totalWords > 15) score -= 5;

            // Random noise to ensure variety on refresh
            score += Math.random() * 15;

            return { ...template, matchedWords, matchCount, totalWords, score };
        });

        // 2. Filter valid sentences (minimum 2 learned words)
        candidates = candidates.filter(s => s.matchCount >= 2);

        if (candidates.length === 0) {
            // Fallback if strict filter yields nothing: try min 1 word
            candidates = sentenceTemplates.map(template => {
                let wordsToMatch = template.words.length ? template.words : extractWordsFromSentence(template.chinese);
                const matchedWords = wordsToMatch.filter(w => learnedChineseSet.has(w));
                return { ...template, matchedWords, matchCount: matchedWords.length };
            }).filter(s => s.matchCount >= 1);
        }

        // 3. Random Shuffle & Pick 10
        // Fisher-Yates Shuffle
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const selectedSentences = candidates.slice(0, 10);

        renderSentencesResult(selectedSentences);
        status('🔄 Đã tạo 10 mẫu câu ngẫu nhiên!', 'success');
    } catch (err) {
        console.error('Error generating sentences:', err);
        status('❌ Lỗi tạo mẫu câu: ' + err.message, 'error');
    }
};

window.renderSentences = function () {
    const learnedEl = document.getElementById('sentences-learned-count');
    const totalEl = document.getElementById('sentences-total-count');
    if (learnedEl) learnedEl.textContent = vocab.filter(v => v.learned).length;
    if (totalEl) totalEl.textContent = sentenceTemplates.length;

    // Initial generation if list is empty
    const list = document.getElementById('sentences-list');
    if (list && list.children.length === 0) {
        generateSentences();
    }

    updateVocabDatalist();
};

// ==================== SENTENCE SEARCH (MULTI-WORD) ====================

let selectedSearchWords = []; // Array of string (Chinese words)

window.updateVocabDatalist = function () {
    const dataList = document.getElementById('vocab-datalist');
    if (!dataList) return;

    // Create unique list of vocab items for suggestions
    const uniqueMap = new Map();
    vocab.forEach(v => {
        if (!selectedSearchWords.includes(v.chinese) && !uniqueMap.has(v.chinese)) {
            uniqueMap.set(v.chinese, v);
        }
    });

    const sortedVocab = Array.from(uniqueMap.values()).sort((a, b) => b.id - a.id);

    // We put Chinese in value so it fills the input, and Pinyin/Viet in label/text for searching
    dataList.innerHTML = sortedVocab.map(v => {
        const normPinyin = removeAccents(v.pinyin);
        const displayLabel = normPinyin !== v.pinyin
            ? `${v.pinyin} (${normPinyin}) - ${v.vietnamese}`
            : `${v.pinyin} - ${v.vietnamese}`;
        return `<option value="${v.chinese}">${displayLabel}</option>`;
    }).join('');
};

window.addSearchWord = function (val) {
    const input = document.getElementById('sentence-search-input');
    const word = val ? val.trim() : input.value.trim();

    if (!word) return;

    if (selectedSearchWords.length >= 5) {
        status('⚠️ Tối đa 5 từ vựng!', 'error');
        input.value = '';
        return;
    }

    let chineseWord = word;

    // If input is not Chinese (e.g. Pinyin or Viet), try to resolve it to Chinese
    if (!/[\u4e00-\u9fa5]/.test(word)) {
        const normInput = removeAccents(word);

        // Find best match in vocab
        const found = vocab.find(v =>
            v.chinese === word || // Exact match (rare if not Chinese)
            removeAccents(v.pinyin) === normInput ||
            removeAccents(v.vietnamese) === normInput
        );

        if (found) {
            chineseWord = found.chinese;
        } else {
            // If not found in vocab, invalid for "Finding sentences containing THIS word"
            // But maybe user wants to search purely by text? 
            // Our searchSentencesByWords uses t.chinese.includes(kw).
            // So if kw is "hao" it won't find "好".
            // So we MUST resolve to Chinese.
            status('⚠️ Vui lòng chọn từ trong danh sách gợi ý!', 'warning');
            return;
        }
    }

    if (!selectedSearchWords.includes(chineseWord)) {
        selectedSearchWords.push(chineseWord);
        renderSearchTags();
        input.value = '';
        updateVocabDatalist();
    }
    input.focus();
};

window.removeSearchWord = function (word) {
    selectedSearchWords = selectedSearchWords.filter(w => w !== word);
    renderSearchTags();
    updateVocabDatalist();
};

function renderSearchTags() {
    const container = document.getElementById('search-tags');
    if (!container) return;

    container.innerHTML = selectedSearchWords.map(w => `
        <div class="search-tag">
            <span>${w}</span>
            <span class="search-tag-remove" onclick="removeSearchWord('${w}')">✕</span>
        </div>
    `).join('');

    // Show/hide logic is in CSS (:empty) but padding might need adjust
    container.style.marginBottom = selectedSearchWords.length > 0 ? '8px' : '0';
}

window.searchSentencesByWords = function () {
    if (selectedSearchWords.length === 0) {
        // Fallback to random generation if no filters
        generateSentences();
        return;
    }

    // Find sentences that contain ANY or ALL of the words
    // We prioritize "More matches"

    const results = sentenceTemplates.map(t => {
        let matchCount = 0;
        let matchedKeywords = [];

        selectedSearchWords.forEach(kw => {
            if (t.chinese.includes(kw)) {
                matchCount++;
                matchedKeywords.push(kw);
            }
        });

        // Match learned words for highlighting
        const learnedWords = vocab.filter(v => v.learned);
        const learnedChineseSet = new Set(learnedWords.map(w => w.chinese));
        let allWords = t.words.length ? t.words : extractWordsFromSentence(t.chinese);
        let knownMatches = allWords.filter(w => learnedChineseSet.has(w));

        return {
            ...t,
            matchedWords: knownMatches,
            matchCount: knownMatches.length,
            searchMatchCount: matchCount,
            searchKeywords: matchedKeywords
        };
    })
        .filter(s => s.searchMatchCount > 0) // Must contain at least 1 searching word
        .sort((a, b) => {
            // 1. Sort by number of search keywords found (Desc)
            if (b.searchMatchCount !== a.searchMatchCount) return b.searchMatchCount - a.searchMatchCount;
            // 2. Sort by total learned words (Desc) - good for comprehensibility
            return b.matchCount - a.matchCount;
        })
        .slice(0, 30);

    if (results.length === 0) {
        status('⚠️ Không tìm thấy câu nào chứa các từ này.', 'error');
        const list = document.getElementById('sentences-list');
        list.innerHTML = `<div style="text-align:center;padding:40px;color:#666;">
            <p>Không tìm thấy mẫu câu chứa: <strong>${selectedSearchWords.join(', ')}</strong></p>
         </div>`;
        return;
    }

    renderSentencesResult(results);
    status(`✅ Tìm thấy ${results.length} câu phù hợp!`, 'success');
};

window.toggleSentenceMode = function (mode) {
    isQuizMode = (mode === 'quiz');
    const readBtn = document.getElementById('mode-read');
    const quizBtn = document.getElementById('mode-quiz');

    if (isQuizMode) {
        readBtn.classList.remove('active');
        quizBtn.classList.add('active');
    } else {
        readBtn.classList.add('active');
        quizBtn.classList.remove('active');
    }

    // If we have search tags, re-run search. If empty, run generate.
    if (selectedSearchWords.length > 0) {
        searchSentencesByWords();
    } else {
        generateSentences();
    }
};

function renderSentencesResult(sentences) {
    const container = document.getElementById('sentences-list');
    if (!container) return;

    if (sentences.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;"><p>Chưa có mẫu câu phù hợp (cần học thêm từ).</p></div>';
        return;
    }

    container.innerHTML = sentences.map((s, index) => {
        if (isQuizMode) {
            return renderQuizItem(s, index);
        } else {
            return renderReadItem(s);
        }
    }).join('');
}

function renderReadItem(s) {
    const matchedSet = new Set(s.matchedWords || []);
    const interactiveChinese = renderInteractiveSentence(s.chinese, matchedSet, false);

    return `
        <div class="sentence-item">
            <div class="sentence-chinese">${interactiveChinese}</div>
            <div class="sentence-pinyin">${s.pinyin}</div>
            <div class="sentence-viet">${s.vietnamese}</div>
            <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center">
                <span class="sentence-badge">${s.matchCount} từ đã học</span>
                <button class="action-btn" style="width:36px; height:36px; font-size:1.1rem" onclick="speak('${s.chinese.replace(/'/g, "\\'")}')">🔊</button>
            </div>
        </div>
    `;
}

function renderQuizItem(s, index) {
    // In quiz mode, we replace matched words with blanks
    let quizContent = s.chinese;
    const sortedMatches = [...new Set(s.matchedWords)].sort((a, b) => b.length - a.length);

    // We only hide 1-2 words max per sentence to keep it doable, or all learned words?
    // "Review" means testing learned words. Let's hide ALL learned words for maximum practice.
    // Or randomly hide some? Let's hide all matched words (Cloze Deletion).

    sortedMatches.forEach(word => {
        const regex = new RegExp(word, 'g');
        // Use a placeholder with data-answer attribute
        quizContent = quizContent.replace(regex, `<span class="cloze-blank" onclick="revealCloze(this, '${word}')">?</span>`);
    });

    return `
        <div class="sentence-item quiz-mode">
            <div class="sentence-chinese">${quizContent}</div>
            <!-- Hide Pinyin/Viet initially in quiz mode -->
            <div class="quiz-details" id="quiz-details-${index}" style="display:none">
                <div class="sentence-pinyin">${s.pinyin}</div>
                <div class="sentence-viet">${s.vietnamese}</div>
            </div>
            
            <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center">
                <button class="btn btn-sm" onclick="toggleQuizDetails(${index})">👁️ Hiện nghĩa</button>
                <button class="action-btn" style="width:36px; height:36px; font-size:1.1rem" onclick="speak('${s.chinese.replace(/'/g, "\\'")}')">🔊</button>
            </div>
        </div>
    `;
}

window.revealCloze = function (el, answer) {
    el.textContent = answer;
    el.classList.add('revealed');
    el.onclick = null; // Remove click handler
};

window.toggleQuizDetails = function (index) {
    const el = document.getElementById(`quiz-details-${index}`);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
};

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
        'sheets-sentences-gid': 'sheets-sentences-gid',
        'github-token': 'github-token',
        'github-repo': 'github-repo',
        'github-file': 'github-file',
        'vocab-json-url': 'vocab-json-url',
        'sync-strategy': 'sync-strategy',
        'gemini-api-key': 'gemini-api-key'
    };

    Object.entries(fields).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.value = localStorage.getItem(key) || (id === 'github-file' ? 'data/vocab.json' : '');
    });

    const lastSyncEl = document.getElementById('last-sync-time');
    if (lastSyncEl) lastSyncEl.textContent = localStorage.getItem('last-sync-time') || 'Chưa sync';
}

window.saveGeminiConfig = function () {
    const key = document.getElementById('gemini-api-key')?.value.trim() || '';
    localStorage.setItem('gemini-api-key', key);
    const storyKeyEl = document.getElementById('story-gemini-key');
    if (storyKeyEl) storyKeyEl.value = key;
    status('💾 Đã lưu Gemini API Key!', 'success');
};

window.saveGeminiKeyFromStory = function () {
    const key = document.getElementById('story-gemini-key')?.value.trim() || '';
    localStorage.setItem('gemini-api-key', key);
    const cfgKeyEl = document.getElementById('gemini-api-key');
    if (cfgKeyEl) cfgKeyEl.value = key;
    status('💾 Đã lưu Gemini API Key!', 'success');
};

window.testGeminiApiKey = async function () {
    const key = localStorage.getItem('gemini-api-key');
    if (!key) {
        status('⚠️ Chưa nhập API Key!', 'error');
        return;
    }
    showLoading('Đang kiểm tra kết nối Gemini API...', 'Vui lòng chờ...');
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Trả lời: "OK"' }] }]
            })
        });
        hideLoading();
        if (res.ok) {
            status('✅ Kết nối Gemini API thành công!', 'success');
        } else {
            const errData = await res.json().catch(() => ({}));
            status(`❌ Lỗi kết nối (${res.status}): ${errData.error?.message || 'Key không hợp lệ'}`, 'error');
        }
    } catch (e) {
        hideLoading();
        status(`❌ Lỗi kết nối: ${e.message}`, 'error');
    }
};

window.saveConfig = function () {
    localStorage.setItem('sheets-url', document.getElementById('sheets-url').value.trim());
    localStorage.setItem('sheets-sentences-gid', document.getElementById('sheets-sentences-gid').value.trim() || '1');
    status('💾 Đã lưu cấu hình!', 'success');

    // Refresh sentences after GID update
    loadSentenceTemplates().then(() => {
        renderSentences();
        status('🔄 Đã tải lại mẫu câu!', 'success');
    });
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

        // 1. Create a map of CURRENT local status to preserve progress
        // Key: Chinese char (unique identifier)
        const currentCheckMap = new Map();
        vocab.forEach(v => {
            currentCheckMap.set(v.chinese, {
                learned: v.learned,
                reviewCount: v.reviewCount || 0,
                nextReview: v.nextReview || Date.now()
            });
        });

        const newVocab = [];
        lines.slice(1).forEach((line, idx) => {
            const row = parseCSVLine(line);
            if (row.length >= 4) {
                const chinese = row[0]?.trim();

                if (chinese && !newVocab.some(v => v.chinese === chinese)) {
                    // Check if we have local progress for this word
                    const localStatus = currentCheckMap.get(chinese);

                    // Priority: Local Status > Sheet Status (if sheet has it) > Default false
                    // NOTE: usually sheets won't have 'learned' column updated by app, so we trust local.
                    // If sheet explicitly has 'TRUE' in learned column, we could respect it, 
                    // BUT user requirement is "Safe Sync" -> Keep local progress.

                    let isLearned = false;
                    let reviewCount = 0;
                    let nextReview = Date.now();

                    if (localStatus) {
                        isLearned = localStatus.learned;
                        reviewCount = localStatus.reviewCount;
                        nextReview = localStatus.nextReview;
                    } else {
                        // Inherit from sheet if provided (optional)
                        isLearned = row[6]?.toLowerCase() === 'true' || row[6] === '1';
                    }

                    newVocab.push({
                        id: Date.now() + idx,
                        vietnamese: row[3]?.trim() || chinese,
                        chinese,
                        pinyin: row[2]?.trim() || generatePinyin(chinese),
                        meaning: row[3]?.trim() || chinese,
                        topic: row[4]?.trim() || 'Sheet',
                        difficulty: row[5]?.trim() || 'easy',
                        learned: isLearned,
                        nextReview: nextReview,
                        reviewCount: reviewCount
                    });
                }
            }
        });

        vocab = newVocab;
        save();
        buildCharMap();
        updateLastSyncTime();
        if (!isBackground) {
            hideLoading();
            status(`✅ Đã đồng bộ ${vocab.length} từ (Giữ nguyên tiến độ)!`, 'success');
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
                buildCharMap();
                renderLibrary();
                return true;
            }
        }
    } catch (e) { console.error('⚠️ GitHub fallback failed:', e.message); }
    return false;
}

async function syncFromLocalVocabJson() {
    try {
        console.log('📦 Loading vocab from local vocab.json...');
        const response = await fetchWithTimeout('./vocab.json', {}, 3000);
        if (response.ok) {
            const data = await response.json();
            const vocabData = Array.isArray(data) ? data : data.vocab;
            if (vocabData && vocabData.length > 0) {
                vocab = vocabData;
                save();
                buildCharMap();
                renderLibrary();
                console.log(`✅ Loaded ${vocab.length} words from local vocab.json`);
                return true;
            }
        }
    } catch (e) {
        console.warn('⚠️ Local vocab.json fallback skipped:', e.message);
    }
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
                vocab = vocabData; save(); buildCharMap(); renderLibrary(); status(`📤 Đã nhập ${vocab.length} từ!`, 'success');
            } else throw new Error('No vocab data found');
        } catch (err) { status(`❌ File không hợp lệ: ${err.message}`, 'error'); }
    };
    reader.readAsText(file);
};

window.confirmClearData = function () {
    if (confirm('🗑️ XÓA TẤT CẢ dữ liệu?')) {
        vocab = []; save(); buildCharMap(); renderLibrary(); status('🗑️ Đã xóa!', 'success');
    }
};

// ==================== STORIES & CONVERSATIONS ====================

// Comprehensive built-in dictionary for touch-to-translate & new words lookup
const BUILTIN_CHINESE_DICT = {
    // Weather & Nature
    '晴朗': 'nắng ráo, trong xanh',
    '阳光': 'ánh nắng, ánh mặt trời',
    '明媚': 'rực rỡ, tươi đẹp',
    '天气': 'thời tiết',
    '今天': 'hôm nay',
    '明天': 'ngày mai',
    '昨天': 'hôm qua',
    '晴天': 'ngày nắng',
    '阴天': 'ngày âm u',
    '下雨': 'trời mưa',
    '下雪': 'tuyết rơi',
    '刮风': 'nổi gió',
    '太阳': 'mặt trời',
    '月亮': 'mặt trăng',
    '星星': 'ngôi sao',
    '天空': 'bầu trời',
    '空气': 'không khí',
    '春天': 'mùa xuân',
    '夏天': 'mùa hè',
    '秋天': 'mùa thu',
    '冬天': 'mùa đông',
    '热': 'nóng',
    '冷': 'lạnh',
    '暖和': 'ấm áp',
    '凉快': 'mát mẻ',

    // Daily Life & Actions
    '出门': 'ra ngoài, xuất môn',
    '心情': 'tâm trạng',
    '舒畅': 'khoan khoái, dễ chịu',
    '非常': 'vô cùng, rất',
    '特别': 'đặc biệt',
    '十分': 'rất, mười phần',
    '路上': 'trên đường',
    '碰见': 'tình cờ gặp',
    '遇到': 'gặp gỡ, bắt gặp',
    '相遇': 'gặp nhau',
    '互相': 'lẫn nhau, qua lại',
    '问好': 'hỏi thăm, chào hỏi',
    '打招呼': 'chào hỏi',
    '安静': 'yên tĩnh',
    '享用': 'thưởng thức, dùng bữa',
    '品尝': 'nếm thử, thưởng thức',
    '味道': 'hương vị',
    '打算': 'dự định',
    '不久': 'không lâu, sắp',
    '探索': 'khám phá',
    '地方': 'nơi chốn, địa điểm',
    '有趣': 'thú vị',
    '有意思': 'có ý nghĩa, thú vị',
    '接触': 'tiếp xúc',
    '快乐': 'vui vẻ',
    '高兴': 'vui mừng',
    '开心': 'vui vẻ',
    '充实': 'trọn vẹn, phong phú',
    '意义': 'ý nghĩa',
    '充满': 'tràn đầy',
    '期待': 'mong đợi, kỳ vọng',
    '聊天': 'trò chuyện, tán gẫu',
    '谈到': 'nhắc đến, nói đến',
    '收获': 'thu hoạch, gặt hái',
    '愉快': 'vui vẻ, sảng khoái',
    '祝': 'chúc',
    '决定': 'quyết định',
    '继续': 'tiếp tục',
    '约定': 'hẹn ước, hẹn gặp',
    '下次': 'lần sau',
    '常常': 'thường xuyên',
    '平时': 'ngày thường, bình thường',
    '生活': 'cuộc sống',
    '工作': 'làm việc, công việc',
    '学习': 'học tập',
    '复习': 'ôn tập',
    '练习': 'luyện tập',

    // People & Relations
    '小明': 'Tiểu Minh',
    '小华': 'Tiểu Hoa',
    '玛丽': 'Mã Lệ (Mary)',
    '刘明': 'Lưu Minh',
    '朋友': 'bạn bè',
    '好朋友': 'bạn thân',
    '大家': 'mọi người',
    '他们': 'bọn họ',
    '我们': 'chúng tôi, chúng ta',
    '人们': 'mọi người',
    '老师': 'thầy/cô giáo',
    '学生': 'học sinh',
    '留学生': 'lưu học sinh',
    '医生': 'bác sĩ',
    '爸爸': 'bố, cha',
    '妈妈': 'mẹ',
    '哥哥': 'anh trai',
    '姐姐': 'chị gái',
    '弟弟': 'em trai',
    '妹妹': 'em gái',
    '家人': 'người nhà',
    '家庭': 'gia đình',

    // Food & Dining
    '咖啡': 'cà phê',
    '咖啡馆': 'quán cà phê',
    '茶': 'trà',
    '中国茶': 'trà Trung Quốc',
    '绿茶': 'trà xanh',
    '红茶': 'hồng trà',
    '茶馆': 'quán trà',
    '喝': 'uống',
    '吃': 'ăn',
    '水': 'nước',
    '米饭': 'cơm',
    '菜': 'món ăn, rau',
    '中国菜': 'món ăn Trung Quốc',
    '好喝': 'ngon (uống)',
    '好吃': 'ngon (ăn)',
    '饭馆': 'nhà hàng, quán ăn',
    '苹果': 'quả táo',
    '水果': 'hoa quả',
    '面包': 'bánh mì',
    '包子': 'bánh bao',

    // Time & Frequency
    '现在': 'bây giờ',
    '早上': 'buổi sáng',
    '上午': 'buổi sáng (trước trưa)',
    '中午': 'buổi trưa',
    '下午': 'buổi chiều',
    '晚上': 'buổi tối',
    '周末': 'cuối tuần',
    '星期': 'tuần',
    '星期天': 'chủ nhật',
    '点': 'giờ',
    '分': 'phút',
    '年': 'năm',
    '月': 'tháng',
    '日': 'ngày',
    '每天': 'mỗi ngày',
    '一年': 'một năm',
    '多长时间': 'bao lâu',
    '时候': 'lúc, khi',
    '有时候': 'có lúc, thỉnh thoảng',

    // Travel & Places
    '去': 'đi',
    '来': 'đến',
    '回': 'về',
    '走': 'đi, bước đi',
    '旅游': 'du lịch',
    '旅行': 'du lịch',
    '风景': 'phong cảnh',
    '中国': 'Trung Quốc',
    '北京': 'Bắc Kinh',
    '上海': 'Thượng Hải',
    '美国': 'Mỹ',
    '加拿大': 'Canada',
    '家': 'nhà',
    '学校': 'trường học',
    '公司': 'công ty',
    '商店': 'cửa hàng',
    '超市': 'siêu thị',
    '公园': 'công viên',
    '路': 'con đường',

    // Common Verbs & Adjectives
    '喜欢': 'thích',
    '爱': 'yêu',
    '想': 'nghĩ, muốn, nhớ',
    '看': 'nhìn, xem, đọc',
    '听': 'nghe',
    '说': 'nói',
    '写': 'viết',
    '买': 'mua',
    '卖': 'bán',
    '坐': 'ngồi',
    '叫': 'gọi, tên là',
    '姓': 'họ là',
    '是': 'là',
    '有': 'có',
    '没有': 'không có',
    '认识': 'quen biết',
    '知道': 'biết',
    '觉得': 'cảm thấy',
    '认为': 'cho rằng',
    '懂': 'hiểu',
    '好': 'tốt, khỏe, ngon',
    '多': 'nhiều',
    '少': 'ít',
    '大': 'to, lớn',
    '小': 'nhỏ, bé',
    '快': 'nhanh',
    '慢': 'chậm',
    '新': 'mới',
    '旧': 'cũ',
    '贵': 'đắt',
    '便宜': 'rẻ',
    '漂亮': 'xinh đẹp',
    '美丽': 'tươi đẹp',
    '容易': 'dễ dàng',
    '难': 'khó',
    '累': 'mệt mỏi',

    // Pronouns & Modifiers
    '你': 'bạn, anh, chị',
    '我': 'tôi, mình',
    '他': 'anh ấy, ông ấy',
    '她': 'cô ấy, bà ấy',
    '您': 'ngài, ông, bà (kính trọng)',
    '什么': 'cái gì, gì',
    '哪': 'nào',
    '哪里': 'ở đâu',
    '谁': 'ai',
    '多少': 'bao nhiêu',
    '几': 'mấy',
    '怎么': 'thế nào',
    '为什么': 'tại sao',
    '吗': 'không (trợ từ nghi vấn)',
    '呢': 'thì sao, nhé',
    '吧': 'đi, nhé (trợ từ ngữ khí)',
    '的': 'của (trợ từ sở hữu)',
    '了': 'rồi (trợ từ hoàn thành)',
    '和': 'và, cùng',
    '跟': 'cùng với',
    '在': 'ở, tại, đang',
    '从': 'từ',
    '到': 'đến',
    '也': 'cũng',
    '都': 'đều',
    '很': 'rất',
    '太': 'quá',
    '真': 'thật là',
    '就': 'thì, ngay',
    '还': 'còn, vẫn',
    '一': 'một',
    '二': 'hai',
    '三': 'ba',
    '四': 'bốn',
    '五': 'năm',
    '六': 'sáu',
    '七': 'bảy',
    '八': 'tám',
    '九': 'chín',
    '十': 'mười',
    '个': 'cái, chiếc (lượng từ)',
    '杯': 'ly, cốc (lượng từ)',
    '一下儿': 'một chút',
    '一点儿': 'một ít'
};

function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getWordMeaning(chinese) {
    if (!chinese) return '';
    // 1. Check user vocab
    const vocabWord = vocab.find(v => v.chinese === chinese);
    if (vocabWord) return vocabWord.vietnamese || vocabWord.meaning || '';

    // 2. Check built-in dictionary
    if (BUILTIN_CHINESE_DICT[chinese]) return BUILTIN_CHINESE_DICT[chinese];

    // 3. Check current story target words
    if (currentStory && currentStory.targetWords) {
        const tw = currentStory.targetWords.find(w => w.chinese === chinese);
        if (tw) return tw.vietnamese || tw.meaning || '';
    }

    // 4. Character by character lookup if compound
    if (chinese.length >= 2) {
        const parts = chinese.split('').map(c => BUILTIN_CHINESE_DICT[c] || '').filter(Boolean);
        if (parts.length > 0) return parts.join(' - ');
    }

    return '';
}

async function fetchWordDefinition(chinese) {
    try {
        const res = await fetchWithTimeout(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chinese)}&langpair=zh-CN|vi`,
            {},
            3000
        );
        if (res.ok) {
            const data = await res.json();
            const trans = data.responseData?.translatedText;
            if (trans && trans.toLowerCase() !== chinese.toLowerCase()) {
                BUILTIN_CHINESE_DICT[chinese] = trans;
                return trans;
            }
        }
    } catch (e) {
        console.log('Online translation skipped:', e.message);
    }
    return '';
}

function segmentChineseSentence(sentence, targetWordsSet = new Set()) {
    if (!sentence) return [];

    // All known terms from vocab + targetWords + dict
    const dictTerms = new Set([
        ...vocab.map(v => v.chinese),
        ...targetWordsSet,
        ...Object.keys(BUILTIN_CHINESE_DICT)
    ]);

    // Use Intl.Segmenter if supported
    let intlTokens = null;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const seg = new Intl.Segmenter('zh-CN', { granularity: 'word' });
            intlTokens = Array.from(seg.segment(sentence)).map(s => s.segment);
        } catch (e) {}
    }

    const tokens = [];
    let i = 0;
    const len = sentence.length;

    while (i < len) {
        const char = sentence[i];

        // 1. Punctuation / Non-Chinese / Whitespace
        if (!/[\u4e00-\u9fa5]/.test(char)) {
            let j = i;
            while (j < len && !/[\u4e00-\u9fa5]/.test(sentence[j])) {
                j++;
            }
            tokens.push({ text: sentence.slice(i, j), isPunct: true });
            i = j;
            continue;
        }

        // 2. Try Longest Matching from length 6 down to 2 in dictTerms
        let matched = '';
        const maxLen = Math.min(6, len - i);
        for (let l = maxLen; l >= 2; l--) {
            const sub = sentence.slice(i, i + l);
            if (dictTerms.has(sub)) {
                matched = sub;
                break;
            }
        }

        if (matched) {
            tokens.push({ text: matched, isPunct: false });
            i += matched.length;
            continue;
        }

        // 3. Check Intl.Segmenter candidate word
        if (intlTokens) {
            const rem = sentence.slice(i);
            const intlMatch = intlTokens.find(t => rem.startsWith(t) && /[\u4e00-\u9fa5]/.test(t) && t.length >= 2);
            if (intlMatch) {
                tokens.push({ text: intlMatch, isPunct: false });
                i += intlMatch.length;
                continue;
            }
        }

        // 4. Default: single character
        tokens.push({ text: char, isPunct: false });
        i++;
    }

    return tokens;
}

function renderInteractiveSentence(sentence, targetWordsSet = new Set(), isQuiz = false) {
    if (!sentence) return '';

    const tokens = segmentChineseSentence(sentence, targetWordsSet);

    return tokens.map(token => {
        if (token.isPunct) {
            return escapeHtml(token.text);
        }

        const w = token.text;

        // If in quiz mode and is target word
        if (isQuiz && targetWordsSet.has(w)) {
            return `<span class="story-cloze" onclick="revealStoryCloze(this, '${escapeQuotes(w)}')">?</span>`;
        }

        // Determine status
        let classType = '';
        let titleHint = '';

        if (targetWordsSet.has(w)) {
            classType = 'target-word';
            titleHint = '🎯 Từ mục tiêu ôn tập (chạm để xem chi tiết)';
        } else {
            const vWord = vocab.find(v => v.chinese === w);
            if (vWord) {
                classType = 'known-word' + (vWord.learned ? ' learned-word' : '');
                titleHint = vWord.learned ? '✅ Đã thuộc trong thư viện' : '📚 Đã có trong thư viện';
            } else {
                // NEW WORD OUTSIDE VOCAB!
                classType = 'new-word';
                titleHint = '✨ Từ mới ngoài thư viện (chạm để xem nghĩa & thêm)';
            }
        }

        return `<span class="story-word ${classType}" onclick="showWordDetail('${escapeQuotes(w)}')" title="${titleHint}">${escapeHtml(w)}</span>`;
    }).join('');
}

let currentStoryType = 'conversation'; // 'conversation' | 'story'
let currentEngine = 'builtin'; // 'builtin' | 'ai'
let storyVocabSource = 'unlearned'; // 'unlearned' | 'learned' | 'all'
let storySelectedTopic = '';
let targetStoryWords = [];
let currentStory = null;
let savedStories = [];
let storyShowPinyin = true;
let storyShowViet = true;
let storyIsQuiz = false;
let isSpeakingSequence = false;
let currentSpeechIndex = 0;
let currentWordDetail = null;

function loadSavedStories() {
    try {
        const raw = localStorage.getItem('saved-stories');
        savedStories = raw ? JSON.parse(raw) : [];
    } catch (e) {
        savedStories = [];
    }
}

function saveSavedStories() {
    localStorage.setItem('saved-stories', JSON.stringify(savedStories));
}

window.renderStoriesTab = function () {
    // 1. Update stats
    const totalEl = document.getElementById('stories-vocab-total');
    const learnedEl = document.getElementById('stories-vocab-learned');
    const savedEl = document.getElementById('stories-saved-count');
    const savedBadgeEl = document.getElementById('saved-count-badge');

    const learnedCount = vocab.filter(v => v.learned).length;
    if (totalEl) totalEl.textContent = vocab.length;
    if (learnedEl) learnedEl.textContent = learnedCount;
    if (savedEl) savedEl.textContent = savedStories.length;
    if (savedBadgeEl) savedBadgeEl.textContent = `${savedStories.length} bài`;

    // 2. Populate topics dropdown
    const topicSelect = document.getElementById('story-topic-filter');
    if (topicSelect) {
        const currentVal = topicSelect.value;
        const topics = [...new Set(vocab.map(v => v.topic).filter(t => t))];
        topicSelect.innerHTML = `<option value="">Tất cả chủ đề (${vocab.length} từ)</option>` +
            topics.map(t => {
                const count = vocab.filter(v => v.topic === t).length;
                return `<option value="${t}" ${currentVal === t ? 'selected' : ''}>${t} (${count})</option>`;
            }).join('');
    }

    // 3. Sync API Key from localStorage
    const keyInput = document.getElementById('story-gemini-key');
    if (keyInput) {
        keyInput.value = localStorage.getItem('gemini-api-key') || '';
    }

    // 4. If target words is empty, randomize initial target words
    if (targetStoryWords.length === 0 && vocab.length > 0) {
        randomizeTargetWords();
    } else {
        renderTargetWordsTags();
    }

    // 5. Update datalist and saved list
    updateStoryVocabDatalist();
    renderSavedStoriesList();

    // 6. If we have a current story, render it
    if (currentStory) {
        renderCurrentStory();
    }
};

window.setStoryType = function (type) {
    currentStoryType = type;
    const btnConv = document.getElementById('btn-type-conversation');
    const btnStory = document.getElementById('btn-type-story');
    if (btnConv && btnStory) {
        if (type === 'conversation') {
            btnConv.classList.add('active');
            btnStory.classList.remove('active');
        } else {
            btnStory.classList.add('active');
            btnConv.classList.remove('active');
        }
    }
};

window.switchEngine = function (engine) {
    currentEngine = engine;
    const tabBuiltin = document.getElementById('tab-engine-builtin');
    const tabAi = document.getElementById('tab-engine-ai');
    const panelAi = document.getElementById('ai-engine-panel');

    if (tabBuiltin && tabAi) {
        if (engine === 'builtin') {
            tabBuiltin.classList.add('active');
            tabAi.classList.remove('active');
            if (panelAi) panelAi.style.display = 'none';
        } else {
            tabAi.classList.add('active');
            tabBuiltin.classList.remove('active');
            if (panelAi) panelAi.style.display = 'block';
        }
    }
};

window.onStorySourceChange = function () {
    const sel = document.getElementById('story-vocab-source');
    if (sel) {
        storyVocabSource = sel.value;
        randomizeTargetWords();
    }
};

window.onStoryTopicChange = function () {
    const sel = document.getElementById('story-topic-filter');
    if (sel) {
        storySelectedTopic = sel.value;
        randomizeTargetWords();
    }
};

window.randomizeTargetWords = function () {
    let pool = vocab.slice();

    if (storyVocabSource === 'unlearned') {
        const unlearned = pool.filter(v => !v.learned);
        if (unlearned.length > 0) pool = unlearned;
    } else if (storyVocabSource === 'learned') {
        const learned = pool.filter(v => v.learned);
        if (learned.length > 0) pool = learned;
    }

    if (storySelectedTopic) {
        const topicPool = pool.filter(v => v.topic === storySelectedTopic);
        if (topicPool.length > 0) pool = topicPool;
    }

    if (pool.length === 0) pool = vocab.slice();

    const count = Math.min(Math.max(3, pool.length), 5);
    const shuffled = pool.slice().sort(() => 0.5 - Math.random());
    targetStoryWords = shuffled.slice(0, count);

    renderTargetWordsTags();
    updateStoryVocabDatalist();
    status(`🎲 Đã chọn ngẫu nhiên ${targetStoryWords.length} từ vựng!`, 'success');
};

window.clearTargetWords = function () {
    targetStoryWords = [];
    renderTargetWordsTags();
    updateStoryVocabDatalist();
    status('🗑️ Đã xóa danh sách từ mục tiêu', 'success');
};

window.addCustomTargetWord = function (val) {
    const input = document.getElementById('target-word-input');
    const wordStr = (val || (input ? input.value : '')).trim();
    if (!wordStr) return;

    if (targetStoryWords.length >= 10) {
        status('⚠️ Tối đa 10 từ mục tiêu cho một bài!', 'error');
        if (input) input.value = '';
        return;
    }

    const normInput = removeAccents(wordStr);
    let matchedWord = vocab.find(v =>
        v.chinese === wordStr ||
        removeAccents(v.vietnamese) === normInput ||
        removeAccents(v.pinyin) === normInput
    );

    if (!matchedWord) {
        matchedWord = {
            id: Date.now(),
            chinese: wordStr,
            pinyin: generatePinyin(wordStr),
            vietnamese: wordStr,
            meaning: wordStr,
            topic: 'Tự chọn',
            difficulty: 'easy',
            learned: false
        };
    }

    if (!targetStoryWords.some(w => w.chinese === matchedWord.chinese)) {
        targetStoryWords.push(matchedWord);
        renderTargetWordsTags();
        updateStoryVocabDatalist();
        status(`➕ Đã thêm từ: ${matchedWord.chinese}`, 'success');
    } else {
        status(`ℹ️ Từ "${matchedWord.chinese}" đã có trong danh sách`, 'warning');
    }

    if (input) {
        input.value = '';
        input.focus();
    }
};

window.removeTargetWord = function (chinese) {
    targetStoryWords = targetStoryWords.filter(w => w.chinese !== chinese);
    renderTargetWordsTags();
    updateStoryVocabDatalist();
};

function renderTargetWordsTags() {
    const container = document.getElementById('target-words-tags');
    const countEl = document.getElementById('target-words-count');
    if (countEl) countEl.textContent = targetStoryWords.length;
    if (!container) return;

    if (targetStoryWords.length === 0) {
        container.innerHTML = `<span style="color:var(--g6); font-size:0.9rem; font-style:italic">Chưa có từ nào. Hãy bấm "🎲 Đổi từ ngẫu nhiên" hoặc thêm từ bên dưới!</span>`;
        return;
    }

    container.innerHTML = targetStoryWords.map(w => `
        <div class="target-word-chip">
            <span style="font-size:1.05rem">${w.chinese}</span>
            <span class="chip-pinyin">(${w.pinyin || ''})</span>
            <span class="chip-remove" onclick="removeTargetWord('${w.chinese.replace(/'/g, "\\'")}')" title="Xóa từ này">✕</span>
        </div>
    `).join('');
}

window.updateStoryVocabDatalist = function () {
    const datalist = document.getElementById('story-vocab-datalist');
    if (!datalist) return;

    const targetSet = new Set(targetStoryWords.map(w => w.chinese));
    const available = vocab.filter(v => !targetSet.has(v.chinese));

    datalist.innerHTML = available.slice(0, 150).map(v => {
        return `<option value="${v.chinese}">${v.pinyin} - ${v.vietnamese || v.meaning}</option>`;
    }).join('');
};

window.triggerStoryGeneration = function () {
    if (targetStoryWords.length === 0) {
        status('⚠️ Vui lòng chọn ít nhất 1-2 từ vựng mục tiêu!', 'error');
        return;
    }

    const lengthSelect = document.getElementById('story-length');
    const lengthVal = lengthSelect ? lengthSelect.value : 'medium';

    if (currentEngine === 'ai') {
        generateGeminiStory(currentStoryType, targetStoryWords, lengthVal);
    } else {
        generateSmartStory(currentStoryType, targetStoryWords, lengthVal);
    }
};

function generateSmartStory(type, words, lengthVal) {
    showLoading('Đang sáng tác bài học...', 'Đang kết hợp ngữ cảnh và từ vựng...');

    setTimeout(() => {
        try {
            const isConv = (type === 'conversation');
            const targetChineseList = words.map(w => w.chinese);
            const targetMeanings = words.map(w => (w.vietnamese || w.meaning || '')).join(' ');

            let theme = 'Giao tiếp sinh hoạt hàng ngày';
            let titleChinese = '日常生活';
            let titlePinyin = 'rì cháng shēng huó';
            let titleViet = 'Cuộc Sống Hàng Ngày';

            if (/cà phê|trà|uống|ăn|ngon|quán/i.test(targetMeanings) || targetChineseList.some(c => /咖啡|茶|喝|吃|水|饭/.test(c))) {
                theme = 'Gặp gỡ ở quán nước & ẩm thực';
                titleChinese = '在咖啡馆相遇';
                titlePinyin = 'zài kā fēi guǎn xiāng yù';
                titleViet = 'Gặp Nhau Ở Quán Cà Phê';
            } else if (/du lịch|đi|chơi|cuối tuần|núi|biển/i.test(targetMeanings) || targetChineseList.some(c => /去|旅游|周末|玩|北京|中国/.test(c))) {
                theme = 'Kế hoạch cuối tuần & du lịch';
                titleChinese = '周末的计划';
                titlePinyin = 'zhōu mò de jì huà';
                titleViet = 'Kế Hoạch Cuối Tuần';
            } else if (/học|tiếng trung|chữ hán|sách|thầy|cô/i.test(targetMeanings) || targetChineseList.some(c => /学|中文|汉字|老师|学生|书/.test(c))) {
                theme = 'Cùng nhau học tiếng Trung';
                titleChinese = '一起学中文';
                titlePinyin = 'yì qǐ xué zhōng wén';
                titleViet = 'Cùng Nhau Học Tiếng Trung';
            } else if (/chào|khỏe|tên|gì|bạn|tôi/i.test(targetMeanings) || targetChineseList.some(c => /你好|叫|什么|名字|认识/.test(c))) {
                theme = 'Chào hỏi & Làm quen bạn mới';
                titleChinese = '认识新朋友';
                titlePinyin = 'rèn shi xīn péng you';
                titleViet = 'Làm Quen Bạn Mới';
            } else if (/gia đình|bố|mẹ|anh|chị|em|nhà/i.test(targetMeanings) || targetChineseList.some(c => /爸爸|妈妈|哥哥|姐姐|家/.test(c))) {
                theme = 'Chuyện gia đình & người thân';
                titleChinese = '我的家庭';
                titlePinyin = 'wǒ de jiā tíng';
                titleViet = 'Gia Đình Của Tôi';
            }

            const lines = [];

            if (isConv) {
                // DIALOGUE GENERATOR
                // Opening greeting
                lines.push({
                    speaker: 'A',
                    speakerName: '小明',
                    chinese: '你好！今天见到你很高兴。',
                    pinyin: generatePinyin('你好！今天见到你很高兴。'),
                    vietnamese: 'Chào bạn! Hôm nay gặp được bạn tôi rất vui.',
                    usedWords: targetChineseList.filter(c => '你好！今天见到你很高兴。'.includes(c))
                });

                lines.push({
                    speaker: 'B',
                    speakerName: '小华',
                    chinese: '你好小明！我也很高兴。你今天在忙什么呢？',
                    pinyin: generatePinyin('你好小明！我也很高兴。你今天在忙什么呢？'),
                    vietnamese: 'Chào Tiểu Minh! Tôi cũng rất vui. Hôm nay bạn đang bận gì thế?',
                    usedWords: targetChineseList.filter(c => '你好小明！我也很高兴。你今天在忙什么呢？'.includes(c))
                });

                // Insert sentences with target words
                words.forEach((w, idx) => {
                    const speaker = (idx % 2 === 0) ? 'A' : 'B';
                    const speakerName = (speaker === 'A') ? '小明' : '小华';
                    const otherSpeaker = (speaker === 'A') ? '小华' : '小明';

                    // Check if sentenceTemplates has a sentence matching this word
                    let matchedTpl = null;
                    if (sentenceTemplates && sentenceTemplates.length > 0) {
                        matchedTpl = sentenceTemplates.find(s => s.chinese && s.chinese.includes(w.chinese));
                    }

                    if (matchedTpl) {
                        lines.push({
                            speaker,
                            speakerName,
                            chinese: matchedTpl.chinese,
                            pinyin: matchedTpl.pinyin || generatePinyin(matchedTpl.chinese),
                            vietnamese: matchedTpl.vietnamese || 'Mẫu câu ôn tập',
                            usedWords: [w.chinese]
                        });
                    } else {
                        // Construct authentic conversational sentence based on word meaning/category
                        let cText = '';
                        let vText = '';

                        if (/uống|cà phê|trà|nước|ăn/i.test(w.vietnamese || '')) {
                            cText = `我们一起去品尝${w.chinese}吧，味道一定很好！`;
                            vText = `Chúng ta cùng đi thưởng thức ${w.vietnamese} nhé, hương vị chắc chắn rất ngon!`;
                        } else if (/đi|đến|du lịch|chơi/i.test(w.vietnamese || '')) {
                            cText = `听说很多人都喜欢${w.chinese}，我也想试试看。`;
                            vText = `Nghe nói nhiều người đều thích ${w.vietnamese}, tôi cũng muốn thử xem sao.`;
                        } else if (/thích|yêu|muốn/i.test(w.vietnamese || '')) {
                            cText = `我也很${w.chinese}这样，感觉生活很充实。`;
                            vText = `Tôi cũng rất ${w.vietnamese} như vậy, cảm thấy cuộc sống rất trọn vẹn.`;
                        } else if (/bạn|thầy|cô|người|bác sĩ|lưu học sinh/i.test(w.vietnamese || '')) {
                            cText = `我的${w.chinese}也经常跟我说起这件事情。`;
                            vText = `${w.vietnamese} của tôi cũng thường nói với tôi về chuyện này.`;
                        } else if (/gì|nào|ai|đâu/i.test(w.vietnamese || '')) {
                            cText = `请问你还想了解${w.chinese}呢？`;
                            vText = `Xin hỏi bạn còn muốn tìm hiểu ${w.vietnamese} nữa không?`;
                        } else {
                            cText = `说到${w.chinese}，我觉得这真的很有意义。`;
                            vText = `Nói đến ${w.vietnamese}, tôi thấy điều này thực sự rất có ý nghĩa.`;
                        }

                        lines.push({
                            speaker,
                            speakerName,
                            chinese: cText,
                            pinyin: generatePinyin(cText),
                            vietnamese: vText,
                            usedWords: [w.chinese]
                        });
                    }
                });

                // Closing exchange
                lines.push({
                    speaker: 'A',
                    speakerName: '小明',
                    chinese: '太好了，今天跟你聊天收获很多！下次再见。',
                    pinyin: generatePinyin('太好了，今天跟你聊天收获很多！下次再见。'),
                    vietnamese: 'Tuyệt quá, hôm nay trò chuyện cùng bạn học được rất nhiều! Hẹn gặp lại lần sau.',
                    usedWords: targetChineseList.filter(c => '太好了，今天跟你聊天收获很多！下次再见。'.includes(c))
                });

                lines.push({
                    speaker: 'B',
                    speakerName: '小华',
                    chinese: '好啊，祝你今天过得愉快，再见！',
                    pinyin: generatePinyin('好啊，祝你今天过得愉快，再见！'),
                    vietnamese: 'Được thôi, chúc bạn hôm nay vui vẻ, tạm biệt!',
                    usedWords: targetChineseList.filter(c => '好啊，祝你今天过得愉快，再见！'.includes(c))
                });
            } else {
                // STORY / NARRATIVE GENERATOR
                lines.push({
                    chinese: '今天天气非常晴朗，阳光明媚。',
                    pinyin: generatePinyin('今天天气非常晴朗，阳光明媚。'),
                    vietnamese: 'Hôm nay thời tiết vô cùng trong xanh, ánh nắng rạng rỡ.',
                    usedWords: []
                });

                lines.push({
                    chinese: '小明出门的时候，心情感到特别舒畅。',
                    pinyin: generatePinyin('小明出门的时候，心情感到特别舒畅。'),
                    vietnamese: 'Lúc Tiểu Minh ra ngoài, tâm trạng cảm thấy đặc biệt thư thái.',
                    usedWords: []
                });

                words.forEach((w) => {
                    let matchedTpl = null;
                    if (sentenceTemplates && sentenceTemplates.length > 0) {
                        matchedTpl = sentenceTemplates.find(s => s.chinese && s.chinese.includes(w.chinese));
                    }

                    if (matchedTpl) {
                        lines.push({
                            chinese: matchedTpl.chinese,
                            pinyin: matchedTpl.pinyin || generatePinyin(matchedTpl.chinese),
                            vietnamese: matchedTpl.vietnamese || 'Mẫu câu ôn tập',
                            usedWords: [w.chinese]
                        });
                    } else {
                        let cText = '';
                        let vText = '';

                        if (/uống|cà phê|trà|nước|ăn/i.test(w.vietnamese || '')) {
                            cText = `小明在一家安静的店里享用了${w.chinese}。`;
                            vText = `Tiểu Minh thưởng thức ${w.vietnamese} tại một quán yên tĩnh.`;
                        } else if (/đi|đến|du lịch|chơi/i.test(w.vietnamese || '')) {
                            cText = `他打算不久后就要${w.chinese}，探索更多有趣的地方。`;
                            vText = `Cậu ấy dự định không lâu nữa sẽ ${w.vietnamese}, khám phá thêm nhiều nơi thú vị.`;
                        } else if (/bạn|thầy|cô|người|gia đình/i.test(w.vietnamese || '')) {
                            cText = `路上他碰见了自己的${w.chinese}，大家互相热情问好。`;
                            vText = `Trên đường cậu ấy tình cờ gặp ${w.vietnamese} của mình, mọi người nhiệt tình chào hỏi nhau.`;
                        } else {
                            cText = `每一次接触到${w.chinese}，他都觉得学习中文是一件快乐的事。`;
                            vText = `Mỗi lần tiếp xúc với ${w.vietnamese}, cậu ấy đều thấy học tiếng Trung là một niềm vui.`;
                        }

                        lines.push({
                            chinese: cText,
                            pinyin: generatePinyin(cText),
                            vietnamese: vText,
                            usedWords: [w.chinese]
                        });
                    }
                });

                lines.push({
                    chinese: '这一天过得充实而有意义，小明心里充满期待。',
                    pinyin: generatePinyin('这一天过得充实而有意义，小明心里充满期待。'),
                    vietnamese: 'Ngày hôm nay trôi qua thật trọn vẹn và ý nghĩa, trong lòng Tiểu Minh tràn đầy hy vọng.',
                    usedWords: []
                });
            }

            // Fill all usedWords accurately
            lines.forEach(l => {
                const found = targetChineseList.filter(c => l.chinese.includes(c));
                l.usedWords = [...new Set([...(l.usedWords || []), ...found])];
            });

            currentStory = {
                id: Date.now(),
                title: titleChinese,
                titlePinyin: titlePinyin,
                titleViet: titleViet,
                type: type,
                theme: theme,
                createdAt: new Date().toLocaleString('vi-VN'),
                targetWords: words,
                lines: lines
            };

            hideLoading();
            renderCurrentStory();
            status(`✨ Đã tạo thành công ${isConv ? 'đoạn hội thoại' : 'mẩu chuyện'} ôn tập!`, 'success');
        } catch (err) {
            hideLoading();
            console.error('Error generating smart story:', err);
            status('❌ Lỗi tạo bài: ' + err.message, 'error');
        }
    }, 350);
}

window.generateGeminiStory = async function (type, words, lengthVal) {
    const apiKey = localStorage.getItem('gemini-api-key');
    if (!apiKey) {
        status('⚠️ Chưa nhập Gemini API Key. Đang tạo bằng Trình tạo thông minh...', 'warning');
        generateSmartStory(type, words, lengthVal);
        return;
    }

    const lengthCount = lengthVal === 'short' ? '4-5' : (lengthVal === 'long' ? '9-12' : '6-8');
    const wordListStr = words.map(w => `${w.chinese} (${w.pinyin || ''} - ${w.vietnamese || w.meaning || ''})`).join(', ');

    showLoading('🤖 AI đang sáng tác bài học...', 'Đang kết hợp ngữ cảnh và từ vựng...');

    const promptText = `Bạn là giáo viên tiếng Trung. Tạo một ${type === 'conversation' ? 'đoạn hội thoại tự nhiên giữa 2 nhân vật (A: 小明, B: 小华)' : 'mẩu chuyện ngắn sinh động'} tiếng Trung trình độ HSK 1-3.
Từ vựng mục tiêu cần đưa vào bài: ${wordListStr}.
Độ dài: khoảng ${lengthCount} câu.

YÊU CẦU: Trả về DUY NHẤT một mã JSON hợp lệ (không kèm Markdown code fence):
{
  "title": "Tiêu đề tiếng Trung",
  "titlePinyin": "Pinyin tiêu đề có dấu",
  "titleViet": "Dịch tiếng Việt tiêu đề",
  "type": "${type}",
  "theme": "Chủ đề bài học ngắn gọn",
  "lines": [
    {
      "speaker": "A",
      "speakerName": "小明",
      "chinese": "Câu tiếng Trung",
      "pinyin": "Pinyin câu",
      "vietnamese": "Dịch tiếng Việt",
      "usedWords": ["từ mục tiêu xuất hiện"]
    }
  ]
}`;

    try {
        const response = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.7
                    }
                })
            },
            15000
        );

        hideLoading();

        if (response.ok) {
            const data = await response.json();
            const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textOutput) {
                const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                parsed.id = Date.now();
                parsed.createdAt = new Date().toLocaleString('vi-VN');
                parsed.targetWords = words;
                currentStory = parsed;
                renderCurrentStory();
                status('✅ AI đã tạo thành công bài ôn tập!', 'success');
                return;
            }
        }
        throw new Error(`API trả về mã lỗi: ${response.status}`);
    } catch (err) {
        hideLoading();
        console.warn('Gemini AI generation failed, falling back to smart built-in:', err);
        status(`⚠️ Lỗi AI (${err.message}). Chuyển sang Trình tạo thông minh!`, 'warning');
        generateSmartStory(type, words, lengthVal);
    }
};

window.copyAIPrompt = function () {
    if (targetStoryWords.length === 0) {
        status('⚠️ Hãy chọn từ vựng mục tiêu trước!', 'error');
        return;
    }
    const lengthVal = document.getElementById('story-length')?.value || 'medium';
    const lengthCount = lengthVal === 'short' ? '4-5' : (lengthVal === 'long' ? '9-12' : '6-8');
    const wordListStr = targetStoryWords.map(w => `${w.chinese} (${w.pinyin || ''} - ${w.vietnamese || w.meaning || ''})`).join(', ');

    const promptText = `Bạn là một giáo viên dạy tiếng Trung. Hãy tạo một ${currentStoryType === 'conversation' ? 'đoạn hội thoại tự nhiên giữa 2 nhân vật (A: 小明, B: 小华)' : 'mẩu chuyện ngắn sinh động'} tiếng Trung trình độ HSK 1-3 để ôn tập các từ vựng sau:
Từ vựng mục tiêu: ${wordListStr}
Độ dài: khoảng ${lengthCount} câu.

Vui lòng trả về DUY NHẤT một chuỗi JSON theo cấu trúc sau (không kèm giải thích bên ngoài):
{
  "title": "Tiêu đề tiếng Trung",
  "titlePinyin": "Pinyin tiêu đề có dấu",
  "titleViet": "Nghĩa tiếng Việt tiêu đề",
  "type": "${currentStoryType}",
  "theme": "Chủ đề ngắn gọn",
  "lines": [
    {
      "speaker": "A",
      "speakerName": "小明",
      "chinese": "Câu tiếng Trung",
      "pinyin": "Pinyin đầy đủ có dấu",
      "vietnamese": "Dịch nghĩa tiếng Việt",
      "usedWords": ["từ vựng mục tiêu được dùng trong câu"]
    }
  ]
}`;

    navigator.clipboard.writeText(promptText).then(() => {
        status('📋 Đã sao chép Prompt! Dán vào ChatGPT/Gemini rồi bấm "Dán Kết Quả" nhé!', 'success');
    }).catch(() => {
        status('⚠️ Không thể tự động sao chép, hãy cấp quyền clipboard cho trình duyệt', 'error');
    });
};

window.toggleImportAIModal = function () {
    const modal = document.getElementById('import-ai-modal');
    if (modal) {
        modal.classList.toggle('show');
        if (modal.classList.contains('show')) {
            const ta = document.getElementById('ai-import-text');
            if (ta) { ta.value = ''; ta.focus(); }
        }
    }
};

window.applyImportedAIContent = function () {
    const ta = document.getElementById('ai-import-text');
    if (!ta || !ta.value.trim()) {
        status('⚠️ Vui lòng dán nội dung từ AI vào ô!', 'error');
        return;
    }

    try {
        let text = ta.value.trim();
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.slice(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(text);
        if (!data.lines || !Array.isArray(data.lines) || data.lines.length === 0) {
            throw new Error('Dữ liệu JSON không chứa danh sách các câu (lines)!');
        }

        data.id = Date.now();
        data.createdAt = new Date().toLocaleString('vi-VN');
        data.type = data.type || currentStoryType;
        data.targetWords = targetStoryWords.length > 0 ? targetStoryWords : [];

        data.lines.forEach((l, idx) => {
            if (!l.pinyin && l.chinese) l.pinyin = generatePinyin(l.chinese);
            if (!l.speaker) l.speaker = (idx % 2 === 0 ? 'A' : 'B');
            if (!l.speakerName) l.speakerName = (l.speaker === 'A' ? '小明' : '小华');
        });

        currentStory = data;
        toggleImportAIModal();
        renderCurrentStory();
        status('✨ Đã tải và hiển thị bài học thành công!', 'success');
    } catch (e) {
        status(`❌ Lỗi định dạng JSON: ${e.message}`, 'error');
    }
};

window.renderCurrentStory = function () {
    const container = document.getElementById('current-story-container');
    if (!container || !currentStory) return;

    container.style.display = 'block';

    const isConv = (currentStory.type === 'conversation');
    const targetWordsList = currentStory.targetWords || targetStoryWords || [];
    const targetWordsSet = new Set(targetWordsList.map(w => w.chinese));

    // Format lines with interactive segmentation
    const linesHtml = currentStory.lines.map((line, index) => {
        const formattedChinese = renderInteractiveSentence(line.chinese, targetWordsSet, storyIsQuiz);

        if (isConv) {
            const isSpeakerA = (line.speaker === 'A');
            return `
                <div class="dialogue-bubble ${isSpeakerA ? 'speaker-a' : 'speaker-b'}" id="story-line-${index}">
                    <div class="dialogue-avatar">${isSpeakerA ? 'A' : 'B'}</div>
                    <div class="dialogue-content">
                        <div class="dialogue-speaker-name">${line.speakerName || (isSpeakerA ? '小明' : '小华')}</div>
                        <div class="dialogue-chinese">${formattedChinese}</div>
                        ${storyShowPinyin ? `<div class="dialogue-pinyin">${line.pinyin}</div>` : ''}
                        ${storyShowViet ? `<div class="dialogue-viet">${line.vietnamese}</div>` : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0">
                        <button class="action-btn" style="width:36px; height:36px; font-size:1.1rem"
                            onclick="startJoggingMode(${index})" title="Nghe từ câu này kèm dịch nghĩa (Chạy bộ)">▶️</button>
                        <button class="action-btn" style="width:36px; height:36px; font-size:0.95rem"
                            onclick="speak('${line.chinese.replace(/'/g, "\\'")}')" title="Phát âm nhanh tiếng Trung">🔊</button>
                        <button class="action-btn" style="width:36px; height:36px; font-size:0.85rem"
                            onclick="downloadSentenceAudio('${line.chinese.replace(/'/g, "\\'")}', 'zh-CN', 'Cau_${index + 1}_TiengTrung.mp3')" title="Tải file MP3 câu này về máy">📥</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="narrative-sentence" id="story-line-${index}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px">
                        <div style="flex:1">
                            <span class="sentence-badge" style="background:#0ea5e9; font-size:0.75rem; margin-bottom:6px">Câu ${index + 1}</span>
                            <div class="narrative-chinese">${formattedChinese}</div>
                            ${storyShowPinyin ? `<div class="narrative-pinyin">${line.pinyin}</div>` : ''}
                            ${storyShowViet ? `<div class="narrative-viet">${line.vietnamese}</div>` : ''}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0">
                            <button class="action-btn" style="width:36px; height:36px; font-size:1.1rem"
                                onclick="startJoggingMode(${index})" title="Nghe từ câu này kèm dịch nghĩa (Chạy bộ)">▶️</button>
                            <button class="action-btn" style="width:36px; height:36px; font-size:0.95rem"
                                onclick="speak('${line.chinese.replace(/'/g, "\\'")}')" title="Phát âm nhanh tiếng Trung">🔊</button>
                            <button class="action-btn" style="width:36px; height:36px; font-size:0.85rem"
                                onclick="downloadSentenceAudio('${line.chinese.replace(/'/g, "\\'")}', 'zh-CN', 'Cau_${index + 1}_TiengTrung.mp3')" title="Tải file MP3 câu này về máy">📥</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Vocab breakdown cards
    const vocabBreakdownHtml = targetWordsList.map(w => {
        return `
            <div class="vocab-breakdown-item">
                <div>
                    <div style="font-size:1.2rem; font-weight:700; color:var(--g8)">${w.chinese}</div>
                    <div style="font-size:0.85rem; color:var(--p); font-style:italic">${w.pinyin || ''}</div>
                    <div style="font-size:0.9rem; color:var(--g6)">${w.vietnamese || w.meaning || ''}</div>
                </div>
                <div style="display:flex; gap:6px">
                    <button class="action-btn" style="width:34px; height:34px; font-size:1rem" onclick="speak('${w.chinese.replace(/'/g, "\\'")}')" title="Phát âm">🔊</button>
                    <button class="action-btn" style="width:34px; height:34px; font-size:1rem" onclick="showStrokeOrder('${w.chinese.replace(/'/g, "\\'")}')" title="Tập viết nét">✍️</button>
                    <button class="action-btn ${w.learned ? 'learned' : ''}" style="width:34px; height:34px; font-size:1rem" onclick="toggleStoryWordLearned(${w.id})" title="Đã thuộc">
                        ${w.learned ? '✅' : '⭕'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="current-story-card">
            <!-- Header -->
            <div class="story-card-header">
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px">
                        <span class="sentence-badge" style="background:${isConv ? 'var(--p)' : 'var(--s)'}">
                            ${isConv ? '💬 Đoạn Hội Thoại' : '📖 Mẩu Truyện Ngắn'}
                        </span>
                        <span style="font-size:0.85rem; color:var(--g6)">📂 ${currentStory.theme || 'Chủ đề ôn tập'}</span>
                    </div>
                    <h2 class="story-title-chinese">${currentStory.title || '日常生活'}</h2>
                    ${storyShowPinyin ? `<div class="story-title-pinyin">${currentStory.titlePinyin || ''}</div>` : ''}
                    ${storyShowViet ? `<div class="story-title-viet">${currentStory.titleViet || ''}</div>` : ''}
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap">
                    <button class="btn btn-sm" onclick="saveCurrentStory()" style="background:#f59e0b" title="Lưu bài này để ôn lại sau">
                        ⭐ Lưu bài
                    </button>
                    <button class="btn btn-sm" onclick="triggerStoryGeneration()" style="background:var(--p)">
                        🔄 Đổi bài mới
                    </button>
                </div>
            </div>

            <!-- Jogging Mode CTA Banner -->
            <div class="jogging-cta-banner">
                <div style="display:flex; align-items:center; gap:12px">
                    <span class="jog-pulse-icon" style="font-size:2rem; line-height:1">🏃‍♂️</span>
                    <div>
                        <div style="font-weight:700; font-size:1.05rem; color:#fff">Chế Độ Nghe Thụ Động Khi Chạy Bộ</div>
                        <div style="font-size:0.85rem; color:#cbd5e1">Tự động đọc Tiếng Trung ➔ đọc Dịch nghĩa Tiếng Việt ➔ lặp lại liên tục, hỗ trợ chạy nền khi khóa màn hình & điều khiển qua tai nghe Bluetooth.</div>
                    </div>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap">
                    <button class="btn" onclick="startJoggingMode(0)" style="background:linear-gradient(135deg, #10b981, #059669); font-weight:700; white-space:nowrap; padding:10px 18px; box-shadow:0 4px 15px rgba(16, 185, 129, 0.4)">
                        ▶️ Bắt Đầu Nghe
                    </button>
                    <button class="btn" onclick="openAudioDownloadModal()" style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.45); color:#fff; font-weight:600; white-space:nowrap; padding:10px 16px;">
                        📥 Tải File Nghe MP3
                    </button>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="story-toolbar">
                <button class="story-tool-btn active-jogging" onclick="startJoggingMode(0)" title="Nghe tiếng Trung kèm dịch tiếng Việt liên tục khi chạy bộ">
                    🏃‍♂️ Nghe Chạy Bộ (Trung + Việt)
                </button>
                <button class="story-tool-btn" onclick="openAudioDownloadModal()" style="background:#0284c7; color:#fff; font-weight:600" title="Tải file MP3 hoặc Playlist .m3u về điện thoại">
                    📥 Tải File Nghe MP3
                </button>
                <button class="story-tool-btn ${storyShowPinyin ? 'active' : ''}" onclick="toggleStoryPinyin()">
                    🔤 ${storyShowPinyin ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
                </button>
                <button class="story-tool-btn ${storyShowViet ? 'active' : ''}" onclick="toggleStoryViet()">
                    🇻🇳 ${storyShowViet ? 'Ẩn Dịch Nghĩa' : 'Hiện Dịch Nghĩa'}
                </button>
                <button class="story-tool-btn ${storyIsQuiz ? 'active' : ''}" onclick="toggleStoryQuiz()">
                    📝 ${storyIsQuiz ? 'Tắt Câu Đố Điền Từ' : 'Luyện Điền Từ (Quiz)'}
                </button>
                <button class="story-tool-btn" id="btn-speak-all" onclick="speakStorySequence()">
                    🔊 Đọc toàn bài
                </button>
            </div>

            <!-- Legend Bar -->
            <div class="story-legend-bar">
                <span style="font-weight:700; color:var(--g8); margin-right:4px">💡 Chú thích:</span>
                <span class="legend-item"><span class="legend-dot target"></span> Từ mục tiêu ôn tập</span>
                <span class="legend-item"><span class="legend-dot known"></span> Đã có trong thư viện</span>
                <span class="legend-item"><span class="legend-dot new"></span> Từ mới ngoài thư viện (chạm để xem &amp; lưu)</span>
            </div>

            <!-- Content -->
            <div class="${isConv ? 'dialogue-flow' : 'narrative-flow'}">
                ${linesHtml}
            </div>

            <!-- Target Vocab Breakdown -->
            <div class="vocab-breakdown-card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">
                    <h4 style="color:var(--g8); font-size:1.05rem">🎯 Từ Vựng Trọng Tâm Trong Bài (${targetWordsList.length} từ)</h4>
                    <span style="font-size:0.85rem; color:var(--g6)">Nhấn vào từng từ trong bài hoặc bên dưới để xem nét viết và phát âm</span>
                </div>
                <div class="vocab-breakdown-grid">
                    ${vocabBreakdownHtml}
                </div>
            </div>
        </div>
    `;
};

window.toggleStoryPinyin = function () {
    storyShowPinyin = !storyShowPinyin;
    renderCurrentStory();
};

window.toggleStoryViet = function () {
    storyShowViet = !storyShowViet;
    renderCurrentStory();
};

window.toggleStoryQuiz = function () {
    storyIsQuiz = !storyIsQuiz;
    renderCurrentStory();
    if (storyIsQuiz) {
        status('📝 Đã bật chế độ Luyện Điền Từ: Nhấn vào các dấu "?" để mở đáp án!', 'success');
    }
};

window.revealStoryCloze = function (el, word) {
    el.textContent = word;
    el.classList.add('revealed');
    el.onclick = () => showWordDetail(word);
    speak(word);
};

window.toggleStoryWordLearned = function (id) {
    toggleLearnedById(id);
    renderCurrentStory();
};

// ==================== JOGGING / PASSIVE AUDIO PLAYER ENGINE ====================

let isJoggingActive = false;
let isJoggingPaused = false;
let jogCurrentIndex = 0;
let jogTimeoutId = null;
let jogChineseSpokenCount = 0;

let jogSettings = {
    includeViet: true,           // Đọc kèm dịch nghĩa tiếng Việt
    loopArticle: true,           // Lặp lại toàn bộ bài liên tục
    repeatChinese: false,        // Đọc tiếng Trung 2 lần trước khi dịch
    pauseAfterChinese: 900,      // Khoảng nghỉ sau tiếng Trung (ms)
    pauseBetweenSentences: 2000, // Khoảng nghỉ giữa các câu (ms)
    rateChinese: 0.85,           // Tốc độ tiếng Trung
    rateVietnamese: 1.0,         // Tốc độ tiếng Việt
    audioEngine: 'stream'        // 'stream' (HTML5 Audio Stream - khóa màn hình) hoặc 'speech' (Web Speech API)
};

// Tự động nạp cấu hình đã lưu
try {
    const savedJog = localStorage.getItem('jog-settings');
    if (savedJog) {
        jogSettings = Object.assign(jogSettings, JSON.parse(savedJog));
    }
} catch (e) {}

// HTML5 Stream Audio Engine (chạy ngầm khi khóa màn hình điện thoại)
let jogHtmlAudio = null;

function getJogHtmlAudio() {
    if (!jogHtmlAudio) {
        jogHtmlAudio = new Audio();
        jogHtmlAudio.preload = 'auto';
        jogHtmlAudio.setAttribute('playsinline', '');
        jogHtmlAudio.setAttribute('webkit-playsinline', '');
    }
    return jogHtmlAudio;
}

function stopStreamAudio() {
    if (jogHtmlAudio) {
        try {
            jogHtmlAudio.pause();
            jogHtmlAudio.currentTime = 0;
            jogHtmlAudio.onended = null;
            jogHtmlAudio.onerror = null;
        } catch (e) {}
    }
}

function getGoogleTTSUrl(text, lang) {
    const targetLang = (lang === 'zh-CN' || lang === 'zh') ? 'zh-CN' : 'vi';
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent((text || '').trim())}`;
}

function playStreamAudio(text, lang, rate, onEndCallback, onErrorCallback) {
    stopStreamAudio();
    const audio = getJogHtmlAudio();
    const url = getGoogleTTSUrl(text, lang);
    audio.src = url;
    audio.playbackRate = rate || 1.0;

    audio.onended = () => {
        audio.onended = null;
        audio.onerror = null;
        if (typeof onEndCallback === 'function') onEndCallback();
    };

    audio.onerror = (e) => {
        audio.onended = null;
        audio.onerror = null;
        console.warn('HTML5 Audio stream error, falling back:', e);
        if (typeof onErrorCallback === 'function') onErrorCallback();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => {
            console.warn('Audio play() rejected or blocked:', err);
            audio.onended = null;
            audio.onerror = null;
            if (typeof onErrorCallback === 'function') onErrorCallback();
        });
    }
}

// Background keepalive audio for mobile lock screen / jogging
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
let silentAudioEl = null;

function startAudioKeepalive() {
    try {
        if (!silentAudioEl) {
            silentAudioEl = new Audio(SILENT_AUDIO_URI);
            silentAudioEl.loop = true;
        }
        silentAudioEl.play().catch(() => {});
    } catch (e) {}
}

function stopAudioKeepalive() {
    try {
        if (silentAudioEl) silentAudioEl.pause();
    } catch (e) {}
}

// MediaSession setup for Bluetooth headphones & lock screen
function setupMediaSessionHandlers() {
    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('play', () => resumeJoggingPlayer());
            navigator.mediaSession.setActionHandler('pause', () => pauseJoggingPlayer());
            navigator.mediaSession.setActionHandler('nexttrack', () => jogNextSentence());
            navigator.mediaSession.setActionHandler('previoustrack', () => jogPrevSentence());
            navigator.mediaSession.setActionHandler('stop', () => stopJoggingMode());
        } catch (e) {}
    }
}

function updateMediaSession(chinese, vietnamese, index, total) {
    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `${chinese}`,
                artist: `${vietnamese || 'Đang phát...' }`,
                album: `🏃‍♂️ ${currentStory?.title || 'Luyện Nghe Thụ Động'} (${index + 1}/${total})`,
                artwork: [
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
                ]
            });
            navigator.mediaSession.playbackState = isJoggingPaused ? 'paused' : 'playing';
        } catch (e) {}
    }
}

window.startJoggingMode = function (startIndex = 0) {
    if (!currentStory || !currentStory.lines || currentStory.lines.length === 0) {
        status('⚠️ Chưa có bài nào để nghe. Hãy tạo bài mới hoặc chọn bài đã lưu!', 'warning');
        return;
    }

    if (!('speechSynthesis' in window)) {
        status('⚠️ Trình duyệt của bạn không hỗ trợ Web Speech API phát âm', 'error');
        return;
    }

    isJoggingActive = true;
    isJoggingPaused = false;
    jogCurrentIndex = Math.max(0, Math.min(startIndex, currentStory.lines.length - 1));
    jogChineseSpokenCount = 0;

    startAudioKeepalive();
    setupMediaSessionHandlers();

    const container = document.getElementById('jogging-player-container');
    if (container) {
        container.style.display = 'block';
    }

    const btnPlayPause = document.getElementById('btn-jog-playpause');
    if (btnPlayPause) btnPlayPause.innerHTML = '⏸️';

    updateJogPlayerUI();
    playJoggingSentence();
    status('🏃‍♂️ Đã bật chế độ Nghe Chạy Bộ! (Tiếng Trung ➔ Dịch Việt)', 'success');
};

window.stopJoggingMode = function () {
    isJoggingActive = false;
    isJoggingPaused = false;
    if (jogTimeoutId) clearTimeout(jogTimeoutId);
    stopStreamAudio();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    stopAudioKeepalive();

    document.querySelectorAll('.sentence-speaking').forEach(el => el.classList.remove('sentence-speaking'));

    const container = document.getElementById('jogging-player-container');
    if (container) {
        container.style.display = 'none';
        container.classList.remove('fullscreen');
    }

    const btn = document.getElementById('btn-speak-all');
    if (btn) btn.innerHTML = '🔊 Đọc toàn bài';

    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'none'; } catch (e) {}
    }
};

window.toggleJoggingPlayPause = function () {
    if (!isJoggingActive) {
        startJoggingMode(0);
        return;
    }

    if (isJoggingPaused) {
        resumeJoggingPlayer();
    } else {
        pauseJoggingPlayer();
    }
};

function pauseJoggingPlayer() {
    isJoggingPaused = true;
    if (jogTimeoutId) clearTimeout(jogTimeoutId);
    stopStreamAudio();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    const btn = document.getElementById('btn-jog-playpause');
    if (btn) btn.innerHTML = '▶️';
    const statusText = document.getElementById('jog-status-text');
    if (statusText) statusText.textContent = '⏸️ Đang tạm dừng';

    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
    }
}

function resumeJoggingPlayer() {
    isJoggingPaused = false;
    const btn = document.getElementById('btn-jog-playpause');
    if (btn) btn.innerHTML = '⏸️';
    jogChineseSpokenCount = 0;
    playJoggingSentence();

    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing'; } catch (e) {}
    }
}

window.jogNextSentence = function () {
    if (!currentStory || !currentStory.lines) return;
    if (jogTimeoutId) clearTimeout(jogTimeoutId);
    stopStreamAudio();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    jogCurrentIndex = (jogCurrentIndex + 1) % currentStory.lines.length;
    jogChineseSpokenCount = 0;
    isJoggingPaused = false;
    const btn = document.getElementById('btn-jog-playpause');
    if (btn) btn.innerHTML = '⏸️';

    playJoggingSentence();
};

window.jogPrevSentence = function () {
    if (!currentStory || !currentStory.lines) return;
    if (jogTimeoutId) clearTimeout(jogTimeoutId);
    stopStreamAudio();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    jogCurrentIndex = (jogCurrentIndex - 1 + currentStory.lines.length) % currentStory.lines.length;
    jogChineseSpokenCount = 0;
    isJoggingPaused = false;
    const btn = document.getElementById('btn-jog-playpause');
    if (btn) btn.innerHTML = '⏸️';

    playJoggingSentence();
};

window.jogReplayCurrent = function () {
    if (jogTimeoutId) clearTimeout(jogTimeoutId);
    stopStreamAudio();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    jogChineseSpokenCount = 0;
    isJoggingPaused = false;
    const btn = document.getElementById('btn-jog-playpause');
    if (btn) btn.innerHTML = '⏸️';
    playJoggingSentence();
};

function playJoggingSentence() {
    if (!isJoggingActive || isJoggingPaused) return;
    if (!currentStory || !currentStory.lines || currentStory.lines.length === 0) {
        stopJoggingMode();
        return;
    }

    if (jogCurrentIndex >= currentStory.lines.length) {
        if (jogSettings.loopArticle) {
            jogCurrentIndex = 0;
            jogChineseSpokenCount = 0;
            const statusText = document.getElementById('jog-status-text');
            if (statusText) statusText.textContent = '🔄 Hết bài! Lặp lại từ đầu...';
            jogTimeoutId = setTimeout(playJoggingSentence, 1500);
            return;
        } else {
            stopJoggingMode();
            status('🎉 Đã hoàn thành toàn bộ bài nghe!', 'success');
            return;
        }
    }

    const currentLine = currentStory.lines[jogCurrentIndex];
    if (!currentLine) return;

    document.querySelectorAll('.sentence-speaking').forEach(el => el.classList.remove('sentence-speaking'));
    const lineEl = document.getElementById(`story-line-${jogCurrentIndex}`);
    if (lineEl) {
        lineEl.classList.add('sentence-speaking');
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateJogPlayerUI();
    updateMediaSession(currentLine.chinese, currentLine.vietnamese, jogCurrentIndex, currentStory.lines.length);

    speakChineseStep(currentLine);
}

function speakChineseStep(currentLine) {
    if (!isJoggingActive || isJoggingPaused) return;

    const statusText = document.getElementById('jog-status-text');
    if (statusText) {
        statusText.textContent = (jogSettings.repeatChinese && jogChineseSpokenCount === 1)
            ? '🔊 Đang đọc tiếng Trung (lần 2)...'
            : '🔊 Đang đọc tiếng Trung...';
    }

    const onZhEnd = () => {
        if (!isJoggingActive || isJoggingPaused) return;

        jogChineseSpokenCount++;
        if (jogSettings.repeatChinese && jogChineseSpokenCount < 2) {
            jogTimeoutId = setTimeout(() => {
                speakChineseStep(currentLine);
            }, 600);
            return;
        }

        jogChineseSpokenCount = 0;

        if (jogSettings.includeViet && currentLine.vietnamese) {
            jogTimeoutId = setTimeout(() => {
                speakVietnameseStep(currentLine);
            }, jogSettings.pauseAfterChinese);
        } else {
            scheduleNextSentenceGap();
        }
    };

    const onZhFallback = () => {
        if (!isJoggingActive || isJoggingPaused) return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const zhUtterance = new SpeechSynthesisUtterance(currentLine.chinese);
            zhUtterance.lang = 'zh-CN';
            zhUtterance.rate = jogSettings.rateChinese;
            zhUtterance.onend = onZhEnd;
            zhUtterance.onerror = (e) => {
                console.warn('ZH speech fallback error, advancing:', e);
                scheduleNextSentenceGap();
            };
            window.speechSynthesis.speak(zhUtterance);
        } else {
            scheduleNextSentenceGap();
        }
    };

    if (jogSettings.audioEngine === 'stream') {
        playStreamAudio(currentLine.chinese, 'zh-CN', jogSettings.rateChinese, onZhEnd, onZhFallback);
    } else {
        onZhFallback();
    }
}

function speakVietnameseStep(currentLine) {
    if (!isJoggingActive || isJoggingPaused) return;

    const statusText = document.getElementById('jog-status-text');
    if (statusText) statusText.textContent = '🇻🇳 Đang đọc dịch nghĩa tiếng Việt...';

    const onViEnd = () => {
        if (!isJoggingActive || isJoggingPaused) return;
        scheduleNextSentenceGap();
    };

    const onViFallback = () => {
        if (!isJoggingActive || isJoggingPaused) return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const viUtterance = new SpeechSynthesisUtterance(currentLine.vietnamese);
            viUtterance.lang = 'vi-VN';
            viUtterance.rate = jogSettings.rateVietnamese;
            viUtterance.onend = onViEnd;
            viUtterance.onerror = (e) => {
                console.warn('VI speech fallback error, advancing:', e);
                scheduleNextSentenceGap();
            };
            window.speechSynthesis.speak(viUtterance);
        } else {
            scheduleNextSentenceGap();
        }
    };

    if (jogSettings.audioEngine === 'stream') {
        playStreamAudio(currentLine.vietnamese, 'vi', jogSettings.rateVietnamese, onViEnd, onViFallback);
    } else {
        onViFallback();
    }
}

function scheduleNextSentenceGap() {
    if (!isJoggingActive || isJoggingPaused) return;

    const statusText = document.getElementById('jog-status-text');
    const delaySec = Math.round(jogSettings.pauseBetweenSentences / 100) / 10;
    if (statusText) statusText.textContent = `⏱️ Nghỉ ${delaySec}s trước câu tiếp...`;

    jogTimeoutId = setTimeout(() => {
        if (!isJoggingActive || isJoggingPaused) return;
        jogCurrentIndex++;
        playJoggingSentence();
    }, jogSettings.pauseBetweenSentences);
}

function updateJogPlayerUI() {
    if (!currentStory || !currentStory.lines || !currentStory.lines[jogCurrentIndex]) return;

    const line = currentStory.lines[jogCurrentIndex];
    const total = currentStory.lines.length;

    const zhEl = document.getElementById('jog-current-chinese');
    const pyEl = document.getElementById('jog-current-pinyin');
    const viEl = document.getElementById('jog-current-viet');
    const progEl = document.getElementById('jog-progress-text');

    if (zhEl) zhEl.textContent = line.chinese;
    if (pyEl) pyEl.textContent = line.pinyin || generatePinyin(line.chinese);
    if (viEl) {
        if (jogSettings.includeViet) {
            viEl.textContent = line.vietnamese || '(Không có bản dịch)';
            viEl.style.display = 'block';
        } else {
            viEl.style.display = 'none';
        }
    }
    if (progEl) progEl.textContent = `Câu ${jogCurrentIndex + 1} / ${total}`;

    const indViet = document.getElementById('jog-ind-viet');
    const indLoop = document.getElementById('jog-ind-loop');
    const indDelay = document.getElementById('jog-ind-delay');
    const indRate = document.getElementById('jog-ind-rate');

    if (indViet) indViet.textContent = jogSettings.includeViet ? '🇻🇳 Dịch: Bật' : '🇻🇳 Dịch: Tắt';
    if (indLoop) indLoop.textContent = jogSettings.loopArticle ? '🔄 Lặp cả bài' : '➡️ Chạy 1 lần';
    if (indDelay) indDelay.textContent = `⏱️ Nghỉ ${jogSettings.pauseBetweenSentences / 1000}s`;
    if (indRate) indRate.textContent = `⚡ Tốc độ ${jogSettings.rateChinese}x`;
}

window.toggleJogSettingsModal = function () {
    const panel = document.getElementById('jog-settings-panel');
    if (panel) {
        panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
    }
};

window.toggleJogFullscreen = function () {
    const container = document.getElementById('jogging-player-container');
    if (container) {
        container.classList.toggle('fullscreen');
    }
};

window.updateJogSetting = function (key, value) {
    jogSettings[key] = value;
    try {
        localStorage.setItem('jog-settings', JSON.stringify(jogSettings));
    } catch (e) {}
    updateJogPlayerUI();
};

// ==================== AUDIO DOWNLOAD & EXPORT ====================

window.downloadStoryPlaylistM3U = function () {
    if (!currentStory || !currentStory.lines || currentStory.lines.length === 0) {
        status('⚠️ Chưa có bài đọc nào để tải playlist!', 'warning');
        return;
    }

    const title = currentStory.title || 'Bai_Hoc_Tieng_Trung';
    const safeTitle = title.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');

    let m3u = '#EXTM3U\n';
    m3u += `#PLAYLIST: ${title}\n\n`;

    currentStory.lines.forEach((line, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const zhUrl = getGoogleTTSUrl(line.chinese, 'zh-CN');
        m3u += `#EXTINF:-1, [Câu ${num}] ${line.chinese}\n`;
        m3u += `${zhUrl}\n\n`;

        if (line.vietnamese) {
            const viUrl = getGoogleTTSUrl(line.vietnamese, 'vi');
            m3u += `#EXTINF:-1, [Dịch ${num}] ${line.vietnamese}\n`;
            m3u += `${viUrl}\n\n`;
        }
    });

    const blob = new Blob([m3u], { type: 'audio/x-mpegurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    status('✅ Đã tải file Playlist (.m3u)! Mở bằng ứng dụng VLC hoặc app nghe nhạc trên máy để nghe nền.', 'success');
};

window.downloadSentenceAudio = function (text, lang, filename) {
    if (!text) return;
    const url = getGoogleTTSUrl(text, lang);
    const safeName = (filename || text.slice(0, 15)).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_') + '.mp3';

    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

window.openAudioDownloadModal = function () {
    if (!currentStory || !currentStory.lines || currentStory.lines.length === 0) {
        status('⚠️ Hãy tạo hoặc chọn một bài đọc trước khi tải file nghe!', 'warning');
        return;
    }

    const modal = document.getElementById('audio-download-modal');
    const listEl = document.getElementById('audio-download-sentence-list');
    const titleEl = document.getElementById('audio-modal-story-title');
    if (!modal) return;

    if (titleEl) {
        titleEl.textContent = currentStory.title || 'Bài học hiện tại';
    }

    if (listEl) {
        listEl.innerHTML = currentStory.lines.map((line, idx) => {
            const num = idx + 1;
            const zhUrl = getGoogleTTSUrl(line.chinese, 'zh-CN');
            const viUrl = line.vietnamese ? getGoogleTTSUrl(line.vietnamese, 'vi') : '';

            return `
                <div class="audio-download-row" style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; font-size:1rem; color:var(--g8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            <span style="color:#0ea5e9; margin-right:8px; font-weight:8px">#${num}</span>${line.chinese}
                        </div>
                        <div style="font-size:0.85rem; color:var(--g6); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                            ${line.vietnamese || ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <a href="${zhUrl}" download="Cau_${num}_TiengTrung.mp3" target="_blank" class="btn btn-sm" style="background:#0284c7; padding:7px 12px; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Tải file MP3 tiếng Trung">
                            🇨🇳 Tải MP3
                        </a>
                        ${line.vietnamese ? `
                            <a href="${viUrl}" download="Cau_${num}_DichViet.mp3" target="_blank" class="btn btn-sm btn-outline" style="padding:7px 12px; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Tải file MP3 dịch Việt">
                                🇻🇳 Dịch MP3
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    modal.classList.add('show');
};

window.closeAudioDownloadModal = function () {
    const modal = document.getElementById('audio-download-modal');
    if (modal) modal.classList.remove('show');
};

window.speakStorySequence = function () {
    // When clicking "Đọc toàn bài", start Jogging / Bilingual sequence from beginning
    if (isJoggingActive && !isJoggingPaused) {
        stopJoggingMode();
    } else {
        startJoggingMode(0);
    }
};

window.stopStorySequence = function () {
    stopJoggingMode();
};

window.showWordDetail = function (chinese) {
    if (!chinese) return;

    const modal = document.getElementById('word-detail-modal');
    if (!modal) return;

    // 1. Check if word is in vocab
    const inVocab = vocab.find(w => w.chinese === chinese);

    // 2. Check if it's a target word
    const targetWord = (currentStory && currentStory.targetWords && currentStory.targetWords.find(w => w.chinese === chinese)) ||
        (typeof targetStoryWords !== 'undefined' && targetStoryWords.find(w => w.chinese === chinese));

    // 3. Resolve pronunciation and meaning
    let pinyin = '';
    if (inVocab && inVocab.pinyin && inVocab.pinyin !== chinese) {
        pinyin = inVocab.pinyin;
    } else if (targetWord && targetWord.pinyin && targetWord.pinyin !== chinese) {
        pinyin = targetWord.pinyin;
    } else {
        pinyin = generatePinyin(chinese);
    }

    let meaning = (inVocab && (inVocab.vietnamese || inVocab.meaning)) ||
        (targetWord && (targetWord.vietnamese || targetWord.meaning)) ||
        getWordMeaning(chinese) || '';

    // Cache active word details
    currentWordDetail = {
        chinese,
        pinyin,
        meaning,
        vietnamese: meaning,
        inVocab: !!inVocab,
        vocabWord: inVocab || null
    };

    // DOM Elements
    const badgeEl = document.getElementById('detail-word-badge');
    const chineseEl = document.getElementById('detail-word-chinese');
    const pinyinEl = document.getElementById('detail-word-pinyin');
    const meaningDisplayEl = document.getElementById('detail-word-meaning');
    const meaningInputEl = document.getElementById('detail-meaning-input');
    const metaEl = document.getElementById('detail-word-meta');
    const topicSelectEl = document.getElementById('detail-topic-select');
    const existingActions = document.getElementById('detail-existing-actions');
    const newActions = document.getElementById('detail-new-actions');

    if (chineseEl) chineseEl.textContent = chinese;
    if (pinyinEl) pinyinEl.textContent = pinyin;

    // Populate topics dropdown
    if (topicSelectEl) {
        const topics = [...new Set(vocab.map(w => w.topic).filter(Boolean))];
        if (!topics.includes('Từ mới')) topics.unshift('Từ mới');
        if (!topics.includes('Thời tiết')) topics.push('Thời tiết');
        if (!topics.includes('Giao tiếp')) topics.push('Giao tiếp');

        let preferredTopic = 'Từ mới';
        if (currentStory && currentStory.theme) {
            if (/thời tiết/i.test(currentStory.theme)) preferredTopic = 'Thời tiết';
            else if (/cà phê|ẩm thực|ăn uống/i.test(currentStory.theme)) preferredTopic = 'Ăn uống';
            else if (/du lịch/i.test(currentStory.theme)) preferredTopic = 'Du lịch';
        }

        topicSelectEl.innerHTML = topics.map(t =>
            `<option value="${escapeQuotes(t)}" ${t === preferredTopic ? 'selected' : ''}>Chủ đề: ${escapeHtml(t)}</option>`
        ).join('');
    }

    if (inVocab) {
        // --- CASE A: WORD ALREADY IN VOCABULARY ---
        if (badgeEl) {
            if (inVocab.learned) {
                badgeEl.textContent = '✅ Đã thuộc trong Thư viện';
                badgeEl.style.background = '#dcfce7';
                badgeEl.style.color = '#15803d';
                badgeEl.style.border = '1px solid #86efac';
            } else {
                badgeEl.textContent = '📚 Đã có trong Thư viện';
                badgeEl.style.background = '#e0f2fe';
                badgeEl.style.color = '#0369a1';
                badgeEl.style.border = '1px solid #7dd3fc';
            }
        }

        if (meaningDisplayEl) {
            meaningDisplayEl.style.display = 'block';
            meaningDisplayEl.textContent = meaning || '(Chưa có giải nghĩa)';
        }
        if (meaningInputEl) meaningInputEl.style.display = 'none';

        if (metaEl) metaEl.textContent = `📁 Chủ đề: ${inVocab.topic || 'Cơ bản'} | Độ khó: ${inVocab.difficulty || 'Easy'}`;
        if (topicSelectEl) topicSelectEl.style.display = 'none';

        if (existingActions) existingActions.style.display = 'flex';
        if (newActions) newActions.style.display = 'none';

        const speakBtn = document.getElementById('btn-detail-speak');
        const strokeBtn = document.getElementById('btn-detail-stroke');
        const learnBtn = document.getElementById('btn-detail-learn');

        if (speakBtn) speakBtn.onclick = () => speak(chinese);
        if (strokeBtn) strokeBtn.onclick = () => { closeWordDetailModal(); showStrokeOrder(chinese); };
        if (learnBtn) {
            learnBtn.innerHTML = inVocab.learned ? '✅ Đã thuộc' : '⭕ Đánh dấu đã thuộc';
            learnBtn.onclick = () => {
                inVocab.learned = !inVocab.learned;
                save();
                status(`${inVocab.learned ? '✅ Đã thuộc' : '⭕ Chưa học'}: ${chinese}`, 'success');
                showWordDetail(chinese);
                if (document.getElementById('stories')?.classList.contains('active')) {
                    renderStoriesTab();
                    renderCurrentStory();
                }
                if (document.getElementById('library')?.classList.contains('active')) {
                    renderLibrary();
                }
            };
        }
    } else {
        // --- CASE B: NEW WORD OUTSIDE VOCABULARY ---
        if (badgeEl) {
            badgeEl.textContent = '✨ Từ mới ngoài Thư viện';
            badgeEl.style.background = '#fef3c7';
            badgeEl.style.color = '#b45309';
            badgeEl.style.border = '1px solid #fcd34d';
        }

        if (meaningDisplayEl) {
            meaningDisplayEl.style.display = 'block';
            meaningDisplayEl.textContent = meaning || 'Đang tra nghĩa... Bạn có thể nhập/sửa nghĩa bên dưới:';
        }

        if (meaningInputEl) {
            meaningInputEl.style.display = 'block';
            meaningInputEl.value = meaning || '';
        }

        if (metaEl) metaEl.textContent = 'Chọn chủ đề khi lưu:';
        if (topicSelectEl) topicSelectEl.style.display = 'inline-block';

        if (existingActions) existingActions.style.display = 'none';
        if (newActions) newActions.style.display = 'flex';

        const speakNewBtn = document.getElementById('btn-detail-speak-new');
        const strokeNewBtn = document.getElementById('btn-detail-stroke-new');
        if (speakNewBtn) speakNewBtn.onclick = () => speak(chinese);
        if (strokeNewBtn) strokeNewBtn.onclick = () => { closeWordDetailModal(); showStrokeOrder(chinese); };

        // Background lookup if meaning is still empty
        if (!meaning) {
            fetchWordDefinition(chinese).then(trans => {
                if (trans && currentWordDetail && currentWordDetail.chinese === chinese) {
                    currentWordDetail.meaning = trans;
                    currentWordDetail.vietnamese = trans;
                    if (meaningDisplayEl) meaningDisplayEl.textContent = trans;
                    if (meaningInputEl && !meaningInputEl.value) meaningInputEl.value = trans;
                }
            });
        }
    }

    modal.classList.add('show');
};

window.addCurrentModalWordToLibrary = function () {
    if (!currentWordDetail || !currentWordDetail.chinese) return;

    const chinese = currentWordDetail.chinese;

    // Check if already in library
    if (vocab.some(w => w.chinese === chinese)) {
        status(`ℹ️ Từ "${chinese}" đã có trong thư viện từ vựng!`, 'warning');
        showWordDetail(chinese);
        return;
    }

    const inputEl = document.getElementById('detail-meaning-input');
    const inputVal = inputEl ? inputEl.value.trim() : '';
    const finalMeaning = inputVal || currentWordDetail.meaning || currentWordDetail.vietnamese || 'Từ mới học';
    const pinyin = (currentWordDetail.pinyin && currentWordDetail.pinyin !== chinese) ? currentWordDetail.pinyin : generatePinyin(chinese);
    const topicSelect = document.getElementById('detail-topic-select');
    const selectedTopic = (topicSelect && topicSelect.value) ? topicSelect.value : 'Từ mới';

    const newWord = {
        id: Date.now(),
        chinese: chinese,
        vietnamese: finalMeaning,
        meaning: finalMeaning,
        pinyin: pinyin,
        topic: selectedTopic,
        difficulty: 'Easy',
        learned: false,
        nextReview: Date.now(),
        reviewCount: 0
    };

    vocab.unshift(newWord);
    save();
    buildCharMap();

    // Remember in dictionary
    BUILTIN_CHINESE_DICT[chinese] = finalMeaning;

    // Refresh UI
    renderLibrary();
    renderGroups();
    if (document.getElementById('stories')?.classList.contains('active')) {
        renderStoriesTab();
        renderCurrentStory();
    }
    if (document.getElementById('sentences')?.classList.contains('active')) {
        renderSentences();
    }

    status(`🎉 Đã thêm từ "${chinese}" (${pinyin}: ${finalMeaning}) vào thư viện!`, 'success');

    // Instantly refresh modal to show updated status ("Đã có trong Thư viện")
    showWordDetail(chinese);
};

window.lookupCurrentWordOnline = function () {
    if (!currentWordDetail || !currentWordDetail.chinese) return;
    const chinese = currentWordDetail.chinese;
    const url = `https://translate.google.com/?sl=zh-CN&tl=vi&text=${encodeURIComponent(chinese)}&op=translate`;
    window.open(url, '_blank');
};

window.closeWordDetailModal = function () {
    const modal = document.getElementById('word-detail-modal');
    if (modal) modal.classList.remove('show');
};

window.saveCurrentStory = function () {
    if (!currentStory) return;
    if (savedStories.some(s => s.id === currentStory.id)) {
        status('ℹ️ Bài này đã được lưu trước đó!', 'warning');
        return;
    }
    savedStories.unshift(currentStory);
    saveSavedStories();
    renderSavedStoriesList();

    const savedEl = document.getElementById('stories-saved-count');
    const savedBadgeEl = document.getElementById('saved-count-badge');
    if (savedEl) savedEl.textContent = savedStories.length;
    if (savedBadgeEl) savedBadgeEl.textContent = `${savedStories.length} bài`;

    status('⭐ Đã lưu bài ôn tập vào danh sách!', 'success');
};

window.viewSavedStory = function (id) {
    const story = savedStories.find(s => s.id === id);
    if (story) {
        currentStory = story;
        renderCurrentStory();
        const container = document.getElementById('current-story-container');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        status(`📖 Đang xem bài: ${story.title || 'Bài đã lưu'}`, 'success');
    }
};

window.deleteSavedStory = function (id) {
    if (confirm('Bạn có chắc chắn muốn xóa bài đã lưu này?')) {
        savedStories = savedStories.filter(s => s.id !== id);
        saveSavedStories();
        renderSavedStoriesList();

        const savedEl = document.getElementById('stories-saved-count');
        const savedBadgeEl = document.getElementById('saved-count-badge');
        if (savedEl) savedEl.textContent = savedStories.length;
        if (savedBadgeEl) savedBadgeEl.textContent = `${savedStories.length} bài`;

        status('🗑️ Đã xóa bài!', 'success');
    }
};

function renderSavedStoriesList() {
    const container = document.getElementById('saved-stories-list');
    if (!container) return;

    if (savedStories.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:32px; color:var(--g6); background:var(--g1); border-radius:12px; border:2px dashed var(--g2)">
            Chưa có bài nào được lưu. Sau khi tạo bài, hãy bấm "⭐ Lưu bài" để lưu lại ôn tập bất cứ lúc nào!
        </div>`;
        return;
    }

    container.innerHTML = savedStories.map(s => {
        const isConv = (s.type === 'conversation');
        const typeLabel = isConv ? '💬 Hội Thoại' : '📖 Truyện Ngắn';
        const targetWordsPreview = s.targetWords && s.targetWords.length > 0
            ? s.targetWords.map(w => `<span class="target-word-chip" style="font-size:0.8rem; padding:2px 8px">${w.chinese}</span>`).join(' ')
            : '';

        return `
            <div class="saved-story-card">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                        <span class="sentence-badge" style="background:${isConv ? 'var(--p)' : 'var(--s)'}">${typeLabel}</span>
                        <span style="font-size:0.8rem; color:var(--g6)">${s.createdAt || ''}</span>
                    </div>
                    <div style="font-size:1.25rem; font-weight:700; color:var(--g8); margin-bottom:4px">${s.title || 'Bài ôn tập'}</div>
                    <div style="font-size:0.9rem; color:var(--g6); margin-bottom:12px">${s.titleViet || ''}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px">
                        ${targetWordsPreview}
                    </div>
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end">
                    <button class="btn btn-sm" onclick="startJoggingForSavedStory(${s.id})" style="background:linear-gradient(135deg, #10b981, #059669); color:#fff; font-weight:600">🏃‍♂️ Nghe</button>
                    <button class="btn btn-sm" onclick="viewSavedStory(${s.id})">📖 Xem lại</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSavedStory(${s.id})">🗑️ Xóa</button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== INITIALIZATION (OPTIMIZED) ====================

async function init() {
    // 1. Load local data immediately for instant display
    load();
    loadHideLearnedState();
    loadSavedStories();
    if (vocab.length === 0) {
        vocab = [
            { id: 1, vietnamese: 'xin chào', chinese: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', topic: 'Cơ bản', difficulty: 'easy', learned: false, nextReview: Date.now(), reviewCount: 0 },
            { id: 2, vietnamese: 'cảm ơn', chinese: '谢谢', pinyin: 'xiè xiè', meaning: 'thank you', topic: 'Cơ bản', difficulty: 'easy', learned: false, nextReview: Date.now(), reviewCount: 0 }
        ];
        buildCharMap();
    }
    renderLibrary();
    updateConfig();

    // 2. Start all async tasks in parallel without blocking UI
    console.log('🚀 Loading remote data in background...');

    // Synchronize access: Load Config FIRST, then other tasks
    await loadConfig();

    // Now safe to load sentences with correct GID
    const setupTasks = [
        loadSentenceTemplates().then(() => renderSentences())
    ];

    // Synchronization logic
    const syncAndFallback = async () => {
        const syncStrategy = localStorage.getItem('sync-strategy') || 'sheets-first';
        if (syncStrategy === 'sheets-first') {
            const success = await syncFromSheets(true); // true = silent background sync
            if (!success) {
                const ghSuccess = await syncFromGitHubFallback();
                if (!ghSuccess && vocab.length <= 2) {
                    await syncFromLocalVocabJson();
                }
            }
            // Final UI update
            renderLibrary();
        } else if (vocab.length <= 2) {
            await syncFromLocalVocabJson();
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
    console.log('✅ Initialization complete - DEBUG V2');
}

document.addEventListener('DOMContentLoaded', init);
