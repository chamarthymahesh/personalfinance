import React, { useState } from 'react';
import axios from 'axios';
import { X, Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../config';

export default function LendingBorrowingModal({ isOpen, onClose, onSave, existingRecord = null }) {
  const [formData, setFormData] = useState(
    existingRecord || {
      borrowedFrom: '',
      borrowedPrincipal: '',
      borrowedInterestRate: '',
      borrowedInterestType: 'Simple Interest',
      lentTo: '',
      lentInterestRate: '',
      lentInterestType: 'Simple Interest',
      startDate: new Date().toISOString().split('T')[0],
      partners: [{ name: '', investmentAmount: '' }]
    }
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePartnerChange = (index, field, value) => {
    const newPartners = [...formData.partners];
    newPartners[index][field] = value;
    setFormData({ ...formData, partners: newPartners });
  };

  const addPartner = () => {
    setFormData({ ...formData, partners: [...formData.partners, { name: '', investmentAmount: '' }] });
  };

  const removePartner = (index) => {
    const newPartners = formData.partners.filter((_, i) => i !== index);
    setFormData({ ...formData, partners: newPartners });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate partners
    const validPartners = formData.partners.filter(p => p.name && p.investmentAmount > 0);
    if (validPartners.length === 0) {
      setError("Please add at least one partner with a valid investment amount.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        borrowedPrincipal: Number(formData.borrowedPrincipal),
        borrowedInterestRate: Number(formData.borrowedInterestRate),
        lentInterestRate: Number(formData.lentInterestRate),
        partners: validPartners.map(p => ({
          name: p.name,
          investmentAmount: Number(p.investmentAmount)
        }))
      };

      if (existingRecord) {
        await axios.put(`${API_URL}/lending-borrowing/${existingRecord._id}`, payload);
      } else {
        await axios.post(`${API_URL}/lending-borrowing`, payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h2>{existingRecord ? 'Edit Transaction' : 'New Lending & Borrowing Transaction'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Borrowing Details */}
            <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-danger)' }}>Borrowing Details</h3>
              <div className="form-group">
                <label className="form-label">Borrowed From (Source)</label>
                <input type="text" name="borrowedFrom" className="form-input" value={formData.borrowedFrom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Borrowed Principal Amount (₹)</label>
                <input type="number" name="borrowedPrincipal" className="form-input" value={formData.borrowedPrincipal} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Borrow Interest Rate (%)</label>
                <input type="number" step="0.01" name="borrowedInterestRate" className="form-input" value={formData.borrowedInterestRate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Borrow Interest Type</label>
                <select name="borrowedInterestType" className="form-input" value={formData.borrowedInterestType} onChange={handleChange}>
                  <option value="Simple Interest">Simple Interest</option>
                  <option value="Compound Interest">Compound Interest (Monthly)</option>
                  <option value="Yearly Compound Interest">Yearly Compound Interest</option>
                </select>
              </div>
            </div>

            {/* Lending Details */}
            <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Lending Details</h3>
              <div className="form-group">
                <label className="form-label">Lent To (Target)</label>
                <input type="text" name="lentTo" className="form-input" value={formData.lentTo} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Lent Interest Rate (%)</label>
                <input type="number" step="0.01" name="lentInterestRate" className="form-input" value={formData.lentInterestRate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Lent Interest Type</label>
                <select name="lentInterestType" className="form-input" value={formData.lentInterestType} onChange={handleChange}>
                  <option value="Simple Interest">Simple Interest</option>
                  <option value="Compound Interest">Compound Interest (Monthly)</option>
                  <option value="Yearly Compound Interest">Yearly Compound Interest</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" name="startDate" className="form-input" value={formData.startDate.split('T')[0]} onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Partners / Profit Split */}
          <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Partners & Investment Share</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Enter the partners and their investment amounts. Profit will be split proportionally.
            </p>
            
            {formData.partners.map((partner, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Partner Name</label>
                  <input type="text" className="form-input" value={partner.name} onChange={(e) => handlePartnerChange(idx, 'name', e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Investment Amount (₹)</label>
                  <input type="number" className="form-input" value={partner.investmentAmount} onChange={(e) => handlePartnerChange(idx, 'investmentAmount', e.target.value)} required />
                </div>
                {formData.partners.length > 1 && (
                  <button type="button" onClick={() => removePartner(idx)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPartner} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px dashed var(--border-color)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Plus size={16} /> Add Partner
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Transaction'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
