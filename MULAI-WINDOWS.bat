@echo off
setlocal
title Website SMP Nasional KPS (lokal)
cd /d "%~dp0"
rem Monorepo: website ada di apps\web. File .env/.env.vercel lama di folder utama dipindahkan otomatis.
if exist ".env" if not exist "apps\web\.env" move ".env" "apps\web\.env" >nul
if exist ".env.vercel" if not exist "apps\web\.env.vercel" move ".env.vercel" "apps\web\.env.vercel" >nul
cd /d "%~dp0apps\web"

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

rem Platform multi-sekolah: alamat localhost menampilkan sekolah KPS (isi paket konten awal).
findstr /b /c:"DEFAULT_TENANT_SLUG=" .env >nul 2>nul || (echo.>>.env & echo DEFAULT_TENANT_SLUG=kps>>.env)

if not exist "..\..\node_modules\@payloadcms\storage-vercel-blob\" (
  echo [1/3] Memasang paket - sekali saja, beberapa menit...
  pushd "%~dp0" & call npm ci & popd
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
