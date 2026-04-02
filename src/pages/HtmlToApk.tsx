import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Download, 
  Code, 
  Settings, 
  Globe, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Play,
  FileCode,
  Layers,
  Zap,
  Info,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export function HtmlToApk() {
  const [appName, setAppName] = useState("My Web App");
  const [packageId, setPackageId] = useState("com.example.myapp");
  const [version, setVersion] = useState("1.0.0");
  const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Hello World!</h1>
        <p>Welcome to my Android App.</p>
        <button onclick="showAlert()">Click Me</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`);
  const [cssCode, setCssCode] = useState(`body {
    font-family: sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background: #f0f2f5;
}
.container {
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 1rem;
    shadow: 0 4px 6px rgba(0,0,0,0.1);
}
button {
    padding: 0.5rem 1rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
}`);
  const [jsCode, setJsCode] = useState(`function showAlert() {
    alert("Hello from your Android App!");
}`);
  
  const [activeTab, setActiveTab] = useState<"html" | "css" | "js" | "preview">("html");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const generateProject = async () => {
    setIsGenerating(true);
    const zip = new JSZip();

    // Android Project Structure
    const packagePath = packageId.replace(/\./g, "/");
    
    // 1. AndroidManifest.xml
    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageId}">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

    // 2. MainActivity.java
    const mainActivity = `package ${packageId};

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}`;

    // 3. build.gradle (app)
    const appGradle = `plugins {
    id 'com.android.application'
}

android {
    compileSdk 33
    defaultConfig {
        applicationId "${packageId}"
        minSdk 21
        targetSdk 33
        versionCode 1
        versionName "${version}"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.8.0'
}`;

    // 4. PWA Manifest
    const pwaManifest = {
      name: appName,
      short_name: appName,
      start_url: "index.html",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#4f46e5",
      icons: [
        {
          src: "icon.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    };

    // Add files to ZIP
    zip.file("app/src/main/AndroidManifest.xml", manifest);
    zip.file(`app/src/main/java/${packagePath}/MainActivity.java`, mainActivity);
    zip.file("app/build.gradle", appGradle);
    
    // Assets
    zip.file("app/src/main/assets/index.html", htmlCode);
    zip.file("app/src/main/assets/style.css", cssCode);
    zip.file("app/src/main/assets/script.js", jsCode);
    
    // PWA files
    zip.file("pwa/manifest.json", JSON.stringify(pwaManifest, null, 2));
    zip.file("pwa/index.html", htmlCode);
    zip.file("pwa/style.css", cssCode);
    zip.file("pwa/script.js", jsCode);

    // Instructions
    zip.file("README.txt", `Web2App Studio - Project Instructions
------------------------------------------
App Name: ${appName}
Package ID: ${packageId}

How to build APK:
1. Open Android Studio.
2. Select "Open an existing project".
3. Navigate to the extracted folder.
4. Go to Build > Build Bundle(s) / APK(s) > Build APK(s).

How to use PWA:
1. Upload the files in the 'pwa' folder to any web hosting.
2. Open the URL in your mobile browser.
3. Select "Add to Home Screen".
`);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${appName.replace(/\s+/g, "_")}_Android_Project.zip`);
    
    setIsGenerating(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const getPreviewContent = () => {
    return `
      <html>
        <head>
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
          <script>${jsCode}</script>
        </body>
      </html>
    `;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Web2App <span className="text-indigo-600">Studio</span>
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Convert your HTML/JS/CSS into a production-ready Android Studio project.
          </p>
        </div>
        
        <button
          onClick={generateProject}
          disabled={isGenerating}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95"
        >
          {isGenerating ? (
            <Zap className="w-6 h-6 animate-spin" />
          ) : (
            <Download className="w-6 h-6" />
          )}
          {isGenerating ? "Generating..." : "Download Project ZIP"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">App Config</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">App Name</label>
                <input 
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="My Awesome App"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Package ID</label>
                <input 
                  type="text"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="com.example.myapp"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Version</label>
                <input 
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="1.0.0"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  This tool generates a <strong>WebView-based</strong> Android project. You can open it in Android Studio to build your APK.
                </p>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Included Features</h3>
            <div className="space-y-3">
              {[
                { icon: Globe, text: "Full Offline Support" },
                { icon: Zap, text: "JS & CSS Injection" },
                { icon: Layers, text: "PWA Manifest Ready" },
                { icon: Package, text: "Android Studio Template" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <item.icon className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setActiveTab("html")}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "html" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                    >
                      HTML
                    </button>
                    <button 
                      onClick={() => setHtmlCode("")}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Clear HTML"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setActiveTab("css")}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "css" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                    >
                      CSS
                    </button>
                    <button 
                      onClick={() => setCssCode("")}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Clear CSS"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setActiveTab("js")}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "js" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                    >
                      JS
                    </button>
                    <button 
                      onClick={() => setJsCode("")}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Clear JS"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all code (HTML, CSS, and JS)?")) {
                      setHtmlCode("");
                      setCssCode("");
                      setJsCode("");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all border border-rose-200 dark:border-rose-800"
                  title="Clear All Code"
                >
                  <Layers className="w-4 h-4" />
                  Clear All
                </button>
                <button 
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "preview" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  <Play className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {activeTab !== "preview" ? (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <Editor
                      height="100%"
                      defaultLanguage={activeTab}
                      theme="vs-dark"
                      value={activeTab === "html" ? htmlCode : activeTab === "css" ? cssCode : jsCode}
                      onChange={(val) => {
                        if (activeTab === "html") setHtmlCode(val || "");
                        else if (activeTab === "css") setCssCode(val || "");
                        else setJsCode(val || "");
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        padding: { top: 20 },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full bg-white"
                  >
                    <iframe 
                      srcDoc={getPreviewContent()}
                      className="w-full h-full border-none"
                      title="App Preview"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Success Message */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Project Generated Successfully!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Check your downloads for the ZIP file.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
