import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
  MapPin, Users, IndianRupee, Plus, Trash2, Receipt,
  ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, X
} from 'lucide-react';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function PlotPurchase() {
  const [plots, setPlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewPlot, setShowNewPlot] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [error, setError] = useState('');

  const [plotForm, setPlotForm] = useState({
    plotName: '', location: '', area: '', totalCost: '', registrationDate: '', notes: '',
    partners: [
      { name: '', sharePercent: 50 },
      { name: '', sharePercent: 50 }
    ]
  });

  const [paymentForm, setPaymentForm] = useState({
    paidBy: '', amount: '', date: new Date().toISOString().split('T')[0],
    transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: ''
  });

  const fetchPlots = async () => {
    try {
      const res = await axios.get(`${API_URL}/plots`);
      setPlots(res.data);
      if (res.data.length > 0 && !selectedPlot) setSelectedPlot(res.data[0]);
      else if (selectedPlot) {
        const updated = res.data.find(p => p._id === selectedPlot._id);
        if (updated) setSelectedPlot(updated);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load plots');
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlots(); }, []);

  // Computed stats per partner
  const getPartnerStats = (plot) => {
    return plot.partners.map(partner => {
      const paid = plot.payments
        .filter(p => p.paidBy === partner.name)
        .reduce((s, p) => s + p.amount, 0);
      return {
        ...partner,
        paid,
        pending: partner.shareAmount - paid,
        paidPercent: Math.min(100, Math.round((paid / partner.shareAmount) * 100))
      };
    });
  };

  const handleCreatePlot = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/plots`, {
        ...plotForm,
        totalCost: Number(plotForm.totalCost)
      });
      await fetchPlots();
      setSelectedPlot(res.data);
      setShowNewPlot(false);
      setPlotForm({ plotName: '', location: '', area: '', totalCost: '', registrationDate: '', notes: '', partners: [{ name: '', sharePercent: 50 }, { name: '', sharePercent: 50 }] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create plot');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/plots/${selectedPlot._id}/payments`, {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      });
      await fetchPlots();
      setShowAddPayment(false);
      setPaymentForm({ paidBy: '', amount: '', date: new Date().toISOString().split('T')[0], transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add payment');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}/payments/${paymentId}`);
      await fetchPlots();
    } catch (err) {
      setError('Failed to delete payment');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>🏞️ Plot Purchase</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track joint land purchase payments &amp; partner contributions</p>
        </div>
        <button onClick={() => setShowNewPlot(true)} style={{ background: 'var(--bg-sidebar)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
          <Plus size={16} /> New Plot
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>{error} <X size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} /></div>}

      {/* Plot selector tabs */}
      {plots.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {plots.map(p => (
            <button key={p._id} onClick={() => setSelectedPlot(p)}
              style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: '2px solid', borderColor: selectedPlot?._id === p._id ? 'var(--accent-primary)' : 'var(--border-color)', background: selectedPlot?._id === p._id ? 'rgba(99,102,241,0.1)' : 'transparent', color: selectedPlot?._id === p._id ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
              {p.plotName}
            </button>
          ))}
        </div>
      )}

      {/* No plots state */}
      {plots.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <MapPin size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>No plots yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Click "New Plot" to add your first joint plot purchase</p>
        </div>
      )}

      {/* Selected Plot Detail */}
      {selectedPlot && (() => {
        const partnerStats = getPartnerStats(selectedPlot);
        const totalPaid = selectedPlot.payments.reduce((s, p) => s + p.amount, 0);
        const totalPending = selectedPlot.totalCost - totalPaid;
        const overallPercent = Math.min(100, Math.round((totalPaid / selectedPlot.totalCost) * 100));

        return (
          <>
            {/* Plot info card */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <MapPin size={16} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedPlot.plotName}</span>
                  </div>
                  {selectedPlot.location && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedPlot.location}</div>}
                  {selectedPlot.area && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📐 {selectedPlot.area}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Cost</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{fmt(selectedPlot.totalCost)}</div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total paid: <strong style={{ color: '#15803d' }}>{fmt(totalPaid)}</strong></span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending: <strong style={{ color: '#b91c1c' }}>{fmt(totalPending)}</strong></span>
                </div>
                <div style={{ background: 'var(--border-color)', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${overallPercent}%`, height: '100%', background: 'linear-gradient(90deg, #15803d, #22c55e)', borderRadius: '100px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{overallPercent}% paid</div>
              </div>
            </div>

            {/* Partner Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {partnerStats.map((ps, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: `2px solid ${ps.pending <= 0 ? '#22c55e' : 'var(--border-color)'}`, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${i * 120}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      {ps.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ps.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ps.sharePercent}% share</div>
                    </div>
                    {ps.pending <= 0 && <CheckCircle2 size={18} color="#22c55e" style={{ marginLeft: 'auto' }} />}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[
                      { label: 'Total Share', val: fmt(ps.shareAmount), color: 'var(--text-main)' },
                      { label: 'Paid', val: fmt(ps.paid), color: '#15803d' },
                      { label: 'Pending', val: fmt(ps.pending), color: ps.pending > 0 ? '#b91c1c' : '#15803d' }
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: 'center', background: 'var(--bg-dark, #f8f9fa)', borderRadius: '8px', padding: '0.6rem 0.4rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Partner progress */}
                  <div style={{ background: 'var(--border-color)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${ps.paidPercent}%`, height: '100%', background: `hsl(${i * 120}, 60%, 45%)`, borderRadius: '100px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{ps.paidPercent}% paid</div>

                  {/* Partner payment history toggle */}
                  <button onClick={() => setExpandedPartner(expandedPartner === ps.name ? null : ps.name)}
                    style={{ marginTop: '0.75rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}>
                    {expandedPartner === ps.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expandedPartner === ps.name ? 'Hide' : 'View'} payments ({selectedPlot.payments.filter(p => p.paidBy === ps.name).length})
                  </button>

                  {expandedPartner === ps.name && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedPlot.payments.filter(p => p.paidBy === ps.name).sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => (
                        <div key={payment._id} style={{ background: 'var(--bg-dark, #f8f9fa)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#15803d' }}>{fmt(payment.amount)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {payment.paymentMode && <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>💳 {payment.paymentMode}</div>}
                          {payment.transactionId && <div style={{ color: 'var(--text-muted)' }}>Txn: {payment.transactionId}</div>}
                          {payment.notes && <div style={{ color: 'var(--text-muted)' }}>📝 {payment.notes}</div>}
                          {payment.proofUrl && <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem' }}><Receipt size={12} /> View Proof</a>}
                          <button onClick={() => handleDeletePayment(payment._id)}
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: '0.2rem' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {selectedPlot.payments.filter(p => p.paidBy === ps.name).length === 0 && (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem', fontSize: '0.8rem' }}>No payments yet</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* All payments table */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>All Transactions</h3>
                <button onClick={() => setShowAddPayment(true)}
                  style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  <Plus size={14} /> Add Payment
                </button>
              </div>

              {selectedPlot.payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payments recorded yet. Click "Add Payment" to start.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        {['Date', 'Paid By', 'Amount', 'Mode', 'Transaction ID', 'Notes', 'Proof', ''].map(h => (
                          <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedPlot.payments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => (
                        <tr key={payment._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{payment.paidBy}</td>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>{fmt(payment.amount)}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{payment.paymentMode || '—'}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{payment.transactionId || '—'}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payment.notes || '—'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {payment.proofUrl ? <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Receipt size={14} /> View</a> : '—'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button onClick={() => handleDeletePayment(payment._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-dark, #f8f9fa)' }}>
                        <td colSpan={2} style={{ padding: '0.75rem', fontWeight: 700 }}>Total Paid</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d' }}>{fmt(totalPaid)}</td>
                        <td colSpan={5} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── Modal: New Plot ─────────────────────────────────────────── */}
      {showNewPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add New Plot</h2>
              <button onClick={() => setShowNewPlot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreatePlot}>
              {[
                { label: 'Plot Name *', key: 'plotName', placeholder: 'e.g. Sy No 45, Shadnagar', required: true },
                { label: 'Location / Address', key: 'location', placeholder: 'Village, Mandal, District' },
                { label: 'Area', key: 'area', placeholder: 'e.g. 300 sq yards' },
                { label: 'Total Cost (₹) *', key: 'totalCost', type: 'number', placeholder: '12000000', required: true },
                { label: 'Registration Date', key: 'registrationDate', type: 'date' },
                { label: 'Notes', key: 'notes', placeholder: 'Any additional info' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={plotForm[f.key]} onChange={e => setPlotForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div style={{ margin: '1rem 0 0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> Partners</div>
              {plotForm.partners.map((partner, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Partner {i + 1} Name *</label>
                    <input required value={partner.name} placeholder={i === 0 ? 'Your name' : "Partner's name"}
                      onChange={e => {
                        const p = [...plotForm.partners]; p[i].name = e.target.value;
                        setPlotForm(f => ({ ...f, partners: p }));
                      }}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ minWidth: '90px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Share %</label>
                    <input type="number" min={0} max={100} value={partner.sharePercent}
                      onChange={e => {
                        const p = [...plotForm.partners]; p[i].sharePercent = Number(e.target.value);
                        setPlotForm(f => ({ ...f, partners: p }));
                      }}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ))}
              {plotForm.totalCost && (
                <div style={{ background: 'var(--bg-dark, #f8f9fa)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {plotForm.partners.map((p, i) => (
                    <div key={i}><strong>{p.name || `Partner ${i + 1}`}</strong>: {fmt(Math.round(Number(plotForm.totalCost) * p.sharePercent / 100))}</div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowNewPlot(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: 'var(--bg-sidebar)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Create Plot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Payment ─────────────────────────────────────── */}
      {showAddPayment && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Payment</h2>
              <button onClick={() => setShowAddPayment(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Paid By *</label>
                <select required value={paymentForm.paidBy} onChange={e => setPaymentForm(p => ({ ...p, paidBy: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  <option value="">Select partner</option>
                  {selectedPlot.partners.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              {[
                { label: 'Amount (₹) *', key: 'amount', type: 'number', placeholder: '500000', required: true },
                { label: 'Date *', key: 'date', type: 'date', required: true },
                { label: 'Transaction ID / UTR', key: 'transactionId', placeholder: 'Bank ref / UPI / Cheque no' },
                { label: 'Proof URL', key: 'proofUrl', placeholder: 'Link to receipt / screenshot' },
                { label: 'Notes', key: 'notes', placeholder: 'Any note about this payment' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={paymentForm[f.key]} onChange={e => setPaymentForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Payment Mode</label>
                <select value={paymentForm.paymentMode} onChange={e => setPaymentForm(p => ({ ...p, paymentMode: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'DD'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              {paymentForm.paidBy && paymentForm.amount && (
                <div style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {(() => {
                    const ps = getPartnerStats(selectedPlot).find(p => p.name === paymentForm.paidBy);
                    const newPending = ps ? ps.pending - Number(paymentForm.amount) : 0;
                    return ps ? <>After this payment: <strong style={{ color: newPending > 0 ? '#b91c1c' : '#15803d' }}>{fmt(Math.max(0, newPending))}</strong> pending for {paymentForm.paidBy}</> : null;
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddPayment(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#15803d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
