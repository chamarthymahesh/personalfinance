// Simulate the correct Simple Interest calculation
// Principal: 10,00,000 | Rate: 1.5%/month | Start: 4 Mar 2026 | Payment: 20 Jul 2026

const entries = [
  { type: 'opening', date: new Date('2026-03-04T00:00:00.000Z'), amount: 1000000 },
  { type: 'partial_payment', date: new Date('2026-07-20T00:00:00.000Z'), amount: 1000000 }
];

// Fixed getPrincipalAt: payment effective from NEXT day
function getPrincipalAt(entries, atDate) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let principal = 0;
  let unpaidInterest = 0;
  for (const e of sorted) {
    const entryDate = new Date(e.date);
    if (e.type === 'opening') {
      if (entryDate > atDate) break;
      principal = e.amount;
    } else if (e.type === 'interest') {
      if (entryDate > atDate) break;
      unpaidInterest += e.amount;
    } else if (e.type === 'partial_payment') {
      const effectiveDate = new Date(entryDate);
      effectiveDate.setDate(effectiveDate.getDate() + 1);
      effectiveDate.setHours(0, 0, 0, 0);
      if (effectiveDate > atDate) break;
      let remaining = e.amount;
      if (remaining >= unpaidInterest) { remaining -= unpaidInterest; unpaidInterest = 0; principal -= remaining; }
      else { unpaidInterest -= remaining; }
    }
  }
  return principal < 0 ? 0 : principal;
}

let currentStart = new Date('2026-03-04T00:00:00.000Z');
const today = new Date('2026-09-01T00:00:00.000Z');
const rate = 1.5;
let totalInterest = 0;

while (currentStart < today) {
  let nextFirst = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
  let periodEnd = nextFirst > today ? today : nextFirst;
  
  const startDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());
  const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  const daysInMonth = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate();
  
  let monthInterest = 0;
  for (let d = new Date(startDay); d < endDay; d.setDate(d.getDate() + 1)) {
    let endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);
    const dayBasis = getPrincipalAt(entries, endOfDay);
    monthInterest += (dayBasis * rate / 100) / daysInMonth;
  }
  monthInterest = parseFloat(monthInterest.toFixed(2));
  totalInterest += monthInterest;
  
  const label = currentStart.toLocaleString('default', { month: 'short', year: 'numeric' });
  const days = Math.round((endDay - startDay) / (1000*60*60*24));
  if (monthInterest > 0)
    console.log(`${label}: ${days} days, Interest = ₹${monthInterest.toFixed(2)}`);
  
  currentStart = nextFirst;
}

console.log(`\nTotal Interest = ₹${totalInterest.toFixed(2)}`);
console.log(`Expected balance after ₹10L payment = ₹${(totalInterest).toFixed(2)}`);
