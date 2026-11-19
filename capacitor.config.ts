// Capacitor configuration for Diclik.com Android APK & AAB builds
const previewServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const isProd = process.env.NODE_ENV === "production";

const config: {
  appId: string;
  appName: string;
  webDir: string;
  server: {
    androidScheme: string;
    url?: string;
    cleartext: boolean;
  };
  android: {
    allowMixedContent: boolean;
    captureInput: boolean;
    webContentsDebuggingEnabled: boolean;
  };
  plugins: {
    SplashScreen: {
      launchShowDuration: number;
      backgroundColor: string;
      showSpinner: boolean;
    };
  };
} = {
  appId: "com.directo.app",
  appName: "Diclik.com",
  webDir: "dist/web",
  server: {
    androidScheme: "https",
    cleartext: false,
    ...(previewServerUrl ? { url: previewServerUrl } : {}),
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: !isProd && process.env.CAPACITOR_DEBUG === "true",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#00103d",
      showSpinner: false,
    },
  },
};

export default config;
