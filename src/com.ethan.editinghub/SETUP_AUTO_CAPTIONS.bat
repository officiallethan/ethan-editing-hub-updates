@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%~dp0transcribe"
set "RUNTIME=%ROOT%\runtime"
set "MODELS=%ROOT%\models"
set "FFROOT=%ROOT%\ffmpeg"
if not exist "%RUNTIME%" mkdir "%RUNTIME%"
if not exist "%MODELS%" mkdir "%MODELS%"
if not exist "%FFROOT%" mkdir "%FFROOT%"

echo [Ethan Hub] Preparing free local Auto Captions engine...

if not exist "%RUNTIME%\Release\whisper-cli.exe" (
  echo [1/3] Downloading lightweight whisper.cpp CPU runtime...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip' -OutFile '%ROOT%\whisper-bin-x64.zip'"
  if errorlevel 1 exit /b 2
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ROOT%\whisper-bin-x64.zip' -DestinationPath '%RUNTIME%' -Force"
  if errorlevel 1 exit /b 3
)

if not exist "%MODELS%\ggml-tiny.en-q5_1.bin" (
  echo [2/3] Downloading Whisper tiny.en Q5_1 model ^(~31 MB^)...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin' -OutFile '%MODELS%\ggml-tiny.en-q5_1.bin'"
  if errorlevel 1 exit /b 4
)

where ffmpeg >nul 2>nul
if errorlevel 1 if not exist "%FFROOT%\ffmpeg.exe" (
  echo [3/3] ffmpeg was not found. Downloading a local free copy for caption audio extraction...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile '%ROOT%\ffmpeg-release-essentials.zip'"
  if errorlevel 1 exit /b 5
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$z='%ROOT%\ffmpeg-release-essentials.zip';$d='%ROOT%\ffmpeg_unpack';if(Test-Path $d){Remove-Item $d -Recurse -Force};Expand-Archive -LiteralPath $z -DestinationPath $d -Force;$x=Get-ChildItem $d -Recurse -Filter ffmpeg.exe | Select-Object -First 1;if(-not $x){exit 6};Copy-Item $x.FullName '%FFROOT%\ffmpeg.exe' -Force"
  if errorlevel 1 exit /b 6
)

echo [Ethan Hub] Auto Captions engine ready. No API key. CPU-only by default.
exit /b 0
