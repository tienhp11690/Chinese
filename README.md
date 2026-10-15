# 📚 Học Tiếng Trung Pro (Chinese Learning App)

Ứng dụng học từ vựng, flashcard, luyện viết chữ Hán, tra cứu mẫu câu và tạo truyện/hội thoại tự động bằng AI (Google Gemini). Hỗ trợ PWA hoạt động ngoại tuyến (Offline) và đồng bộ dữ liệu linh hoạt qua Google Sheets & GitHub.

🔗 **GitHub Repository:** [https://github.com/tienhp11690/Chinese](https://github.com/tienhp11690/Chinese)

---

## ✨ Tính Năng Nổi Bật

- 📖 **Thư Viện Từ Vựng:** Quản lý hàng trăm từ vựng theo chủ đề, cấp độ, phát âm Pinyin chuẩn, nghĩa tiếng Việt, phân loại từ đã học/chưa học.
- 🃏 **Flashcard Ôn Tập:** Lật thẻ từ vựng với hoạt họa mượt mà, phát âm giọng đọc, chế độ ngẫu nhiên.
- ✍️ **Luyện Viết Chữ Hán (Hanzi Writer):** Tích hợp thư viện Hanzi Writer cục bộ, hiển thị thứ tự nét viết chuẩn động.
- 🔠 **Hán Tự Dùng Chung:** Tự động thống kê các chữ Hán xuất hiện chung giữa nhiều từ vựng.
- 💬 **Mẫu Câu Giao Tiếp:** Tra cứu các câu ví dụ thực tế liên kết trực tiếp với từ vựng.
- 🤖 **AI Studio (Google Gemini):** Tự động sinh truyện ngắn và hội thoại ngữ cảnh dựa trên kho từ vựng cá nhân.
- ⚡ **PWA Offline & Mobile Ready:** Cài đặt trực tiếp lên điện thoại/máy tính, hoạt động không cần mạng Internet nhờ Service Worker.
- 🔄 **Đồng Bộ Dữ Liệu:** Hỗ trợ nạp dữ liệu từ Google Sheets và sao lưu tự động lên GitHub.

---

## 🚀 Hướng Dẫn Sử Dụng

### 1. Chạy Thử Ứng Dụng Ở Máy Local
Để vượt qua giới hạn bảo mật CORS khi đọc dữ liệu từ file cục bộ hoặc Google Sheets, xem hướng dẫn chi tiết tại:
👉 [**LOCAL_TESTING.md**](LOCAL_TESTING.md)

Lệnh chạy nhanh bằng Node.js:
```bash
npx http-server . -c-1 -o
```
hoặc mở bằng extension **Live Server** trong VS Code.

### 2. Quản Lý Mã Nguồn Git & GitHub
Hướng dẫn chi tiết từng bước cho người mới về cách lấy code (**Pull**), đẩy code (**Push**), giải quyết xung đột (Conflict) và quản lý nhánh (Branch):
👉 [**GITHUB_GUIDE.md**](GITHUB_GUIDE.md)

Các lệnh thường dùng:
```bash
# 1. Lấy code mới nhất về máy
git pull origin main

# 2. Đưa thay đổi lên GitHub
git add .
git commit -m "feat: mô tả nội dung thay đổi"
git push origin main
```

---

## ⚙️ Cấu Hình Dự Án

- [`config.json`](config.json): Chứa thông tin link GitHub repo, link Google Sheets, chiến lược đồng bộ.
- [`package.json`](package.json): Thông tin metadata dự án, script khởi chạy và liên kết kho GitHub.
- [`sw.js`](sw.js) & [`manifest.json`](manifest.json): Cấu hình PWA để cài đặt lên thiết bị và lưu cache offline.

---

## 📄 Bản Quyền & Giấy Phép
Dự án được duy trì bởi [tienhp11690](https://github.com/tienhp11690). Giấy phép mã nguồn mở ISC.
