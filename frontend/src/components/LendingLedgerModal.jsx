import { useState, useEffect } from 'react';
import axios from 'axios';

import { API_URL, SERVER_URL } from '../config';


export default function LendingLedgerModal({ bill, onClose }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    principalAmount: bill.amount || '',
    interestRate: bill.details?.interestRate || '',
    startDate: new Date().toISOString().split('T')[0],
    interestType: bill.details?.interestType || 'Simple Interest'
  });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', paymentMode: '', proofFile: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/lending-ledger/${bill._id}`);
      setLedger(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setShowSetup(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const createLedger = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await axios.post(`${API_URL}/lending-ledger`, {
        expenseId: bill._id,
        personName: bill.details?.personName || bill.title,
        principalAmount: parseFloat(setupForm.principalAmount),
        interestRate: parseFloat(setupForm.interestRate) || 0,
        startDate: setupForm.startDate,
        interestType: setupForm.interestType
      });
      setLedger(res.data);
      setShowSetup(false);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const syncInterest = async () => {
    if (!ledger) return;
    try {
      setActionLoading(true);
      const res = await axios.post(`${API_URL}/lending-ledger/${ledger._id}/sync-interest`);
      setLedger(res.data.ledger);
      if (res.data.newEntriesCount > 0) {
        alert(`✅ Added ${res.data.newEntriesCount} new month(s) of interest!`);
      } else if (res.data.updatedCurrentMonth) {
        const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        alert(`✅ ${monthName} interest refreshed to today's date (${new Date().toLocaleDateString('en-IN')}).`);
      } else {
        alert('✅ All interest is already up to date. No changes needed.');
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const recalculateInterest = async () => {
    if (!ledger) return;
    try {
      setActionLoading(true);
      const res = await axios.post(`${API_URL}/lending-ledger/${ledger._id}/recalculate-interest`);
      setLedger(res.data.ledger);
      alert(`Done! Recalculated ${res.data.newEntriesCount} month(s) of interest with correct balances.`);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!entryId) { alert('Cannot identify entry to delete.'); return; }
    // Removed window.confirm because browser popup blocker was silencing it
    try {
      const res = await axios.delete(`${API_URL}/lending-ledger/${ledger._id}/entry/${String(entryId)}`);
      setLedger(res.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      
      const formData = new FormData();
      formData.append('amount', paymentForm.amount);
      formData.append('date', paymentForm.date);
      formData.append('note', paymentForm.note);
      formData.append('paymentMode', paymentForm.paymentMode);
      if (paymentForm.proofFile) {
        formData.append('proofFile', paymentForm.proofFile);
      }

      const res = await axios.post(`${API_URL}/lending-ledger/${ledger._id}/add-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setLedger(res.data);
      setShowAddPayment(false);
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '', paymentMode: '', proofFile: null });
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!ledger) return;
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LENDING LEDGER STATEMENT', 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 25);

    // Summary box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Borrower Details', 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${ledger.personName}`, 14, 56);
    doc.text(`Principal Amount: Rs.${ledger.principalAmount.toLocaleString('en-IN')}`, 14, 63);
    doc.text(`Interest Rate: ${ledger.interestRate}% per month (${ledger.interestType || 'Simple Interest'})`, 14, 70);
    doc.text(`Start Date: ${new Date(ledger.startDate).toLocaleDateString('en-IN')}`, 14, 77);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38);
    doc.text(`Outstanding Balance: Rs.${ledger.outstandingBalance.toLocaleString('en-IN')}`, 14, 90);

    // Chronologically sort and calculate true running balances
    const sortedEntries = [...ledger.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningPdfBalance = 0;
    const pdfEntries = sortedEntries.map(entry => {
      if (entry.type === 'opening') runningPdfBalance = entry.amount;
      else if (entry.type === 'interest') runningPdfBalance += entry.amount;
      else if (entry.type === 'partial_payment') runningPdfBalance -= entry.amount;
      return { ...entry, trueBalance: runningPdfBalance };
    });

    // Table
    const tableRows = pdfEntries.map((entry, i) => [
      (i + 1).toString(),
      new Date(entry.date).toLocaleDateString('en-IN'),
      entry.type === 'opening' ? 'Opening Balance' : entry.type === 'interest' ? 'Interest Charged' : 'Payment Received',
      entry.type === 'interest' ? `Rs.${entry.amount.toLocaleString('en-IN')}` : '-',
      entry.type === 'partial_payment' ? `Rs.${entry.amount.toLocaleString('en-IN')}` : '-',
      `Rs.${entry.trueBalance.toLocaleString('en-IN')}`,
      entry.note || ''
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['#', 'Date', 'Type', 'Interest', 'Payment', 'Balance', 'Note']],
      body: tableRows,
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        3: { textColor: [220, 38, 38] },
        4: { textColor: [21, 128, 61] },
        5: { fontStyle: 'bold' }
      },
      styles: { fontSize: 9 }
    });

    doc.save(`Lending_Statement_${ledger.personName}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`);
  };

  const inputStyle = {
    width: '100%', padding: '0.65rem 1rem',
    border: '1px solid var(--border-color)', borderRadius: '8px',
    background: 'white', fontSize: '0.9rem', color: '#1e293b'
  };
  const labelStyle = { display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' };

  const isBorrowing = bill?.category?.toLowerCase().includes('borrowing') || bill?.category?.toLowerCase().includes('interest taken');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fffdf6', borderRadius: '14px', width: '700px',
          maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 70px rgba(0,0,0,0.3)', color: '#1e293b', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)',
          background: '#fffdf6', flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontFamily: 'Merriweather, serif', fontSize: '1.3rem', margin: 0 }}>
              {isBorrowing ? 'Borrowing Ledger' : 'Lending Ledger'}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {bill.details?.personName || bill.title}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px',
            width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

          {/* SETUP FORM */}
          {showSetup && (
            <div>
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Set up the ledger to start tracking interest and payments.
              </div>
              <form onSubmit={createLedger}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Principal Amount (₹)</label>
                    <input type="number" required style={inputStyle}
                      value={setupForm.principalAmount}
                      onChange={(e) => setSetupForm({ ...setupForm, principalAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Monthly Interest Rate (%)</label>
                    <input type="number" step="0.01" required style={inputStyle}
                      placeholder="e.g. 2 for 2%"
                      value={setupForm.interestRate}
                      onChange={(e) => setSetupForm({ ...setupForm, interestRate: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>Start Date</label>
                    <input type="date" required style={inputStyle}
                      value={setupForm.startDate}
                      onChange={(e) => setSetupForm({ ...setupForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Interest Type</label>
                    <select style={inputStyle}
                      value={setupForm.interestType}
                      onChange={(e) => setSetupForm({ ...setupForm, interestType: e.target.value })}
                    >
                      <option value="Simple Interest">Simple Interest</option>
                      <option value="Compound Interest">Compound Interest (Monthly)</option>
                      <option value="Yearly Compound Interest">Yearly Compound Interest (Annual)</option>
                    </select>
                    {setupForm.interestType === 'Yearly Compound Interest' && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5 }}>
                        📅 Interest is calculated monthly on the principal. At each year anniversary, accumulated interest is added to the principal for the next year.
                        <br/><strong>Example:</strong> ₹1,00,000 @ 2%/mo → Year 1: ₹2,000/mo. Year 2: ₹2,480/mo (on ₹1,24,000)
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={actionLoading} style={{
                  padding: '0.75rem 2rem', background: '#1e293b', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem'
                }}>
                  {actionLoading ? 'Creating...' : 'Create Ledger'}
                </button>
              </form>
            </div>
          )}

          {/* LEDGER VIEW */}
          {!showSetup && ledger && (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Principal</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>₹{ledger.principalAmount.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Interest Rate</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{ledger.interestRate}% / mo</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {ledger.interestType === 'Yearly Compound Interest'
                      ? '📅 Yearly Compound'
                      : ledger.interestType === 'Compound Interest'
                      ? '🔁 Monthly Compound'
                      : '➖ Simple Interest'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.4rem' }}>Outstanding Balance</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#dc2626' }}>₹{ledger.outstandingBalance.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Yearly Compound info badge */}
              {ledger.interestType === 'Yearly Compound Interest' && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e', lineHeight: 1.6 }}>
                  📅 <strong>Yearly Compound Interest:</strong> Monthly interest is calculated on the principal only. At each loan anniversary (yearly), accumulated interest is rolled into the principal for the next year.<br/>
                  <span style={{ fontSize: '0.78rem' }}>E.g. ₹1,00,000 @ 2%/mo → Year 1: ₹2,000/mo | Year 2 (on ₹1,24,000): ₹2,480/mo</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={syncInterest}
                  disabled={actionLoading}
                  style={{
                    padding: '0.6rem 1.25rem', background: '#fef3c7', color: '#92400e',
                    border: '1px solid #f59e0b', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.85rem'
                  }}
                >
                  {actionLoading ? 'Syncing...' : '🔄 Sync Accrued Interest'}
                </button>
                <button
                  onClick={recalculateInterest}
                  disabled={actionLoading}
                  title="Deletes all auto-generated interest and recalculates correctly from scratch. Use this after recording payments."
                  style={{
                    padding: '0.6rem 1.25rem', background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.85rem'
                  }}
                >
                  {actionLoading ? '...' : '⚠️ Recalculate All Interest'}
                </button>
                <button
                  onClick={() => setShowAddPayment(!showAddPayment)}
                  style={{
                    padding: '0.6rem 1.25rem', background: '#f0fdf4', color: '#15803d',
                    border: '1px solid #86efac', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.85rem'
                  }}
                >
                  + Record Payment {isBorrowing ? 'Made' : 'Received'}
                </button>
                <button
                  onClick={downloadPDF}
                  style={{
                    padding: '0.6rem 1.25rem', background: '#1e293b', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.85rem', marginLeft: 'auto'
                  }}
                >
                  ↓ Download PDF Statement
                </button>
              </div>


              {/* Payment Form */}
              {showAddPayment && (
                <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#15803d' }}>Record Payment {isBorrowing ? 'Made' : 'Received'}</div>
                  <form onSubmit={addPayment}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Amount (₹)</label>
                        <input type="number" required style={inputStyle}
                          placeholder="e.g. 10000"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Mode of Payment</label>
                        <select style={inputStyle}
                          value={paymentForm.paymentMode}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                        >
                          <option value="">Select Mode</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Date</label>
                        <input type="date" required style={inputStyle}
                          value={paymentForm.date}
                          onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>Proof (optional image/pdf)</label>
                        <input type="file" style={{...inputStyle, padding: '0.5rem'}}
                          onChange={(e) => setPaymentForm({ ...paymentForm, proofFile: e.target.files[0] })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Note (optional)</label>
                        <input type="text" style={inputStyle}
                          placeholder="Any extra details..."
                          value={paymentForm.note}
                          onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" disabled={actionLoading} style={{
                        padding: '0.55rem 1.5rem', background: '#15803d', color: 'white',
                        border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem'
                      }}>
                        {actionLoading ? 'Saving...' : 'Save Payment'}
                      </button>
                      <button type="button" onClick={() => setShowAddPayment(false)} style={{
                        padding: '0.55rem 1rem', background: 'white', color: '#64748b',
                        border: '1px solid var(--border-color)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.88rem'
                      }}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Transaction Table */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: '600', fontSize: '0.9rem' }}>
                  Transaction History ({ledger.entries.length} entries)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Type</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#dc2626', borderBottom: '1px solid var(--border-color)' }}>Interest</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#15803d', borderBottom: '1px solid var(--border-color)' }}>Payment</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Balance</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Details</th>
                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Chronologically sort and calculate true running balances for display
                        const sortedEntries = [...ledger.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
                        let runningDisplayBalance = 0;
                        const displayEntries = sortedEntries.map(entry => {
                          if (entry.type === 'opening') runningDisplayBalance = entry.amount;
                          else if (entry.type === 'interest') runningDisplayBalance += entry.amount;
                          else if (entry.type === 'partial_payment') runningDisplayBalance -= entry.amount;
                          return { ...entry, trueBalance: runningDisplayBalance };
                        });
                        
                        return [...displayEntries].reverse().map((entry, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.7rem 1rem', color: '#94a3b8' }}>{displayEntries.length - i}</td>
                            <td style={{ padding: '0.7rem 1rem' }}>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '0.7rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '500',
                                background: entry.type === 'interest' ? '#fef3c7' : entry.type === 'partial_payment' ? '#f0fdf4' : '#f1f5f9',
                                color: entry.type === 'interest' ? '#92400e' : entry.type === 'partial_payment' ? '#15803d' : '#475569'
                              }}>
                                {entry.type === 'opening' ? 'Opening' : entry.type === 'interest' ? 'Interest' : 'Payment'}
                              </span>
                              {entry.monthLabel && <div style={{fontSize: '0.7rem', color: '#92400e', marginTop: '0.2rem'}}>{entry.monthLabel}</div>}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', textAlign: 'right', color: '#dc2626', fontWeight: '500' }}>
                              {entry.type === 'interest' ? `₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', textAlign: 'right', color: '#15803d', fontWeight: '500' }}>
                              {entry.type === 'partial_payment' ? `₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: '700' }}>
                              ₹{entry.trueBalance.toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                              {entry.note}
                              {entry.paymentMode && <div style={{fontSize: '0.7rem', color: '#1e293b', marginTop: '0.2rem'}}>Mode: {entry.paymentMode}</div>}
                              {entry.proofUrl && (
                                <div style={{marginTop: '0.2rem'}}>
                                  <a href={`${SERVER_URL}${entry.proofUrl}`} target="_blank" rel="noreferrer" style={{color: '#3b82f6', textDecoration: 'underline'}}>View Proof</a>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                              {entry.type !== 'opening' && (
                                <button
                                  onClick={() => deleteEntry(entry._id)}
                                  title="Delete this entry"
                                  style={{
                                    background: 'none', border: '1px solid #fecaca', borderRadius: '6px',
                                    cursor: 'pointer', padding: '0.25rem 0.5rem', color: '#dc2626',
                                    fontSize: '0.8rem', lineHeight: 1,
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                                >
                                  🗑
                                </button>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading ledger...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
