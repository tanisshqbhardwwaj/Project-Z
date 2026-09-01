import type { CapacitorConfig } from "@capacitor/cli";
import { withNativeAppEntryUrl } from "./src/lib/app/public-url";
import { capacitorNetworkFlags } from "./src/lib/security/csp";
import { NATIVE_APP_UA_MARK } from "./src/platform/common/native";

const network = capacitorNetworkFlags();

const config: CapacitorConfig = {
  appId: "com.projectz.shop",
  appName: "BusinessOS · E-console",
  webDir: "android-www",
  appendUserAgent: `${NATIVE_APP_UA_MARK}/Android`,
  server: {
    androidScheme: "https",
    url: network.url ? withNativeAppEntryUrl(network.url) : undefined,
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
    appendUserAgent: `${NATIVE_APP_UA_MARK}/Android`,
  },
};

export default config;
