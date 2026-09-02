const fs = require('fs');
const files = ['backend/routes/lending.js', 'backend/routes/hand_loans.js', 'backend/routes/investments.js'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const auth = require\('\.\.\/middleware\/auth'\);/g, "const auth = require('../middleware/auth');\nconst syncExpenseStatus = require('../utils/syncExpenseStatus');");
  content = content.replace(/await ledger\.save\(\);/g, "await ledger.save();\n    await syncExpenseStatus(ledger.expenseId, ledger.outstandingBalance);");
  fs.writeFileSync(file, content);
}
console.log('updated routes');
