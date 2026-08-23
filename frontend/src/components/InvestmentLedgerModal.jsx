import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, TrendingDown, TrendingUp, Trash2, Zap } from 'lucide-react';
import { SERVER_URL } from '../config';

export default function InvestmentLedgerModal({ bill, onClose }) {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'invest',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Transfer',
    note: ''
  });

  const fetchLedger = async () => {
    try {
      const token = localStorage.getItem('token');
      // Try to fetch existing
      let res = await axios.get(`${SERVER_URL}/api/v1/investment-ledger/${bill._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLedger(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        // Init ledger if not found
        try {
          const token = localStorage.getItem('token');
          const initRes = await axios.post(`${SERVER_URL}/api/v1/investment-ledger/init`, {
            expenseId: bill._id,
            fundName: bill.details?.fundName || bill.title,
            initialAmount: 0,
            startDate: bill.details?.startDate
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setLedger(initRes.data.data);
        } catch (initErr) {
          console.error("Failed to init ledger:", initErr);
        }
      } else {
        console.error("Failed to fetch ledger:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [bill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      Object.entries(formData).forEach(([k, v]) => form.append(k, v));
      
      await axios.post(`${SERVER_URL}/api/v1/investment-ledger/${ledger._id}/entry`, form, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowAddForm(false);
      setFormData({
        type: 'invest',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'Bank Transfer',
        note: ''
      });
      fetchLedger();
    } catch (err) {
      console.error(err);
      alert('Failed to add transaction.');
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${SERVER_URL}/api/v1/investment-ledger/${ledger._id}/entry/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLedger();
    } catch (err) {
      console.error(err);
      alert('Failed to delete transaction.');
    }
  };

  const handleAutoGenerate = async () => {
    const startDate = bill.details?.startDate;
    const sipAmount = bill.amount;
    const frequency = bill.frequency || 'Monthly';

    if (!startDate) {
      alert('Please set a Start Date on this fund entry first (click Edit).');
      return;
    }
    if (!sipAmount || sipAmount <= 0) {
      alert('Invalid SIP amount.');
      return;
    }

    const confirm = window.confirm(
      `This will auto-generate one ${frequency.toLowerCase()} SIP entry of ₹${sipAmount.toLocaleString()} for every month from ${new Date(startDate).toLocaleDateString()} up to today.\n\nProceed?`
    );
    if (!confirm) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${SERVER_URL}/api/v1/investment-ledger/${ledger._id}/auto-generate`,
        { startDate, sipAmount, frequency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`✅ ${res.data.generated} entries generated successfully!`);
      fetchLedger();
    } catch (err) {
      console.error(err);
      alert('Failed to auto-generate entries.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-card" style={{
        background: 'var(--bg-main)', width: '100%', maxWidth: '700px',
        maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px',
        border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--glass-shadow)'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 10
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Merriweather, serif', color: 'var(--text-main)' }}>
              Investment Ledger
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {bill.title} • {bill.details?.fundName}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading ledger...</div>
          ) : !ledger ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Failed to load ledger.</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
                  borderRadius: '12px', padding: '1.5rem', color: 'white',
                  border: '1px solid #3b82f6', borderLeft: '4px solid #60a5fa'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>Total Invested Amount</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Merriweather, serif' }}>
                    ₹{ledger.totalInvested.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Transaction History</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAutoGenerate}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                    title="Auto-generate monthly SIP entries from start date to today"
                  >
                    <Zap size={15} /> Auto-Generate History
                  </button>
                  <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                  >
                    <Plus size={16} /> Add Transaction
                  </button>
                </div>
              </div>

              {showAddForm && (
                <form onSubmit={handleSubmit} style={{
                  background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', 
                  border: '1px solid var(--border-color)', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Type</label>
                      <select 
                        className="form-input" 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        required
                      >
                        <option value="invest">Invest (Deposit)</option>
                        <option value="withdraw">Withdraw (Redeem)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Amount (₹)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required 
                        min="1"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Payment Mode</label>
                      <select 
                        className="form-input" 
                        value={formData.paymentMode}
                        onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Note / Remarks (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      placeholder="e.g. Monthly SIP, Partial Withdrawal..."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setShowAddForm(false)} style={{
                      padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)',
                      borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)'
                    }}>Cancel</button>
                    <button type="submit" style={{
                      padding: '0.5rem 1rem', background: '#1e293b', color: 'white',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500'
                    }}>Save Transaction</button>
                  </div>
                </form>
              )}

              {ledger.entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No transactions recorded yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-card)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Type</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Amount</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Balance</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Note</th>
                        <th style={{ padding: '0.75rem', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.entries.map((entry, idx) => (
                        <tr key={entry._id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {entry.type === 'invest' || entry.type === 'opening' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-success)', background: 'rgba(34,197,94,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                                <TrendingUp size={14} /> Invested
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-danger)', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                                <TrendingDown size={14} /> Withdrawn
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '500', color: (entry.type === 'withdraw' ? 'var(--accent-danger)' : 'var(--accent-success)') }}>
                            {entry.type === 'withdraw' ? '-' : '+'}₹{entry.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-main)' }}>
                            ₹{entry.totalInvestedAfter.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                            {entry.note || '-'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button onClick={() => handleDelete(entry._id)} style={{
                              background: 'none', border: 'none', color: 'var(--accent-danger)',
                              cursor: 'pointer', padding: '0.25rem', opacity: 0.7
                            }} title="Delete transaction">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
