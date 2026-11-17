@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Abonix : demarrage local ===
where node >nul 2>nul || (echo Node.js 22+ est requis : https://nodejs.org & pause & exit /b 1)
if not exist node_modules (
  echo [1/5] Installation des dependances...
  call npm install || (pause & exit /b 1)
)
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Le fichier .env vient d'etre cree. Ouvrez-le et regler DATABASE_URL, par exemple :
  echo   DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/abonix"
  echo Creez aussi la base "abonix" dans pgAdmin ^(clic droit sur Databases ^> Create^).
  echo Puis relancez ce fichier.
  start notepad .env
  pause & exit /b 0
)
echo [2/5] Migrations...
call npm run db:migrate || (echo Echec : verifiez DATABASE_URL et que la base existe. & pause & exit /b 1)
echo [3/5] Donnees de demonstration...
call npm run db:seed || (pause & exit /b 1)
echo [4/5] Creation de l'administrateur ^(si besoin, Ctrl+C pour passer^)...
call npm run admin:create
echo [5/5] Demarrage : http://localhost:3000  ^(admin : /admin^)
start "" http://localhost:3000
call npm run dev
