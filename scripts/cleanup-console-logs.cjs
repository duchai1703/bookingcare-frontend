// scripts/cleanup-console-logs.js
// [Phase 9.7] Production Cleanup Script
// Quét và XÓA CHỈ console.log — KHÔNG xóa console.error / console.warn / console.info
// trong src/containers/ và src/services/ của Frontend
// Usage: node scripts/cleanup-console-logs.js [--dry-run]

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const TARGET_DIRS = [
  path.resolve(__dirname, '../src/containers'),
  path.resolve(__dirname, '../src/services'),
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// FINAL FIX 9.7 — CHỈ match console.log, KHÔNG xóa console.error / console.warn / console.info
// Giữ nguyên error/warn/info để debug Production an toàn
const CONSOLE_LOG_REGEX = /^\s*console\.log\(.*\);?\s*$/; // FINAL FIX 9.7

const IS_DRY_RUN = process.argv.includes('--dry-run');

// ═══════════════════════════════════════════════════════════════
// HÀM: Đệ quy tìm tất cả file trong thư mục
// ═══════════════════════════════════════════════════════════════
function getAllFiles(dirPath, fileList = []) {
  if (!fs.existsSync(dirPath)) return fileList;

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (FILE_EXTENSIONS.includes(path.extname(fullPath))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Quét và xóa console.log
// ═══════════════════════════════════════════════════════════════
let totalFilesScanned = 0;
let totalFilesModified = 0;
let totalLinesRemoved = 0;

console.log('='.repeat(60));
console.log('[Phase 9.7] Console Log Cleanup Script');
console.log(`Mode: ${IS_DRY_RUN ? 'DRY RUN (không sửa file)' : 'LIVE (sẽ xóa dòng)'}`);
console.log('='.repeat(60));

for (const dir of TARGET_DIRS) {
  console.log(`\nScanning: ${dir}`);

  const files = getAllFiles(dir);
  for (const filePath of files) {
    totalFilesScanned++;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cleanedLines = [];
    let removedInFile = 0;

    for (let i = 0; i < lines.length; i++) {
      if (CONSOLE_LOG_REGEX.test(lines[i])) { // FINAL FIX 9.7
        removedInFile++;
        totalLinesRemoved++;
        if (IS_DRY_RUN) {
          const relativePath = path.relative(process.cwd(), filePath);
          console.log(`  [WOULD REMOVE] ${relativePath}:${i + 1} → ${lines[i].trim()}`);
        }
      } else {
        cleanedLines.push(lines[i]);
      }
    }

    if (removedInFile > 0) {
      totalFilesModified++;
      if (!IS_DRY_RUN) {
        fs.writeFileSync(filePath, cleanedLines.join('\n'), 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`  ✅ ${relativePath} — ${removedInFile} line(s) removed`);
      }
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 REPORT:`);
console.log(`   Files scanned:  ${totalFilesScanned}`);
console.log(`   Files modified: ${totalFilesModified}`);
console.log(`   Lines removed:  ${totalLinesRemoved}`);
console.log('='.repeat(60));

if (IS_DRY_RUN && totalLinesRemoved > 0) {
  console.log('\n⚠️  Chạy lại KHÔNG có --dry-run để thực sự xóa các dòng console.log');
}
