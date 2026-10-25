@echo off
setlocal
title Website SMP Nasional KPS (lokal)
cd /d "%~dp0"

echo ================================================
echo   Website SMP Nasional KPS - jalankan di komputer ini
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js belum terpasang.
  echo     Unduh versi LTS 22 atau lebih baru dari https://nodejs.org lalu jalankan file ini lagi.
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 22 (
  echo [!] Versi Node.js terlalu lama. Dibutuhkan versi 22.12 atau lebih baru.
  node -v
  pause
  exit /b 1
)

if not exist ".env" (
  echo [!] File .env tidak ditemukan. Salin .env.example menjadi .env lalu isi nilainya.
  pause
  exit /b 1
)

if not exist "node_modules\@payloadcms\storage-vercel-blob\" (
  echo [1/3] Memasang paket - sekali saja, beberapa menit...
  call npm ci
  if errorlevel 1 (
    echo [!] Gagal memasang paket. Periksa koneksi internet lalu coba lagi.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Paket sudah terpasang.
)

if not exist "kps.db" (
  echo [2/3] Membuat database lokal dan mengisi konten awal...
  call npm run seed
  if errorlevel 1 (
    echo [!] Gagal mengisi konten awal.
    pause
    exit /b 1
  )
) else (
  echo [2/3] Database lokal sudah ada.
)

echo [3/3] Menjalankan website...
echo.
echo   Website : http://localhost:3000
echo   CMS     : http://localhost:3000/admin - akun pertama otomatis jadi Admin Teknis
echo   Hentikan: tekan Ctrl+C di jendela ini
echo.
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"
call npm run dev
pause
