# JMK HRMS — Mobile App & Production Deployment Guide

This guide provides the complete, end-to-end instructions for deploying the **Jatta M Kommerce HRMS** across:
1. **Google Play Store** (Android Release `.aab`)
2. **Apple App Store** (iOS `.ipa` Archive)
3. **Progressive Web App (PWA)** (Custom Web Domain)

---

## 1. Architecture Overview

The HRMS uses a **Single Responsive Codebase**:
- **Web / PWA**: React 19 + Vite with Service Worker (`sw.js`) and PWA manifest.
- **Native Mobile**: Capacitor 6+ native bridge running the exact same frontend bundle with hardware access (Camera, Biometrics, GPS Geolocation).
- **Backend**: Node.js / Express 5 API with MySQL 8.0.

---

## 2. Progressive Web App (PWA) Deployment

### Build Command:
```bash
cd frontend
npm run build
```

### Static Web Server / Reverse Proxy Setup (Nginx Example):
```nginx
server {
    listen 443 ssl http2;
    server_name hrms.jattamkommerce.com;

    ssl_certificate /etc/letsencrypt/live/hrms.jattamkommerce.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hrms.jattamkommerce.com/privkey.pem;

    root /var/www/hrms/frontend/dist;
    index index.html;

    # Service Worker and Manifest caching rules
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    location = /manifest.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Static Assets (cached aggressively)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy to Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded Photos
    location /uploads/ {
        proxy_pass http://127.0.0.1:5001/uploads/;
    }

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 3. Google Play Store (Android) Deployment

### Prerequisites:
- Android Studio Ladybug or higher
- JDK 17 or higher
- Google Play Console Developer Account ($25 one-time fee)

### Step 3.1: Install Capacitor CLI & Android Platform
Inside the `frontend/` directory:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
```

### Step 3.2: Configure Production API URL & Build
Create a production build pointing to your live backend:
```bash
# In frontend/.env.production:
VITE_API_URL=https://api.jattamkommerce.com/api

# Build web distribution:
npm run build

# Sync assets with native Android project:
npx cap sync android
```

### Step 3.3: Android Permissions Configuration
Open `android/app/src/main/AndroidManifest.xml` and ensure the following permissions are present before the `<application>` tag:
```xml
<!-- Internet Access -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Camera for QR Code Scanner & Employee Profile Photos -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Geolocation for Mobile Attendance Geofencing / Punch-in -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### Step 3.4: Generate Signed Release Android App Bundle (.aab)
1. Open Android project in Android Studio:
   ```bash
   npx cap open android
   ```
2. In Android Studio, go to **Build** → **Generate Signed Bundle / APK**.
3. Choose **Android App Bundle** (`.aab`).
4. Select your keystore (or create a new keystore and securely back up your keystore file and passwords).
5. Select **release** variant and build.
6. Upload the generated `.aab` file located in `android/app/release/app-release.aab` to Google Play Console under **Production** or **Internal Testing**.

---

## 4. Apple App Store (iOS) Deployment

### Prerequisites:
- macOS with Xcode 15+ installed
- Apple Developer Program Membership ($99/year)
- CocoaPods (`sudo gem install cocoapods`)

### Step 4.1: Add iOS Platform
Inside the `frontend/` directory:
```bash
cd frontend
npm install @capacitor/ios
npx cap add ios
```

### Step 4.2: Build & Sync
```bash
npm run build
npx cap sync ios
```

### Step 4.3: Configure iOS Privacy Descriptions (Info.plist)
Apple requires explicit human-readable descriptions in `ios/App/App/Info.plist` for any hardware permissions:
```xml
<key>NSCameraUsageDescription</key>
<string>JMK HRMS requires camera access to scan QR attendance codes and upload employee ID photos.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>JMK HRMS requires location access to verify employee presence during attendance punch-in.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>JMK HRMS requires photo library access to upload documents and profile images.</string>
```

### Step 4.4: Archive and Upload via Xcode
1. Open the project in Xcode:
   ```bash
   npx cap open ios
   ```
2. In Xcode, select the **App** target:
   - Under **Signing & Capabilities**, select your **Team** and check **Automatically manage signing**.
   - Ensure the **Bundle Identifier** matches `com.jattamkommerce.hrms`.
3. Select **Product** → **Destination** → **Any iOS Device (arm64)**.
4. Select **Product** → **Archive**.
5. Once the Organizer window appears, click **Distribute App** → **App Store Connect** → **Upload**.
6. In App Store Connect, configure your app listing (screenshots, privacy policy, contact info) and submit for Review.

---

## 5. Production Environment Checklist

Before going live with the backend and database:
- [x] Set strong 64-character random strings for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- [x] Enable SSL for cloud database connections (`DB_SSL=true`).
- [x] Restrict `CORS_ORIGIN` to your official web domains and `capacitor://localhost`.
- [x] Configure Gmail SMTP or SendGrid credentials for onboarding activation emails.
- [x] Point `APP_URL` and `APP_DOWNLOAD_URL` to your production HTTPS domain.
- [x] Verify system health check responds `healthy` at `/api/health`.
