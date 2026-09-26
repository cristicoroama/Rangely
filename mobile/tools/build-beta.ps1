# Rangely beta build: a standalone APK with the JavaScript inside it.
#
# No Metro, no laptop and no cable needed to run it: install it once and ride.
# It is signed with the same debug key as the development build, so it
# installs over it and keeps your rides.
#
#   npm run beta            (from the mobile folder)
#
# The APK lands in ..\beta\Rangely-beta-<date>.apk. If exactly one real phone
# is connected (cable or wireless debugging), it is installed on it as well.

$ErrorActionPreference = "Stop"
$mobile = Split-Path -Parent $PSScriptRoot

# Java 17 and the Android SDK, found the same way as for `npx expo run:android`.
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  $jdk = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
  if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"

# Only the ARM 64-bit code every recent phone runs: a smaller APK and a faster
# build. (It will not install on the x86 emulator; use the dev build there.)
Push-Location (Join-Path $mobile "android")
try {
  & .\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a"
  if ($LASTEXITCODE -ne 0) { throw "Gradle build failed (exit code $LASTEXITCODE)." }
} finally {
  Pop-Location
}

$apk = Join-Path $mobile "android\app\build\outputs\apk\release\app-release.apk"
$outDir = Join-Path (Split-Path -Parent $mobile) "beta"
New-Item -ItemType Directory -Force $outDir | Out-Null
$dest = Join-Path $outDir ("Rangely-beta-{0}.apk" -f (Get-Date -Format "yyyy-MM-dd_HHmm"))
Copy-Item $apk $dest
$sizeMb = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host ""
Write-Host "Beta APK ($sizeMb MB): $dest" -ForegroundColor Green

# Install straight away if one real phone is connected; emulators are skipped.
$adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
if (Test-Path $adb) {
  $phones = & $adb devices | Select-String "\tdevice$" | Where-Object { $_ -notmatch "^emulator-" }
  if (@($phones).Count -eq 1) {
    $serial = ($phones[0].ToString() -split "\t")[0]
    Write-Host "Installing on $serial ..."
    & $adb -s $serial install -r $dest
  } else {
    Write-Host "No single phone connected - copy the APK to the phone and open it to install."
  }
}
