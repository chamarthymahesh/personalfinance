import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, SERVER_URL } from '../config';

export default function HandLoanLedgerModal({ bill, onClose }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  
  const isTaken = bill.category?.toLowerCase().includes('taken');

  const [setupForm, setSetupForm] = useState({
    initialAmount: bill.amount || '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({ 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    note: '', 
    paymentMode: '', 
    transactionType: isTaken ? 'received' : 'given', 
    proofFile: null 
  });
  
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/hand-loans-ledger/${bill._id}`);
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
      const res = await axios.post(`${API_URL}/hand-loans-ledger`, {
        expenseId: bill._id,
        personName: bill.details?.personName || bill.title,
        initialAmount: parseFloat(setupForm.initialAmount),
        startDate: setupForm.startDate
      });
      setLedger(res.data);
      setShowSetup(false);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!entryId) return;
    try {
      const res = await axios.delete(`${API_URL}/hand-loans-ledger/${ledger._id}/entry/${String(entryId)}`);
      setLedger(res.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('amount', txForm.amount);
      formData.append('date', txForm.date);
      formData.append('note', txForm.note);
      formData.append('paymentMode', txForm.paymentMode);
      formData.append('transactionType', txForm.transactionType);
      
      if (txForm.proofFile) {
        formData.append('proofFile', txForm.proofFile);
      }

      const res = await axios.post(`${API_URL}/hand-loans-ledger/${ledger._id}/add-transaction`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setLedger(res.data);
      setShowAddTx(false);
      setTxForm({ 
        amount: '', 
        date: new Date().toISOString().split('T')[0], 
        note: '', 
        paymentMode: '', 
        transactionType: isTaken ? 'received' : 'given', 
        proofFile: null 
      });
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.65rem 1rem',
    border: '1px solid var(--border-color)', borderRadius: '8px',
    background: 'white', fontSize: '0.9rem', color: '#1e293b'
  };
  const labelStyle = { display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' };

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
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)',
          background: '#f0f9ff', flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontFamily: 'Merriweather, serif', fontSize: '1.3rem', margin: 0, color: '#0369a1' }}>
              Hand Loan Ledger
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#0ea5e9', marginTop: '0.2rem', fontWeight: 500 }}>
              {bill.details?.personName || bill.title} ({isTaken ? 'Taken' : 'Given'})
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #bae6fd', borderRadius: '6px',
            width: '32px', height: '32px', cursor: 'pointer', color: '#0369a1',
            fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
          {showSetup && (
            <div>
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Initialize the hand loan ledger for {bill.details?.personName || bill.title}.
              </div>
              <form onSubmit={createLedger}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>Opening Balance (₹)</label>
                    <input type="number" required style={inputStyle}
                      value={setupForm.initialAmount}
                      onChange={(e) => setSetupForm({ ...setupForm, initialAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Start Date</label>
                    <input type="date" required style={inputStyle}
                      value={setupForm.startDate}
                      onChange={(e) => setSetupForm({ ...setupForm, startDate: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" disabled={actionLoading} style={{
                  padding: '0.75rem 2rem', background: '#0284c7', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem'
                }}>
                  {actionLoading ? 'Creating...' : 'Initialize Ledger'}
                </button>
              </form>
            </div>
          )}

          {!showSetup && ledger && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Current Running Balance
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: ledger.currentBalance > 0 ? (isTaken ? '#dc2626' : '#15803d') : '#333' }}>
                    ₹{ledger.currentBalance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowAddTx(!showAddTx)}
                  style={{
                    padding: '0.6rem 1.25rem', background: '#e0f2fe', color: '#0369a1',
                    border: '1px solid #7dd3fc', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.85rem'
                  }}
                >
                  + Add Transaction
                </button>
              </div>

              {showAddTx && (
                <div style={{ padding: '1.25rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#0369a1' }}>New Transaction</div>
                  <form onSubmit={addTransaction}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Amount (₹)</label>
                        <input type="number" required style={inputStyle}
                          value={txForm.amount}
                          onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Type</label>
                        <select style={inputStyle}
                          value={txForm.transactionType}
                          onChange={(e) => setTxForm({ ...txForm, transactionType: e.target.value })}
                        >
                          <option value="given">Amount Given</option>
                          <option value="received">Amount Received</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Date</label>
                        <input type="date" required style={inputStyle}
                          value={txForm.date}
                          onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>Mode</label>
                        <select style={inputStyle}
                          value={txForm.paymentMode}
                          onChange={(e) => setTxForm({ ...txForm, paymentMode: e.target.value })}
                        >
                          <option value="">Select Mode</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Note (optional)</label>
                        <input type="text" style={inputStyle}
                          value={txForm.note}
                          onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" disabled={actionLoading} style={{
                        padding: '0.55rem 1.5rem', background: '#0284c7', color: 'white',
                        border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem'
                      }}>
                        {actionLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setShowAddTx(false)} style={{
                        padding: '0.55rem 1rem', background: 'white', color: '#64748b',
                        border: '1px solid var(--border-color)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.88rem'
                      }}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: '600', fontSize: '0.9rem' }}>
                  Transaction History ({ledger.entries.length} entries)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Type</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Amount</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Balance</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid var(--border-color)' }}>Details</th>
                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const reversedEntries = [...ledger.entries].reverse();
                        return reversedEntries.map((entry, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.7rem 1rem' }}>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '0.7rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '500',
                                background: entry.type === 'given' ? '#fef2f2' : entry.type === 'received' ? '#f0fdf4' : '#f1f5f9',
                                color: entry.type === 'given' ? '#991b1b' : entry.type === 'received' ? '#166534' : '#475569'
                              }}>
                                {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                              </span>
                            </td>
                            <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: '500', color: entry.type === 'given' ? '#991b1b' : entry.type === 'received' ? '#166534' : '#333' }}>
                              ₹{entry.amount.toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: '700' }}>
                              ₹{entry.balanceAfter.toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '0.7rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                              {entry.note}
                              {entry.paymentMode && <div style={{fontSize: '0.7rem', color: '#1e293b', marginTop: '0.2rem'}}>Mode: {entry.paymentMode}</div>}
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
