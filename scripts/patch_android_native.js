'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainActivity = path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'vocabmaster', 'app', 'MainActivity.java');

if (!fs.existsSync(mainActivity)) {
  console.error(`Android MainActivity not found: ${mainActivity}`);
  process.exit(1);
}

const source = `package com.vocabmaster.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
  private static final int CREATE_BACKUP_FILE = 7001;
  private String pendingBackupJson = null;
  private TextToSpeech textToSpeech = null;
  private boolean ttsReady = false;
  private String pendingTtsText = null;
  private String pendingTtsLang = "en-US";
  private float pendingTtsRate = 0.82f;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getBridge().getWebView().addJavascriptInterface(new VocabNativeBridge(), "VocabNative");
    textToSpeech = new TextToSpeech(this, status -> {
      ttsReady = status == TextToSpeech.SUCCESS;
      if (ttsReady && pendingTtsText != null) {
        speakNow(pendingTtsText, pendingTtsLang, pendingTtsRate);
        pendingTtsText = null;
      }
    });
  }

  @Override
  protected void onDestroy() {
    if (textToSpeech != null) {
      textToSpeech.stop();
      textToSpeech.shutdown();
    }
    super.onDestroy();
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == CREATE_BACKUP_FILE && resultCode == Activity.RESULT_OK && data != null && pendingBackupJson != null) {
      Uri uri = data.getData();
      if (uri != null) {
        try (OutputStream output = getContentResolver().openOutputStream(uri)) {
          if (output != null) output.write(pendingBackupJson.getBytes(StandardCharsets.UTF_8));
          showToast("学习数据已导出");
        } catch (Exception error) {
          showToast("导出失败：" + error.getMessage());
        }
      }
      pendingBackupJson = null;
    }
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

  private void speakNow(String text, String lang, float rate) {
    if (textToSpeech == null) return;
    Locale locale = String.valueOf(lang).toLowerCase(Locale.ROOT).startsWith("zh") ? Locale.CHINA : Locale.US;
    textToSpeech.setLanguage(locale);
    textToSpeech.setSpeechRate(rate);
    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vocab-" + System.currentTimeMillis());
  }

  public class VocabNativeBridge {
    @JavascriptInterface
    public String saveJson(String filename, String content) {
      pendingBackupJson = content;
      Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.setType("application/json");
      intent.putExtra(Intent.EXTRA_TITLE, filename);
      startActivityForResult(intent, CREATE_BACKUP_FILE);
      return "OPENED";
    }

    @JavascriptInterface
    public String speak(String text, String lang, String rateText) {
      float rate = 0.82f;
      try {
        rate = Float.parseFloat(rateText);
      } catch (Exception ignored) {}
      if (textToSpeech == null || !ttsReady) {
        pendingTtsText = text;
        pendingTtsLang = lang;
        pendingTtsRate = rate;
        return "OK";
      }
      speakNow(text, lang, rate);
      return "OK";
    }

    @JavascriptInterface
    public void stopTts() {
      if (textToSpeech != null) textToSpeech.stop();
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
