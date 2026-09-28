import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Home, Zap, Smartphone, Wifi, GraduationCap, CreditCard, Package, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { API_URL } from '../config';


// Premium color palette for the donut chart
const COLORS = ['#854d0e', '#15803d', '#b91c1c', '#1d4ed8', '#7e22ce', '#0369a1', '#be123c'];

export default function Dashboard({ onNewEntry }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`, { timeout: 10000 });
      setExpenses(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching expenses", err);
      setError("Could not connect to the server. Please ensure the backend is running.");
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryName) => {
    switch(categoryName) {
      case 'House Rent':
      case 'Godown Rent':
        return <Home size={18} />;
      case 'Electricity':
      case 'Current (electricity) bills':
        return <Zap size={18} />;
      case 'Phone':
      case 'Phone bill':
        return <Smartphone size={18} />;
      case 'Internet':
      case 'Internet bill':
        return <Wifi size={18} />;
      case 'School Fees':
        return <GraduationCap size={18} />;
      case 'Credit Card':
        return <CreditCard size={18} />;
      default:
        return <Package size={18} />;
    }
  };

  // Calculations
  const unpaidExpenses = expenses.filter(e => e.status === 'Unpaid');
  
  // Sort unpaid expenses by due date (closest first)
  const upcomingExpenses = [...unpaidExpenses].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  }).slice(0, 5); // Take top 5

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const overdueExpenses = unpaidExpenses.filter(e => {
    if (!e.dueDate) return false;
    return new Date(e.dueDate) < today;
  });

  const monthlyOutgo = unpaidExpenses.reduce((sum, e) => sum + e.amount, 0);
  const activeRecords = unpaidExpenses.length;

  // Calculate actual data instead of mock
  const monthlyIncome = unpaidExpenses
    .filter(e => e.category?.toLowerCase().includes('income') || e.category?.toLowerCase().includes('interest given'))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const monthlyInvestment = unpaidExpenses
    .filter(e => e.category?.toLowerCase().includes('mutual funds - sip'))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Chart Data preparation
  const chartDataMap = {};
  unpaidExpenses.forEach(e => {
    chartDataMap[e.category] = (chartDataMap[e.category] || 0) + e.amount;
  });
  
  const chartData = Object.entries(chartDataMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Bar Chart Data Preparation (Paid expenses grouped by month)
  const paidExpenses = expenses.filter(e => e.status === 'Paid');
  const barChartDataMap = {};
  paidExpenses.forEach(e => {
    let date = new Date(e.paidDate || e.updatedAt || today);
    let monthYear = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    barChartDataMap[monthYear] = (barChartDataMap[monthYear] || 0) + e.amount;
  });
  
  let barChartData = Object.entries(barChartDataMap).map(([month, amount]) => ({
    month,
    amount
  }));

  // If no paid expenses, provide a default empty state for the current month
  if (barChartData.length === 0) {
    barChartData = [{ 
      month: today.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), 
      amount: 0 
    }];
  }

  const currentDateFormatted = today.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).toUpperCase();

  const handleMarkPaid = (bill) => {
    window.dispatchEvent(new CustomEvent('open-payment-modal-from-dashboard', { detail: bill }));
  };

  if (loading) return <div style={{padding: '2rem', color: 'var(--text-muted)'}}>Loading dashboard data...</div>;
  if (error) return (
    <div style={{padding: '2rem', textAlign: 'center'}}>
      <div style={{background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '2rem', color: '#991b1b', maxWidth: '500px', margin: '0 auto'}}>
        <strong>Connection Error</strong><br/><br/>
        {error}<br/><br/>
        <button onClick={fetchExpenses} style={{padding: '0.5rem 1.5rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Retry</button>
      </div>
    </div>
  );

  // Format large numbers with abbreviations
  const fmtCompact = (n) => {
    const num = Number(n || 0);
    if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
    return '₹' + num.toLocaleString('en-IN');
  };

  const monthlySavings = monthlyIncome - monthlyOutgo;

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)'}}>
      
      {/* HEADER SECTION */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase'}}>
            {currentDateFormatted}
          </div>
          <h1 className="page-title" style={{margin: 0, fontSize: '1.8rem'}}>Financial Overview</h1>
        </div>
        <button className="btn" onClick={onNewEntry} style={{
          background: 'linear-gradient(135deg, #1a2235 0%, #2d3a52 100%)', color: 'white', padding: '0.65rem 1.75rem', 
          borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: 'none', fontSize: '0.85rem',
          boxShadow: '0 2px 8px rgba(26,34,53,0.3)', transition: 'all 0.2s'
        }}>
          + New entry
        </button>
      </div>

      {/* SUMMARY CARDS - 2x2 Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem'}}>
        {[
          { label: 'Monthly Outgo', sublabel: 'Bills, EMIs & Premiums', value: fmtCompact(monthlyOutgo), rawValue: monthlyOutgo, color: '#b91c1c', bgGrad: 'linear-gradient(135deg, rgba(185,28,28,0.06) 0%, rgba(185,28,28,0.02) 100%)', icon: '📤' },
          { label: 'Monthly Income', sublabel: 'Rent & Interest Received', value: fmtCompact(monthlyIncome), rawValue: monthlyIncome, color: '#15803d', bgGrad: 'linear-gradient(135deg, rgba(21,128,61,0.06) 0%, rgba(21,128,61,0.02) 100%)', icon: '📥' },
          { label: 'SIP Commitment', sublabel: 'Monthly Investment', value: fmtCompact(monthlyInvestment), rawValue: monthlyInvestment, color: '#854d0e', bgGrad: 'linear-gradient(135deg, rgba(133,77,14,0.06) 0%, rgba(133,77,14,0.02) 100%)', icon: '📈' },
          { label: 'Active Records', sublabel: 'Pending Payments', value: activeRecords, rawValue: activeRecords, color: '#1d4ed8', bgGrad: 'linear-gradient(135deg, rgba(29,78,216,0.06) 0%, rgba(29,78,216,0.02) 100%)', icon: '📋' }
        ].map((card, i) => (
          <div key={i} style={{
            padding: '1.25rem 1.5rem', background: card.bgGrad, borderRadius: '12px',
            border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)',
            borderLeft: `4px solid ${card.color}`, transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default', position: 'relative', overflow: 'hidden'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}
          >
            <div style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontSize: '1.5rem', opacity: 0.15 }}>{card.icon}</div>
            <div style={{fontSize: '0.72rem', color: card.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem'}}>{card.label}</div>
            <div style={{fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.75rem'}}>{card.sublabel}</div>
            <div style={{fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2}}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Net Savings Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderRadius: '10px',
        background: monthlySavings >= 0 ? 'linear-gradient(135deg, rgba(21,128,61,0.08) 0%, rgba(21,128,61,0.03) 100%)' : 'linear-gradient(135deg, rgba(185,28,28,0.08) 0%, rgba(185,28,28,0.03) 100%)',
        border: `1px solid ${monthlySavings >= 0 ? 'rgba(21,128,61,0.2)' : 'rgba(185,28,28,0.2)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem' }}>{monthlySavings >= 0 ? '💰' : '⚠️'}</span>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Monthly Position</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Income minus all outgoing payments</div>
          </div>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: monthlySavings >= 0 ? '#15803d' : '#b91c1c' }}>
          {monthlySavings >= 0 ? '+' : ''}{fmtCompact(monthlySavings)}
        </div>
      </div>

      {overdueExpenses.length > 0 && (
        <div onClick={() => window.dispatchEvent(new Event('navigate-to-alerts'))} style={{
          cursor: 'pointer', padding: '0.85rem 1.5rem', borderRadius: '10px', marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)'}
        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)'}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b'}}>
            <AlertTriangle size={18} />
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{overdueExpenses.length} payments are overdue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
            <span style={{ fontSize: '0.8rem' }}>Tap to review</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* MAIN CONTENT SPLIT */}
      <div style={{display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
        
        {/* LEFT COLUMN: UPCOMING BILLS */}
        <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--glass-shadow)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem'}}>
            <h3 style={{fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: '600'}}>Upcoming Due (next 15 days)</h3>
            <span onClick={() => window.dispatchEvent(new Event('navigate-to-alerts'))} style={{fontSize: '0.78rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: '500', gap: '0.15rem'}}>View all <ChevronRight size={13} /></span>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column'}}>
            {upcomingExpenses.length === 0 ? (
              <div style={{color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '2rem 0', textAlign: 'center'}}>No upcoming expenses in this period.</div>
            ) : upcomingExpenses.map((bill, idx) => {
              const due = new Date(bill.dueDate);
              const diffTime = due - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0;
              
              let statusText = '';
              if (isOverdue) statusText = `${Math.abs(diffDays)} days overdue`;
              else if (diffDays === 0) statusText = 'Due today';
              else statusText = `Due in ${diffDays} days`;

              return (
                <div key={bill._id} style={{
                  display: 'flex', alignItems: 'center', padding: '0.85rem 0',
                  borderBottom: idx < upcomingExpenses.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59,130,246,0.08)',
                    color: isOverdue ? '#b91c1c' : 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '1rem'
                  }}>
                    {getCategoryIcon(bill.category)}
                  </div>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{bill.title}</div>
                    <div style={{fontSize: '0.72rem', color: isOverdue ? '#b91c1c' : 'var(--text-muted)', fontWeight: isOverdue ? '600' : '400'}}>
                      {due.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})} &bull; {statusText}
                    </div>
                  </div>
                  <div style={{fontSize: '0.95rem', fontWeight: '700', marginRight: '1rem', whiteSpace: 'nowrap', color: isOverdue ? '#b91c1c' : 'var(--text-main)'}}>
                    ₹{bill.amount.toLocaleString('en-IN')}
                  </div>
                  <button onClick={() => handleMarkPaid(bill)} style={{
                    background: 'rgba(21, 128, 61, 0.1)', color: '#15803d', border: '1px solid rgba(21, 128, 61, 0.2)', 
                    padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#15803d'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(21, 128, 61, 0.1)'; e.currentTarget.style.color = '#15803d'; }}
                  >
                    <CheckCircle2 size={13} /> Pay
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CHART */}
        <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--glass-shadow)', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, marginBottom: '1rem', fontFamily: 'Inter, sans-serif', fontWeight: '600'}}>Outgo Distribution</h3>
          
          {chartData.length > 0 ? (
            <div style={{flex: 1, minHeight: '280px', width: '100%'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem'}}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{fontSize: '0.68rem', paddingTop: '0.5rem', lineHeight: '1.8'}}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', textAlign: 'center', padding: '3rem 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              Not enough data for chart
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM SECTION: BAR CHART */}
      <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--glass-shadow)'}}>
        <h3 style={{fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif', fontWeight: '600'}}>Monthly Payment History</h3>
        <div style={{height: '280px', width: '100%'}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'var(--text-muted)'}} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 11, fill: 'var(--text-muted)'}}
                tickFormatter={(value) => `₹${value >= 1000 ? (value/1000) + 'k' : value}`}
              />
              <Tooltip 
                formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem'}}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="amount" fill="#cda640" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
