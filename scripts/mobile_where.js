#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  ['手机离线入口', 'public/mobile.html'],
  ['APK 打包入口', 'mobile-dist/index.html'],
  ['APK 内置离线词库', 'mobile-dist/words.json'],
  ['Capacitor 配置', 'capacitor.config.json'],
  ['APK 默认输出位置', 'android/app/build/outputs/apk/debug/app-debug.apk']
];

for (const [label, relative] of files) {
  const full = path.join(root, relative);
  const status = fs.existsSync(full) ? '存在' : '尚未生成';
  console.log(`${label}: ${relative} (${status})`);
}
