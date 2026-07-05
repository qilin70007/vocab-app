# 给 Claw 的完整 APK 生成指令

把下面整段发给 Claw / 另一台具备 Android 构建环境的执行器。目标是生成一个可以安装到安卓手机的 APK 文件。

## 任务说明

你在处理 `/workspace/vocab-app` 仓库。请生成安卓手机离线版 APK。这个 APK 必须使用仓库里的手机离线入口和内置词库：

- 手机入口：`public/mobile.html`
- 内置词库：`public/words.json`
- Capacitor 配置：`capacitor.config.json`
- 构建脚本：`scripts/build_android_apk.sh`

## 环境要求

需要可访问 npm、Maven/Gradle、Android SDK 下载源，并安装：

1. Node.js 18+
2. JDK 17 或 21
3. Android Studio 或 Android SDK / Gradle
4. 可用网络，能安装 `@capacitor/core @capacitor/cli @capacitor/android`

## 执行命令

```bash
cd /workspace/vocab-app

git status --short
npm ci
npm run mobile:prepare
npm install -D @capacitor/core @capacitor/cli @capacitor/android

# 如果 android 目录不存在，这一步会创建 Android 工程；存在则跳过
if [ ! -d android ]; then
  npx cap add android
fi

npx cap sync android

# 生成 debug APK
if [ -x android/gradlew ]; then
  (cd android && ./gradlew assembleDebug)
else
  (cd android && gradle assembleDebug)
fi

mkdir -p dist
cp android/app/build/outputs/apk/debug/app-debug.apk dist/vocab-app-mobile-debug.apk
ls -lh dist/vocab-app-mobile-debug.apk
```

也可以直接运行仓库脚本：

```bash
cd /workspace/vocab-app
npm ci
./scripts/build_android_apk.sh
```

## 验证要求

生成后请执行：

```bash
unzip -t dist/vocab-app-mobile-debug.apk
npm run mobile:where
npm run check
```

如果连接了安卓手机，可继续执行：

```bash
adb install -r dist/vocab-app-mobile-debug.apk
```

## 交付物

请把以下文件作为最终产物返回：

```text
dist/vocab-app-mobile-debug.apk
```

并在回复里说明：

1. APK 文件路径。
2. APK 文件大小。
3. 是否通过 `unzip -t`。
4. 是否执行过 `adb install -r`。
5. 如果失败，贴出失败命令和完整错误。

## 常见失败处理

- 如果 `npm install -D @capacitor/android` 失败：检查 npm registry 或代理。
- 如果 `npx cap add android` 失败：确认 JDK 和 Android SDK 可用。
- 如果 `gradle assembleDebug` 失败：打开 Android Studio 安装缺失的 SDK Platform / Build Tools 后重试。
- 如果 APK 生成但打开后仍请求电脑服务器：检查 `public/mobile.html` 是否包含 `window.VOCAB_STANDALONE = true`，并重新运行 `npx cap sync android`。
