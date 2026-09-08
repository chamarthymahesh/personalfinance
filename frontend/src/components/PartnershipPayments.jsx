// PlotPurchase.jsx – Updated with edit, commission type handling, and other expenses
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL, SERVER_URL } from '../config';
import {
  MapPin, Users, Plus, Trash2, Receipt,
  ChevronDown, ChevronUp, CheckCircle2, X,
  Upload, UserCheck, IndianRupee, Eye
} from 'lucide-react';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const inputStyle = {
  width: '100%', padding: '0.6rem 0.75rem',
  border: '1px solid var(--border-color)', borderRadius: '8px',
  background: 'var(--bg-dark, #f8f9fa)', color: 'var(--text-main)',
  fontSize: '0.9rem', boxSizing: 'border-box'
};

const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' };

function FileUploadField({ label, value, onChange, existingFile }) {
  const ref = useRef();
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button type="button" onClick={() => ref.current.click()}
          style={{ padding: '0.5rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flex: 1 }}>
          <Upload size={14} />
          {value ? value.name : (existingFile ? '✅ File uploaded — click to replace' : 'Click to upload (JPG/PNG/PDF)')}
        </button>
        {existingFile && !value && (
          <a href={`${SERVER_URL}${existingFile}`} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            <Eye size={14} /> View
          </a>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => onChange(e.target.files[0])} />
    </div>
  );
}

export default function PlotPurchase() {
  const [plots, setPlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewPlot, setShowNewPlot] = useState(false);
  const [showEditPlot, setShowEditPlot] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [activeSection, setActiveSection] = useState('payments'); // payments | agents | expenses
  const [error, setError] = useState('');

  const [plotForm, setPlotForm] = useState({
    plotName: '', location: '', area: '', totalCost: '', registrationDate: '', notes: '',
    partners: [{ name: '', sharePercent: 50 }, { name: '', sharePercent: 50 }]
  });

  const [paymentForm, setPaymentForm] = useState({
    paidBy: '', amount: '', date: new Date().toISOString().split('T')[0],
    transactionId: '', paymentMode: 'Bank Transfer', notes: ''
  });
  const [paymentFile, setPaymentFile] = useState(null);

  const [agentForm, setAgentForm] = useState({
    agentName: '', commissionAmount: '', commissionType: 'fixed', commissionPercent: '', paidAmount: '0',
    paymentDate: '', transactionId: '', paymentMode: 'Bank Transfer', notes: ''
  });
  const [agentFile, setAgentFile] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    expenseType: '', amount: '', date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [expenseFile, setExpenseFile] = useState(null);

  // Fetch plots
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

  const getPartnerStats = (plot) => plot.partners.map(p => {
    const paid = plot.payments.filter(pay => pay.paidBy === p.name).reduce((s, pay) => s + pay.amount, 0);
    const shareAmount = Math.round(Number(plot.totalCost) * p.sharePercent / 100);
    const pending = shareAmount - paid;
    const paidPercent = Math.min(100, Math.round((paid / shareAmount) * 100) || 0);
    return { ...p, shareAmount, paid, pending, paidPercent };
  });

  // ----- Plot CRUD -----
  const handleCreatePlot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/plots`, { ...plotForm, totalCost: Number(plotForm.totalCost) });
      await fetchPlots();
      setShowNewPlot(false);
      setPlotForm({ plotName: '', location: '', area: '', totalCost: '', registrationDate: '', notes: '', partners: [{ name: '', sharePercent: 50 }, { name: '', sharePercent: 50 }] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create plot');
    }
  };

  const handleUpdatePlot = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/plots/${selectedPlot._id}`, { ...plotForm, totalCost: Number(plotForm.totalCost) });
      await fetchPlots();
      setShowEditPlot(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plot');
    }
  };

  // ----- Payments -----
  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(paymentForm).forEach(([k, v]) => fd.append(k, v));
      if (paymentFile) fd.append('proofFile', paymentFile);
      await axios.post(`${API_URL}/plots/${selectedPlot._id}/payments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchPlots();
      setShowAddPayment(false);
      setPaymentFile(null);
      setPaymentForm({ paidBy: '', amount: '', date: new Date().toISOString().split('T')[0], transactionId: '', paymentMode: 'Bank Transfer', notes: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add payment');
    }
  };

  const handleUpdatePayment = async (paymentId, updatedData, newFile) => {
    try {
      const fd = new FormData();
      Object.entries(updatedData).forEach(([k, v]) => fd.append(k, v));
      if (newFile) fd.append('proofFile', newFile);
      await axios.put(`${API_URL}/plots/${selectedPlot._id}/payments/${paymentId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchPlots();
    } catch (err) {
      setError('Failed to update payment');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}/payments/${paymentId}`);
      await fetchPlots();
    } catch { setError('Failed to delete payment'); }
  };

  // ----- Commission Agents -----
  const handleAddAgent = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(agentForm).forEach(([k, v]) => fd.append(k, v));
      if (agentFile) fd.append('proofFile', agentFile);
      await axios.post(`${API_URL}/plots/${selectedPlot._id}/agents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchPlots();
      setShowAddAgent(false);
      setAgentFile(null);
      setAgentForm({ agentName: '', commissionAmount: '', commissionType: 'fixed', commissionPercent: '', paidAmount: '0', paymentDate: '', transactionId: '', paymentMode: 'Bank Transfer', notes: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add agent');
    }
  };

  const handleUpdateAgent = async (agentId, updatedData, newFile) => {
    try {
      const fd = new FormData();
      Object.entries(updatedData).forEach(([k, v]) => fd.append(k, v));
      if (newFile) fd.append('proofFile', newFile);
      await axios.put(`${API_URL}/plots/${selectedPlot._id}/agents/${agentId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchPlots();
    } catch { setError('Failed to update agent'); }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Delete this agent?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}/agents/${agentId}`);
      await fetchPlots();
    } catch { setError('Failed to delete agent'); }
  };

  // ----- Other Expenses -----
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/plots/${selectedPlot._id}/expenses`, expenseForm);
      await fetchPlots();
      setShowAddExpense(false);
      setExpenseForm({ expenseType: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}/expenses/${expenseId}`);
      await fetchPlots();
    } catch { setError('Failed to delete expense'); }
  };

  const proofLink = (item) => {
    if (item.proofFile) return `${SERVER_URL}${item.proofFile}`;
    if (item.proofUrl) return item.proofUrl;
    return null;
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>🏞️ Plot Purchase</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track joint land purchase — partner payments, commissions, and misc expenses</p>
        </div>
        <button onClick={() => setShowNewPlot(true)}
          style={{ background: 'var(--bg-sidebar)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
          <Plus size={16} /> New Plot
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error} <X size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}

      {/* Plot tabs */}
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

      {plots.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <MapPin size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>No plots yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Click "New Plot" to add your first joint plot purchase</p>
        </div>
      )}

      {selectedPlot && (
        (() => {
          const partnerStats = getPartnerStats(selectedPlot);
          const totalPaid = selectedPlot.payments.reduce((s, p) => s + p.amount, 0);
          const totalPending = selectedPlot.totalCost - totalPaid;
          const overallPct = Math.min(100, Math.round((totalPaid / selectedPlot.totalCost) * 100));
          const totalCommission = (selectedPlot.commissionAgents || []).reduce((s, a) => s + a.commissionAmount, 0);
          const totalCommissionPaid = (selectedPlot.commissionAgents || []).reduce((s, a) => s + a.paidAmount, 0);
          const totalExpenses = (selectedPlot.otherExpenses || []).reduce((s, e) => s + e.amount, 0);

          return (
            <>
              {/* Plot summary */}
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
                <button onClick={() => { setPlotForm({ plotName: selectedPlot.plotName, location: selectedPlot.location || '', area: selectedPlot.area || '', totalCost: selectedPlot.totalCost, registrationDate: selectedPlot.registrationDate ? selectedPlot.registrationDate.split('T')[0] : '', notes: selectedPlot.notes || '', partners: selectedPlot.partners.map(p => ({ name: p.name, sharePercent: p.sharePercent })) }); setShowEditPlot(true); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Edit
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingRight: '4rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <MapPin size={16} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedPlot.plotName}</span>
                    </div>
                    {selectedPlot.location && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedPlot.location}</div>}
                    {selectedPlot.area && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📐 {selectedPlot.area}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', textAlign: 'right', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Cost</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmt(selectedPlot.totalCost)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Commission</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalCommissionPaid < totalCommission ? '#b91c1c' : '#15803d' }}>{fmt(totalCommission)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Other Expenses</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmt(totalExpenses)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Paid: <strong style={{ color: '#15803d' }}>{fmt(totalPaid)}</strong></span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending: <strong style={{ color: '#b91c1c' }}>{fmt(totalPending)}</strong></span>
                  </div>
                  <div style={{ background: 'var(--border-color)', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${overallPct}%`, height: '100%', background: 'linear-gradient(90deg,#15803d,#22c55e)', borderRadius: '100px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{overallPct}% paid</div>
                </div>
              </div>

              {/* Partner cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {partnerStats.map((ps, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: `2px solid ${ps.pending <= 0 ? '#22c55e' : 'var(--border-color)'}`, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${i * 120}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{ps.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{ps.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ps.sharePercent}% share</div>
                      </div>
                      {ps.pending <= 0 && <CheckCircle2 size={18} color="#22c55e" style={{ marginLeft: 'auto' }} />}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {[{ label: 'Total Share', val: fmt(ps.shareAmount), color: 'var(--text-main)' }, { label: 'Paid', val: fmt(ps.paid), color: '#15803d' }, { label: 'Pending', val: fmt(ps.pending), color: ps.pending > 0 ? '#b91c1c' : '#15803d' }].map(item => (
                        <div key={item.label} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '0.6rem 0.4rem' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{item.label}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: item.color }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'var(--border-color)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${ps.paidPercent}%`, height: '100%', background: `hsl(${i * 120}, 60%, 45%)`, borderRadius: '100px', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{ps.paidPercent}% paid</div>
                    <button onClick={() => setExpandedPartner(expandedPartner === ps.name ? null : ps.name)}
                      style={{ marginTop: '0.75rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}>
                      {expandedPartner === ps.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedPartner === ps.name ? 'Hide' : 'View'} payments ({selectedPlot.payments.filter(p => p.paidBy === ps.name).length})
                    </button>
                    {expandedPartner === ps.name && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPlot.payments.filter(p => p.paidBy === ps.name).sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => (
                          <div key={payment._id} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, color: '#15803d' }}>{fmt(payment.amount)}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {payment.paymentMode && <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>💳 {payment.paymentMode}</div>}
                            {payment.transactionId && <div style={{ color: 'var(--text-muted)' }}>Txn: {payment.transactionId}</div>}
                            {payment.notes && <div style={{ color: 'var(--text-muted)' }}>📝 {payment.notes}</div>}
                            {proofLink(payment) && <a href={proofLink(payment)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem' }}><Receipt size={12} /> View Proof</a>}
                            <button onClick={() => handleDeletePayment(payment._id)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: '0.2rem' }}><Trash2 size={13} /></button>
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

              {/* Section tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { key: 'payments', label: '💰 Payments', count: selectedPlot.payments.length },
                  { key: 'agents', label: '🤝 Commission Agents', count: (selectedPlot.commissionAgents || []).length },
                  { key: 'expenses', label: '📊 Other Expenses', count: (selectedPlot.otherExpenses || []).length }
                ].map(s => (
                  <button key={s.key} onClick={() => setActiveSection(s.key)}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid', borderColor: activeSection === s.key ? 'var(--accent-primary)' : 'var(--border-color)', background: activeSection === s.key ? 'rgba(99,102,241,0.1)' : 'transparent', color: activeSection === s.key ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                    {s.label} {s.count > 0 && <span style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '10px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', marginLeft: '0.25rem' }}>{s.count}</span>}
                  </button>
                ))}
              </div>

              {/* Payments Section */}
              {activeSection === 'payments' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>All Payments</h3>
                    <button onClick={() => setShowAddPayment(true)}
                      style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <Plus size={14} /> Add Payment
                    </button>
                  </div>
                  {selectedPlot.payments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payments recorded yet.</div>
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
                                {proofLink(payment) ? <a href={proofLink(payment)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}><Eye size={14} /> View</a> : '—'}
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                <button onClick={() => handleDeletePayment(payment._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><Trash2 size={14} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                            <td colSpan={2} style={{ padding: '0.75rem', fontWeight: 700 }}>Total Paid</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d' }}>{fmt(totalPaid)}</td>
                            <td colSpan={5} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Agents Section */}
              {activeSection === 'agents' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Commission Agents</h3>
                    <button onClick={() => setShowAddAgent(true)}
                      style={{ background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <Plus size={14} /> Add Agent
                    </button>
                  </div>
                  {(selectedPlot.commissionAgents || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No commission agents added yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedPlot.commissionAgents.map(agent => {
                        const pending = agent.commissionAmount - agent.paidAmount;
                        const pct = Math.min(100, Math.round((agent.paidAmount / agent.commissionAmount) * 100));
                        const agentProof = proofLink(agent);
                        return (
                          <div key={agent._id} style={{ border: `1px solid ${pending <= 0 ? '#22c55e' : 'var(--border-color)'}`, borderRadius: '10px', padding: '1rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserCheck size={18} color="#7e22ce" />
                                <strong style={{ fontSize: '1rem' }}>{agent.agentName}</strong>
                                {pending <= 0 && <CheckCircle2 size={16} color="#22c55e" />}
                              </div>
                              <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right', flexWrap: 'wrap' }}>
                                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Commission</div><div style={{ fontWeight: 700 }}>{fmt(agent.commissionAmount)}</div></div>
                                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Paid</div><div style={{ fontWeight: 700, color: '#15803d' }}>{fmt(agent.paidAmount)}</div></div>
                                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pending</div><div style={{ fontWeight: 700, color: pending > 0 ? '#b91c1c' : '#15803d' }}>{fmt(pending)}</div></div>
                              </div>
                            </div>
                            <div style={{ marginTop: '0.75rem', background: 'var(--border-color)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#7e22ce,#a855f7)', borderRadius: '100px', transition: 'width 0.5s' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              {agent.paymentMode && <span>💳 {agent.paymentMode}</span>}
                              {agent.transactionId && <span>Txn: {agent.transactionId}</span>}
                              {agent.paymentDate && <span>📅 {new Date(agent.paymentDate).toLocaleDateString('en-IN')}</span>}
                              {agent.notes && <span>📝 {agent.notes}</span>}
                              {agentProof && <a href={agentProof} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Eye size={12} /> Proof</a>}
                            </div>
                            <button onClick={() => handleDeleteAgent(agent._id)}
                              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><Trash2 size={14} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Expenses Section */}
              {activeSection === 'expenses' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Other Expenses</h3>
                    <button onClick={() => setShowAddExpense(true)}
                      style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <Plus size={14} /> Add Expense
                    </button>
                  </div>
                  {(selectedPlot.otherExpenses || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No other expenses recorded yet.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                            {['Date', 'Type', 'Amount', 'Notes', ''].map(h => (
                              <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedPlot.otherExpenses || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => (
                            <tr key={exp._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td style={{ padding: '0.75rem' }}>{exp.expenseType}</td>
                              <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d' }}>{fmt(exp.amount)}</td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.notes || '—'}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <button onClick={() => handleDeleteExpense(exp._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><Trash2 size={14} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </>
          );
        })()
      )}

      {/* ---------- Modals ---------- */}

      {/* New Plot Modal */}
      {showNewPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
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
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={plotForm[f.key]} onChange={e => setPlotForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div style={{ margin: '1rem 0 0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> Partners</div>
              {plotForm.partners.map((partner, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>Partner {i + 1} Name *</label>
                    <input required value={partner.name} placeholder={i === 0 ? 'Your name' : "Partner's name"}
                      onChange={e => { const p = [...plotForm.partners]; p[i].name = e.target.value; setPlotForm(f => ({ ...f, partners: p })); }}
                      style={inputStyle} />
                  </div>
                  <div style={{ minWidth: '90px' }}>
                    <label style={labelStyle}>Share %</label>
                    <input type="number" min={0} max={100} value={partner.sharePercent}
                      onChange={e => { const p = [...plotForm.partners]; p[i].sharePercent = Number(e.target.value); setPlotForm(f => ({ ...f, partners: p })); }}
                      style={inputStyle} />
                  </div>
                </div>
              ))}
              {plotForm.totalCost && (
                <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                  {plotForm.partners.map((p, i) => (
                    <div key={i} style={{ color: 'var(--text-muted)' }}>
                      <strong>{p.name || `Partner ${i + 1}`}</strong>: {fmt(Math.round(Number(plotForm.totalCost) * p.sharePercent / 100))}
                    </div>
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

      {/* Edit Plot Modal */}
      {showEditPlot && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Plot Details</h2>
              <button onClick={() => setShowEditPlot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdatePlot}>
              {[
                { label: 'Plot Name *', key: 'plotName', placeholder: 'e.g. Sy No 45, Shadnagar', required: true },
                { label: 'Location / Address', key: 'location', placeholder: 'Village, Mandal, District' },
                { label: 'Area', key: 'area', placeholder: 'e.g. 300 sq yards' },
                { label: 'Total Cost (₹) *', key: 'totalCost', type: 'number', placeholder: '12000000', required: true },
                { label: 'Registration Date', key: 'registrationDate', type: 'date' },
                { label: 'Notes', key: 'notes', placeholder: 'Any additional info' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={plotForm[f.key]} onChange={e => setPlotForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div style={{ margin: '1rem 0 0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> Partners</div>
              {plotForm.partners.map((partner, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>Partner {i + 1} Name *</label>
                    <input required value={partner.name} placeholder={i === 0 ? 'Your name' : "Partner's name"}
                      onChange={e => { const p = [...plotForm.partners]; p[i].name = e.target.value; setPlotForm(f => ({ ...f, partners: p })); }}
                      style={inputStyle} />
                  </div>
                  <div style={{ minWidth: '90px' }}>
                    <label style={labelStyle}>Share %</label>
                    <input type="number" min={0} max={100} value={partner.sharePercent}
                      onChange={e => { const p = [...plotForm.partners]; p[i].sharePercent = Number(e.target.value); setPlotForm(f => ({ ...f, partners: p })); }}
                      style={inputStyle} />
                  </div>
                </div>
              ))}
              {plotForm.totalCost && (
                <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                  {plotForm.partners.map((p, i) => (
                    <div key={i} style={{ color: 'var(--text-muted)' }}>
                      <strong>{p.name || `Partner ${i + 1}`}</strong>: {fmt(Math.round(Number(plotForm.totalCost) * p.sharePercent / 100))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditPlot(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: 'var(--bg-sidebar)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPayment && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Payment</h2>
              <button onClick={() => { setShowAddPayment(false); setPaymentFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Paid By *</label>
                <select required value={paymentForm.paidBy} onChange={e => setPaymentForm(p => ({ ...p, paidBy: e.target.value }))} style={inputStyle}>
                  <option value="">Select partner</option>
                  {selectedPlot.partners.map(p => (<option key={p.name} value={p.name}>{p.name}</option>))}
                </select>
              </div>
              {[
                { label: 'Amount (₹) *', key: 'amount', type: 'number', placeholder: '500000', required: true },
                { label: 'Date *', key: 'date', type: 'date', required: true },
                { label: 'Transaction ID / UTR', key: 'transactionId', placeholder: 'Bank ref / UPI / Cheque no' },
                { label: 'Notes', key: 'notes', placeholder: 'Any note' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={paymentForm[f.key]} onChange={e => setPaymentForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Payment Mode</label>
                <select value={paymentForm.paymentMode} onChange={e => setPaymentForm(p => ({ ...p, paymentMode: e.target.value }))} style={inputStyle}>
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'DD'].map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <FileUploadField label="Upload Proof (Receipt / Screenshot / PDF)" value={paymentFile} onChange={setPaymentFile} existingFile={null} />
              {paymentForm.paidBy && paymentForm.amount && (
                (() => {
                  const ps = getPartnerStats(selectedPlot).find(p => p.name === paymentForm.paidBy);
                  const newPending = ps ? ps.pending - Number(paymentForm.amount) : 0;
                  return ps ? (
                    <div style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      After this: <strong style={{ color: newPending > 0 ? '#b91c1c' : '#15803d' }}>{fmt(Math.max(0, newPending))}</strong> pending for {paymentForm.paidBy}
                    </div>
                  ) : null;
                })()
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowAddPayment(false); setPaymentFile(null); }} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#15803d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddAgent && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Commission Agent</h2>
              <button onClick={() => { setShowAddAgent(false); setAgentFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddAgent}>
              {[
                { label: "Agent Name *", key: 'agentName', placeholder: "Agent's full name", required: true },
                { label: "Commission Amount (₹) *", key: 'commissionAmount', type: 'number', placeholder: 'e.g. 150000', required: true },
                { label: "Commission Type", key: 'commissionType', placeholder: 'fixed or percentage' },
                { label: "Commission % (if percentage)", key: 'commissionPercent', type: 'number', placeholder: 'e.g. 5' },
                { label: "Amount Already Paid (₹)", key: 'paidAmount', type: 'number', placeholder: '0' },
                { label: "Payment Date", key: 'paymentDate', type: 'date' },
                { label: "Transaction ID / UTR", key: 'transactionId', placeholder: 'Bank ref / UPI / Cheque no' },
                { label: "Notes", key: 'notes', placeholder: 'Any note about this commission' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={agentForm[f.key]} onChange={e => setAgentForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Payment Mode</label>
                <select value={agentForm.paymentMode} onChange={e => setAgentForm(p => ({ ...p, paymentMode: e.target.value }))} style={inputStyle}>
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'DD'].map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <FileUploadField label="Upload Proof (Receipt / Screenshot / PDF)" value={agentFile} onChange={setAgentFile} existingFile={null} />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowAddAgent(false); setAgentFile(null); }} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Expense</h2>
              <button onClick={() => setShowAddExpense(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddExpense}>
              {[
                { label: 'Expense Type *', key: 'expenseType', placeholder: 'e.g. Registration Charge, Document Fee', required: true },
                { label: 'Amount (₹) *', key: 'amount', type: 'number', placeholder: '5000', required: true },
                { label: 'Date', key: 'date', type: 'date' },
                { label: 'Notes', key: 'notes', placeholder: 'Additional info' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={expenseForm[f.key]} onChange={e => setExpenseForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddExpense(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
