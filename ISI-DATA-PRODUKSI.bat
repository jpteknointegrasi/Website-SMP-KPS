@echo off
setlocal
title Isi data awal ke website produksi (Vercel)
cd /d "%~dp0"
rem Monorepo: website ada di apps\web. File .env/.env.vercel lama di folder utama dipindahkan otomatis.
if exist ".env" if not exist "apps\web\.env" move ".env" "apps\web\.env" >nul
if exist ".env.vercel" if not exist "apps\web\.env.vercel" move ".env.vercel" "apps\web\.env.vercel" >nul
cd /d "%~dp0apps\web"

echo ================================================
echo   Mengisi konten dan foto awal ke database produksi
echo ================================================
echo.

if not exist ".env.vercel" (
  echo [!] File .env.vercel belum ada.
  echo     Ikuti PANDUAN_GO_LIVE_VERCEL.md langkah 6, lalu jalankan file ini lagi.
  pause
  exit /b 1
)
findstr /b /c:"DATABASE_URI=postgres" .env.vercel >nul
if errorlevel 1 (
  echo [!] DATABASE_URI di .env.vercel belum diisi - salin dari Vercel, Storage, Neon.
  pause
  exit /b 1
)
findstr /b /c:"BLOB_READ_WRITE_TOKEN=vercel_blob" .env.vercel >nul
if errorlevel 1 (
  echo [!] BLOB_READ_WRITE_TOKEN di .env.vercel belum diisi - salin dari Vercel, Storage, Blob.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js belum terpasang. Unduh versi LTS 22+ dari https://nodejs.org
  pause
  exit /b 1
)

if not exist "..\..\node_modules\@payloadcms\storage-vercel-blob\" (
  echo Memasang paket - sekali saja, beberapa menit...
  pushd "%~dp0" & call npm ci & popd
  if errorlevel 1 (
    echo [!] Gagal memasang paket.
    pause
    exit /b 1
  )
)

echo Mengunggah foto ke Vercel Blob dan mengisi database Neon...
echo Aman diulang: data yang sudah ada tidak digandakan.
echo.
call npm run seed:prod
if errorlevel 1 (
  echo.
  echo [!] Pengisian data gagal. Kirim tangkapan layar jendela ini ke tim pengembang.
  pause
  exit /b 1
)
echo.
echo Selesai. Buka website Anda di Vercel, lalu /admin untuk membuat akun Admin pertama.
pause
