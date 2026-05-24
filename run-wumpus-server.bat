@echo off
cd /d "%~dp0"
"C:\Program Files\Python313\python.exe" -m http.server 8010 --bind 127.0.0.1
