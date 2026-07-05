# 安卓手机端使用方案

你可以按需求选择两种手机端使用方式：

## 方案 A：手机浏览器访问电脑网址（最简单）

适合：电脑在身边，手机和电脑在同一个 Wi‑Fi。

1. 在电脑上进入项目目录，运行：

   ```bash
   npm start
   ```

2. 电脑终端会显示手机访问地址，例如：

   ```text
   手机访问: http://192.168.x.x:3000
   ```

3. 安卓手机连接同一个 Wi‑Fi，用 Chrome/Edge 打开这个地址。
4. 进入“同步设置”，手机和电脑填同一个同步码。
5. 背词、复习、拼写产生的记录会同步到电脑服务器。

注意：这种方式只是访问电脑上的本地服务器。电脑关机、服务停止、手机不在同一网络时，这个网址就打不开。

## 方案 B：真正手机端 APK（电脑不在身边也能背）

适合：希望手机独立打开、独立背词，不依赖电脑服务器。

这里的“真正手机端”不是一个已经提交到仓库里的 `.apk` 文件，而是已经落地好的 APK 源码/打包入口：

- `public/mobile.html`：手机离线版入口，会设置 `window.VOCAB_STANDALONE = true`。
- `public/words.json`：打包进手机的内置词库。
- `public/app.js`：检测 standalone 模式后，不再请求电脑 `/api`，改用手机本地词库和本地进度。
- `capacitor.config.json`：Capacitor 打包配置。

生成 APK 之后，实际安装包位置通常是：`android/app/build/outputs/apk/debug/app-debug.apk`。

### 生成 APK

> 当前执行环境无法从 npm registry 安装 `@capacitor/android`（403），所以仓库已落地 Web 侧离线模式、词库资产和 Capacitor 配置；在本机网络正常的开发机上执行下面命令即可生成安卓工程/APK。

```bash
npm install -D --legacy-peer-deps @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7 @capacitor-community/text-to-speech
npm run mobile:prepare
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio 打开后，选择 **Build > Build Bundle(s) / APK(s) > Build APK(s)**。生成后在 Android Studio 弹窗中点 **locate**，或到 `android/app/build/outputs/apk/debug/app-debug.apk` 找到 APK，再把它安装到安卓手机。

### APK 日常使用

1. 手机打开 APK。
2. 直接进入“背词 / 复习 / 拼写”。
3. 进度保存在手机本地，不需要电脑开机，也不需要同一个 Wi‑Fi。
4. 建议定期到“同步设置”导出 JSON 备份。


### APK 连接电脑同步

APK 不是打开电脑网址，所以只填同步码不够；还需要在“同步设置”里填写 **APK 电脑同步地址**，例如：

```text
http://192.168.1.8:3000
```

电脑端必须先运行 `npm start`，手机和电脑必须在同一网络。保存地址后再点“立即同步”。
如果提示 `Failed to fetch` / `无法连接电脑同步地址`：

1. 确认 APK 里填的是电脑终端显示的完整地址，例如 `http://192.168.1.8:3000`，不是只填同步码。
2. 确认电脑正在运行 `npm start`。
3. 确认手机和电脑在同一个 Wi‑Fi，且手机浏览器能打开这个地址。
4. Windows 防火墙弹窗请选择允许 Node.js 访问专用网络。
5. 重新生成 APK，确保 `capacitor.config.json` 使用 `androidScheme: "http"` 和 `cleartext: true`。


### APK 和电脑同步

当前落地的是“手机可独立离线背词”的 APK 基础版。同步可以先用备份文件完成：

1. 手机 APK：进入“同步设置” → “立即导出学习数据”。
2. 电脑网页版：进入“同步设置” → “导入学习数据”。
3. 或反过来，把电脑导出的 JSON 导入手机 APK。

如果你要手机和电脑自动实时同步，推荐把 Node 服务部署到 HTTPS 云服务器，让手机和电脑都连接同一个云端地址。

## 方案 C：HTTPS 云端部署（不装 APK，但电脑不必在身边）

适合：希望手机用浏览器访问固定网址，且电脑不在身边也能同步。

做法是把当前 Node 服务部署到云服务器，并配置 HTTPS 域名。手机和电脑都访问同一个云端网址、使用同一个同步码即可。缺点是需要服务器费用，并且要考虑账号和数据安全。

## 方案 D：用 GitHub Actions 自动生成 APK

如果本地电脑没有 Android Studio，或者本地网络下载 Android SDK/Capacitor 失败，可以把代码推到 GitHub 后手动运行仓库里的 **Build Android APK** 工作流。

步骤：

1. 打开 GitHub 仓库页面。
2. 进入 **Actions**。
3. 选择 **Build Android APK v2**（如果只看到旧的 Build Android APK，说明最新 workflow 还没推到 GitHub）。
4. 点击 **Run workflow**。
5. 等任务完成后，在页面底部 **Artifacts** 下载 `vocab-app-mobile-debug-apk`。
6. 解压后得到 `vocab-app-mobile-debug.apk`，传到安卓手机安装。

这个方法使用 `.github/workflows/android-apk.yml`，会在 GitHub 的 Ubuntu 构建机上分步执行 Android SDK、Capacitor、Gradle 构建并上传 APK 产物。
