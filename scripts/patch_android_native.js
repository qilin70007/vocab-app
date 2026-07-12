'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainActivity = path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'vocabmaster', 'app', 'MainActivity.java');
const androidManifest = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const variablesGradle = path.join(root, 'android', 'variables.gradle');

if (!fs.existsSync(mainActivity)) {
  console.error(`Android MainActivity not found: ${mainActivity}`);
  process.exit(1);
}

const source = `package com.vocabmaster.app;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.media.AudioManager;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class MainActivity extends BridgeActivity {
  private static final String GOOGLE_TTS_PACKAGE = "com.google.android.tts";
  private static final String SYSTEM_DEFAULT_ENGINE = "";

  private final List<String> ttsEngineCandidates = new ArrayList<>();
  private TextToSpeech textToSpeech = null;
  private boolean ttsReady = false;
  private boolean ttsInitializing = false;
  private boolean ttsInitFailed = false;
  private int ttsEngineIndex = -1;
  private int ttsGeneration = 0;
  private String activeTtsEngine = "";
  private String pendingTtsText = null;
  private String pendingTtsLang = "en-US";
  private float pendingTtsRate = 0.82f;
  private String pendingTtsCallbackId = null;
  private final Map<String, String> ttsCallbacks = new HashMap<>();
  private PowerManager.WakeLock readingWakeLock = null;
  private AudioManager audioManager = null;
  private boolean readingAudioFocus = false;
  private final AudioManager.OnAudioFocusChangeListener readingFocusListener = focusChange -> {};

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getBridge().getWebView().addJavascriptInterface(new VocabNativeBridge(), "VocabNative");
    getBridge().getWebView().post(() -> getBridge().getWebView().reload());
    initializePreferredTts();
  }

  @Override
  public void onResume() {
    super.onResume();
    if (ttsInitFailed && !ttsInitializing) initializePreferredTts();
  }

  @Override
  public void onDestroy() {
    stopBackgroundReading();
    synchronized (this) {
      ttsGeneration += 1;
      if (textToSpeech != null) {
        textToSpeech.stop();
        textToSpeech.shutdown();
        textToSpeech = null;
      }
      ttsReady = false;
      ttsInitializing = false;
    }
    super.onDestroy();
  }

  private synchronized void startBackgroundReading() {
    try {
      if (readingWakeLock == null) {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        readingWakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VocabMaster:ContinuousReading");
        readingWakeLock.setReferenceCounted(false);
      }
      if (!readingWakeLock.isHeld()) readingWakeLock.acquire();
    } catch (Exception ignored) {}
    try {
      if (audioManager == null) audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
      int result = audioManager.requestAudioFocus(readingFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
      readingAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    } catch (Exception ignored) {}
  }

  private synchronized void stopBackgroundReading() {
    try {
      if (readingWakeLock != null && readingWakeLock.isHeld()) readingWakeLock.release();
    } catch (Exception ignored) {}
    try {
      if (readingAudioFocus && audioManager != null) audioManager.abandonAudioFocus(readingFocusListener);
    } catch (Exception ignored) {}
    readingAudioFocus = false;
  }

  private void showToast(String message) {
    runOnUiThread(() -> android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show());
  }

  private void callback(String callbackId, JSONObject payload) {
    runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(
      "window.__vocabNativeCallbacks&&window.__vocabNativeCallbacks[" + JSONObject.quote(callbackId) + "]&&window.__vocabNativeCallbacks[" + JSONObject.quote(callbackId) + "](" + payload.toString() + ")",
      null
    ));
  }

  private List<String> installedTtsPackages() {
    Set<String> packageNames = new LinkedHashSet<>();
    try {
      Intent serviceIntent = new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE);
      List<ResolveInfo> services = getPackageManager().queryIntentServices(serviceIntent, PackageManager.GET_META_DATA);
      for (ResolveInfo service : services) {
        if (service.serviceInfo != null && service.serviceInfo.packageName != null) {
          packageNames.add(service.serviceInfo.packageName);
        }
      }
    } catch (Exception ignored) {}
    return new ArrayList<>(packageNames);
  }

  private boolean isIflytekEngine(String packageName) {
    String label = "";
    try {
      label = String.valueOf(getPackageManager().getApplicationLabel(
        getPackageManager().getApplicationInfo(packageName, 0)
      ));
    } catch (Exception ignored) {}
    String identity = (packageName + " " + label).toLowerCase(Locale.ROOT);
    return identity.contains("iflytek") || identity.contains("speechcloud") || identity.contains("讯飞");
  }

  private synchronized void initializePreferredTts() {
    if (ttsInitializing) return;
    ttsEngineCandidates.clear();
    List<String> installedPackages = installedTtsPackages();

    if (installedPackages.contains(GOOGLE_TTS_PACKAGE)) {
      ttsEngineCandidates.add(GOOGLE_TTS_PACKAGE);
    }

    List<String> iflytekPackages = new ArrayList<>();
    for (String packageName : installedPackages) {
      if (!GOOGLE_TTS_PACKAGE.equals(packageName) && isIflytekEngine(packageName)) {
        iflytekPackages.add(packageName);
      }
    }
    Collections.sort(iflytekPackages);
    ttsEngineCandidates.addAll(iflytekPackages);

    // Empty package name tells Android to use the engine configured as the system default.
    ttsEngineCandidates.add(SYSTEM_DEFAULT_ENGINE);
    ttsEngineIndex = -1;
    ttsInitFailed = false;
    startTtsCandidate(0);
  }

  private synchronized void startTtsCandidate(int candidateIndex) {
    if (candidateIndex >= ttsEngineCandidates.size()) {
      boolean hadPendingSpeech = pendingTtsText != null;
      pendingTtsCallbackId = null;
      pendingTtsText = null;
      ttsReady = false;
      ttsInitializing = false;
      ttsInitFailed = true;
      activeTtsEngine = "";
      if (hadPendingSpeech) showToast("未找到可用的文字转语音引擎，请安装 Google TTS、讯飞语音或启用系统默认引擎");
      return;
    }

    ttsEngineIndex = candidateIndex;
    ttsReady = false;
    ttsInitializing = true;
    ttsInitFailed = false;
    activeTtsEngine = "";
    final int generation = ++ttsGeneration;
    final String requestedEngine = ttsEngineCandidates.get(candidateIndex);

    runOnUiThread(() -> {
      TextToSpeech previous;
      synchronized (MainActivity.this) {
        previous = textToSpeech;
        textToSpeech = null;
      }
      if (previous != null) previous.shutdown();

      TextToSpeech.OnInitListener listener = status -> onTtsInitialized(generation, requestedEngine, status);
      TextToSpeech created = requestedEngine.isEmpty()
        ? new TextToSpeech(this, listener)
        : new TextToSpeech(this, listener, requestedEngine);

      synchronized (MainActivity.this) {
        if (generation != ttsGeneration) {
          created.shutdown();
          return;
        }
        textToSpeech = created;
      }
    });
  }

  private void onTtsInitialized(int generation, String requestedEngine, int status) {
    String queuedText = null;
    String queuedLang = "en-US";
    float queuedRate = 0.82f;
    String queuedCallbackId = null;
    int nextCandidate = -1;

    synchronized (this) {
      if (generation != ttsGeneration) return;
      ttsInitializing = false;
      if (status == TextToSpeech.SUCCESS && textToSpeech != null) {
        ttsReady = true;
        ttsInitFailed = false;
        activeTtsEngine = requestedEngine.isEmpty() ? currentEnginePackage() : requestedEngine;
        if (pendingTtsText != null) {
          queuedText = pendingTtsText;
          queuedLang = pendingTtsLang;
          queuedRate = pendingTtsRate;
          queuedCallbackId = pendingTtsCallbackId;
          pendingTtsCallbackId = null;
          pendingTtsText = null;
        }
      } else {
        ttsReady = false;
        nextCandidate = ttsEngineIndex + 1;
      }
    }

    if (nextCandidate >= 0) {
      startTtsCandidate(nextCandidate);
    } else if (queuedText != null) {
      speakNow(queuedText, queuedLang, queuedRate, queuedCallbackId);
    }
  }

  private synchronized String currentEnginePackage() {
    if (textToSpeech == null) return "";
    try {
      String engine = textToSpeech.getDefaultEngine();
      return engine == null ? "" : engine;
    } catch (Exception ignored) {
      return "";
    }
  }

  private synchronized boolean queueSpeechAndTryNextEngine(String text, String lang, float rate, String callbackId) {
    pendingTtsText = text;
    pendingTtsLang = lang;
    pendingTtsRate = rate;
    pendingTtsCallbackId = callbackId;
    int nextCandidate = ttsEngineIndex + 1;
    if (nextCandidate >= ttsEngineCandidates.size()) {
      pendingTtsCallbackId = null;
      pendingTtsText = null;
      ttsReady = false;
      ttsInitFailed = true;
      activeTtsEngine = "";
      return false;
    }
    startTtsCandidate(nextCandidate);
    return true;
  }

  private boolean speakNow(String text, String lang, float rate, String callbackId) {
    TextToSpeech engine;
    synchronized (this) {
      if (textToSpeech == null || !ttsReady) return false;
      engine = textToSpeech;
    }

    Locale locale = String.valueOf(lang).toLowerCase(Locale.ROOT).startsWith("zh") ? Locale.CHINA : Locale.US;
    int languageStatus = engine.setLanguage(locale);
    if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
      if (queueSpeechAndTryNextEngine(text, lang, rate, callbackId)) return true;
      showToast("Google TTS、讯飞语音和系统默认引擎均不支持该语言，请安装对应语音包");
      return false;
    }

    engine.setSpeechRate(rate);
    Bundle speakParams = new Bundle();
    speakParams.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
    speakParams.putString(TextToSpeech.Engine.KEY_PARAM_STREAM, String.valueOf(android.media.AudioManager.STREAM_MUSIC));
    String utteranceId = "vocab-" + System.currentTimeMillis();
    if (callbackId != null && !callbackId.isEmpty()) {
      synchronized (this) { ttsCallbacks.put(utteranceId, callbackId); }
      engine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
        @Override public void onStart(String id) {}
        @Override public void onDone(String id) { notifyTtsFinished(id, "OK"); }
        @Override public void onError(String id) { notifyTtsFinished(id, "OK"); }
        @Override public void onError(String id, int errorCode) { notifyTtsFinished(id, "OK"); }
      });
    }
    engine.playSilentUtterance(120, TextToSpeech.QUEUE_FLUSH, utteranceId + "-warmup");
    int speakStatus = engine.speak(text, TextToSpeech.QUEUE_ADD, speakParams, utteranceId);
    if (speakStatus == TextToSpeech.SUCCESS) return true;
    return queueSpeechAndTryNextEngine(text, lang, rate, callbackId);
  }


  private void notifyTtsFinished(String utteranceId, String result) {
    String callbackId = null;
    synchronized (this) {
      callbackId = ttsCallbacks.remove(utteranceId);
    }
    if (callbackId == null || callbackId.isEmpty()) return;
    try {
      JSONObject payload = new JSONObject();
      payload.put("result", result);
      callback(callbackId, payload);
    } catch (Exception ignored) {}
  }

  public class VocabNativeBridge {
    @JavascriptInterface
    public void startContinuousReading() { startBackgroundReading(); }

    @JavascriptInterface
    public void stopContinuousReading() { stopBackgroundReading(); }

    private String saveDocumentInternal(String filename, String content, String mimeType, boolean quiet) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType);
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/VocabMaster");
        Uri item = null;
        try {
          item = getContentResolver().insert(collection, values);
          if (item != null) {
            try (OutputStream output = getContentResolver().openOutputStream(item, "wt")) {
              if (output == null) throw new java.io.IOException("无法打开备份文件");
              output.write(content.getBytes(StandardCharsets.UTF_8));
            }
            String location = "Download/VocabMaster/" + filename;
            if (!quiet) showToast("学习数据已导出到：" + location);
            return "SAVED_DOWNLOADS:" + location;
          }
        } catch (Exception mediaError) {
          if (item != null) {
            try { getContentResolver().delete(item, null, null); } catch (Exception ignored) {}
          }
        }
      }

      File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
      File outputDir = new File(downloads, "VocabMaster");
      if (!outputDir.exists()) outputDir.mkdirs();
      if (!outputDir.exists() || !outputDir.canWrite()) {
        outputDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (outputDir == null) outputDir = getFilesDir();
        if (!outputDir.exists()) outputDir.mkdirs();
      }
      File outputFile = new File(outputDir, filename);
      try (OutputStream output = new FileOutputStream(outputFile)) {
        output.write(content.getBytes(StandardCharsets.UTF_8));
        if (!quiet) showToast("学习数据已导出到：" + outputFile.getAbsolutePath());
        return "SAVED_DOWNLOADS:" + outputFile.getAbsolutePath();
      } catch (Exception writeError) {
        if (!quiet) showToast("导出失败：" + writeError.getMessage());
        return "ERROR";
      }
    }

    @JavascriptInterface
    public String saveJson(String filename, String content) {
      return saveDocumentInternal(filename, content, "application/json", false);
    }

    @JavascriptInterface
    public String saveJsonQuiet(String filename, String content) {
      return saveDocumentInternal(filename, content, "application/json", true);
    }

    @JavascriptInterface
    public String saveDocument(String filename, String content, String mimeType) {
      return saveDocumentInternal(filename, content, mimeType, false);
    }

    @JavascriptInterface
    public String speak(String text, String lang, String rateText) {
      float rate = 0.82f;
      try {
        rate = Float.parseFloat(rateText);
      } catch (Exception ignored) {}

      synchronized (MainActivity.this) {
        if (ttsInitFailed && !ttsInitializing) return "NO_TTS_ENGINE";
        if (textToSpeech == null || !ttsReady) {
          pendingTtsText = text;
          pendingTtsLang = lang;
          pendingTtsRate = rate;
          pendingTtsCallbackId = null;
          if (!ttsInitializing) initializePreferredTts();
          return "OK";
        }
      }
      return speakNow(text, lang, rate, null) ? "OK" : "NO_TTS_ENGINE";
    }



    @JavascriptInterface
    public String speakWithCallback(String text, String lang, String rateText, String callbackId) {
      float rate = 0.82f;
      try {
        rate = Float.parseFloat(rateText);
      } catch (Exception ignored) {}

      synchronized (MainActivity.this) {
        if (ttsInitFailed && !ttsInitializing) return "NO_TTS_ENGINE";
        if (textToSpeech == null || !ttsReady) {
          pendingTtsText = text;
          pendingTtsLang = lang;
          pendingTtsRate = rate;
          pendingTtsCallbackId = callbackId;
          if (!ttsInitializing) initializePreferredTts();
          return "OK";
        }
      }
      return speakNow(text, lang, rate, callbackId) ? "OK" : "NO_TTS_ENGINE";
    }

    @JavascriptInterface
    public String getTtsEngine() {
      synchronized (MainActivity.this) {
        return activeTtsEngine;
      }
    }

    @JavascriptInterface
    public void stopTts() {
      synchronized (MainActivity.this) {
        pendingTtsCallbackId = null;
        pendingTtsText = null;
        ttsCallbacks.clear();
        if (textToSpeech != null) textToSpeech.stop();
      }
    }

    @JavascriptInterface
    public void openTtsSettings() {
      runOnUiThread(() -> {
        try {
          Intent installIntent = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
          startActivity(installIntent);
        } catch (Exception installError) {
          try {
            Intent settingsIntent = new Intent(Settings.ACTION_SETTINGS);
            startActivity(settingsIntent);
          } catch (Exception settingsError) {
            showToast("请在系统设置中搜索“文字转语音输出”，安装或启用英文语音引擎");
          }
        }
      });
    }

    @JavascriptInterface
    public void request(String method, String urlText, String headersJson, String body, String callbackId) {
      new Thread(() -> {
        HttpURLConnection connection = null;
        try {
          URL url = new URL(urlText);
          connection = (HttpURLConnection) url.openConnection();
          connection.setRequestMethod(method);
          connection.setConnectTimeout(10000);
          connection.setReadTimeout(10000);
          JSONObject headers = new JSONObject(headersJson == null || headersJson.isEmpty() ? "{}" : headersJson);
          Iterator<String> keys = headers.keys();
          while (keys.hasNext()) {
            String key = keys.next();
            connection.setRequestProperty(key, headers.optString(key));
          }
          if (body != null && !body.isEmpty()) {
            connection.setDoOutput(true);
            try (OutputStream output = connection.getOutputStream()) {
              output.write(body.getBytes(StandardCharsets.UTF_8));
            }
          }
          int status = connection.getResponseCode();
          java.io.InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
          String responseBody = "";
          if (input != null) {
            try (java.util.Scanner scanner = new java.util.Scanner(input, StandardCharsets.UTF_8.name()).useDelimiter("\\\\A")) {
              responseBody = scanner.hasNext() ? scanner.next() : "";
            }
          }
          JSONObject payload = new JSONObject();
          payload.put("status", status);
          payload.put("body", responseBody);
          callback(callbackId, payload);
        } catch (Exception error) {
          JSONObject payload = new JSONObject();
          try {
            payload.put("error", error.getMessage());
          } catch (Exception ignored) {}
          callback(callbackId, payload);
        } finally {
          if (connection != null) connection.disconnect();
        }
      }).start();
    }
  }
}
`;

