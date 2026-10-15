# 📘 Hướng Dẫn Sử Dụng Git: Pull & Push Code Lên GitHub

Tài liệu này cung cấp hướng dẫn chi tiết từng bước cho việc quản lý mã nguồn, tải code mới về máy (**Pull**) và đẩy code lên kho lưu trữ GitHub (**Push**) cho dự án **Chinese Learning App**.

---

## 📌 1. Thông Tin Repository & Cấu Hình Local

| Thông tin | Giá trị |
| :--- | :--- |
| **Tên dự án** | Chinese Learning App (`chinese-learning-app`) |
| **GitHub Web** | [https://github.com/tienhp11690/Chinese](https://github.com/tienhp11690/Chinese) |
| **Clone URL (HTTPS)** | `https://github.com/tienhp11690/Chinese.git` |
| **Clone URL (SSH)** | `git@github.com:tienhp11690/Chinese.git` |
| **Nhánh mặc định (Default Branch)** | `main` |
| **Remote Name** | `origin` |

### 📂 Vị trí cấu hình link GitHub trong file cục bộ (Local)
Dự án đã tích hợp link GitHub vào các file sau để thuận tiện quản lý:
1. [`config.json`](file:///c:/Projects/Chinese-main/config.json):
   - `project.githubUrl`: Link xem kho mã nguồn trên web.
   - `project.cloneUrl`: Đường dẫn clone HTTPS.
   - `defaultConfig.projectGithubUrl`: Link repo dùng trong cấu hình mặc định.
   - `defaultConfig.githubRepo`: `tienhp11690/Chinese` (dùng cho backup dữ liệu từ vựng).
   - `defaultConfig.vocabJsonUrl`: URL tải trực tiếp `vocab.json` từ GitHub raw.
2. [`package.json`](file:///c:/Projects/Chinese-main/package.json):
   - `repository.url`: Đường dẫn Git repository.
   - `homepage`: Trang chủ dự án trên GitHub.
3. [`app.js`](file:///c:/Projects/Chinese-main/app.js):
   - `CONFIG_URL`: Đường dẫn raw tải cấu hình từ repository.
   - `DEFAULT_CONFIG.projectGithubUrl`: Link GitHub mặc định của ứng dụng.

---

## ⚙️ 2. Chuẩn Bị & Cấu Hình Ban Đầu (Chỉ làm 1 lần)

### Bước 2.1: Kiểm tra Git đã cài đặt
Mở Terminal (hoặc PowerShell trong VS Code):
```bash
git --version
```
> Nếu chưa có Git, tải và cài đặt tại [git-scm.com](https://git-scm.com/).

### Bước 2.2: Thiết lập thông tin tác giả
Giúp GitHub nhận diện chính xác người thực hiện commit:
```bash
git config --global user.name "Tên Của Bạn"
git config --global user.email "email-cua-ban@gmail.com"
```

### Bước 2.3: Kiểm tra kết nối Remote của thư mục dự án
Trong thư mục `c:\Projects\Chinese-main`, chạy lệnh:
```bash
git remote -v
```
Kết quả chuẩn sẽ hiển thị:
```text
origin  https://github.com/tienhp11690/Chinese.git (fetch)
origin  https://github.com/tienhp11690/Chinese.git (push)
```
*(Nếu chưa có origin, chạy: `git remote add origin https://github.com/tienhp11690/Chinese.git`)*

---

## 📥 3. Hướng Dẫn PULL Code (Tải code mới nhất về máy)

> 💡 **Khuyến nghị:** Luôn chạy lệnh Pull trước khi bắt đầu làm việc để đảm bảo máy của bạn luôn có mã nguồn mới nhất, tránh bị xung đột (conflict).

### 3.1. Trường hợp 1: Máy local không có thay đổi dở dang
Khi bạn vừa mở máy lên và muốn lấy code mới nhất:
```bash
git pull origin main
```

### 3.2. Trường hợp 2: Máy local đang có file chỉnh sửa dở dang
Nếu bạn đang sửa code nhưng chưa muốn commit, hãy dùng **Stash** để cất tạm thời:
```bash
# 1. Cất tạm những thay đổi đang làm dở
git stash

# 2. Kéo code mới nhất từ GitHub về
git pull origin main

# 3. Lấy lại những thay đổi dở dang vừa cất
git stash pop
```

### 3.3. Trường hợp 3: Xử lý Xung Đột (Merge Conflict) khi Pull
Nếu cùng 1 dòng code bị sửa ở cả trên GitHub và ở máy bạn, Git sẽ thông báo:
```text
CONFLICT (content): Merge conflict in <tên_file>
Automatic merge failed; fix conflicts and then commit the result.
```
**Cách giải quyết:**
1. Mở file bị báo đỏ trong VS Code.
2. Bạn sẽ thấy các dấu hiệu đánh dấu của Git:
   ```text
   <<<<<<< HEAD (Mã nguồn hiện tại ở máy bạn)
   Code của bạn
   =======
   Code tải từ GitHub về
   >>>>>>> main
   ```
3. Trong VS Code, bạn có thể click chọn nhanh:
   - **Accept Current Change**: Giữ code ở máy bạn.
   - **Accept Incoming Change**: Lấy code mới từ GitHub.
   - **Accept Both Changes**: Giữ cả hai.
   - Hoặc tự tay xóa các dòng `<<<<<<<`, `=======`, `>>>>>>>` và sửa lại theo ý muốn.
4. Sau khi sửa xong, lưu file và chạy:
   ```bash
   git add <tên_file_đã_sửa>
   git commit -m "fix: resolve merge conflict"
   ```

---

## 📤 4. Hướng Dẫn PUSH Code (Đẩy code từ máy lên GitHub)

Quy trình chuẩn gồm 4 bước cơ bản:

```
[Máy Local]              [Vùng Chờ: Stage]          [Lịch Sử: Commit]          [GitHub Remote]
File sửa đổi  ──(git add)──>  Staging Area  ──(git commit)──>  Local Repo  ──(git push)──>  GitHub
```

### 4 Bước thực hiện chi tiết:

#### Bước 1: Kiểm tra những file đã thay đổi
```bash
git status
```
Git sẽ liệt kê:
- Màu đỏ: File đã thay đổi hoặc file mới tạo chưa được đưa vào vùng chờ.
- Màu xanh: File đã sẵn sàng để commit.

#### Bước 2: Thêm file vào vùng chờ (Staging)
- Thêm tất cả file thay đổi:
  ```bash
  git add .
  ```
- Hoặc chỉ thêm các file cụ thể:
  ```bash
  git add index.html app.js
  ```

#### Bước 3: Đóng gói và ghi chú nội dung thay đổi (Commit)
Đặt thông điệp commit ngắn gọn, rõ ràng theo chuẩn:
```bash
git commit -m "feat: cập nhật chức năng tra cứu mẫu câu"
```
> 📌 **Gợi ý tiền tố thông điệp commit chuẩn (Conventional Commits):**
> - `feat:` Thêm chức năng, tính năng mới.
> - `fix:` Sửa lỗi (bug fix).
> - `docs:` Cập nhật tài liệu, hướng dẫn (như README, GITHUB_GUIDE).
> - `style:` Chỉnh sửa giao diện, CSS, định dạng code không đổi logic.
> - `refactor:` Tối ưu cấu trúc mã nguồn.
> - `chore:` Cập nhật cấu hình, dependencies, việc lặt vặt.

#### Bước 4: Đẩy code lên GitHub (Push)
```bash
git push origin main
```
Sau vài giây, mã nguồn sẽ xuất hiện ngay trên trang GitHub của bạn!

---

## ⚠️ 5. Các Lỗi Thường Gặp & Cách Khắc Phục

### Lỗi 1: `[rejected - non-fast-forward]`
**Nguyên nhân:** Trên GitHub đã có người đẩy commit mới hoặc bạn đã sửa trực tiếp trên web GitHub mà máy local chưa có commit đó.  
**Cách xử lý an toàn:**
```bash
# 1. Kéo code mới về và đặt commit của bạn lên trên
git pull --rebase origin main

# 2. Đẩy lại lên GitHub
git push origin main
```
> ⛔ **Tuyệt đối KHÔNG chạy:** `git push --force` vì lệnh này sẽ ghi đè và làm mất lịch sử code trên GitHub!

### Lỗi 2: Yêu cầu đăng nhập hoặc `Permission denied` / `Authentication failed`
Từ tháng 8/2021, GitHub không cho phép dùng mật khẩu tài khoản trực tiếp khi push code.
**Cách xử lý:**
1. **Dùng Git Credential Manager:** Đăng nhập thông qua cửa sổ popup trình duyệt khi Git yêu cầu.
2. **Dùng Personal Access Token (PAT):**
   - Vào GitHub > **Settings** > **Developer settings** > **Personal access tokens (classic)** > **Generate new token**.
   - Chọn quyền `repo` và copy token (có dạng `ghp_...`).
   - Khi terminal hỏi mật khẩu (Password), dán token này vào.

### Lỗi 3: Muốn hủy bỏ (Undo) thay đổi khi chưa commit
- Bỏ file ra khỏi vùng Staging (đã lỡ `git add`):
  ```bash
  git restore --staged <tên_file>
  ```
- Khôi phục file về trạng thái trước khi sửa (bỏ mọi thay đổi chưa lưu):
  ```bash
  git restore <tên_file>
  ```

---

## 🌿 6. Quy Trình Làm Việc Với Nhánh (Branch Workflow - Khuyên dùng)

Khi phát triển một tính năng lớn hoặc thử nghiệm tính năng mới, tạo nhánh riêng giúp nhánh `main` luôn hoạt động ổn định:

### Bước 1: Tạo và chuyển sang nhánh mới
```bash
git checkout -b feature/giao-dien-moi
```

### Bước 2: Viết code và commit trên nhánh này
```bash
git add .
git commit -m "feat: thiết kế giao diện thẻ từ vựng mới"
```

### Bước 3: Đẩy nhánh lên GitHub
```bash
git push -u origin feature/giao-dien-moi
```

### Bước 4: Tạo Pull Request (PR) & Hợp nhất
1. Truy cập [github.com/tienhp11690/Chinese](https://github.com/tienhp11690/Chinese).
2. Click **Compare & pull request** để xem lại thay đổi và bấm **Merge pull request** để nhập vào `main`.
3. Trở về nhánh `main` ở máy và cập nhật:
   ```bash
   git checkout main
   git pull origin main
   ```
4. Xóa nhánh tạm nếu không còn dùng:
   ```bash
   git branch -d feature/giao-dien-moi
   ```

---

## 🔒 7. Bảo Mật & Best Practices

1. **Không commit API Key & Token nhạy cảm:**
   - File `.gitignore` đã được cấu hình để loại trừ các file rác và log.
   - Các thông tin như Google Gemini API Key hoặc GitHub Personal Access Token cá nhân được lưu an toàn trong `localStorage` trên trình duyệt máy bạn, **không** ghi cứng vào code commit lên GitHub công khai.
2. **Commit đều đặn:** Chia nhỏ công việc thành từng commit có ý nghĩa thay vì dồn hàng tuần mới commit một lần.
3. **Luôn kiểm tra `git status`** trước khi `git add` và `git push`.

---

## 📋 8. Bảng Tra Cứu Nhanh Lệnh Git (Cheat Sheet)

| Nhu cầu | Lệnh Git |
| :--- | :--- |
| Kiểm tra trạng thái các file | `git status` |
| Kéo code mới nhất từ GitHub | `git pull origin main` |
| Thêm tất cả file sửa đổi vào vùng chờ | `git add .` |
| Tạo commit với mô tả | `git commit -m "nội dung commit"` |
| Đẩy commit lên nhánh main | `git push origin main` |
| Xem lịch sử các commit gần nhất | `git log --oneline -n 5` |
| Cất tạm thay đổi chưa commit | `git stash` |
| Lấy lại thay đổi đã cất tạm | `git stash pop` |
| Tạo và chuyển nhánh mới | `git checkout -b <tên_nhánh>` |
| Chuyển về nhánh main | `git checkout main` |
| Xem danh sách remote | `git remote -v` |
