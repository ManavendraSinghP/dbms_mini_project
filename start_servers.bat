@echo off
echo Starting FastAPI Backend Server...
start cmd /k "cd /d C:\Users\manav\PycharmProjects\DBMS_MiniProject\Backend && uvicorn main:app --reload"

echo Starting React Vite Frontend Server...
:: IMPORTANT: If your frontend folder is named something other than "Frontend", change it below!
start cmd /k "cd /d C:\Users\manav\PycharmProjects\DBMS_MiniProject\frontend && npm run dev"