@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title FlowPilot - Visual Browser Automation Platform
color 0B

echo ===================================================================
echo                     FLOWPILOT LAUNCHER
echo          "Build browser automations visually."
echo ===================================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH.
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Check if node_modules exists
if not exist "node_modules\" (
    echo [SETUP] Installing required dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 3. Check if production build exists
if not exist "dist\" (
    echo [BUILD] Compiling frontend assets and backend server...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
)

echo [START] Starting FlowPilot server and configuring port forwarding tunnel...
echo.

:: 4. Run application with tunnel & display both Localhost and Port Forwarded URLs
node scripts/start-with-tunnel.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application exited with an error.
    pause
)
