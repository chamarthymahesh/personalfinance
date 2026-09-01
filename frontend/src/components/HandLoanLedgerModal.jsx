import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function HandLoanLedgerModal({ bill, onClose }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const personName = bill.details?.personName || bill.title;
  const startDate = bill.dueDate
    ? new Date(bill.dueDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const defaultTx = () => ({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    paymentMode: '',
    transactionType: 'given',
    proofFile: null
  });

  const [txForm, setTxForm] = useState(defaultTx());

  const autoInitLedger = useCallback(async () => {
    try {
      const res = await axios.post(`${API_URL}/hand-loans-ledger`, {
        expenseId: bill._id,
        personName,
        initialAmount: 0,
        startDate
      });
      return res.data;
    } catch (err) {
      // If already exists (race), try to fetch it
      const res2 = await axios.get(`${API_URL}/hand-loans-ledger/${bill._id}`);
      return res2.data;
    }
  }, [bill._id, personName, startDate]);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/hand-loans-ledger/${bill._id}`);
      setLedger(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        // Auto-initialize silently (no setup form needed)
        try {
          const created = await autoInitLedger();
          setLedger(created);
          // Auto-show add-transaction for first use
          setShowAddTx(true);
        } catch (e2) {
          console.error('Failed to auto-init ledger', e2);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [bill._id, autoInitLedger]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!ledger) return;
    try {
      setActionLoading(true);
      const fd = new FormData();
      fd.append('amount', txForm.amount);
      fd.append('date', txForm.date);
      fd.append('note', txForm.note);
      fd.append('paymentMode', txForm.paymentMode);
      fd.append('transactionType', txForm.transactionType);
      if (txForm.proofFile) fd.append('proofFile', txForm.proofFile);

      let res;
      if (editingTxId) {
        res = await axios.put(
          `${API_URL}/hand-loans-ledger/${ledger._id}/entry/${editingTxId}`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        res = await axios.post(
          `${API_URL}/hand-loans-ledger/${ledger._id}/add-transaction`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      }
      setLedger(res.data);
      setShowAddTx(false);
      setEditingTxId(null);
      setTxForm(defaultTx());
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!entryId || !ledger) return;
    try {
      const res = await axios.delete(
        `${API_URL}/hand-loans-ledger/${ledger._id}/entry/${String(entryId)}`
      );
      setLedger(res.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const inp = {
    width: '100%', padding: '0.65rem 1rem',
    border: '1px solid var(--border-color)', borderRadius: '8px',
    background: 'white', fontSize: '0.9rem', color: '#1e293b'
  };
  const lbl = {
    display: 'block', fontSize: '0.78rem',
    color: 'var(--text-muted)', marginBottom: '0.4rem'
  };

  const balance = ledger?.currentBalance ?? 0;
  // Real transactions (exclude the silent opening-at-zero entry)
  const realEntries = (ledger?.entries || []).filter(
    e => !(e.type === 'opening' && e.amount === 0)
  );
  
  const openingEntry = (ledger?.entries || []).find(e => e.type === 'opening');
  const openingAmt = openingEntry ? openingEntry.amount : 0;
  
  const totalGiven = realEntries.filter(e => e.type === 'given').reduce((s, e) => s + e.amount, 0) + (openingAmt > 0 ? openingAmt : 0);
  const totalReceived = realEntries.filter(e => e.type === 'received').reduce((s, e) => s + e.amount, 0) + (openingAmt < 0 ? Math.abs(openingAmt) : 0);

  // ── Render ────────────────────────────────────────────────────────────────
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
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fffdf6', borderRadius: '14px', width: '740px',
          maxWidth: '95vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 70px rgba(0,0,0,0.3)', color: '#1e293b', overflow: 'hidden'
        }}
      >
        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg,#0369a1,#0ea5e9)', flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontFamily: 'Merriweather,serif', fontSize: '1.2rem', margin: 0, color: 'white' }}>
              ✋ Hand Loan — {personName}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.2rem' }}>
              {bill.category} · Started {startDate}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer',
            color: 'white', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Loading ledger…
            </div>
          ) : (
            <>
              {/* ── SUMMARY CARDS ─────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Given</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#b91c1c' }}>₹{totalGiven.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Received</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#15803d' }}>₹{totalReceived.toLocaleString('en-IN')}</div>
                </div>
                <div style={{
                  padding: '1rem',
                  background: balance > 0 ? '#e0f2fe' : balance < 0 ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${balance > 0 ? '#38bdf8' : balance < 0 ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: '10px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: balance > 0 ? '#0369a1' : balance < 0 ? '#991b1b' : '#64748b', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {balance > 0 ? 'Still Owed' : balance < 0 ? 'Overpaid' : 'Settled'}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: balance > 0 ? '#0369a1' : balance < 0 ? '#b91c1c' : '#475569' }}>
                    ₹{Math.abs(balance).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* ── ADD TRANSACTION BUTTON ────────────────────────────── */}
              <div style={{ marginBottom: '1rem' }}>
                <button
                  onClick={() => {
                    if (showAddTx || editingTxId) {
                      setShowAddTx(false);
                      setEditingTxId(null);
                      setTxForm(defaultTx());
                    } else {
                      setShowAddTx(true);
                    }
                  }}
                  style={{
                    padding: '0.65rem 1.4rem', background: (showAddTx || editingTxId) ? '#0284c7' : '#e0f2fe',
                    color: (showAddTx || editingTxId) ? 'white' : '#0369a1',
                    border: '1px solid #7dd3fc', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '700', fontSize: '0.9rem'
                  }}
                >
                  {(showAddTx || editingTxId) ? '× Cancel' : '+ Add Transaction'}
                </button>
              </div>

              {/* ── ADD TRANSACTION FORM ──────────────────────────────── */}
              {(showAddTx || editingTxId) && (
                <div style={{ padding: '1.25rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: '700', marginBottom: '1rem', color: '#0369a1', fontSize: '0.95rem' }}>
                    {editingTxId ? 'Edit Transaction' : 'New Transaction'}
                  </div>
                  <form onSubmit={addTransaction}>
                    {/* Row 1: Amount | Type | Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={lbl}>Amount (₹)</label>
                        <input
                          type="number" required min="0.01" step="0.01" style={inp}
                          value={txForm.amount}
                          onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label style={lbl}>Type</label>
                        <select style={inp}
                          value={txForm.transactionType}
                          onChange={e => setTxForm({ ...txForm, transactionType: e.target.value })}
                        >
                          <option value="given">💸 Amount Given (lent out)</option>
                          <option value="received">💰 Amount Received (returned)</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Date</label>
                        <input type="date" required style={inp}
                          value={txForm.date}
                          onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Row 2: Mode | Note | Proof File */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={lbl}>Payment Mode</label>
                        <select style={inp}
                          value={txForm.paymentMode}
                          onChange={e => setTxForm({ ...txForm, paymentMode: e.target.value })}
                        >
                          <option value="">Select Mode</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Note (optional)</label>
                        <input type="text" style={inp}
                          value={txForm.note}
                          onChange={e => setTxForm({ ...txForm, note: e.target.value })}
                          placeholder="e.g. For medical expenses"
                        />
                      </div>
                      <div>
                        <label style={lbl}>Payment Proof</label>
                        <input type="file" style={inp}
                          onChange={e => setTxForm({ ...txForm, proofFile: e.target.files[0] })}
                          accept="image/*,.pdf"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                      <button type="submit" disabled={actionLoading} style={{
                        padding: '0.6rem 1.75rem', background: '#0284c7', color: 'white',
                        border: 'none', borderRadius: '7px', cursor: 'pointer',
                        fontWeight: '700', fontSize: '0.9rem'
                      }}>
                        {actionLoading ? 'Saving…' : 'Save Transaction'}
                      </button>
                      <button type="button" onClick={() => { setShowAddTx(false); setEditingTxId(null); setTxForm(defaultTx()); }}
                        style={{ padding: '0.6rem 1rem', background: 'white', color: '#64748b', border: '1px solid var(--border-color)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.88rem' }}
                      >Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── TRANSACTION TABLE ─────────────────────────────────── */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Transaction History</span>
                  <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{realEntries.length} record{realEntries.length !== 1 ? 's' : ''}</span>
                </div>

                {realEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No transactions yet. Use "+ Add Transaction" to record the first one.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Date', 'Type', 'Amount', 'Balance After', 'Details', ''].map(h => (
                            <th key={h} style={{ padding: '0.7rem 1rem', textAlign: h === 'Amount' || h === 'Balance After' ? 'right' : 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...ledger.entries]
                          .filter(e => !(e.type === 'opening' && e.amount === 0))
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((entry, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap' }}>
                                {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.7rem 1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600',
                                  background: entry.type === 'given' ? '#fef2f2' : entry.type === 'received' ? '#f0fdf4' : '#f1f5f9',
                                  color: entry.type === 'given' ? '#991b1b' : entry.type === 'received' ? '#166534' : '#475569'
                                }}>
                                  {entry.type === 'given' ? '💸 Given' : entry.type === 'received' ? '💰 Received' : entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: '600',
                                color: entry.type === 'given' ? '#b91c1c' : entry.type === 'received' ? '#15803d' : '#1e293b' }}>
                                ₹{entry.amount.toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: '700', color: entry.balanceAfter > 0 ? '#0369a1' : '#475569' }}>
                                ₹{entry.balanceAfter.toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '0.7rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                                {entry.note && <div>{entry.note}</div>}
                                {entry.paymentMode && <div style={{ color: '#94a3b8', marginTop: '0.15rem' }}>via {entry.paymentMode}</div>}
                                {entry.proofUrl && (
                                  <div style={{ marginTop: '0.2rem' }}>
                                    <a href={`${API_URL}${entry.proofUrl}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none' }}>📎 View Proof</a>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                                {entry.type !== 'opening' && (
                                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                    <button
                                      onClick={() => {
                                        setEditingTxId(entry._id);
                                        setTxForm({
                                          amount: entry.amount,
                                          date: new Date(entry.date).toISOString().split('T')[0],
                                          note: entry.note || '',
                                          paymentMode: entry.paymentMode || '',
                                          transactionType: entry.type,
                                          proofFile: null
                                        });
                                      }}
                                      title="Edit entry"
                                      style={{
                                        background: 'none', border: '1px solid #bae6fd', borderRadius: '6px',
                                        cursor: 'pointer', padding: '0.2rem 0.45rem', color: '#0284c7',
                                        fontSize: '0.8rem', transition: 'background 0.15s'
                                      }}
                                      onMouseOver={e => e.currentTarget.style.background = '#f0f9ff'}
                                      onMouseOut={e => e.currentTarget.style.background = 'none'}
                                    >✎</button>
                                    <button
                                      onClick={() => deleteEntry(entry._id)}
                                      title="Delete entry"
                                      style={{
                                        background: 'none', border: '1px solid #fecaca', borderRadius: '6px',
                                        cursor: 'pointer', padding: '0.2rem 0.45rem', color: '#dc2626',
                                        fontSize: '0.8rem', transition: 'background 0.15s'
                                      }}
                                      onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                                      onMouseOut={e => e.currentTarget.style.background = 'none'}
                                    >🗑</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
