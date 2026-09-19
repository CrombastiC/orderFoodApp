module.exports = {
  expo: {
    name: "餐厅点餐系统",
    slug: "rn-components",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rncomponents",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "我们需要获取您的位置信息来显示附近的门店",
        NSCameraUsageDescription: "我们需要使用您的相机来扫描二维码",
        NSPhotoLibraryUsageDescription: "我们需要访问相册以便在客服会话中发送图片"
      },
      bundleIdentifier: "com.ar1se.restaurant"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      softwareKeyboardLayoutMode: "resize",
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.INTERNET"
      ],
      package: "com.ar1se.restaurant",
      usesCleartextTraffic: true
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
            networkInspector: true
          }
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "我们需要使用您的相机来扫描二维码"
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "我们需要获取您的位置信息来显示附近的门店"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "我们需要访问相册以便在客服会话中发送图片"
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "1b11bc14-a537-46cc-9ad7-168baaf50ffa"
      },
      // 将环境变量暴露给应用
      APP_ENV: process.env.APP_ENV || 'development',
      // 高德地图 Key：开发环境使用默认值，生产环境通过 EAS Secrets 注入 AMAP_KEY
      AMAP_KEY: process.env.AMAP_KEY || (process.env.APP_ENV !== 'production' ? 'f619fad5bbb623bc56e5ec243a575dfe' : '')
    }
  }
};
