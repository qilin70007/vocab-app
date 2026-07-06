# 给 Claw 的完整 APK 生成指令

把下面整段发给 Claw / 另一台具备 Android 构建环境的执行器。目标是生成一个可以安装到安卓手机的离线版 APK 文件。

## 任务说明

你在处理词汇应用仓库。请生成安卓手机离线版 APK。这个 APK 必须使用仓库里的手机离线入口、内置词库和 standalone 逻辑：

- 手机入口：`public/mobile.html`
- standalone 标记：`public/mobile.html` 里必须有 `window.VOCAB_STANDALONE = true`
- 内置词库：`public/words.json`
- Capacitor 配置：`capacitor.config.json`
- 构建脚本：`scripts/build_android_apk.sh`
- 目标产物：`dist/vocab-app-mobile-debug.apk`

## 环境要求

需要可访问 npm、Maven/Gradle、Android SDK 下载源，并安装：

1. Node.js 18+（推荐 22）
2. JDK 17
3. Android Studio 或 Android SDK / Gradle
4. 可用网络，能安装 `@capacitor/core@7 @capacitor/cli@7 @capacitor/android@7 @capacitor-community/text-to-speech @capacitor/filesystem@7 @capacitor/share@7`
5. `capacitor.config.json` 中必须保留 `androidScheme: "http"` 和 `cleartext: true`，否则 APK 可能无法请求电脑的 `http://192.168.x.x:3000`

## 如果从 GitHub Actions 构建

1. 打开 GitHub 仓库。
2. 进入 **Actions**。
3. 选择 **Build Android APK v2**。
4. 点击 **Run workflow**。
5. 成功后下载 Artifact：`vocab-app-mobile-debug-apk`。
6. 解压得到 `vocab-app-mobile-debug.apk`。

如果失败，请点开失败步骤，必须返回具体失败步骤和完整日志，不要只返回总览截图。

## 如果在本地/Claw 机器构建

先进入项目根目录。如果 Claw 的项目路径不是 `/workspace/vocab-app`，请替换成实际路径。

```bash
cd /workspace/vocab-app
```

执行完整构建：

```bash
git status --short
npm ci
npm run mobile:prepare
npm install -D --legacy-peer-deps @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7 @capacitor-community/text-to-speech @capacitor/filesystem@7 @capacitor/share@7

if [ ! -d android ]; then
  npx cap add android
fi

npx cap sync android

if [ -x android/gradlew ]; then
  (cd android && ./gradlew assembleDebug --stacktrace --info)
else
  (cd android && gradle assembleDebug --stacktrace --info)
fi

mkdir -p dist
cp android/app/build/outputs/apk/debug/app-debug.apk dist/vocab-app-mobile-debug.apk
ls -lh dist/vocab-app-mobile-debug.apk
```

也可以直接运行仓库脚本：

```bash
cd /workspace/vocab-app
npm ci
npm run mobile:apk
```

## 验证要求

生成后必须执行：

```bash
unzip -t dist/vocab-app-mobile-debug.apk
npm run mobile:where
npm run check
```

如果连接了安卓手机，可继续执行：

```bash
adb install -r dist/vocab-app-mobile-debug.apk
```

## 手机安装后的同步说明

APK 是手机本地独立版。安装后如果要和电脑同步，不能只填同步码，还必须填写电脑服务器地址：

1. 电脑运行：

   ```bash
   npm start
   ```

2. 电脑终端会显示类似：

   ```text
   手机访问: http://192.168.1.8:3000
   ```

3. 手机 APK 打开 **同步设置**。
4. 同步码填写和电脑一致。
5. **APK 电脑同步地址** 填电脑终端显示的地址，例如：

   ```text
   http://192.168.1.8:3000
   ```

6. 点 **保存地址**。
7. 点 **立即同步**。

## 交付物

请把以下文件作为最终产物返回：

```text
dist/vocab-app-mobile-debug.apk
```

并在回复里说明：

1. APK 文件路径。
2. APK 文件大小。
3. `unzip -t` 是否通过。
4. `npm run check` 是否通过。
5. 是否执行过 `adb install -r`。
6. 如果失败，贴出失败命令和完整错误日志。

## 常见失败处理

- 如果 `npm install -D @capacitor/android@7` 失败：检查 npm registry 或代理。
- 如果 `npx cap add android` 失败：确认 JDK 17 和 Android SDK 可用。
- 如果 `gradle assembleDebug` 失败：打开 Android Studio 安装缺失的 SDK Platform / Build Tools 后重试。
- 如果 APK 生成但打开后仍请求电脑服务器：检查 `public/mobile.html` 是否包含 `window.VOCAB_STANDALONE = true`，并重新运行 `npx cap sync android`。
- 如果 APK 能打开但“立即同步”没反应：确认电脑端已运行 `npm start`，手机和电脑在同一网络，APK 里已填写 **APK 电脑同步地址**，且电脑地址形如 `http://192.168.x.x:3000`。
