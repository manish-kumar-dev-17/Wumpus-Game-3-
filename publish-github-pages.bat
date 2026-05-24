@echo off
setlocal
cd /d "%~dp0"

where gh >nul 2>nul
if errorlevel 1 (
  echo GitHub CLI is not installed.
  pause
  exit /b 1
)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo Please login to GitHub first.
  echo A browser login will open now.
  gh auth login --web --hostname github.com
  if errorlevel 1 (
    echo GitHub login failed.
    echo Try running login-github.bat, then run this file again.
    pause
    exit /b 1
  )
)

if not exist ".git" (
  git init
  git branch -M main
)

git add index.html styles.css app.js assets README.md LICENSE run-wumpus-server.bat publish-github-pages.bat .gitignore
git commit -m "Publish Wumpus World game" || echo Nothing new to commit.

set REPO_NAME=wumpus-world-game
gh repo view %REPO_NAME% >nul 2>nul
if errorlevel 1 (
  gh repo create %REPO_NAME% --public --source=. --push
) else (
  git remote get-url origin >nul 2>nul || gh repo set-default %REPO_NAME%
  git push -u origin main
)

gh api -X POST "repos/{owner}/%REPO_NAME%/pages" -f "source[branch]=main" -f "source[path]=/" >nul 2>nul || echo GitHub Pages may already be enabled.

for /f "tokens=*" %%u in ('gh api "repos/{owner}/%REPO_NAME%/pages" --jq ".html_url" 2^>nul') do set PAGE_URL=%%u

echo.
echo Public game link:
echo %PAGE_URL%
echo.
echo If the page is not live immediately, wait 1-2 minutes and refresh.
pause
