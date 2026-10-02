/**
 * Production APK Build & Packaging Script for JMK HRMS
 * Compiles resources with the official vortex logo launcher icons and signs the release APK.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'frontend/android');
const jdkHome = path.join(root, 'scratch/jdk-17/Contents/Home');
const releaseApk = path.join(androidDir, 'app/build/outputs/apk/release/app-release.apk');
const publicApk = path.join(root, 'frontend/public/jmk-hrms.apk');
const distApk = path.join(root, 'frontend/dist/jmk-hrms.apk');
const releaseDirApk = path.join(androidDir, 'app/build/outputs/apk/release/jmk-hrms-release.apk');

console.log('============================================================');
console.log('📱 JMK HRMS ANDROID APK COMPILATION PIPELINE');
console.log('============================================================\n');

try {
  // 1. Generate updated app icons & splash screens
  console.log('1. Generating custom launcher icons and splash screens...');
  execSync('python3 scripts/generate-app-icons.py', { cwd: root, stdio: 'inherit' });

  // 1b. Sync web dist into Android assets
  console.log('\n1b. Syncing latest web assets into Android project...');
  const androidPublicDir = path.join(androidDir, 'app/src/main/assets/public');
  fs.mkdirSync(androidPublicDir, { recursive: true });
  execSync(`cp -R "${path.join(root, 'frontend/dist')}/"* "${androidPublicDir}/"`);

  // 2. Ensure web assets in assets/public are clean (no nested APK)
  console.log('\n2. Sanitizing web assets in Android project...');
  const nestedApk = path.join(androidDir, 'app/src/main/assets/public/jmk-hrms.apk');
  if (fs.existsSync(nestedApk)) fs.unlinkSync(nestedApk);

  // 3. Compile and sign with Gradle
  console.log('\n3. Building signed release APK with Gradle assembleRelease...');
  const env = Object.assign({}, process.env, {
    JAVA_HOME: fs.existsSync(jdkHome) ? jdkHome : process.env.JAVA_HOME,
    PATH: fs.existsSync(jdkHome) ? `${path.join(jdkHome, 'bin')}:${process.env.PATH}` : process.env.PATH
  });

  execSync('./gradlew assembleRelease --no-daemon', { cwd: androidDir, env, stdio: 'inherit' });

  if (!fs.existsSync(releaseApk)) {
    throw new Error(`Release APK not found at: ${releaseApk}`);
  }

  // 4. Distribute to public, dist, and release folders
  console.log('\n4. Copying release APK to public download endpoints...');
  fs.copyFileSync(releaseApk, publicApk);
  if (fs.existsSync(path.dirname(distApk))) {
    fs.copyFileSync(releaseApk, distApk);
  }
  fs.copyFileSync(releaseApk, releaseDirApk);

  const stats = fs.statSync(publicApk);
  console.log('\n============================================================');
  console.log('🎉 PRODUCTION APK COMPILED & SIGNED SUCCESSFULLY!');
  console.log('============================================================');
  console.log(`File: ${publicApk}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log('============================================================\n');

} catch (err) {
  console.error('\n❌ APK build failed:', err.message);
  process.exit(1);
}
