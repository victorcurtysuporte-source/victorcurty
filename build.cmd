@echo off
REM Gera a pasta dist/ para arrastar na Netlify.
cd /d "%~dp0"
python build.py
echo.
pause
