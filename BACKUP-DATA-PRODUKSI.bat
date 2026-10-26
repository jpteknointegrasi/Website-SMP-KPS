@echo off
setlocal
title Backup data website (produksi)
cd /d "%~dp0"
rem Monorepo: website ada di apps\web. File .env/.env.vercel lama di folder utama dipindahkan otomatis.
if exist ".env" if not exist "apps\web\.env" move ".env" "apps\web\.env" >nul
if exist ".env.vercel" if not exist "apps\web\.env.vercel" move ".env.vercel" "apps\web\.env.vercel" >nul
cd /d "%~dp0apps\web"
echo ================================================
echo   Backup seluruh data website ke folder backups\
echo ================================================
echo.
findstr /b /c:"DATABASE_URI=postgres" .env.vercel >nul 2>nul
if errorlevel 1 (
  echo [!] DATABASE_URI di .env.vercel belum diisi.
  echo     Salin dari Vercel: Storage, Neon, tab .env.local, nilai DATABASE_URL.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js belum terpasang. Unduh versi LTS 22+ dari https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules\payload\" (
  echo Memasang paket - sekali saja, beberapa menit...
  pushd "%~dp0" & call npm ci & popd
)
call npm run backup:prod
echo.
echo PENTING: folder backups berisi data pribadi. Simpan di tempat aman, jangan dibagikan.
pause
