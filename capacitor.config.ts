import type { CapacitorConfig } from "@capacitor/cli";
import { capacitorNetworkFlags } from "./src/lib/security/csp";

const network = capacitorNetworkFlags();

const config: CapacitorConfig = {
  appId: "com.projectz.shop",
  appName: "Project Z",
  webDir: "android-www",
  server: {
    androidScheme: "https",
    url: network.url,
    cleartext: network.cleartext,
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: true,
      iosKeychainPrefix: "com.projectz.shop",
      androidIsEncryption: true,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: "Unlock shop database",
        biometricSubTitle: "Confirm it is you",
      },
    },
    Camera: {
      presentationStyle: "fullscreen",
    },
  },
  android: {
    allowMixedContent: network.allowMixedContent,
  },
};

export default config;
