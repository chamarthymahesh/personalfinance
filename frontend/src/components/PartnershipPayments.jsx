import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL, SERVER_URL } from '../config';
import {
  MapPin, Users, Plus, Trash2, Receipt,
  ChevronDown, ChevronUp, CheckCircle2, X,
  Upload, UserCheck, IndianRupee, Eye, Edit, Tag, BookOpen
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
  
  // Modals state
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Edit state (holds the ID of the item being edited, or null if creating new)
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [expandedPartner, setExpandedPartner] = useState(null);
  const [activeSection, setActiveSection] = useState('payments'); // 'payments' | 'agents' | 'expenses'
  const [error, setError] = useState('');

  const [plotForm, setPlotForm] = useState({
    plotName: '', location: '', area: '', totalCost: '', registrationDate: '', notes: '',
    partners: [{ name: '', sharePercent: 50 }, { name: '', sharePercent: 50 }]
  });

  const [paymentForm, setPaymentForm] = useState({
    paidBy: '', amount: '', date: new Date().toISOString().split('T')[0],
    transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: ''
  });
  const [paymentFile, setPaymentFile] = useState(null);
  const [existingPaymentFile, setExistingPaymentFile] = useState('');

  const [agentForm, setAgentForm] = useState({
    agentName: '', commissionType: 'fixed', commissionPercentage: '', commissionAmount: '', paidAmount: '0', paidBy: '',
    paymentDate: '', transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: ''
  });
  const [agentFile, setAgentFile] = useState(null);
  const [existingAgentFile, setExistingAgentFile] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    expenseName: '', amount: '', date: new Date().toISOString().split('T')[0], paidBy: '',
    transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: ''
  });
  const [expenseFile, setExpenseFile] = useState(null);
  const [existingExpenseFile, setExistingExpenseFile] = useState('');

  const fetchPlots = async () => {
    try {
      const res = await axios.get(`${API_URL}/plots`);
      setPlots(res.data);
      if (res.data.length > 0 && !selectedPlot) {
        setSelectedPlot(res.data[0]);
      } else if (selectedPlot) {
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

  // --- Calculations ---
  
  const getProjectTotals = (plot) => {
    if (!plot) return { totalCost: 0, totalCommissions: 0, totalExpenses: 0, totalProjectCost: 0 };
    const totalCommissions = (plot.commissionAgents || []).reduce((s, a) => s + (a.commissionAmount || 0), 0);
    const totalExpenses = (plot.otherExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const totalProjectCost = plot.totalCost + totalCommissions + totalExpenses;
    return { totalCost: plot.totalCost, totalCommissions, totalExpenses, totalProjectCost };
  };

  const getPartnerStats = (plot) => {
    const { totalProjectCost } = getProjectTotals(plot);

    return plot.partners.map(partner => {
      // Amount paid towards the plot cost itself
      const plotPaid = plot.payments.filter(p => p.paidBy === partner.name).reduce((s, p) => s + p.amount, 0);
      // Commission paid by this partner
      const commPaid = (plot.commissionAgents || []).filter(a => a.paidBy === partner.name).reduce((s, a) => s + (a.paidAmount || 0), 0);
      // Other expenses paid by this partner
      const expPaid = (plot.otherExpenses || []).filter(e => e.paidBy === partner.name).reduce((s, e) => s + (e.amount || 0), 0);
      
      const totalPaidByPartner = plotPaid + commPaid + expPaid;
      const shareAmount = Math.round(totalProjectCost * (partner.sharePercent / 100));
      const pending = shareAmount - totalPaidByPartner;
      
      return { 
        ...partner, 
        shareAmount, 
        paid: totalPaidByPartner, 
        pending, 
        paidPercent: shareAmount > 0 ? Math.min(100, Math.round((totalPaidByPartner / shareAmount) * 100)) : 0
      };
    });
  };

  // --- Plot Handlers ---

  const openPlotModal = (editMode = false) => {
    if (editMode && selectedPlot) {
      setPlotForm({
        plotName: selectedPlot.plotName,
        location: selectedPlot.location || '',
        area: selectedPlot.area || '',
        totalCost: selectedPlot.totalCost,
        registrationDate: selectedPlot.registrationDate ? new Date(selectedPlot.registrationDate).toISOString().split('T')[0] : '',
        notes: selectedPlot.notes || '',
        partners: selectedPlot.partners.map(p => ({ name: p.name, sharePercent: p.sharePercent }))
      });
    } else {
      setPlotForm({ plotName: '', location: '', area: '', totalCost: '', registrationDate: '', notes: '', partners: [{ name: '', sharePercent: 50 }, { name: '', sharePercent: 50 }] });
    }
    setShowPlotModal(true);
  };

  const handleSavePlot = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...plotForm, totalCost: Number(plotForm.totalCost) };
      if (selectedPlot && plotForm.plotName === selectedPlot.plotName && plotForm.totalCost === selectedPlot.totalCost) { // Simple heuristic for edit vs create if we just use the modal for both. A better way is checking if it's an edit via a flag.
        // Actually, we should use a flag. Let's assume if selectedPlot is not null AND we clicked edit, we do PUT.
        // But the button "New Plot" vs "Edit" determines this.
        // Let's rely on the modal opening context. For safety, if we have selectedPlot and we are editing, we call PUT.
        // Wait, "New Plot" sets selectedPlot? No, it just shows modal. Let's add isEditingPlot state if needed, or just check the button clicked.
        // For now, I'll update the `openPlotModal` to use `selectedPlot` if editing. But what if we just pass a boolean `isEdit`?
      }
      
      if (showPlotModal === 'edit') {
         await axios.put(`${API_URL}/plots/${selectedPlot._id}`, payload);
      } else {
         const res = await axios.post(`${API_URL}/plots`, payload);
         setSelectedPlot(res.data); // Switch to new plot
      }
      
      await fetchPlots();
      setShowPlotModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save plot');
    }
  };

  const handleDeletePlot = async () => {
    if(!window.confirm('Are you sure you want to delete this entire plot and all its data?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}`);
      setSelectedPlot(null);
      await fetchPlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete plot');
    }
  }

  // --- Payment Handlers ---

  const openPaymentModal = (payment = null) => {
    if (payment) {
      setEditingPaymentId(payment._id);
      setPaymentForm({
        paidBy: payment.paidBy, amount: payment.amount, 
        date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : '',
        transactionId: payment.transactionId || '', paymentMode: payment.paymentMode || 'Bank Transfer', 
        proofUrl: payment.proofUrl || '', notes: payment.notes || ''
      });
      setExistingPaymentFile(payment.proofFile || '');
    } else {
      setEditingPaymentId(null);
      setPaymentForm({ paidBy: '', amount: '', date: new Date().toISOString().split('T')[0], transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: '' });
      setExistingPaymentFile('');
    }
    setPaymentFile(null);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(paymentForm).forEach(([k, v]) => fd.append(k, v));
      if (paymentFile) fd.append('proofFile', paymentFile);
      
      if (editingPaymentId) {
        await axios.put(`${API_URL}/plots/${selectedPlot._id}/payments/${editingPaymentId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API_URL}/plots/${selectedPlot._id}/payments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await fetchPlots();
      setShowPaymentModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}/payments/${paymentId}`);
      await fetchPlots();
    } catch { setError('Failed to delete payment'); }
  };

  // --- Agent Handlers ---

  const openAgentModal = (agent = null) => {
    if (agent) {
      setEditingAgentId(agent._id);
      setAgentForm({
        agentName: agent.agentName, 
        commissionType: agent.commissionType || 'fixed', 
        commissionPercentage: agent.commissionPercentage || '', 
        commissionAmount: agent.commissionAmount, 
        paidAmount: agent.paidAmount || 0, 
        paidBy: agent.paidBy || '',
        paymentDate: agent.paymentDate ? new Date(agent.paymentDate).toISOString().split('T')[0] : '', 
        transactionId: agent.transactionId || '', 
        paymentMode: agent.paymentMode || 'Bank Transfer', 
        proofUrl: agent.proofUrl || '', 
        notes: agent.notes || ''
      });
      setExistingAgentFile(agent.proofFile || '');
    } else {
      setEditingAgentId(null);
      setAgentForm({ agentName: '', commissionType: 'fixed', commissionPercentage: '', commissionAmount: '', paidAmount: '0', paidBy: '', paymentDate: '', transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: '' });
      setExistingAgentFile('');
    }
    setAgentFile(null);
    setShowAgentModal(true);
  };

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(agentForm).forEach(([k, v]) => fd.append(k, v));
      if (agentFile) fd.append('proofFile', agentFile);
      
      if (editingAgentId) {
        await axios.put(`${API_URL}/plots/${selectedPlot._id}/agents/${editingAgentId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API_URL}/plots/${selectedPlot._id}/agents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await fetchPlots();
      setShowAgentModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save agent');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Delete this agent?')) return;
    try {
      await axios.delete(`${API_URL}/plots/${selectedPlot._id}/agents/${agentId}`);
      await fetchPlots();
    } catch { setError('Failed to delete agent'); }
  };

  // --- Other Expenses Handlers ---

  const openExpenseModal = (expense = null) => {
    if (expense) {
      setEditingExpenseId(expense._id);
      setExpenseForm({
        expenseName: expense.expenseName, amount: expense.amount, 
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
        paidBy: expense.paidBy || '', transactionId: expense.transactionId || '', 
        paymentMode: expense.paymentMode || 'Bank Transfer', proofUrl: expense.proofUrl || '', notes: expense.notes || ''
      });
      setExistingExpenseFile(expense.proofFile || '');
    } else {
      setEditingExpenseId(null);
      setExpenseForm({ expenseName: '', amount: '', date: new Date().toISOString().split('T')[0], paidBy: '', transactionId: '', paymentMode: 'Bank Transfer', proofUrl: '', notes: '' });
      setExistingExpenseFile('');
    }
    setExpenseFile(null);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(expenseForm).forEach(([k, v]) => fd.append(k, v));
      if (expenseFile) fd.append('proofFile', expenseFile);
      
      if (editingExpenseId) {
        await axios.put(`${API_URL}/plots/${selectedPlot._id}/expenses/${editingExpenseId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API_URL}/plots/${selectedPlot._id}/expenses`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await fetchPlots();
      setShowExpenseModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense');
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
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track joint land purchase — partner payments, commissions &amp; extra expenses</p>
        </div>
        <button onClick={() => { setShowPlotModal('new'); }}
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

      {selectedPlot && (() => {
        const partnerStats = getPartnerStats(selectedPlot);
        const totals = getProjectTotals(selectedPlot);
        
        // Total payments made directly towards the plot
        const plotPaid = selectedPlot.payments.reduce((s, p) => s + p.amount, 0);
        // Overall paid for the entire project
        const overallPaid = partnerStats.reduce((s, p) => s + p.paid, 0);
        const overallPending = totals.totalProjectCost - overallPaid;
        const overallPercent = totals.totalProjectCost > 0 ? Math.min(100, Math.round((overallPaid / totals.totalProjectCost) * 100)) : 0;

        return (
          <>
            {/* Plot info + overall progress */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
              
              {/* Plot Edit & Delete Actions */}
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowPlotModal('edit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit Plot Details"><Edit size={16} /></button>
                <button onClick={handleDeletePlot} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }} title="Delete Plot"><Trash2 size={16} /></button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingRight: '4rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <MapPin size={18} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{selectedPlot.plotName}</span>
                  </div>
                  {selectedPlot.location && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📍 {selectedPlot.location}</div>}
                  {selectedPlot.area && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📐 {selectedPlot.area}</div>}
                </div>
                
                <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right', flexWrap: 'wrap', background: 'rgba(0,0,0,0.02)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Plot Value</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{fmt(totals.totalCost)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+ Comm & Exp</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{fmt(totals.totalCommissions + totals.totalExpenses)}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 600 }}>Total Project Cost</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{fmt(totals.totalProjectCost)}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Funded: <strong style={{ color: '#15803d' }}>{fmt(overallPaid)}</strong></span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining Needed: <strong style={{ color: '#b91c1c' }}>{fmt(overallPending)}</strong></span>
                </div>
                <div style={{ background: 'var(--border-color)', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${overallPercent}%`, height: '100%', background: 'linear-gradient(90deg,#15803d,#22c55e)', borderRadius: '100px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{overallPercent}% funded</div>
              </div>
            </div>

            {/* Partner Cards */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={18} /> Partner Contributions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {partnerStats.map((ps, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: `2px solid ${ps.pending <= 0 ? '#22c55e' : 'var(--border-color)'}`, padding: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${i * 130 + 40}, 70%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                      {ps.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{ps.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-dark, #f1f5f9)', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.2rem' }}>{ps.sharePercent}% Share</div>
                    </div>
                    {ps.pending <= 0 && <CheckCircle2 size={24} color="#22c55e" style={{ marginLeft: 'auto' }} />}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[
                      { label: 'Total Resp.', val: fmt(ps.shareAmount), color: 'var(--text-main)' },
                      { label: 'Contributed', val: fmt(ps.paid), color: '#15803d' },
                      { label: 'Due', val: fmt(ps.pending), color: ps.pending > 0 ? '#b91c1c' : '#15803d' }
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.2rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--border-color)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${ps.paidPercent}%`, height: '100%', background: `hsl(${i * 130 + 40}, 70%, 45%)`, borderRadius: '100px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Section tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
              {[
                { key: 'payments', label: '💰 Plot Payments', count: selectedPlot.payments.length },
                { key: 'agents', label: '🤝 Commissions', count: (selectedPlot.commissionAgents || []).length },
                { key: 'expenses', label: '📑 Other Expenses', count: (selectedPlot.otherExpenses || []).length }
              ].map(s => (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: activeSection === s.key ? 'var(--bg-sidebar)' : 'transparent', color: activeSection === s.key ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                  {s.label} {s.count > 0 && <span style={{ background: activeSection === s.key ? 'rgba(255,255,255,0.2)' : 'var(--border-color)', color: activeSection === s.key ? '#fff' : 'var(--text-main)', borderRadius: '10px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', marginLeft: '0.4rem' }}>{s.count}</span>}
                </button>
              ))}
            </div>

            {/* ── Payments Section ── */}
            {activeSection === 'payments' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Payments towards Plot Cost</h3>
                  <button onClick={() => openPaymentModal()}
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
                        <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-dark, #f8f9fa)' }}>
                          {['Date', 'Paid By', 'Amount', 'Mode', 'Transaction ID', 'Notes', 'Proof', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
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
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={payment.notes}>{payment.notes || '—'}</td>
                            <td style={{ padding: '0.75rem' }}>
                              {proofLink(payment) ? <a href={proofLink(payment)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}><Eye size={14} /> View</a> : '—'}
                            </td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                              <button onClick={() => openPaymentModal(payment)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginRight: '0.5rem' }}><Edit size={14} /></button>
                              <button onClick={() => handleDeletePayment(payment._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                          <td colSpan={2} style={{ padding: '0.75rem', fontWeight: 700 }}>Total Paid for Plot</td>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d' }}>{fmt(plotPaid)}</td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Commission Agents Section ── */}
            {activeSection === 'agents' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Commission Agents</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Total Comm: {fmt(totals.totalCommissions)}
                    </div>
                  </div>
                  <button onClick={() => openAgentModal()}
                    style={{ background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    <Plus size={14} /> Add Agent
                  </button>
                </div>

                {(selectedPlot.commissionAgents || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No commission agents added yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    {selectedPlot.commissionAgents.map(agent => {
                      const pending = agent.commissionAmount - agent.paidAmount;
                      const pct = Math.min(100, Math.round((agent.paidAmount / agent.commissionAmount) * 100));
                      const agentProof = proofLink(agent);
                      return (
                        <div key={agent._id} style={{ border: `1px solid ${pending <= 0 ? '#22c55e' : 'var(--border-color)'}`, borderRadius: '10px', padding: '1.25rem', position: 'relative', background: 'var(--bg-dark, #f8f9fa)' }}>
                          
                          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => openAgentModal(agent)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit size={14} /></button>
                            <button onClick={() => handleDeleteAgent(agent._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><Trash2 size={14} /></button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <UserCheck size={18} color="#7e22ce" />
                            <strong style={{ fontSize: '1.05rem' }}>{agent.agentName}</strong>
                            {pending <= 0 && <CheckCircle2 size={16} color="#22c55e" />}
                          </div>
                          
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ background: 'var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {agent.commissionType === 'percentage' ? `${agent.commissionPercentage}% of Plot` : 'Fixed Amount'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Commission</div><div style={{ fontWeight: 700 }}>{fmt(agent.commissionAmount)}</div></div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Paid</div><div style={{ fontWeight: 700, color: '#15803d' }}>{fmt(agent.paidAmount)}</div></div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pending</div><div style={{ fontWeight: 700, color: pending > 0 ? '#b91c1c' : '#15803d' }}>{fmt(pending)}</div></div>
                          </div>

                          {agent.paidAmount > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Paid By:</span> {agent.paidBy || 'Not specified'} 
                              {agent.paymentDate && <span style={{ marginLeft: 'auto' }}>📅 {new Date(agent.paymentDate).toLocaleDateString('en-IN')}</span>}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                            {agent.paymentMode && <span>💳 {agent.paymentMode}</span>}
                            {agent.transactionId && <span>Txn: {agent.transactionId}</span>}
                            {agentProof && <a href={agentProof} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Eye size={12} /> Proof</a>}
                          </div>
                          {agent.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>📝 {agent.notes}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Other Expenses Section ── */}
            {activeSection === 'expenses' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Other Expenses</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Registration, Legal, Misc fees shared by partners</div>
                  </div>
                  <button onClick={() => openExpenseModal()}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    <Plus size={14} /> Add Expense
                  </button>
                </div>

                {(selectedPlot.otherExpenses || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No other expenses recorded.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-dark, #f8f9fa)' }}>
                          {['Date', 'Expense Type', 'Paid By', 'Amount', 'Mode', 'Transaction ID', 'Proof', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedPlot.otherExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => (
                          <tr key={exp._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>{exp.expenseName}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{exp.paidBy}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, color: '#b91c1c', whiteSpace: 'nowrap' }}>{fmt(exp.amount)}</td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{exp.paymentMode || '—'}</td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{exp.transactionId || '—'}</td>
                            <td style={{ padding: '0.75rem' }}>
                              {proofLink(exp) ? <a href={proofLink(exp)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}><Eye size={14} /> View</a> : '—'}
                            </td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                              <button onClick={() => openExpenseModal(exp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginRight: '0.5rem' }}><Edit size={14} /></button>
                              <button onClick={() => handleDeleteExpense(exp._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                          <td colSpan={3} style={{ padding: '0.75rem', fontWeight: 700 }}>Total Expenses</td>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>{fmt(totals.totalExpenses)}</td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

          </>
        );
      })()}

      {/* ── Modal: New/Edit Plot ─────────────────────────────────────────────── */}
      {showPlotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{showPlotModal === 'edit' ? 'Edit Plot Details' : 'Add New Plot'}</h2>
              <button onClick={() => setShowPlotModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePlot}>
              {[
                { label: 'Plot Name *', key: 'plotName', placeholder: 'e.g. Sy No 45, Shadnagar', required: true },
                { label: 'Location / Address', key: 'location', placeholder: 'Village, Mandal, District' },
                { label: 'Area', key: 'area', placeholder: 'e.g. 300 sq yards' },
                { label: 'Total Cost of Plot (₹) *', key: 'totalCost', type: 'number', placeholder: '12000000', required: true },
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Define the ownership split. Total percentage must equal 100%.</div>
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
                  <div style={{ marginBottom: '0.4rem', fontWeight: 600, color: 'var(--text-main)' }}>Share breakdown (Plot cost only):</div>
                  {plotForm.partners.map((p, i) => (
                    <div key={i} style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{p.name || `Partner ${i + 1}`}</strong> ({p.sharePercent || 0}%):</span>
                      <span>{fmt(Math.round(Number(plotForm.totalCost) * (p.sharePercent||0) / 100))}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowPlotModal(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: 'var(--bg-sidebar)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>{showPlotModal === 'edit' ? 'Save Changes' : 'Create Plot'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add/Edit Payment ──────────────────────────────────────────── */}
      {showPaymentModal && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{editingPaymentId ? 'Edit Payment' : 'Add Plot Payment'}</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Paid By (Partner) *</label>
                <select required value={paymentForm.paidBy} onChange={e => setPaymentForm(p => ({ ...p, paidBy: e.target.value }))} style={inputStyle}>
                  <option value="">Select partner</option>
                  {selectedPlot.partners.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Amount (₹) *', key: 'amount', type: 'number', placeholder: '500000', required: true },
                { label: 'Payment Date *', key: 'date', type: 'date', required: true },
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
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'DD'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <FileUploadField label="Upload Proof (Receipt / Screenshot / PDF)" value={paymentFile} onChange={setPaymentFile} existingFile={existingPaymentFile} />

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#15803d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add/Edit Commission Agent ─────────────────────────────────── */}
      {showAgentModal && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{editingAgentId ? 'Edit Commission Agent' : 'Add Commission Agent'}</h2>
              <button onClick={() => setShowAgentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAgent}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Agent Name *</label>
                <input required value={agentForm.agentName} placeholder="Agent's full name" onChange={e => setAgentForm(p => ({ ...p, agentName: e.target.value }))} style={inputStyle} />
              </div>
              
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', background: 'var(--bg-dark, #f8f9fa)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Commission Details</h4>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="radio" name="commType" value="fixed" checked={agentForm.commissionType === 'fixed'} 
                      onChange={() => setAgentForm(p => ({ ...p, commissionType: 'fixed', commissionPercentage: '' }))} />
                    Fixed Amount
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="radio" name="commType" value="percentage" checked={agentForm.commissionType === 'percentage'} 
                      onChange={() => setAgentForm(p => ({ ...p, commissionType: 'percentage', commissionAmount: '' }))} />
                    Percentage of Plot Cost
                  </label>
                </div>

                {agentForm.commissionType === 'percentage' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>Percentage (%) *</label>
                      <input type="number" step="0.01" required value={agentForm.commissionPercentage} 
                        onChange={e => {
                          const pct = e.target.value;
                          const amt = pct ? Math.round((Number(pct) / 100) * selectedPlot.totalCost) : '';
                          setAgentForm(p => ({ ...p, commissionPercentage: pct, commissionAmount: amt }));
                        }} style={inputStyle} placeholder="e.g. 2" />
                    </div>
                    <div>
                      <label style={labelStyle}>Calculated Amount (₹)</label>
                      <input readOnly value={agentForm.commissionAmount ? fmt(agentForm.commissionAmount) : ''} style={{ ...inputStyle, background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Commission Amount (₹) *</label>
                    <input type="number" required value={agentForm.commissionAmount} onChange={e => setAgentForm(p => ({ ...p, commissionAmount: e.target.value }))} style={inputStyle} placeholder="e.g. 150000" />
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', background: 'var(--bg-dark, #f8f9fa)' }}>
                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Payment Details (Optional)</h4>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Amount Paid So Far (₹)</label>
                      <input type="number" value={agentForm.paidAmount} onChange={e => setAgentForm(p => ({ ...p, paidAmount: e.target.value }))} style={inputStyle} placeholder="0" />
                    </div>
                    <div>
                      <label style={labelStyle}>Paid By (Partner)</label>
                      <select value={agentForm.paidBy} onChange={e => setAgentForm(p => ({ ...p, paidBy: e.target.value }))} style={inputStyle}>
                        <option value="">-- Select --</option>
                        {selectedPlot.partners.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Date Paid</label>
                      <input type="date" value={agentForm.paymentDate} onChange={e => setAgentForm(p => ({ ...p, paymentDate: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Payment Mode</label>
                      <select value={agentForm.paymentMode} onChange={e => setAgentForm(p => ({ ...p, paymentMode: e.target.value }))} style={inputStyle}>
                        {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'DD'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                 </div>

                 <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Transaction ID / UTR</label>
                    <input type="text" value={agentForm.transactionId} onChange={e => setAgentForm(p => ({ ...p, transactionId: e.target.value }))} style={inputStyle} placeholder="Bank ref / UPI / Cheque no" />
                 </div>
                 
                 <FileUploadField label="Upload Payment Proof" value={agentFile} onChange={setAgentFile} existingFile={existingAgentFile} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Notes</label>
                <input type="text" value={agentForm.notes} onChange={e => setAgentForm(p => ({ ...p, notes: e.target.value }))} style={inputStyle} placeholder="Any notes..." />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAgentModal(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add/Edit Other Expense ─────────────────────────────────── */}
      {showExpenseModal && selectedPlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{editingExpenseId ? 'Edit Expense' : 'Add Other Expense'}</h2>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Expense Type *</label>
                <input required list="expenseTypes" value={expenseForm.expenseName} placeholder="e.g. Registration Charges" onChange={e => setExpenseForm(p => ({ ...p, expenseName: e.target.value }))} style={inputStyle} />
                <datalist id="expenseTypes">
                  <option value="Registration Charges" />
                  <option value="Document Charges" />
                  <option value="Legal Fees" />
                  <option value="Brokerage" />
                  <option value="Miscellaneous" />
                </datalist>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Paid By (Partner) *</label>
                <select required value={expenseForm.paidBy} onChange={e => setExpenseForm(p => ({ ...p, paidBy: e.target.value }))} style={inputStyle}>
                  <option value="">Select partner</option>
                  {selectedPlot.partners.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Amount (₹) *', key: 'amount', type: 'number', placeholder: '50000', required: true },
                { label: 'Payment Date *', key: 'date', type: 'date', required: true },
                { label: 'Transaction ID / UTR', key: 'transactionId', placeholder: 'Bank ref / UPI / Cheque no' },
                { label: 'Notes', key: 'notes', placeholder: 'Any note' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} placeholder={f.placeholder}
                    value={expenseForm[f.key]} onChange={e => setExpenseForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Payment Mode</label>
                <select value={expenseForm.paymentMode} onChange={e => setExpenseForm(p => ({ ...p, paymentMode: e.target.value }))} style={inputStyle}>
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'DD'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <FileUploadField label="Upload Proof (Receipt / Document / PDF)" value={expenseFile} onChange={setExpenseFile} existingFile={existingExpenseFile} />

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
