// =========================================================================
// CHAT SCROLL COLLECTOR (TIỆN ÍCH QUÉT HỘI THOẠI KHI CUỘN MÀN HÌNH)
// Dùng cho: WeChat Web, Zalo Web, Telegram Web, WhatsApp Web, Claude, v.v.
// =========================================================================

(function () {
    if (window.__chatCollectorActive) {
        alert('Trình quét chat đang chạy! Hãy nhìn góc trên bên phải màn hình.');
        return;
    }
    window.__chatCollectorActive = true;

    const collectedMessages = [];
    const seenHashes = new Set();
    let isRecording = true;

    // Tạo Floating HUD điều khiển trên màn hình
    const hud = document.createElement('div');
    hud.id = '__chat_collector_hud';
    hud.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999999;
        background: rgba(15, 23, 42, 0.95);
        color: #fff;
        padding: 16px 20px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        min-width: 300px;
        max-width: 380px;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.15);
    `;

    hud.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="font-size:14px; color:#38bdf8;">🎥 Trình Quét Chat Khi Cuộn</strong>
            <button id="__btn_hud_close" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">✕</button>
        </div>
        <div style="margin-bottom:12px; color:#cbd5e1; line-height:1.4;">
            Trạng thái: <span id="__hud_status" style="color:#4ade80; font-weight:700;">🟢 Đang quét khi cuộn...</span>
            <br>
            Đã thu thập: <strong id="__hud_count" style="font-size:16px; color:#facc15;">0</strong> câu hội thoại
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
            <button id="__btn_hud_toggle" style="background:#2563eb; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:600; cursor:pointer;">⏸️ Tạm dừng</button>
            <button id="__btn_hud_clear" style="background:#475569; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:600; cursor:pointer;">🗑️ Xóa trắng</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
            <button id="__btn_hud_copy" style="background:#10b981; color:#fff; border:none; padding:9px; border-radius:8px; font-weight:700; cursor:pointer;">📋 Copy Toàn Bộ Hội Thoại</button>
            <button id="__btn_hud_send" style="background:linear-gradient(135deg, #ec4899, #8b5cf6); color:#fff; border:none; padding:9px; border-radius:8px; font-weight:700; cursor:pointer;">🚀 Mở Trong Học Tiếng Trung Pro</button>
        </div>
        <div style="margin-top:10px; font-size:11px; color:#94a3b8; text-align:center;">
            💡 Cuộn chuột lên hoặc xuống trong đoạn chat để tự động nhặt các câu tiếng Trung!
        </div>
    `;

    document.body.appendChild(hud);

    // Hàm nhận diện chữ Hán
    function hasChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    // Hàm trích xuất text từ DOM hiện tại
    function scanVisibleMessages() {
        if (!isRecording) return;

        // Quét các thẻ có chứa text tiếng Trung
        const candidates = document.querySelectorAll('p, span, div');
        candidates.forEach(el => {
            // Tránh quét chính HUD
            if (hud.contains(el)) return;

            // Bỏ qua các element cha có chứa nhiều element con
            if (el.children.length > 2) return;

            const text = el.innerText ? el.innerText.trim() : '';
            if (!text || text.length < 2 || text.length > 300) return;

            if (hasChinese(text)) {
                // Tách câu hoặc lấy cả khối
                const cleanText = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
                const hash = cleanText.toLowerCase();

                if (!seenHashes.has(hash)) {
                    seenHashes.add(hash);

                    // Thử đoán người nói hoặc ngữ cảnh
                    let speaker = 'Nhân vật';
                    const parent = el.closest('[data-id], .message, .chat-item, [class*="message"], [class*="bubble"]');
                    if (parent) {
                        const classStr = parent.className || '';
                        if (/mine|outgoing|self|right|me/i.test(classStr)) {
                            speaker = 'Tôi (Khách du lịch)';
                        } else if (/other|incoming|left/i.test(classStr)) {
                            speaker = 'Đối tác / Người bản xứ';
                        }
                    }

                    collectedMessages.push({
                        time: new Date().toLocaleTimeString(),
                        speaker: speaker,
                        chinese: cleanText
                    });

                    updateCount();
                }
            }
        });
    }

    function updateCount() {
        const countEl = document.getElementById('__hud_count');
        if (countEl) countEl.innerText = collectedMessages.length;
    }

    // Lắng nghe sự kiện scroll trên toàn window và các container
    window.addEventListener('scroll', scanVisibleMessages, { passive: true });
    document.querySelectorAll('*').forEach(el => {
        const overflow = window.getComputedStyle(el).overflowY;
        if (overflow === 'auto' || overflow === 'scroll') {
            el.addEventListener('scroll', scanVisibleMessages, { passive: true });
        }
    });

    // Quét ngay lần đầu
    scanVisibleMessages();

    // Sự kiện nút điều khiển
    document.getElementById('__btn_hud_close').onclick = () => {
        window.removeEventListener('scroll', scanVisibleMessages);
        hud.remove();
        window.__chatCollectorActive = false;
    };

    document.getElementById('__btn_hud_toggle').onclick = (e) => {
        isRecording = !isRecording;
        e.target.innerText = isRecording ? '⏸️ Tạm dừng' : '▶️ Tiếp tục quét';
        e.target.style.background = isRecording ? '#2563eb' : '#eab308';
        const st = document.getElementById('__hud_status');
        if (st) {
            st.innerText = isRecording ? '🟢 Đang quét khi cuộn...' : '⏸️ Đang tạm dừng';
            st.style.color = isRecording ? '#4ade80' : '#facc15';
        }
    };

    document.getElementById('__btn_hud_clear').onclick = () => {
        if (confirm('Xóa toàn bộ các câu thoại đã nhặt?')) {
            collectedMessages.length = 0;
            seenHashes.clear();
            updateCount();
        }
    };

    document.getElementById('__btn_hud_copy').onclick = () => {
        if (collectedMessages.length === 0) {
            alert('Chưa có câu thoại nào được thu thập! Hãy cuộn chuột qua đoạn chat.');
            return;
        }
        const textToCopy = collectedMessages.map((m, i) => `${m.speaker || 'Người nói'}: ${m.chinese}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert(`✅ Đã copy ${collectedMessages.length} câu thoại tiếng Trung vào Clipboard! Bạn có thể dán vào app Học Tiếng Trung Pro.`);
        });
    };

    document.getElementById('__btn_hud_send').onclick = () => {
        if (collectedMessages.length === 0) {
            alert('Chưa có câu thoại nào được thu thập! Hãy cuộn chuột qua đoạn chat.');
            return;
        }
        const textToSend = collectedMessages.map(m => m.chinese).join('\n');
        localStorage.setItem('chinese-app-imported-chat', textToSend);
        localStorage.setItem('chinese-app-last-route', 'hsk-hub');
        window.open('https://tienhp11690.github.io/Chinese/#hsk-hub', '_blank');
    };
})();
