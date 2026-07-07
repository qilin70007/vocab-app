'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainActivity = path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'vocabmaster', 'app', 'MainActivity.java');
const variablesGradle = path.join(root, 'android', 'variables.gradle');

if (!fs.existsSync(mainActivity)) {
  console.error(`Android MainActivity not found: ${mainActivity}`);
  process.exit(1);
}

const source = `package com.vocabmaster.app;

import android.os.Bundle;
import android.os.Environment;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
  private TextToSpeech textToSpeech = null;
  private boolean ttsReady = false;
  private boolean ttsInitFailed = false;
  private String pendingTtsText = null;
  private String pendingTtsLang = "en-US";
  private float pendingTtsRate = 0.82f;
  private String pendingTtsCallbackId = null;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getBridge().getWebView().addJavascriptInterface(new VocabNativeBridge(), "VocabNative");
    getBridge().getWebView().post(() -> getBridge().getWebView().reload());
    textToSpeech = new TextToSpeech(this, status -> {
      ttsReady = status == TextToSpeech.SUCCESS;
      ttsInitFailed = !ttsReady;
      if (!ttsReady) {
        showToast("当前设备没有可用的系统文字转语音引擎");
        return;
      }
      if (pendingTtsText != null) {
        if (pendingTtsCallbackId != null) {
          speakWithCallbackNow(pendingTtsText, pendingTtsLang, pendingTtsRate, pendingTtsCallbackId);
        } else {
          speakNow(pendingTtsText, pendingTtsLang, pendingTtsRate);
        }
        pendingTtsText = null;
        pendingTtsCallbackId = null;
      }
    });
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

  private void ttsCallback(String callbackId, String result) {
    if (callbackId == null || callbackId.isEmpty()) return;
    runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(
      "window.__ttsCallback&&window.__ttsCallback(" + JSONObject.quote(callbackId) + "," + JSONObject.quote(result) + ")",
      null
    ));
  }

  private boolean speakNow(String text, String lang, float rate) {
    if (textToSpeech == null || ttsInitFailed) return false;
    Locale locale = String.valueOf(lang).toLowerCase(Locale.ROOT).startsWith("zh") ? Locale.CHINA : Locale.US;
    int languageStatus = textToSpeech.setLanguage(locale);
    if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
      showToast("当前文字转语音引擎不支持该语言，请在系统设置中安装英语语音包");
      return false;
    }
    textToSpeech.setSpeechRate(rate);
    int speakStatus = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vocab-" + System.currentTimeMillis());
    return speakStatus == TextToSpeech.SUCCESS;
  }

  private void speakWithCallbackNow(String text, String lang, float rate, String callbackId) {
    if (textToSpeech == null || ttsInitFailed) {
      ttsCallback(callbackId, "NO_TTS_ENGINE");
      return;
    }
    Locale locale = String.valueOf(lang).toLowerCase(Locale.ROOT).startsWith("zh") ? Locale.CHINA : Locale.US;
    int languageStatus = textToSpeech.setLanguage(locale);
    if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
      showToast("当前文字转语音引擎不支持该语言，请在系统设置中安装英语语音包");
      ttsCallback(callbackId, "error");
      return;
    }
    textToSpeech.setSpeechRate(rate);
    // Set up completion listener
    textToSpeech.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener() {
      @Override
      public void onStart(String utteranceId) {
        // Speech started
      }

      @Override
      public void onDone(String utteranceId) {
        ttsCallback(callbackId, "done");
      }

      @Override
      public void onError(String utteranceId) {
        ttsCallback(callbackId, "error");
      }
    });
    int speakStatus = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vocab-" + System.currentTimeMillis());
    if (speakStatus != TextToSpeech.SUCCESS) {
      ttsCallback(callbackId, "error");
    }
  }

  public class VocabNativeBridge {
    @JavascriptInterface
    public String saveJson(String filename, String content) {
      File downloads = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
      if (downloads == null) downloads = getFilesDir();
      if (!downloads.exists()) downloads.mkdirs();
      File outputFile = new File(downloads, filename);
      try (OutputStream output = new FileOutputStream(outputFile)) {
        output.write(content.getBytes(StandardCharsets.UTF_8));
        showToast("学习数据已导出到：" + outputFile.getAbsolutePath());
        return "SAVED_DOWNLOADS:" + outputFile.getAbsolutePath();
      } catch (Exception writeError) {
        showToast("导出失败：" + writeError.getMessage());
        return "ERROR";
      }
    }

    @JavascriptInterface
    public void initTts() {
      // Force re-initialization if needed
      if (textToSpeech == null && !ttsInitFailed) {
        textToSpeech = new TextToSpeech(MainActivity.this, status -> {
          ttsReady = status == TextToSpeech.SUCCESS;
          ttsInitFailed = !ttsReady;
          if (!ttsReady) {
            showToast("当前设备没有可用的系统文字转语音引擎");
            return;
          }
          if (pendingTtsText != null) {
            if (pendingTtsCallbackId != null) {
              speakWithCallbackNow(pendingTtsText, pendingTtsLang, pendingTtsRate, pendingTtsCallbackId);
            } else {
              speakNow(pendingTtsText, pendingTtsLang, pendingTtsRate);
            }
            pendingTtsText = null;
            pendingTtsCallbackId = null;
          }
        });
      }
    }

    @JavascriptInterface
    public String speak(String text, String lang, String rateText) {
      float rate = 0.82f;
      try {
        rate = Float.parseFloat(rateText);
      } catch (Exception ignored) {}
      if (ttsInitFailed) return "NO_TTS_ENGINE";
      if (textToSpeech == null || !ttsReady) {
        pendingTtsText = text;
        pendingTtsLang = lang;
        pendingTtsRate = rate;
        pendingTtsCallbackId = null;
        return "OK";
      }
      return speakNow(text, lang, rate) ? "OK" : "NO_TTS_ENGINE";
    }

    @JavascriptInterface
    public void speakWithCallback(String text, String lang, String rateText, String callbackId) {
      float rate = 0.82f;
      try {
        rate = Float.parseFloat(rateText);
      } catch (Exception ignored) {}
      if (ttsInitFailed) {
        ttsCallback(callbackId, "NO_TTS_ENGINE");
        return;
      }
      if (textToSpeech == null || !ttsReady) {
        // Store pending request, will be executed when TTS initializes
        pendingTtsText = text;
        pendingTtsLang = lang;
        pendingTtsRate = rate;
        pendingTtsCallbackId = callbackId;
        return;
      }
      speakWithCallbackNow(text, lang, rate, callbackId);
    }

    @JavascriptInterface
    public void stopTts() {
      if (textToSpeech != null) {
        textToSpeech.stop();
      }
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

if (fs.existsSync(variablesGradle)) {
  let gradle = fs.readFileSync(variablesGradle, 'utf8');
  gradle = gradle
    .replace(/minSdkVersion\s*=\s*\d+/g, 'minSdkVersion = 26')
    .replace(/compileSdkVersion\s*=\s*\d+/g, 'compileSdkVersion = 35')
    .replace(/targetSdkVersion\s*=\s*\d+/g, 'targetSdkVersion = 35');
  fs.writeFileSync(variablesGradle, gradle, 'utf8');
  console.log('Patched Android SDK versions: minSdkVersion=26 compileSdkVersion=35 targetSdkVersion=35');
}
