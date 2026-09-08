import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { HandCoins, Plus, Save } from 'lucide-react';
import './PartnershipPayments.css';

export default function PartnershipPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fundName: '',
    type: 'invest',
    date: '',
    amount: '',
    totalInvestedAfter: '',
    note: '',
    paymentMode: '',
    proofUrl: '',
    transactionId: '',
    totalPurchasePrice: '',
    partnerName: '',
    paidBy: ''
  });
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/partnership-payments/payments`);
      setPayments(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load payments');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/partnership-payments/payments`, form);
      setForm({
        fundName: '',
        type: 'invest',
        date: '',
        amount: '',
        totalInvestedAfter: '',
        note: '',
        paymentMode: '',
        proofUrl: '',
        transactionId: '',
        totalPurchasePrice: '',
        partnerName: '',
        paidBy: ''
      });
      fetchPayments();
    } catch (err) {
      console.error(err);
      setError('Failed to add payment');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading payments...</div>;

  return (
    <div className="partner-payments">
      <h2 className="page-title"><HandCoins size={24} /> Partnership Plot Payments</h2>
      {error && <div className="error-msg">{error}</div>}
      <section className="payments-list">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fund</th>
              <th>Amount</th>
              <th>Partner</th>
              <th>Transaction ID</th>
              <th>Proof</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p._id}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td>{p.fundName}</td>
                <td>₹{p.amount?.toLocaleString()}</td>
                <td>{p.partnerName}</td>
                <td>{p.transactionId}</td>
                <td>{p.proofUrl ? <a href={p.proofUrl} target="_blank" rel="noopener noreferrer">View</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="add-payment">
        <h3><Plus size={20} /> Add New Payment</h3>
        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-row">
            <label>Fund Name<input name="fundName" value={form.fundName} onChange={handleChange} required /></label>
            <label>Type<select name="type" value={form.type} onChange={handleChange}> <option value="invest">Invest</option><option value="withdraw">Withdraw</option></select></label>
          </div>
          <div className="form-row">
            <label>Date<input type="date" name="date" value={form.date} onChange={handleChange} required /></label>
            <label>Amount<input type="number" name="amount" value={form.amount} onChange={handleChange} required /></label>
          </div>
          <div className="form-row">
            <label>Total Invested After<input type="number" name="totalInvestedAfter" value={form.totalInvestedAfter} onChange={handleChange} /></label>
            <label>Partner Name<input name="partnerName" value={form.partnerName} onChange={handleChange} /></label>
          </div>
          <div className="form-row">
            <label>Transaction ID<input name="transactionId" value={form.transactionId} onChange={handleChange} /></label>
            <label>Purchase Price<input type="number" name="totalPurchasePrice" value={form.totalPurchasePrice} onChange={handleChange} /></label>
          </div>
          <div className="form-row">
            <label>Paid By<input name="paidBy" value={form.paidBy} onChange={handleChange} /></label>
            <label>Proof URL<input name="proofUrl" value={form.proofUrl} onChange={handleChange} /></label>
          </div>
          <div className="form-row">
            <label>Note<textarea name="note" value={form.note} onChange={handleChange} /></label>
          </div>
          <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
        </form>
      </section>
    </div>
  );
}
