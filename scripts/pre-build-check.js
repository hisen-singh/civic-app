const { execSync } = require('child_process');

console.log('🔍 Running pre-build checks...\n');

try {
  console.log('1️⃣ Running tests...');
  execSync('npx jest --ci --passWithNoTests', { stdio: 'inherit' });

  console.log('\n2️⃣ Checking bundle...');
  execSync('npx expo export -p web', { stdio: 'inherit' });

  console.log('\n✅ All checks passed! Safe to build.');
} catch (error) {
  console.error('\n❌ Pre-build check FAILED. Fix errors before building.');
  process.exit(1);
}
