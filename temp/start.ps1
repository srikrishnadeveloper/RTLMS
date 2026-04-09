# RTLMS Dashboard - Start Script
# Usage: .\start.ps1
# Starts backend (Spring Boot) and frontend (Vite) in parallel

$ErrorActionPreference = "Stop"

$MAVEN = "C:\Users\srik2\.maven\maven-3.9.14\bin\mvn.cmd"
$JAVA_HOME = "C:\Program Files\Java\jdk-25.0.2"
$BACKEND = Join-Path $PSScriptRoot "backend"
$FRONTEND = Join-Path $PSScriptRoot "frontend"

Write-Host "Starting RTLMS Backend (Spring Boot)..." -ForegroundColor Cyan
$env:JAVA_HOME = $JAVA_HOME
$env:PATH = "$JAVA_HOME\bin;$env:PATH"

$backendJob = Start-Job -ScriptBlock {
    param($dir, $mvn, $javaHome)
    $env:JAVA_HOME = $javaHome
    $env:PATH = "$javaHome\bin;$env:PATH"
    Set-Location $dir
    & $mvn spring-boot:run -q
} -ArgumentList $BACKEND, $MAVEN, $JAVA_HOME

Write-Host "Backend starting on http://localhost:8080" -ForegroundColor Green

Write-Host "Starting RTLMS Frontend (Vite)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $FRONTEND

Write-Host "Frontend starting on http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        # Stream output from both jobs
        Receive-Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[BACKEND] $_" -ForegroundColor Blue }
        Receive-Job $frontendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[FRONTEND] $_" -ForegroundColor Magenta }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
}
