# AI Stock Monitor - Local Dev Startup Script
# Run this script to start backend + tunnel + print the URL to paste into Vercel

param(
    [string]$Port = "8000",
    [string]$TunnelSubdomain = "ai-stock-monitor-api"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AI Stock Monitor - 啟動腳本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check node is installed (for localtunnel)
if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 請先安裝 Node.js: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Kill any existing backend on port 8000
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[INFO] 關閉舊的 port $Port 進程..." -ForegroundColor Yellow
    $existing | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# Start Backend in background
Write-Host "`n[1/2] 啟動 FastAPI Backend (port $Port)..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($port)
    Set-Location "c:\stock\apps\backend"
    & "C:\Users\richc\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port $port 2>&1
} -ArgumentList $Port

Start-Sleep -Seconds 3

# Test backend is up
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
    Write-Host "[OK] Backend 已啟動: http://localhost:$Port" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend 啟動失敗，請檢查錯誤" -ForegroundColor Red
    Receive-Job $backendJob
    exit 1
}

# Start localtunnel
Write-Host "`n[2/2] 啟動 Localtunnel..." -ForegroundColor Green
Write-Host "[INFO] 嘗試使用 subdomain: $TunnelSubdomain" -ForegroundColor Yellow

$tunnelOutput = ""
$tunnelJob = Start-Job -ScriptBlock {
    param($port, $subdomain)
    npx localtunnel --port $port --subdomain $subdomain 2>&1
} -ArgumentList $Port, $TunnelSubdomain

Start-Sleep -Seconds 4

# Get tunnel URL
$tunnelOutput = Receive-Job $tunnelJob -Keep
$tunnelUrl = ($tunnelOutput | Select-String "https://.*\.loca\.lt").Matches.Value | Select-Object -First 1

if (-not $tunnelUrl) {
    Write-Host "[WARN] 無法取得指定 subdomain，嘗試隨機 URL..." -ForegroundColor Yellow
    Stop-Job $tunnelJob | Out-Null
    $tunnelJob = Start-Job -ScriptBlock {
        param($port)
        npx localtunnel --port $port 2>&1
    } -ArgumentList $Port
    Start-Sleep -Seconds 4
    $tunnelOutput = Receive-Job $tunnelJob -Keep
    $tunnelUrl = ($tunnelOutput | Select-String "https://.*\.loca\.lt").Matches.Value | Select-Object -First 1
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  🚀 啟動成功！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Local Backend:  http://localhost:$Port" -ForegroundColor White
if ($tunnelUrl) {
    Write-Host "  Tunnel URL:     $tunnelUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ⚡ 請到 Vercel 設定以下環境變數：" -ForegroundColor Cyan
    Write-Host "     NEXT_PUBLIC_API_URL = $tunnelUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "  設定路徑: Vercel Dashboard → Project → Settings → Environment Variables" -ForegroundColor Gray
    Write-Host ""
    # Copy to clipboard
    $tunnelUrl | Set-Clipboard
    Write-Host "  ✅ URL 已複製到剪貼簿！" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Tunnel URL 未取得，請手動檢查" -ForegroundColor Red
}

Write-Host ""
Write-Host "  按 Ctrl+C 停止所有服務" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

# Keep running and show backend logs
try {
    while ($true) {
        $output = Receive-Job $backendJob
        if ($output) { Write-Host $output }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`n正在停止服務..." -ForegroundColor Yellow
    Stop-Job $backendJob, $tunnelJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $tunnelJob -ErrorAction SilentlyContinue
}
