@echo off
chcp 65001 >nul
echo ========================================================
echo   🚀 ĐANG TỰ ĐỘNG GOM CODE VÀ PUSH LÊN GITHUB...
echo ========================================================

git add .

set COMMIT_MSG=%*
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Cap nhat tu lieu va ma nguon moi nhat

git commit -m "%COMMIT_MSG%"

echo.
echo ⏳ Đang đẩy code lên GitHub repository...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   ✅ HOÀN TẤT! Code đã được cập nhật lên GitHub Pages.
    echo ========================================================
) else (
    echo.
    echo ❌ Có lỗi xảy ra khi push. Vui lòng kiểm tra kết nối mạng.
)

timeout /t 4 >nul
