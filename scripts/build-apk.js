const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcApk = path.join(root, 'frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk');
const scratchDir = path.join(root, 'scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

const unsignedApk = path.join(scratchDir, 'app-unsigned.apk');
const alignedApk = path.join(scratchDir, 'app-aligned.apk');
const finalApk = path.join(scratchDir, 'jmk-hrms-release.apk');
const publicApk = path.join(root, 'frontend/public/jmk-hrms.apk');
const distApk = path.join(root, 'frontend/dist/jmk-hrms.apk');
const releaseDirApk = path.join(root, 'frontend/android/app/build/outputs/apk/release/jmk-hrms-release.apk');

console.log('--- Step 1: Syncing web assets ---');
execSync('cd frontend && npx cap sync android', { stdio: 'inherit', cwd: root });
// Remove nested apk if copied into assets
const nestedApk = path.join(root, 'frontend/android/app/src/main/assets/public/jmk-hrms.apk');
if (fs.existsSync(nestedApk)) fs.unlinkSync(nestedApk);

console.log('\n--- Step 2: Packaging assets into APK ---');
fs.copyFileSync(srcApk, unsignedApk);
process.chdir(path.join(root, 'frontend/android/app/src/main'));
execSync(`zip -r -u "${unsignedApk}" assets/public -x "*.DS_Store"`, { stdio: 'inherit' });

console.log('\n--- Step 2b: Injecting compiled launcher icons into APK res/ ---');
const iconMapping = {
  'frontend/android/app/src/main/res/mipmap-mdpi/ic_launcher.png': 'res/9w.png',
  'frontend/android/app/src/main/res/mipmap-hdpi/ic_launcher.png': 'res/yn.png',
  'frontend/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png': 'res/FS.png',
  'frontend/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png': 'res/RJ.png',
  'frontend/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png': 'res/o-.png',

  'frontend/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png': 'res/QZ.png',
  'frontend/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png': 'res/zr.png',
  'frontend/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png': 'res/Em.png',
  'frontend/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png': 'res/Lf.png',
  'frontend/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png': 'res/as.png',

  'frontend/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png': 'res/zR.png',
  'frontend/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png': 'res/8c.png',
  'frontend/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png': 'res/wb.png',
  'frontend/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png': 'res/fO.png',
  'frontend/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png': 'res/Gc.png',
};

const stagingRes = path.join(scratchDir, 'staging_res', 'res');
if (fs.existsSync(path.dirname(stagingRes))) fs.rmSync(path.dirname(stagingRes), { recursive: true, force: true });
fs.mkdirSync(stagingRes, { recursive: true });

for (const [srcRel, destRel] of Object.entries(iconMapping)) {
  const srcFile = path.join(root, srcRel);
  const destFile = path.join(path.dirname(stagingRes), destRel);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
  } else {
    console.warn(`Warning: source icon ${srcFile} not found`);
  }
}

process.chdir(path.dirname(stagingRes));
execSync(`zip -u "${unsignedApk}" res/*`, { stdio: 'inherit' });
console.log('Launcher icons successfully injected into APK res/ folder.');

console.log('\n--- Step 3: Aligning APK with zipalign ---');
const zipalign = '/Users/aishwarya/Library/Android/sdk/build-tools/34.0.0/zipalign';
if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
execSync(`"${zipalign}" -v -p 4 "${unsignedApk}" "${alignedApk}"`, { stdio: 'ignore' });

console.log('\n--- Step 4: Signing APK with official keystore ---');
const apksigner = '/Users/aishwarya/Library/Android/sdk/build-tools/34.0.0/apksigner';
const keystore = path.join(root, 'frontend/android/keystores/jmk-release.keystore');
const pass = fs.readFileSync(path.join(root, 'frontend/android/keystores/.pass'), 'utf8').trim();

if (fs.existsSync(finalApk)) fs.unlinkSync(finalApk);
fs.copyFileSync(alignedApk, finalApk);

const env = Object.assign({}, process.env, {
  JAVA_HOME: '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  PATH: `/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin:${process.env.PATH}`
});

execSync(`"${apksigner}" sign --ks "${keystore}" --ks-key-alias "jmk_release_key" --ks-pass pass:"${pass}" --key-pass pass:"${pass}" "${finalApk}"`, { env, stdio: 'inherit' });

console.log('\n--- Step 5: Verifying signature ---');
const verifyOut = execSync(`"${apksigner}" verify --verbose "${finalApk}"`, { env }).toString();
console.log(verifyOut);

console.log('\n--- Step 6: Copying to frontend/public & dist ---');
fs.copyFileSync(finalApk, publicApk);
if (fs.existsSync(path.dirname(distApk))) {
  fs.copyFileSync(finalApk, distApk);
}
fs.copyFileSync(finalApk, releaseDirApk);

const stats = fs.statSync(publicApk);
console.log(`\n✅ Production APK successfully built and signed with NEW app icons!`);
console.log(`File: ${publicApk}`);
console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
