/**
 * Capacitor 雙平台 (iOS / Android) 原生 App 封裝設定檔
 * 支援直接連通雲端即時 API 與 WebGL 3D 熊霸引擎
 */
const config = {
  appId: "com.omnitick.vbear",
  appName: "OmniTick 熊霸智投",
  webDir: "out",
  server: {
    url: "https://stock-green-ten.vercel.app",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#090d16",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#090d16",
    },
  },
};

export default config;
