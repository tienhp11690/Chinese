# =========================================================================
# CAPTURE CHAT SCROLL - PowerShell Desktop Tool
# Tự động lắng nghe Clipboard khi cuộn chat & xuất file tài liệu ôn tập
# =========================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🇨🇳 TRÌNH QUÉT HỘI THOẠI KHI CUỘN MÀN HÌNH (DESKTOP)   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Chức năng: Tự động gom các đoạn chat tiếng Trung khi bạn cuộn & bấm Ctrl+C" -ForegroundColor Gray
Write-Host "Nhấn Ctrl+C trong màn hình console này khi muốn kết thúc và lưu file." -ForegroundColor DarkGray
Write-Host ""

$collectedSentences = [System.Collections.Generic.List[string]]::new()
$seenHashes = [System.Collections.Generic.HashSet[string]]::new()
$lastClipboard = ""

$outFile = Join-Path $PSScriptRoot "chat_travel_export.txt"

Write-Host "🟢 Đang lắng nghe Clipboard... Hãy mở app chat (WeChat, Zalo...), cuộn màn hình và bôi đen nhấn Ctrl+C các đoạn chat!" -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Milliseconds 500
        
        if ([System.Windows.Forms.Clipboard]::ContainsText()) {
            $clipText = [System.Windows.Forms.Clipboard]::GetText().Trim()
            
            if ($clipText -and $clipText -ne $lastClipboard) {
                $lastClipboard = $clipText
                
                # Kiểm tra xem có chứa chữ Hán không (Unicode range 0x4E00 - 0x9FA5)
                if ($clipText -match '[\u4e00-\u9fa5]') {
                    $lines = $clipText -split "[\r\n]+"
                    
                    foreach ($line in $lines) {
                        $clean = $line.Trim()
                        if ($clean.Length -ge 2 -and $clean -match '[\u4e00-\u9fa5]') {
                            $hash = $clean.ToLower()
                            if (-not $seenHashes.Contains($hash)) {
                                $seenHashes.Add($hash) | Out-Null
                                $collectedSentences.Add($clean)
                                
                                Write-Host "[+ Câu $($collectedSentences.Count)] $clean" -ForegroundColor Yellow
                            }
                        }
                    }
                }
            }
        }
    }
}
finally {
    Write-Host ""
    Write-Host "⏹️ Đã dừng quét!" -ForegroundColor Cyan
    
    if ($collectedSentences.Count -gt 0) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllLines($outFile, $collectedSentences, $utf8NoBom)
        
        Write-Host "🎉 Đã xuất thành công $($collectedSentences.Count) câu hội thoại vào file:" -ForegroundColor Green
        Write-Host "   $outFile" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Bạn có thể dán nội dung này vào trang web Học Tiếng Trung Pro để tự động bóc tách từ vựng & tạo bài học du lịch!" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ Chưa có câu thoại nào được thu thập." -ForegroundColor DarkYellow
    }
}
