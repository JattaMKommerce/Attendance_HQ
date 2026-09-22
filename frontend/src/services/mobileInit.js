import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/**
 * Initializes native mobile lifecycle, status bar, hardware back button, keyboard, and splash screen.
 * Gracefully no-ops in standard web browsers.
 */
export const initMobileApp = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // 1. Configure Native Status Bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f172a' });
  } catch (err) {
    // Non-fatal if platform does not support
  }

  // 2. Configure Virtual Keyboard Resizing
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch (err) {
    // Non-fatal
  }

  // 3. Android Hardware Back Button Handling
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname;
      const isExitRoute = 
        currentPath === '/' || 
        currentPath === '/login' || 
        currentPath === '/app/dashboard' || 
        currentPath === '/app/employee/dashboard';

      if (isExitRoute || !canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  } catch (err) {
    // Non-fatal
  }

  // 4. Hide Native Splash Screen Once React Mounts
  try {
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 150);
  } catch (err) {
    // Non-fatal
  }
};

export default initMobileApp;
