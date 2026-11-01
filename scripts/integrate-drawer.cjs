const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/containers/System/Admin/Financial/VisualCashFlowDashboard.jsx');
let s = fs.readFileSync(file, 'utf8');

if (!s.includes('VaultDetailDrawer')) {
  s = s.replace(
    "import './VisualCashFlowDashboard.scss';",
    "import VaultDetailDrawer from './VaultDetailDrawer';\nimport './VisualCashFlowDashboard.scss';"
  );
}

const target = '      )}\n    </div>\n  );\n}';
const replacement = `      )}

      {/* 7. DRAWER BÓC TÁCH CHI TIẾT KHỐI VỐN (DRILLDOWN) */}
      {selectedVault && (
        <VaultDetailDrawer
          vaultKey={selectedVault}
          data={data}
          onClose={() => setSelectedVault(null)}
          onOpenWithdrawModal={() => setIsWithdrawModalOpen(true)}
        />
      )}
    </div>
  );
}`;

if (s.includes(target)) {
  s = s.replace(target, replacement);
  fs.writeFileSync(file, s, 'utf8');
  console.log('Successfully integrated VaultDetailDrawer!');
} else {
  // Try CRLF
  const targetCRLF = target.replace(/\n/g, '\r\n');
  const replacementCRLF = replacement.replace(/\n/g, '\r\n');
  if (s.includes(targetCRLF)) {
    s = s.replace(targetCRLF, replacementCRLF);
    fs.writeFileSync(file, s, 'utf8');
    console.log('Successfully integrated VaultDetailDrawer with CRLF!');
  } else {
    console.error('Target not found in VisualCashFlowDashboard.jsx');
  }
}

