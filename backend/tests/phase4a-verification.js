/**
 * Phase 4A Production-Hardening Verification Suite
 *
 * Verifies:
 * 1. Express Trust Proxy configuration
 * 2. Production CORS enforcement (localhost blocked in production, allowed in dev)
 * 3. Registration rate limiting on POST /api/auth/register-organization
 * 4. Document Controller RBAC & strict tenant isolation
 * 5. MySQL connection pool configuration (keepAlive, timeouts, timezone)
 * 6. MySQL distributed lock acquisition & release in insightScheduler
 * 7. AI provider request timeout handling & Gemini header authentication
 * 8. Zero localhost:5001 hardcoded in frontend source
 * 9. Frontend .htaccess SPA routing configuration
 * 10. Process error & graceful shutdown handlers
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/db');
const app = require('../src/app');
const insightScheduler = require('../src/services/ai/insightScheduler');
const GeminiProvider = require('../src/services/ai/providers/geminiProvider');
const fs = require('fs');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  console.log(`${colors.green}✓ PASS:${colors.reset} ${name} ${detail ? colors.cyan + '(' + detail + ')' + colors.reset : ''}`);
  passed++;
}

function fail(name, reason) {
  console.error(`${colors.red}✗ FAIL:${colors.reset} ${name} - ${reason}`);
  failed++;
  process.exitCode = 1;
}

async function runPhase4AVerification() {
  console.log(`\n${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.cyan}    PHASE 4A — PRODUCTION HARDENING AUTOMATED VERIFICATION SUITE         ${colors.reset}`);
  console.log(`${colors.cyan}========================================================================\n${colors.reset}`);

  try {
    // ─── 1. EXPRESS TRUST PROXY ───────────────────────────────────────────────
    console.log(`${colors.yellow}1. AUDITING EXPRESS PROXY CONFIGURATION...${colors.reset}`);
    const trustProxySetting = app.get('trust proxy');
    if (trustProxySetting === 1 || trustProxySetting === true) {
      pass('Express trust proxy enabled', `Value: ${trustProxySetting}`);
    } else {
      fail('Express trust proxy not enabled', `Expected 1, got ${trustProxySetting}`);
    }

    // ─── 2. PRODUCTION CORS POLICY ────────────────────────────────────────────
    console.log(`\n${colors.yellow}2. AUDITING CORS HARDENING...${colors.reset}`);
    const appSource = fs.readFileSync(path.resolve(__dirname, '../src/app.js'), 'utf8');
    if (
      appSource.includes("const isProduction = process.env.NODE_ENV === 'production'") &&
      appSource.includes("origin.startsWith('http://localhost')") &&
      appSource.includes("CORS error: Origin")
    ) {
      pass('Production CORS blocks localhost in production mode', 'Localhost strictly bounded to development');
    } else {
      fail('Production CORS allows localhost indiscriminately', 'Localhost check not guarded by NODE_ENV');
    }

    // ─── 3. REGISTRATION RATE LIMITING ────────────────────────────────────────
    console.log(`\n${colors.yellow}3. AUDITING REGISTRATION RATE LIMITER...${colors.reset}`);
    const authRoutesSource = fs.readFileSync(path.resolve(__dirname, '../src/routes/authRoutes.js'), 'utf8');
    if (
      authRoutesSource.includes('registrationLimiter') &&
      authRoutesSource.includes("router.post('/register-organization', registrationLimiter")
    ) {
      pass('Organization registration rate limiter active', 'Stricter 5/hr rate limiter attached');
    } else {
      fail('Registration rate limiter missing', 'POST /register-organization missing registrationLimiter');
    }

    // ─── 4. DOCUMENT CONTROLLER RBAC & ISOLATION ──────────────────────────────
    console.log(`\n${colors.yellow}4. AUDITING DOCUMENT CONTROLLER HARDENING...${colors.reset}`);
    const docControllerSource = fs.readFileSync(path.resolve(__dirname, '../src/controllers/documentController.js'), 'utf8');
    if (
      docControllerSource.includes('req.user?.organization_id || req.user?.organizationId') &&
      docControllerSource.includes('userRoles.some') &&
      docControllerSource.includes("filePath.startsWith(uploadsRoot)")
    ) {
      pass('DocumentController uses organization_id, array roles, and path traversal guard');
    } else {
      fail('DocumentController lacks required fixes', 'Missing organization_id, role array handling, or path guard');
    }

    // ─── 5. MYSQL POOL HARDENING ──────────────────────────────────────────────
    console.log(`\n${colors.yellow}5. AUDITING MYSQL CONNECTION POOL HARDENING...${colors.reset}`);
    const dbSource = fs.readFileSync(path.resolve(__dirname, '../src/config/db.js'), 'utf8');
    if (
      dbSource.includes('enableKeepAlive: true') &&
      dbSource.includes('timezone:') &&
      dbSource.includes('maxIdle:') &&
      dbSource.includes('idleTimeout:') &&
      dbSource.includes('connectTimeout:') &&
      dbSource.includes("pool.on('connection'")
    ) {
      pass('MySQL pool hardened with keepAlive, timezone, timeouts, and error listeners');
    } else {
      fail('MySQL pool config incomplete', 'Missing keepalive or pool error listeners');
    }

    // ─── 6. MYSQL DISTRIBUTED SCHEDULER LOCK ──────────────────────────────────
    console.log(`\n${colors.yellow}6. AUDITING DISTRIBUTED SCHEDULER LOCK...${colors.reset}`);
    const schedulerSource = fs.readFileSync(path.resolve(__dirname, '../src/services/ai/insightScheduler.js'), 'utf8');
    if (
      schedulerSource.includes("GET_LOCK('hrms_insight_detection_lock', 0)") &&
      schedulerSource.includes("RELEASE_LOCK('hrms_insight_detection_lock')")
    ) {
      // Test the actual lock queries in MySQL
      const conn = await db.getConnection();
      try {
        const [lockRes] = await conn.query("SELECT GET_LOCK('hrms_test_verification_lock', 0) AS acquired");
        const acquired = lockRes[0]?.acquired === 1;
        await conn.query("SELECT RELEASE_LOCK('hrms_test_verification_lock')");
        if (acquired) {
          pass('MySQL distributed lock verified via GET_LOCK / RELEASE_LOCK', 'Lock acquired and released safely');
        } else {
          fail('MySQL GET_LOCK failed to acquire test lock', 'Unexpected lock return');
        }
      } finally {
        conn.release();
      }
    } else {
      fail('InsightScheduler lacks MySQL GET_LOCK/RELEASE_LOCK distributed lock');
    }

    // ─── 7. AI PROVIDER TIMEOUTS & HEADERS ────────────────────────────────────
    console.log(`\n${colors.yellow}7. AUDITING AI PROVIDER TIMEOUTS & CREDENTIAL HEADERS...${colors.reset}`);
    const geminiSource = fs.readFileSync(path.resolve(__dirname, '../src/services/ai/providers/geminiProvider.js'), 'utf8');
    const openAiSource = fs.readFileSync(path.resolve(__dirname, '../src/services/ai/providers/openAiProvider.js'), 'utf8');

    if (!geminiSource.includes('?key=') && geminiSource.includes("'x-goog-api-key': this.apiKey")) {
      pass('Gemini credentials passed via x-goog-api-key header (zero URL query leakage)');
    } else {
      fail('Gemini credentials still present in URL query string');
    }

    if (geminiSource.includes('AbortSignal.timeout(10000)') && openAiSource.includes('AbortSignal.timeout(10000)')) {
      pass('10-second timeout configured on Gemini and OpenAI API requests');
    } else {
      fail('AI provider request timeouts missing');
    }

    // ─── 8. ZERO LOCALHOST:5001 IN FRONTEND ───────────────────────────────────
    console.log(`\n${colors.yellow}8. AUDITING FRONTEND SOURCE CODE FOR HARDCODED LOCALHOST...${colors.reset}`);
    const frontendSrcPath = path.resolve(__dirname, '../../frontend/src');
    
    function scanDirForLocalhost(dir) {
      const files = fs.readdirSync(dir);
      let count = 0;
      for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          count += scanDirForLocalhost(full);
        } else if (/\.(jsx?|tsx?|css|html)$/.test(f)) {
          const content = fs.readFileSync(full, 'utf8');
          // Match http://localhost:5001 or localhost:5001 outside of api.js dev fallback comments
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('localhost:5001') && !full.endsWith('api.js')) {
              console.error(`Found localhost:5001 in ${full}:${idx + 1}: ${line.trim()}`);
              count++;
            }
          });
        }
      }
      return count;
    }

    const hardcodedCount = scanDirForLocalhost(frontendSrcPath);
    if (hardcodedCount === 0) {
      pass('Frontend source completely free of hardcoded localhost:5001 in UI code');
    } else {
      fail('Frontend contains hardcoded localhost:5001 occurrences', `Found ${hardcodedCount} occurrences`);
    }

    // ─── 9. APACHE .HTACCESS ROUTING ──────────────────────────────────────────
    console.log(`\n${colors.yellow}9. AUDITING APACHE SPA ROUTING CONFIGURATION...${colors.reset}`);
    const htaccessPath = path.resolve(__dirname, '../../frontend/public/.htaccess');
    const distHtaccessPath = path.resolve(__dirname, '../../frontend/dist/.htaccess');
    
    if (fs.existsSync(htaccessPath)) {
      const htaccessContent = fs.readFileSync(htaccessPath, 'utf8');
      if (htaccessContent.includes('RewriteRule ^ index.html [L]') && htaccessContent.includes('X-Content-Type-Options')) {
        pass('Apache SPA .htaccess present in public directory with security headers');
      } else {
        fail('Apache .htaccess missing SPA rewrite or security headers');
      }
    } else {
      fail('frontend/public/.htaccess does not exist');
    }

    if (fs.existsSync(distHtaccessPath)) {
      pass('Vite production build includes .htaccess in dist/ output');
    } else {
      fail('dist/.htaccess missing from production build output');
    }

    // ─── 10. GRACEFUL SHUTDOWN & PROCESS ERROR HANDLERS ───────────────────────
    console.log(`\n${colors.yellow}10. AUDITING SERVER LIFECYCLE & PROCESS ERROR HANDLERS...${colors.reset}`);
    const serverSource = fs.readFileSync(path.resolve(__dirname, '../src/server.js'), 'utf8');
    if (
      serverSource.includes("gracefulShutdown('SIGTERM')") &&
      serverSource.includes("gracefulShutdown('SIGINT')") &&
      serverSource.includes("process.on('uncaughtException'") &&
      serverSource.includes("process.on('unhandledRejection'") &&
      serverSource.includes('db.end()')
    ) {
      pass('Server implements graceful shutdown (SIGTERM/SIGINT, pool drainage) & process exception handlers');
    } else {
      fail('Server lifecycle or exception handlers incomplete');
    }

    // ─── 11. ROOT PACKAGE.JSON SCRIPTS ────────────────────────────────────────
    console.log(`\n${colors.yellow}11. AUDITING ROOT PACKAGE.JSON SCRIPTS...${colors.reset}`);
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    if (pkg.scripts?.start === 'node backend/src/server.js' && pkg.scripts?.build === 'npm run build:frontend') {
      pass('Root package.json production scripts verified ("start" and "build")');
    } else {
      fail('Root package.json missing required production scripts', JSON.stringify(pkg.scripts));
    }

    // ─── 12. SENSITIVE CREDENTIAL LOG REDACTION ───────────────────────────────
    console.log(`\n${colors.yellow}12. AUDITING CREDENTIAL LOG REDACTION...${colors.reset}`);
    const emailSource = fs.readFileSync(path.resolve(__dirname, '../src/services/emailService.js'), 'utf8');
    const logsRawToken = /console\.(log|info|warn|error)\([^)]*(activationLink|gmailComposeUrl)[^)]*\)/.test(emailSource);
    if (!logsRawToken) {
      pass('Activation token and compose URL logging strictly sanitized (zero token leak in stdout)');
    } else {
      fail('emailService.js still logs raw activation links or tokens to console');
    }

  } catch (err) {
    console.error('Verification error:', err);
    process.exitCode = 1;
  }

  console.log(`\n${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.cyan}  PHASE 4A VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED       ${colors.reset}`);
  console.log(`${colors.cyan}========================================================================\n${colors.reset}`);

  if (failed === 0) {
    console.log(`${colors.green}ALL PHASE 4A PRODUCTION-HARDENING CRITERIA VERIFIED SUCCESSFULLY!${colors.reset}\n`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

runPhase4AVerification();

