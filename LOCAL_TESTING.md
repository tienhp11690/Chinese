# Hướng dẫn Chạy Local để Test

Do chính sách bảo mật của trình duyệt, bạn không thể load dữ liệu từ Google Sheets khi mở trực tiếp file `index.html` (giao thức `file://`). Để ứng dụng hoạt động chính xác ở máy local, bạn cần chạy một server web đơn giản.

## Cách 1: Dùng VS Code Extension (Dễ nhất)
1. Cài đặt extension **Live Server** trong VS Code.
2. Chuột phải vào file `index.html` và chọn **Open with Live Server**.
3. Trình duyệt sẽ mở ứng dụng tại địa chỉ `http://127.0.0.1:5500`.

## Cách 2: Dùng Node.js (Nếu đã cài Node.js)
Mở terminal tại thư mục dự án và chạy lệnh sau:
```bash
npx http-server .
```
Sau đó truy cập địa chỉ `http://localhost:8080`.

## Cách 3: Dùng Python (Nếu có sẵn Python)
Mở terminal tại thư mục dự án và chạy:
```bash
python -m http.server 8000
```
Sau đó truy cập địa chỉ `http://localhost:8000`.

---
Sau khi chạy bằng server local, bạn có thể vào tab **Cài Đặt** và nhấn **Sync ngay** để load dữ liệu từ Google Sheets.
