@echo off
cd /d "%~dp0"
echo Starting GitHub login...
echo.
gh auth login --web --hostname github.com
echo.
echo Login finished. Now run publish-github-pages.bat
pause
