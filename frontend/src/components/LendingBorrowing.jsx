import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CheckCircle, ExternalLink, Calendar, Users, X } from 'lucide-react';
import LendingBorrowingModal from './LendingBorrowingModal';
import { API_URL } from '../config';

export default function LendingBorrowing() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [closingRecordId, setClosingRecordId] = useState(null);
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchRecords = async () => {
    try {
      const res = await axios.get(`${API_URL}/lending-borrowing`);
      setRecords(res.data);
    } catch (err) {
      setError('Failed to fetch records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await axios.delete(`${API_URL}/lending-borrowing/${id}`);
      fetchRecords();
    } catch (err) {
      alert("Error deleting record");
    }
  };

  const handleCloseTransaction = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/lending-borrowing/${closingRecordId}/close`, { endDate: closingDate });
      setClosingRecordId(null);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || "Error closing transaction");
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading records...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Lending & Borrowing</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Track complex borrowed-then-lent transactions with profit sharing</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> New Transaction
        </button>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {records.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No lending/borrowing records found.</p>
          </div>
        ) : records.map(record => (
          <div key={record._id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: `1px solid ${record.status === 'Closed' ? 'var(--accent-success)' : 'var(--border-color)'}`, overflow: 'hidden' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  background: record.status === 'Active' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(21, 128, 61, 0.1)', 
                  color: record.status === 'Active' ? '#3b82f6' : '#15803d', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {record.status}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} /> 
                  Started: {new Date(record.startDate).toLocaleDateString('en-GB')}
                  {record.endDate && ` • Closed: ${new Date(record.endDate).toLocaleDateString('en-GB')}`}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {record.status === 'Active' && (
                  <>
                    <button className="icon-btn" onClick={() => setClosingRecordId(record._id)} title="Close Transaction" style={{ color: '#15803d', background: 'rgba(21, 128, 61, 0.1)' }}>
                      <CheckCircle size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => { setEditingRecord(record); setIsModalOpen(true); }} title="Edit">
                      <ExternalLink size={16} />
                    </button>
                  </>
                )}
                <button className="icon-btn" onClick={() => handleDelete(record._id)} title="Delete" style={{ color: '#ef4444' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-danger)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Borrowed (Source)</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>From:</span>
                  <span style={{ fontWeight: '500' }}>{record.borrowedFrom}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Principal:</span>
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>₹{record.borrowedPrincipal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Interest:</span>
                  <span>{record.borrowedInterestRate}% ({record.borrowedInterestType})</span>
                </div>
                {record.status === 'Closed' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ color: 'var(--accent-danger)', fontSize: '0.9rem' }}>Interest Paid:</span>
                    <span style={{ fontWeight: '600', color: 'var(--accent-danger)' }}>₹{record.totalBorrowedInterest.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lent (Target)</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>To:</span>
                  <span style={{ fontWeight: '500' }}>{record.lentTo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Principal:</span>
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>₹{record.borrowedPrincipal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Interest:</span>
                  <span>{record.lentInterestRate}% ({record.lentInterestType})</span>
                </div>
                {record.status === 'Closed' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Interest Earned:</span>
                    <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>₹{record.totalLentInterest.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-dark)', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Partnership & Profit Split</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${record.partners.length}, 1fr)`, gap: '1rem' }}>
                {record.partners.map((p, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Invested: ₹{p.investmentAmount.toLocaleString('en-IN')}</div>
                    {record.status === 'Closed' && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent-success)', fontWeight: '600', fontSize: '1.1rem' }}>
                        + ₹{p.profitShareAmount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {record.status === 'Closed' && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', background: 'rgba(21, 128, 61, 0.1)', border: '1px dashed rgba(21, 128, 61, 0.3)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: '1rem' }}>Total Net Profit:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#15803d' }}>₹{record.totalProfit.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

      <LendingBorrowingModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }} 
        onSave={() => { setIsModalOpen(false); fetchRecords(); }} 
        existingRecord={editingRecord} 
      />

      {closingRecordId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Close Transaction</h2>
              <button className="icon-btn" onClick={() => setClosingRecordId(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCloseTransaction} style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Closing this transaction will calculate the final interest paid, interest earned, and automatically split the profit among partners based on their investments.
              </p>
              <div className="form-group">
                <label className="form-label">Closing Date</label>
                <input type="date" className="form-input" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ flex: 1, background: 'var(--bg-dark)' }} onClick={() => setClosingRecordId(null)}>Cancel</button>
                <button type="submit" className="btn" style={{ flex: 1, background: '#15803d', color: 'white' }}>Confirm Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
