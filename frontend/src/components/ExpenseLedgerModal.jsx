import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Paperclip, CheckCircle, Plus } from 'lucide-react';
import { SERVER_URL, API_URL } from '../config';

export default function ExpenseLedgerModal({ bill, onClose }) {
  const [historyData, setHistoryData] = useState({ records: [], totalPaid: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Use the existing history API logic from Bills.jsx
      const res = await axios.get(`${API_URL}/expenses/history`, {
        params: { title: bill.title, category: bill.category },
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to fetch expense ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [bill]);

  const handleUploadProof = async (recordId, file) => {
    if (!file) return;
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('paymentProof', file);
      await axios.put(`${API_URL}/expenses/${recordId}/attach-proof`, fd, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });
      // Refresh ledger
      fetchLedger();
    } catch (err) {
      console.error('Upload proof error:', err);
      alert('Failed to attach proof.');
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
              Expense Ledger
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {bill.title} • {bill.category}
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
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '12px', padding: '1.5rem', color: 'white',
                  border: '1px solid #34d399', borderLeft: '4px solid #6ee7b7'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>Total Paid All Time</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Merriweather, serif' }}>
                    ₹{historyData.totalPaid.toLocaleString()}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
                  borderRadius: '12px', padding: '1.5rem', color: 'white',
                  border: '1px solid #3b82f6', borderLeft: '4px solid #60a5fa'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>Instalments Paid</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Merriweather, serif' }}>
                    {historyData.count}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Payment History</h3>
              </div>

              {historyData.records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No payments recorded yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-card)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Date Paid</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Amount</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Payment Mode</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Remarks</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Show most recent first */}
                      {[...historyData.records].reverse().map((record) => (
                        <tr key={record._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>
                            {record.paidDate ? new Date(record.paidDate).toLocaleDateString() : new Date(record.dueDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-main)' }}>
                            ₹{(record.amount || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                            {record.paymentMode || '-'}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                            {record.remarks || '-'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {record.paymentProof ? (
                              <a
                                href={`${SERVER_URL}/${record.paymentProof.replace(/\\/g, '/')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View payment proof"
                                style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', textDecoration: 'none' }}
                              >
                                <Paperclip size={14} /> View
                              </a>
                            ) : (
                              <label style={{
                                color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                              }} title="Upload payment proof">
                                <Plus size={14} /> Attach Proof
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleUploadProof(record._id, e.target.files[0])}
                                />
                              </label>
                            )}
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
