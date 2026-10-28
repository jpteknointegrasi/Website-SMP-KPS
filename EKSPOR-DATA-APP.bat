@echo off
setlocal
title Ekspor data Satu Sekolah App (produksi)
cd /d "%~dp0apps\portal"
echo ================================================
echo   Ekspor database App sekolah + berkasnya
echo   (cadangan dan portabilitas data, folder backups\)
echo ================================================
echo.
if not exist ".env.vercel" (
  echo [!] Buat berkas apps\portal\.env.vercel berisi variabel proyek Vercel App:
  echo     PLATFORM_DATABASE_URL, PLATFORM_SECRET, STORAGE_DRIVER=s3, S3_ENDPOINT, S3_BUCKET,
  echo     S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION  ^(salin dari Vercel, Settings, Environment Variables^)
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js belum terpasang. Unduh versi LTS 22+ dari https://nodejs.org
  pause
  exit /b 1
)
if not exist "..\..\node_modules\drizzle-orm\" (
  echo Memasang paket - sekali saja, beberapa menit...
  pushd "%~dp0" & call npm ci & popd
)
set /p KODE=Kode sekolah (mis. kps):
if "%KODE%"=="" set KODE=kps
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set WAKTU=%%i
set DOTENV_CONFIG_PATH=.env.vercel
call npx tsx scripts/export.ts --sekolah %KODE% --keluar "..\..\backups\app-%KODE%-%WAKTU%"
echo.
echo PENTING: folder backups berisi data pribadi siswa dan keluarga. Simpan terenkripsi, jangan dibagikan.
echo Pemulihan: npm run pulihkan -w @satusekolah/portal -- --sekolah %KODE% --dari ^<folder^> --ya
echo (hanya ke database App yang kosong dan sudah dimigrasi untuk sekolah yang sama)
pause
