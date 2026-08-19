# start-dev.ps1
# Launches the Flask backend in its own PowerShell window, then runs the
# frontend dev server in this window. Run from the project root:
#
#     .\start-dev.ps1
#
# Ctrl+C in this window stops the frontend. The backend window is
# separate — close it manually (or Ctrl+C in it) when you're done.

$root = $PSScriptRoot

Write-Host "Starting Flask backend in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList (
    "-NoExit", "-Command",
    "cd '$root'; venv\Scripts\Activate.ps1; flask --app app run --debug --port 5000"
)

Write-Host "Waiting a moment for Flask to boot..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

Write-Host "Starting frontend dev server in this window..." -ForegroundColor Cyan
Set-Location "$root\frontend"
npm run dev