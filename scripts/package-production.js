/**
 * Production Packaging Script for JMK HRMS
 * 
 * Generates:
 * 1. hrms-frontend.zip: Direct contents of frontend/dist (including .htaccess)
 *    for cPanel public_html deployment.
 * 2. hrms-backend.zip: Clean Node.js backend files (src, schema, package.json, app.js, index.js, .env.example, public)
 *    ready for cPanel Setup Node.js App without development clutter or local secrets.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const distDir = path.join(frontendDir, 'dist');
const stagingDir = path.join(rootDir, 'scratch', 'package_staging');

console.log('============================================================');
console.log('📦  JMK HRMS PRODUCTION PACKAGING PIPELINE');
console.log('============================================================\n');

try {
  // 1. Build frontend
  console.log('1. Building frontend production bundle with Vite...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('Frontend build failed: dist/index.html not found');
  }

  // Ensure .htaccess is in dist
  const htaccessSrc = path.join(frontendDir, 'public', '.htaccess');
  const htaccessDest = path.join(distDir, '.htaccess');
  if (fs.existsSync(htaccessSrc) && !fs.existsSync(htaccessDest)) {
    fs.copyFileSync(htaccessSrc, htaccessDest);
    console.log('   Copied .htaccess into dist/');
  }

  // 2. Clean staging directory
  console.log('\n2. Preparing staging workspace...');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // 3. Package Frontend ZIP
  console.log('\n3. Packaging hrms-frontend.zip...');
  const frontendZipPath = path.join(rootDir, 'hrms-frontend.zip');
  if (fs.existsSync(frontendZipPath)) {
    fs.unlinkSync(frontendZipPath);
  }

  // Zip contents of dist directly (so unzipping in public_html puts files in root)
  execSync(`cd "${distDir}" && zip -r "${frontendZipPath}" . -x "*.DS_Store"`, { stdio: 'pipe' });
  const frontendStat = fs.statSync(frontendZipPath);
  console.log(`   ✅ Created hrms-frontend.zip (${(frontendStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  // 4. Prepare Backend Staging
  console.log('\n4. Preparing clean backend bundle in staging...');
  const backendStaging = path.join(stagingDir, 'backend');
  fs.mkdirSync(backendStaging, { recursive: true });

  // Copy src/
  execSync(`cp -R "${path.join(backendDir, 'src')}" "${backendStaging}/"`);

  // Copy database/schema/
  const dbSchemaDir = path.join(backendStaging, 'database', 'schema');
  fs.mkdirSync(dbSchemaDir, { recursive: true });
  fs.copyFileSync(
    path.join(backendDir, 'database', 'schema', 'production_baseline.sql'),
    path.join(dbSchemaDir, 'production_baseline.sql')
  );

  // Copy root entry points & config
  const filesToCopy = [
    'package.json',
    'package-lock.json',
    'app.js',
    'index.js',
    '.env.example'
  ];
  for (const f of filesToCopy) {
    const srcFile = path.join(backendDir, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(backendStaging, f));
    }
  }

  // Also copy frontend dist into backend/public so backend can serve unified SPA
  const publicDest = path.join(backendStaging, 'public');
  fs.mkdirSync(publicDest, { recursive: true });
  execSync(`cp -R "${distDir}/"* "${publicDest}/"`);
  if (fs.existsSync(htaccessDest)) {
    fs.copyFileSync(htaccessDest, path.join(publicDest, '.htaccess'));
  }

  // Create uploads directory with .gitkeep
  const uploadsDest = path.join(backendStaging, 'uploads');
  fs.mkdirSync(uploadsDest, { recursive: true });
  fs.writeFileSync(path.join(uploadsDest, '.gitkeep'), '');

  // 5. Package Backend ZIP
  console.log('\n5. Packaging hrms-backend.zip...');
  const backendZipPath = path.join(rootDir, 'hrms-backend.zip');
  if (fs.existsSync(backendZipPath)) {
    fs.unlinkSync(backendZipPath);
  }

  execSync(`cd "${backendStaging}" && zip -r "${backendZipPath}" . -x "*.DS_Store"`, { stdio: 'pipe' });
  const backendStat = fs.statSync(backendZipPath);
  console.log(`   ✅ Created hrms-backend.zip (${(backendStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  // 6. Cleanup Staging
  fs.rmSync(stagingDir, { recursive: true, force: true });

  console.log('\n============================================================');
  console.log('🎉 PRODUCTION PACKAGES GENERATED SUCCESSFULLY!');
  console.log('============================================================');
  console.log(`1. Frontend ZIP: ${frontendZipPath} (${(frontendStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`2. Backend ZIP:  ${backendZipPath} (${(backendStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log('\nDeployment Instructions:');
  console.log('- For static frontend: Extract hrms-frontend.zip directly into public_html/');
  console.log('- For Node.js backend: Extract hrms-backend.zip into your cPanel Node.js app folder');
  console.log('  and click "Run NPM Install" in cPanel.');
  console.log('============================================================\n');

} catch (err) {
  console.error('\n❌ Packaging failed:', err.message);
  process.exit(1);
}
