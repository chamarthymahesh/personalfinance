const msPerDay = 1000 * 60 * 60 * 24;

// Mock ledger entries
const entries = [
  { type: 'opening', date: new Date('2026-03-04T00:00:00.000Z'), amount: 1000000 },
  { type: 'partial_payment', date: new Date('2026-07-20T00:00:00.000Z'), amount: 1000000 }
];

function getPrincipalAt(atDate) {
  let principal = 0;
  for (const e of entries) {
    if (new Date(e.date) > atDate) break;
    if (e.type === 'opening') principal += e.amount;
    if (e.type === 'partial_payment') principal -= e.amount;
  }
  return principal < 0 ? 0 : principal;
}

let currentStart = new Date('2026-03-04T00:00:00.000Z');
let today = new Date('2026-08-05T00:00:00.000Z');

while (currentStart < today) {
  let nextFirst = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
  let periodEnd = nextFirst > today ? today : nextFirst;
  
  const startDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());
  const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  const daysElapsed = Math.round((endDay - startDay) / msPerDay);
  
  if (daysElapsed > 0) {
    const daysInMonth = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate();
    let interestAmount = 0;
    
    for (let d = new Date(startDay); d < endDay; d.setDate(d.getDate() + 1)) {
      let endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      
      let dayBasis = getPrincipalAt(endOfDay);
      let dailyFullInterest = (dayBasis * 1.5) / 100;
      let dailyInterest = dailyFullInterest / daysInMonth;
      interestAmount += dailyInterest;
    }
    
    console.log(`Month: ${currentStart.getMonth()+1}, Days: ${daysElapsed}, Interest: ${interestAmount.toFixed(2)}`);
  }
  currentStart = nextFirst;
}
