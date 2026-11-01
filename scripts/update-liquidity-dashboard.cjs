const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/containers/System/Admin/Financial/LiquidityDashboard.jsx');
let s = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!s.includes("import VisualCashFlowDashboard from './VisualCashFlowDashboard';")) {
  s = s.replace(
    "import MasterTreasuryConsole from './MasterTreasuryConsole';",
    "import MasterTreasuryConsole from './MasterTreasuryConsole';\nimport VisualCashFlowDashboard from './VisualCashFlowDashboard';"
  );
}

// 2. Replace render
const oldRender = `          {(activeTab === 'solvency' || activeTab === 'overview') && (
            <MasterTreasuryConsole onNavigateTab={handleSwitchTab} />
          )}`;

const newRender = `          {(activeTab === 'solvency' || activeTab === 'overview') && (
            <VisualCashFlowDashboard onNavigateTab={handleSwitchTab} />
          )}`;

s = s.replace(oldRender, newRender);

// 3. Update tab 1 button label
s = s.replace(
  '<span>1. T?ng quan & Cn d?i qu?</span>',
  '<span>1. So d? Dng ti?n & D?i sot</span>'
);

fs.writeFileSync(file, s, 'utf8');
console.log('Successfully updated LiquidityDashboard.jsx with VisualCashFlowDashboard!');
