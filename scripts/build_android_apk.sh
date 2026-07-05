#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Preparing bundled mobile word list"
npm run mobile:prepare

echo "==> Ensuring Capacitor packages are installed"
if [ ! -d node_modules/@capacitor/android ]; then
  npm install -D @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7
fi

echo "==> Creating Android project if needed"
if [ ! -d android ]; then
  npx cap add android
fi

echo "==> Syncing web assets into Android project"
npx cap sync android

echo "==> Building debug APK"
if [ -x android/gradlew ]; then
  (cd android && ./gradlew assembleDebug --stacktrace)
else
  (cd android && gradle assembleDebug --stacktrace)
fi

APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK" ]; then
  echo "APK was not generated at $APK" >&2
  exit 1
fi

mkdir -p dist
cp "$APK" dist/vocab-app-mobile-debug.apk

echo "Generated APK: dist/vocab-app-mobile-debug.apk"