fs.writeFileSync(mainActivity, source, 'utf8');
console.log(`Patched native Android bridge: ${path.relative(root, mainActivity)}`);

if (fs.existsSync(androidManifest)) {
  let manifest = fs.readFileSync(androidManifest, 'utf8');
  if (!manifest.includes('android.permission.WAKE_LOCK')) {
    manifest = manifest.replace(/<application\b/, '<uses-permission android:name="android.permission.WAKE_LOCK" />\n    <application');
    fs.writeFileSync(androidManifest, manifest, 'utf8');
    console.log(`Added Android wake-lock permission: ${path.relative(root, androidManifest)}`);
  }
  if (!manifest.includes('android.intent.action.TTS_SERVICE')) {
    const queries = `\n    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n`;
    manifest = manifest.replace(/\s*<application\b/, `${queries}\n    <application`);
    fs.writeFileSync(androidManifest, manifest, 'utf8');
    console.log(`Added Android TTS package visibility query: ${path.relative(root, androidManifest)}`);
  }
}

if (fs.existsSync(variablesGradle)) {
  let gradle = fs.readFileSync(variablesGradle, 'utf8');
  gradle = gradle
    .replace(/minSdkVersion\s*=\s*\d+/g, 'minSdkVersion = 26')
    .replace(/compileSdkVersion\s*=\s*\d+/g, 'compileSdkVersion = 35')
    .replace(/targetSdkVersion\s*=\s*\d+/g, 'targetSdkVersion = 35');
  fs.writeFileSync(variablesGradle, gradle, 'utf8');
  console.log('Patched Android SDK versions: minSdkVersion=26 compileSdkVersion=35 targetSdkVersion=35');
}
