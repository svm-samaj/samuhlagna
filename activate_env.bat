@echo off
echo Activating Samuhlagna Virtual Environment...
call venv\Scripts\activate.bat
echo.
echo Virtual Environment Activated!
echo Python Version:
python --version
echo.
echo To run the backend server:
echo   cd backend
echo   uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
