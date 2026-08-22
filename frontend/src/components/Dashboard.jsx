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

  // Mocked data as per plan
  const monthlyIncome = 0;
  const monthlyInvestment = 0;

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

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)'}}>
      
      {/* HEADER SECTION */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem'}}>
        <div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: '500'}}>
            {currentDateFormatted}
          </div>
          <h1 className="page-title" style={{margin: 0}}>Today's register</h1>
        </div>
        <button className="btn" onClick={onNewEntry} style={{background: 'var(--bg-sidebar)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', border: 'none'}}>
          + New entry
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem'}}>
        <div className="dash-card dash-card-outgo">
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Monthly outgo (bills, EMIs, premiums)</div>
          <div style={{fontSize: '1.75rem', fontWeight: '600', color: 'var(--text-main)'}}>₹{monthlyOutgo.toLocaleString()}</div>
        </div>
        <div className="dash-card dash-card-income">
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Monthly income (rent + interest received)</div>
          <div style={{fontSize: '1.75rem', fontWeight: '600', color: 'var(--text-main)'}}>₹{monthlyIncome.toLocaleString()}</div>
        </div>
        <div className="dash-card dash-card-investment">
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Monthly investment commitment (SIPs)</div>
          <div style={{fontSize: '1.75rem', fontWeight: '600', color: 'var(--text-main)'}}>₹{monthlyInvestment.toLocaleString()}</div>
        </div>
        <div className="dash-card dash-card-active">
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Active records</div>
          <div style={{fontSize: '1.75rem', fontWeight: '600', color: 'var(--text-main)'}}>{activeRecords}</div>
        </div>
      </div>

      {overdueExpenses.length > 0 && (
        <div className="dash-overdue-banner" style={{ cursor: 'pointer' }} onClick={() => window.dispatchEvent(new Event('navigate-to-alerts'))}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <AlertTriangle size={18} />
            <span>{overdueExpenses.length} payments are overdue. Tap to review.</span>
          </div>
          <ChevronRight size={18} />
        </div>
      )}

      {/* MAIN CONTENT SPLIT */}
      <div style={{display: 'flex', gap: '2rem'}}>
        
        {/* LEFT COLUMN: UPCOMING BILLS */}
        <div style={{flex: '2', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '1.5rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3 style={{fontSize: '1rem', color: 'var(--text-main)', margin: 0, fontFamily: 'Inter, sans-serif'}}>Due in the next 15 days</h3>
            <span style={{fontSize: '0.8rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>View all <ChevronRight size={14} /></span>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {upcomingExpenses.length === 0 ? (
              <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0'}}>No upcoming expenses in this period.</div>
            ) : upcomingExpenses.map(bill => {
              const due = new Date(bill.dueDate);
              const diffTime = due - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0;
              
              let statusText = '';
              if (isOverdue) statusText = `${Math.abs(diffDays)} days overdue`;
              else if (diffDays === 0) statusText = 'Due today';
              else statusText = `Due in ${diffDays} days`;

              return (
                <div key={bill._id} style={{display: 'flex', alignItems: 'center', padding: '1rem 0', borderBottom: '1px dashed var(--border-color)'}}>
                  <div style={{width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '1rem', background: 'rgba(239, 68, 68, 0.05)'}}>
                    {getCategoryIcon(bill.category)}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '0.2rem'}}>{bill.title}</div>
                    <div style={{fontSize: '0.75rem', color: isOverdue ? '#b91c1c' : 'var(--text-muted)'}}>
                      {due.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})} &bull; {statusText}
                    </div>
                  </div>
                  <div style={{fontSize: '1rem', fontWeight: '600', marginRight: '1.5rem'}}>
                    ₹{bill.amount.toLocaleString()}
                  </div>
                  <button onClick={() => handleMarkPaid(bill)} style={{background: 'rgba(21, 128, 61, 0.1)', color: '#15803d', border: '1px solid rgba(21, 128, 61, 0.2)', padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
                    <CheckCircle2 size={14} /> Mark paid
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CHART */}
        <div style={{flex: '1', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '1.5rem', minWidth: '300px'}}>
          <h3 style={{fontSize: '1rem', color: 'var(--text-main)', margin: 0, marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif'}}>Where the outgo goes</h3>
          
          {chartData.length > 0 ? (
            <div style={{height: '250px', width: '100%'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString()}`}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--glass-shadow)', background: 'var(--bg-card)', color: 'var(--text-main)'}}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{fontSize: '0.75rem', paddingTop: '1rem'}}
                    iconType="rect"
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0'}}>
              Not enough data for chart
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM SECTION: BAR CHART */}
      <div style={{marginTop: '2rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '2rem'}}>
        <h3 style={{fontSize: '1.1rem', color: '#1e293b', margin: 0, marginBottom: '2rem', fontFamily: 'Merriweather, serif'}}>Amount actually paid, by month</h3>
        <div style={{height: '300px', width: '100%'}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="month" axisLine={true} tickLine={true} tick={{fontSize: 12, fill: 'var(--text-muted)'}} />
              <YAxis 
                axisLine={true} 
                tickLine={true} 
                tick={{fontSize: 12, fill: 'var(--text-muted)'}}
                tickFormatter={(value) => `₹${value >= 1000 ? (value/1000) + 'k' : value}`}
              />
              <Tooltip 
                formatter={(value) => `₹${value.toLocaleString()}`}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--glass-shadow)', background: 'var(--bg-card)', color: 'var(--text-main)'}}
              />
              <Bar dataKey="amount" fill="#8c7335" radius={[2, 2, 0, 0]} barSize={500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
