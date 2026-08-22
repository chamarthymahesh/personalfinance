import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Home, Zap, Smartphone, Wifi, GraduationCap, CreditCard, Package, Bell, CheckCircle2, TrendingUp, ShieldCheck, Landmark, Building2, Receipt } from 'lucide-react';

import { API_URL } from '../config';


export default function DueAlerts() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      // Filter only unpaid
      setExpenses(res.data.filter(e => e.status === 'Unpaid'));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching expenses", err);
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('rent')) return <Home size={18} />;
    if (name.includes('electricity')) return <Zap size={18} />;
    if (name.includes('phone')) return <Smartphone size={18} />;
    if (name.includes('internet')) return <Wifi size={18} />;
    if (name.includes('school')) return <GraduationCap size={18} />;
    if (name.includes('card')) return <CreditCard size={18} />;
    if (name.includes('loan') || name.includes('emi')) return <Landmark size={18} />;
    if (name.includes('insurance') || name.includes('lic')) return <ShieldCheck size={18} />;
    if (name.includes('fund') || name.includes('investment')) return <TrendingUp size={18} />;
    if (name.includes('property')) return <Building2 size={18} />;
    return <Receipt size={18} />;
  };

  const handleMarkPaid = async (id) => {
    alert("In a real implementation, this would open the payment modal. Navigate to the specific category to pay.");
  };

  // Bucketing logic
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const overdue = [];
  const next30Days = [];
  const later = [];

  expenses.forEach(bill => {
    if (!bill.dueDate) return; // Skip if no due date
    
    const due = new Date(bill.dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Add calculated fields for easy rendering
    const formatted = {
      ...bill,
      diffDays,
      dueObj: due
    };

    if (diffDays < 0) {
      overdue.push(formatted);
    } else if (diffDays <= 30) {
      next30Days.push(formatted);
    } else {
      later.push(formatted);
    }
  });

  // Sort each bucket: most urgent first (ascending diffDays)
  overdue.sort((a, b) => a.diffDays - b.diffDays);
  next30Days.sort((a, b) => a.diffDays - b.diffDays);
  later.sort((a, b) => a.diffDays - b.diffDays);

  if (loading) return <div style={{padding: '2rem'}}>Loading alerts...</div>;

  const renderList = (title, items, theme) => {
    if (items.length === 0) return null;

    let headerColor, borderColor, iconColor, statusColor;

    if (theme === 'red') {
      headerColor = '#991b1b'; // Dark Red
      borderColor = '#fecaca'; // Light Red border
      iconColor = '#b91c1c'; // Red icon
      statusColor = '#b91c1c';
    } else if (theme === 'gold') {
      headerColor = '#854d0e'; // Dark Gold
      borderColor = '#fde047'; // Yellow border
      iconColor = '#a16207'; // Gold icon
      statusColor = '#854d0e';
    } else {
      headerColor = '#1e293b'; // Slate 800
      borderColor = '#e2e8f0'; // Slate 200
      iconColor = '#475569'; // Slate 600
      statusColor = '#475569';
    }

    return (
      <div style={{
        background: 'var(--bg-card)', 
        borderRadius: '8px', 
        border: `1px solid ${borderColor}`,
        marginBottom: '2rem',
        overflow: 'hidden'
      }}>
        <div style={{padding: '1.5rem', paddingBottom: '0.5rem'}}>
          <h2 style={{fontSize: '1.25rem', color: headerColor, margin: 0, fontFamily: 'Merriweather, serif'}}>
            {title} ({items.length})
          </h2>
        </div>
        
        <div style={{padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column'}}>
          {items.map((bill, idx) => {
            let statusText = '';
            if (bill.diffDays < 0) statusText = `${Math.abs(bill.diffDays)} days overdue`;
            else if (bill.diffDays === 0) statusText = 'Due today';
            else statusText = `in ${bill.diffDays} days`;

            return (
              <div key={bill._id} style={{
                display: 'flex', alignItems: 'center', padding: '1.25rem 0', 
                borderBottom: idx < items.length - 1 ? '1px dashed var(--border-color)' : 'none'
              }}>
                {/* ICON */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', 
                  border: `1px solid ${iconColor}40`, // 40 is hex opacity
                  color: iconColor, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  flexShrink: 0, marginRight: '1.25rem'
                }}>
                  {getCategoryIcon(bill.category)}
                </div>
                
                {/* DETAILS */}
                <div style={{flex: 1}}>
                  <div style={{fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem'}}>
                    {bill.category} &bull; {bill.title}
                  </div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                    {bill.dueObj.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})} &bull; 
                    <span style={{color: statusColor, fontWeight: '500', marginLeft: '0.2rem'}}>{statusText}</span>
                  </div>
                </div>
                
                {/* AMOUNT & BUTTON */}
                <div style={{fontSize: '1.05rem', fontWeight: '600', marginRight: '2rem', color: 'var(--text-main)', fontFamily: 'monospace'}}>
                  ₹{bill.amount.toLocaleString()}
                </div>
                <button onClick={() => handleMarkPaid(bill._id)} style={{
                  background: 'rgba(21, 128, 61, 0.1)', color: '#15803d', border: '1px solid rgba(21, 128, 61, 0.2)', 
                  padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s'
                }}>
                  <CheckCircle2 size={16} /> Mark paid
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)', paddingBottom: '3rem'}}>
      
      {/* HEADER SECTION */}
      <div style={{marginBottom: '1.5rem'}}>
        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: '600'}}>
          STAY AHEAD OF DUE DATES
        </div>
        <h1 className="page-title" style={{margin: 0}}>Due alerts</h1>
      </div>

      {/* INFO BANNER */}
      <div style={{
        background: '#f4ecd8', // yellowish beige
        color: '#6b7280', 
        padding: '1.25rem 1.5rem', 
        borderRadius: '8px', 
        border: '1px solid #e5d8b8',
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '1rem',
        marginBottom: '2.5rem',
        fontSize: '0.9rem',
        lineHeight: '1.5'
      }}>
        <Bell size={18} style={{marginTop: '0.1rem', flexShrink: 0, color: '#4b5563'}} />
        <div>
          This demo shows in-app alerts only. To get these as real WhatsApp pings, this list needs to run on a server on a daily schedule and call the WhatsApp Business API (or a service like Twilio) — a browser-only app can't send WhatsApp messages by itself.
        </div>
      </div>

      {/* LIST SECTIONS */}
      {renderList('Overdue', overdue, 'red')}
      {renderList('Due in the next 30 days', next30Days, 'gold')}
      {renderList('Due later', later, 'grey')}
      
      {expenses.length === 0 && (
        <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontStyle: 'italic'}}>
          You have no unpaid bills! You're all caught up.
        </div>
      )}

    </div>
  );
}
