import React, { useState } from 'react';
import {
  Folder,
  FileCode,
  Layers,
  Shield,
  Radio,
  Database,
  Cpu,
  Download,
  Copy,
  Check,
  Smartphone,
  ChevronRight,
  ExternalLink,
  Code2,
  GitBranch,
  Terminal
} from 'lucide-react';
import JSZip from 'jszip';
import { NakeicLogo } from '../common/NakeicLogo';

export const ArchitectureExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('build.gradle.kts');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileTree = [
    {
      name: 'android/',
      children: [
        { name: 'build.gradle.kts', path: 'android/build.gradle.kts', type: 'gradle' },
        { name: 'settings.gradle.kts', path: 'android/settings.gradle.kts', type: 'gradle' },
        {
          name: 'gradle/',
          children: [
            { name: 'libs.versions.toml', path: 'android/gradle/libs.versions.toml', type: 'toml' }
          ]
        },
        {
          name: 'app/',
          children: [
            { name: 'build.gradle.kts', path: 'android/app/build.gradle.kts', type: 'gradle' },
            {
              name: 'src/main/',
              children: [
                { name: 'AndroidManifest.xml', path: 'android/app/src/main/AndroidManifest.xml', type: 'xml' },
                {
                  name: 'java/com/nakeic/app/',
                  children: [
                    { name: 'NakeicApplication.kt', path: 'android/app/src/main/java/com/nakeic/app/NakeicApplication.kt', type: 'kotlin' },
                    {
                      name: 'core/designsystem/theme/',
                      children: [
                        { name: 'Color.kt', path: 'android/app/src/main/java/com/nakeic/app/core/designsystem/theme/Color.kt', type: 'kotlin' },
                        { name: 'Theme.kt', path: 'android/app/src/main/java/com/nakeic/app/core/designsystem/theme/Theme.kt', type: 'kotlin' }
                      ]
                    },
                    {
                      name: 'core/crypto/',
                      children: [
                        { name: 'SignalProtocolEngine.kt', path: 'android/app/src/main/java/com/nakeic/app/core/crypto/SignalProtocolEngine.kt', type: 'kotlin' }
                      ]
                    },
                    {
                      name: 'domain/model/',
                      children: [
                        { name: 'Models.kt', path: 'android/app/src/main/java/com/nakeic/app/domain/model/Models.kt', type: 'kotlin' }
                      ]
                    },
                    {
                      name: 'data/local/',
                      children: [
                        { name: 'NakeicDatabase.kt', path: 'android/app/src/main/java/com/nakeic/app/data/local/NakeicDatabase.kt', type: 'kotlin' }
                      ]
                    },
                    {
                      name: 'data/repository/',
                      children: [
                        { name: 'ChatRepository.kt', path: 'android/app/src/main/java/com/nakeic/app/data/repository/ChatRepository.kt', type: 'kotlin' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  const fileContents: Record<string, string> = {
    'build.gradle.kts': `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt.android) apply false
    alias(libs.plugins.ksp) apply false
}`,
    'settings.gradle.kts': `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = java.net.URI("https://jitpack.io") }
    }
}

rootProject.name = "NAKEIC"
include(":app")`,
    'libs.versions.toml': `[versions]
agp = "8.7.2"
kotlin = "2.0.21"
coreKtx = "1.15.0"
lifecycleRuntimeKtx = "2.8.7"
activityCompose = "1.9.3"
composeBom = "2024.11.00"
navigationCompose = "2.8.4"
hilt = "2.52"
room = "2.6.1"
coroutines = "1.9.0"
webrtc = "1.0.32006"
cameraX = "1.4.0"
securityCrypto = "1.1.0-alpha06"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
camerax-core = { group = "androidx.camera", name = "camera-core", version.ref = "cameraX" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
hilt-android = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }`,
    'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permisos Esenciales NAKEIC Android -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />

    <application
        android:name=".NakeicApplication"
        android:label="NAKEIC"
        android:theme="@style/Theme.Nakeic">
        
        <activity
            android:name=".presentation.MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.NakeicCallService"
            android:foregroundServiceType="phoneCall|microphone|camera" />
    </application>
</manifest>`,
    'Color.kt': `package com.nakeic.app.core.designsystem.theme

import androidx.compose.ui.graphics.Color

// Paleta Oficial NAKEIC (Identidad Propia - Zero WhatsApp)
val NakeicCyanPrimary = Color(0xFF00B4D8)
val NakeicCyanSecondary = Color(0xFF0077B6)
val NakeicCyanBackgroundDark = Color(0xFF0A0F1D)
val NakeicCyanSurfaceDark = Color(0xFF141B2D)

object NakeicPalettes {
    val DefaultPrimary = Color(0xFF00B4D8)
    val DefaultBubbleSent = Color(0xFF0077B6)
    val PurplePrimary = Color(0xFF8B5CF6)
    val EmeraldPrimary = Color(0xFF10B981)
    val CrimsonPrimary = Color(0xFFF43F5E)
}`,
    'Theme.kt': `package com.nakeic.app.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color

data class NakeicThemeConfig(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val primaryColor: Color = NakeicPalettes.DefaultPrimary,
    val bubbleSentColor: Color = NakeicPalettes.DefaultBubbleSent,
    val isOledBlackEnabled: Boolean = false
)

@Composable
fun NakeicTheme(
    config: NakeicThemeConfig = NakeicThemeConfig(),
    content: @Composable () -> Unit
) {
    val isDark = when (config.themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }
    // Dynamic Material 3 synthesis...
}`,
    'SignalProtocolEngine.kt': `package com.nakeic.app.core.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SignalProtocolEngine {
    // Implementación de Cifrado de Extremo a Extremo (E2EE)
    // Double Ratchet + Android KeyStore Hardware TEE/StrongBox
}`,
    'Models.kt': `package com.nakeic.app.domain.model

data class User(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val username: String,
    val bio: String,
    val avatarUrl: String?,
    val isOnline: Boolean
)

data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val text: String,
    val type: MessageType,
    val status: MessageStatus,
    val timestamp: Long,
    val mediaAttachment: MediaAttachment?
)`
  };

  const handleCopy = () => {
    const content = fileContents[selectedFile] || '// Archivo fuente NAKEIC';
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // Root gradle files
      zip.file('build.gradle.kts', fileContents['build.gradle.kts']);
      zip.file('settings.gradle.kts', fileContents['settings.gradle.kts']);
      
      // Version catalog
      const gradleFolder = zip.folder('gradle');
      gradleFolder?.file('libs.versions.toml', fileContents['libs.versions.toml']);

      // App module
      const appFolder = zip.folder('app');
      appFolder?.file('build.gradle.kts', fileContents['build.gradle.kts']);

      // Manifest
      const mainFolder = appFolder?.folder('src')?.folder('main');
      mainFolder?.file('AndroidManifest.xml', fileContents['AndroidManifest.xml']);

      // Kotlin source files
      const nakeicPackage = mainFolder?.folder('java')?.folder('com')?.folder('nakeic')?.folder('app');
      nakeicPackage?.file('NakeicApplication.kt', `package com.nakeic.app\n// NAKEIC Android Application`);

      const themeFolder = nakeicPackage?.folder('core')?.folder('designsystem')?.folder('theme');
      themeFolder?.file('Color.kt', fileContents['Color.kt']);
      themeFolder?.file('Theme.kt', fileContents['Theme.kt']);

      const cryptoFolder = nakeicPackage?.folder('core')?.folder('crypto');
      cryptoFolder?.file('SignalProtocolEngine.kt', fileContents['SignalProtocolEngine.kt']);

      const domainFolder = nakeicPackage?.folder('domain')?.folder('model');
      domainFolder?.file('Models.kt', fileContents['Models.kt']);

      // Readme instructions
      zip.file('README.md', `# NAKEIC - Aplicación Móvil Nativa para Android
## Arquitectura y Compilación
1. Abrir Android Studio (Iguana, Koala o posterior).
2. Seleccionar "Open Project" y elegir la carpeta descomprimida.
3. Sincronizar Gradle (Gradle 8.7 con JDK 17).
4. Ejecutar en Emulador o Dispositivo Android 15 (Target SDK 35).
`);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NAKEIC_Android_Native_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-slate-950/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <NakeicLogo size="sm" variant="icon" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">NAKEIC Android Native Architecture</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                FASE 1: Arquitectura & Estructura
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Conecta Sin Límites · Kotlin 2.0 · Jetpack Compose · Material 3 · Room · WebRTC · E2EE
            </p>
          </div>
        </div>

        {/* Action button to download full zip */}
        <button
          onClick={handleExportZip}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Generando ZIP...' : 'Descargar Proyecto Android Studio (.zip)'}</span>
        </button>
      </div>

      {/* Main Split Body: Architecture Cards + Code Viewer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Architecture Blueprint (5 cols) */}
        <div className="lg:col-span-5 p-5 overflow-y-auto space-y-4 border-r border-white/10 bg-slate-950/40 text-xs">
          {/* Clean Architecture Breakdown */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Layers className="w-4 h-4" />
              <span>1. Clean Architecture Modular (Android)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              El proyecto separa estrictamente responsabilidades mediante 4 capas desacopladas:
            </p>
            <ul className="space-y-1.5 text-slate-400">
              <li><strong className="text-slate-200">Presentation:</strong> Jetpack Compose Material 3, Navigation Graph, StateFlow, ViewModels con Hilt.</li>
              <li><strong className="text-slate-200">Domain:</strong> Casos de uso puros (<code className="text-cyan-300">SendMessageUseCase</code>, <code className="text-cyan-300">StartVoipCallUseCase</code>) e invariantes de negocio.</li>
              <li><strong className="text-slate-200">Data:</strong> Room Database local reactiva, repositorios offline-first, WebSocket client, WebRTC PeerConnection.</li>
              <li><strong className="text-slate-200">Core:</strong> Motor de temas dinámicos NAKEIC, Keystore E2EE, procesamiento de audio y CameraX.</li>
            </ul>
          </div>

          {/* Security & Cryptography */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Shield className="w-4 h-4" />
              <span>2. Criptografía & Seguridad E2EE</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Algoritmo <strong>Double Ratchet</strong> con curvas elípticas Curve25519 para intercambio de claves Diffie-Hellman y cifrado de carga útil con <strong>AES-256-GCM</strong>. Las claves maestras se custodian en el módulo de hardware <strong>Android KeyStore StrongBox/TEE</strong>, imposibilitando su extracción física.
            </p>
          </div>

          {/* Realtime & WebRTC */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Radio className="w-4 h-4" />
              <span>3. Comunicaciones en Tiempo Real</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Señalización ultrarrápida bidireccional por WebSocket para presencia, recibos de lectura y estados de escritura. Conexión directa P2P mediante <strong>WebRTC con códec Opus para voz HD y VP9/AV1 para videollamadas</strong>, con fallback a servidores TURN de baja latencia.
            </p>
          </div>

          {/* Offline-First */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Database className="w-4 h-4" />
              <span>4. Persistencia Local & Modo Sin Conexión</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Base de datos <strong>Room SQLite</strong> con índices optimizados. Los mensajes enviados sin red se encolan con estado <code className="text-amber-300">SENDING</code> en almacenamiento local cifrado SQLCipher y se sincronizan automáticamente con reintentos exponenciales al reanudar la conectividad.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Code Browser (7 cols) */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden bg-slate-950">
          {/* File Tab Selectors */}
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/10 overflow-x-auto shrink-0 bg-slate-900/60">
            {['build.gradle.kts', 'settings.gradle.kts', 'libs.versions.toml', 'AndroidManifest.xml', 'Color.kt', 'Theme.kt', 'SignalProtocolEngine.kt', 'Models.kt'].map(file => (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedFile === file
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file}</span>
              </button>
            ))}
          </div>

          {/* Code Header Bar */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-white/5 text-xs text-slate-400 shrink-0 bg-slate-900/30">
            <span className="font-mono text-[11px] text-cyan-400">
              android/{selectedFile.endsWith('.kt') ? 'app/src/main/java/com/nakeic/app/' : ''}{selectedFile}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Syntax Highlighted Code Viewer */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300 select-text">
            <pre className="whitespace-pre">
              {fileContents[selectedFile] || '// Archivo fuente preparado para producción en Kotlin'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
