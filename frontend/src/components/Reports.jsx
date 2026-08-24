import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  LineChart, Line, Legend, Cell, PieChart, Pie
} from 'recharts';

import { API_URL } from '../config';


const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CATEGORY_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316', '#84cc16',
  '#22d3ee', '#e879f9', '#fb7185', '#a3e635', '#38bdf8'
];

const SAVINGS_CATEGORIES = [
  'Mutual Funds', 'Chit Funds', 'Chit fund', 'Fixed Deposit',
  'Post Office', 'LIC', 'Gold', 'PPF', 'Stocks', 'Bonds', 'SIP'
];

const isSavings = (category) => {
  if (!category) return false;
  return SAVINGS_CATEGORIES.some(s => category.toLowerCase().includes(s.toLowerCase()));
};

const CHART_VIEWS = ['Bar Chart', 'Trend Chart', 'Pie Chart', 'Savings vs Outgo'];

const formatRupee = (v) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` :
  v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      fontSize: '0.85rem',
      color: 'var(--text-main)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: '0.15rem' }}>
          {p.name}: <strong>₹{Number(p.value).toLocaleString('en-IN')}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('Bar Chart');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savingsTimeframe, setSavingsTimeframe] = useState('Monthly');

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const YEARS = Array.from({ length: 81 }, (_, i) => (2000 + i).toString());

  useEffect(() => {
    fetchExpenses();
    const onFocus = () => fetchExpenses();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchExpenses(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      setExpenses(res.data.filter(e => e.status === 'Paid'));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching expenses', err);
      setLoading(false);
    }
  };

  const getExpenseDate = (expense) =>
    new Date(expense.paidDate || expense.updatedAt || new Date());

  // All unique categories
  const allCategories = useMemo(() => {
    const cats = [...new Set(expenses.map(e => e.category))].filter(Boolean).sort();
    return ['All', ...cats];
  }, [expenses]);

  // Map category -> color
  const categoryColorMap = useMemo(() => {
    const cats = allCategories.filter(c => c !== 'All');
    const map = {};
    cats.forEach((c, i) => { map[c] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });
    return map;
  }, [allCategories]);

  // Filter by category
  const filteredExpenses = useMemo(() =>
    selectedCategory === 'All' ? expenses : expenses.filter(e => e.category === selectedCategory),
    [expenses, selectedCategory]
  );

  // Overall total across all years
  const overallTotal = useMemo(() =>
    filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  // Monthly data
  const selectedMonthIndex = MONTHS.indexOf(selectedMonth);
  const monthExpenses = useMemo(() =>
    filteredExpenses.filter(e => {
      const d = getExpenseDate(e);
      return d.getMonth() === selectedMonthIndex && d.getFullYear().toString() === selectedYear;
    }),
    [filteredExpenses, selectedMonthIndex, selectedYear]
  );

  const totalMonthPaid = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);

  const monthCategoryData = useMemo(() => {
    const map = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  // Yearly data
  const yearExpenses = useMemo(() =>
    filteredExpenses.filter(e => getExpenseDate(e).getFullYear().toString() === selectedYear),
    [filteredExpenses, selectedYear]
  );

  const totalYearPaid = useMemo(() => yearExpenses.reduce((s, e) => s + e.amount, 0), [yearExpenses]);

  const yearCategoryData = useMemo(() => {
    const map = {};
    yearExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [yearExpenses]);

  // Multi-year trend data (category-wise per year)
  const trendCategories = useMemo(() => {
    const cats = [...new Set(filteredExpenses.map(e => e.category))].filter(Boolean);
    return cats;
  }, [filteredExpenses]);

  const trendData = useMemo(() => {
    return YEARS.map(year => {
      const row = { year };
      const yExp = filteredExpenses.filter(e => getExpenseDate(e).getFullYear().toString() === year);
      trendCategories.forEach(cat => {
        row[cat] = yExp.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      });
      row['Total'] = yExp.reduce((s, e) => s + e.amount, 0);
      return row;
    });
  }, [filteredExpenses, trendCategories, selectedYear]);

  // --- Savings vs Outgo Data Calculations ---
  
  // 1. Monthly (for selected year)
  const savingsMonthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthExp = yearExpenses.filter(e => getExpenseDate(e).getMonth() === idx);
      let savings = 0;
      let expenditure = 0;
      monthExp.forEach(e => {
        if (isSavings(e.category)) savings += e.amount;
        else expenditure += e.amount;
      });
      return { name: month.substring(0, 3), Savings: savings, Expenditure: expenditure };
    });
  }, [yearExpenses]);

  // 2. Quarterly (for selected year)
  const QUARTERS = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  const savingsQuarterlyData = useMemo(() => {
    return QUARTERS.map((q, idx) => {
      const qExp = yearExpenses.filter(e => Math.floor(getExpenseDate(e).getMonth() / 3) === idx);
      let savings = 0;
      let expenditure = 0;
      qExp.forEach(e => {
        if (isSavings(e.category)) savings += e.amount;
        else expenditure += e.amount;
      });
      return { name: q, Savings: savings, Expenditure: expenditure };
    });
  }, [yearExpenses]);

  // 3. Yearly (Multi-year)
  const savingsYearlyData = useMemo(() => {
    return YEARS.map(year => {
      // Use expenses (unfiltered by category) to show overall savings vs outgo across all years
      const yExp = expenses.filter(e => getExpenseDate(e).getFullYear().toString() === year);
      let savings = 0;
      let expenditure = 0;
      yExp.forEach(e => {
        if (isSavings(e.category)) savings += e.amount;
        else expenditure += e.amount;
      });
      return { name: year, Savings: savings, Expenditure: expenditure };
    }).filter(y => y.Savings > 0 || y.Expenditure > 0);
  }, [expenses]);

  const activeSavingsData = savingsTimeframe === 'Monthly' ? savingsMonthlyData :
                            savingsTimeframe === 'Quarterly' ? savingsQuarterlyData : 
                            savingsYearlyData;

  const totalSelectedSavings = useMemo(() => activeSavingsData.reduce((s, d) => s + d.Savings, 0), [activeSavingsData]);
  const totalSelectedExpenditure = useMemo(() => activeSavingsData.reduce((s, d) => s + d.Expenditure, 0), [activeSavingsData]);

  const selectStyle = {
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-card)',
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '160px'
  };

  const cardStyle = {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    padding: '1.75rem',
    transition: 'box-shadow 0.2s',
  };

  if (loading) return (
    <div style={{ padding: '3rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
      <div style={{ width: 20, height: 20, border: '2px solid var(--border-color)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading reports...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)', paddingBottom: '3rem' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase' }}>
          Category · Month · Year · Trend
        </div>
        <h1 className="page-title" style={{ margin: 0 }}>Reports</h1>
      </div>

      {/* ── FILTERS ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', alignItems: 'center' }}>
        {/* Category Filter */}
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={selectStyle}>
          {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? '🗂 All Categories' : c}</option>)}
        </select>

        {/* Month Filter */}
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Year Filter */}
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {/* Chart View Toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          {CHART_VIEWS.map(v => (
            <button key={v} onClick={() => setActiveView(v)} style={{
              padding: '0.5rem 1rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: activeView === v ? 'var(--accent)' : 'var(--bg-card)',
              color: activeView === v ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
              letterSpacing: '0.02em'
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* ── SUMMARY CARDS (top row) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>

        {/* Overall Total */}
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Overall Total {selectedCategory !== 'All' ? `· ${selectedCategory}` : ''}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ₹{overallTotal.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.5rem' }}>
            across all years
          </div>
        </div>

        {/* Year Total */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {selectedYear} Total
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ₹{totalYearPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            full year paid
          </div>
        </div>

        {/* Month Total */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {selectedMonth.substring(0, 3)} {selectedYear}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ₹{totalMonthPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            this month paid
          </div>
        </div>
      </div>

      {/* ── MAIN CHART CARD ── */}
      <div style={{ ...cardStyle, marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              {activeView === 'Bar Chart' && `${selectedYear} — Category Breakdown`}
              {activeView === 'Trend Chart' && `Multi-Year Category Trend`}
              {activeView === 'Pie Chart' && `${selectedYear} — Spend Distribution`}
              {activeView === 'Savings vs Outgo' && `Savings vs Expenditure`}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {selectedCategory !== 'All' && activeView !== 'Savings vs Outgo' ? `Filtered: ${selectedCategory}` : 
               activeView === 'Savings vs Outgo' ? `Overview across all categories` : 'All categories'}
            </div>
          </div>
          {activeView === 'Savings vs Outgo' && (
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              {['Monthly', 'Quarterly', 'Yearly'].map(tf => (
                <button key={tf} onClick={() => setSavingsTimeframe(tf)} style={{
                  padding: '0.4rem 0.8rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  background: savingsTimeframe === tf ? 'var(--accent)' : 'transparent',
                  color: savingsTimeframe === tf ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>{tf}</button>
              ))}
            </div>
          )}
        </div>

        {/* Bar Chart */}
        {activeView === 'Bar Chart' && (
          yearCategoryData.length > 0 ? (
            <div style={{ height: '340px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={yearCategoryData} margin={{ top: 5, right: 40, left: 100, bottom: 5 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <XAxis type="number" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickFormatter={formatRupee}
                  />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--text-main)' }} width={95}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {yearCategoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={categoryColorMap[entry.name] || CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', fontStyle: 'italic' }}>
              No data for {selectedYear}
            </div>
          )
        )}

        {/* Trend Chart */}
        {activeView === 'Trend Chart' && (
          trendCategories.length > 0 ? (
            <div style={{ height: '340px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={formatRupee} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '1rem' }} />
                  {selectedCategory === 'All'
                    ? trendCategories.map((cat, i) => (
                        <Line key={cat} type="monotone" dataKey={cat} stroke={categoryColorMap[cat] || CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                          strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      ))
                    : <Line type="monotone" dataKey={selectedCategory} stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  }
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', fontStyle: 'italic' }}>
              No trend data available
            </div>
          )
        )}

        {/* Pie Chart */}
        {activeView === 'Pie Chart' && (
          yearCategoryData.length > 0 ? (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ height: '300px', flex: '1 1 300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={yearCategoryData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={120}
                      paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {yearCategoryData.map((entry, i) => (
                        <Cell key={entry.name} fill={categoryColorMap[entry.name] || CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {yearCategoryData.map((entry, i) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: categoryColorMap[entry.name] || CATEGORY_COLORS[i % CATEGORY_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-main)', flex: 1 }}>{entry.name}</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>₹{entry.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', fontStyle: 'italic' }}>
              No data for {selectedYear}
            </div>
          )
        )}

        {/* Savings vs Outgo Chart */}
        {activeView === 'Savings vs Outgo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Savings ({savingsTimeframe})</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>₹{totalSelectedSavings.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ flex: 1, minWidth: '200px', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Outgo ({savingsTimeframe})</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>₹{totalSelectedExpenditure.toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <div style={{ height: '340px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeSavingsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={formatRupee} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover, rgba(99,102,241,0.04))' }} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '1rem' }} />
                  <Bar dataKey="Savings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={savingsTimeframe === 'Monthly' ? 20 : 40} />
                  <Bar dataKey="Expenditure" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={savingsTimeframe === 'Monthly' ? 20 : 40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── TWO COLUMN: MONTH BREAKDOWN + YEAR CATEGORY TABLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>

        {/* Month Category Breakdown */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1.25rem 0' }}>
            {selectedMonth} {selectedYear} — by category
          </h2>
          {monthCategoryData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {monthCategoryData.map((item, idx) => {
                const pct = totalMonthPaid > 0 ? (item.amount / totalMonthPaid) * 100 : 0;
                const color = categoryColorMap[item.name] || CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <div key={item.name} style={{ paddingBottom: '0.9rem', marginBottom: '0.9rem', borderBottom: idx < monthCategoryData.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                        {item.name}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
              No payments for this month.
            </div>
          )}
        </div>

        {/* Year Category Table */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1.25rem 0' }}>
            {selectedYear} — category totals
          </h2>
          {yearCategoryData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {yearCategoryData.map((item, idx) => {
                const pct = totalYearPaid > 0 ? (item.amount / totalYearPaid) * 100 : 0;
                const color = categoryColorMap[item.name] || CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <div key={item.name} style={{ paddingBottom: '0.9rem', marginBottom: '0.9rem', borderBottom: idx < yearCategoryData.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                        {item.name}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
              No payments for this year.
            </div>
          )}
        </div>
      </div>

      {/* ── PAYMENT LOG ── */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1.5rem 0' }}>
          Payment Log — {selectedMonth} {selectedYear}
          {selectedCategory !== 'All' && ` · ${selectedCategory}`}
        </h2>

        {monthExpenses.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em', fontWeight: 700 }}>DATE</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em', fontWeight: 700 }}>CATEGORY</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em', fontWeight: 700 }}>DESCRIPTION</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em', fontWeight: 700 }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {[...monthExpenses].sort((a, b) => getExpenseDate(b) - getExpenseDate(a)).map((expense, idx) => {
                const date = getExpenseDate(expense);
                const dateString = `${date.getDate()} ${MONTHS[date.getMonth()].substring(0, 3)}`;
                const color = categoryColorMap[expense.category] || '#6366f1';
                return (
                  <tr key={expense._id} style={{ borderBottom: idx < monthExpenses.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(99,102,241,0.04))'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{dateString}</td>
                    <td style={{ padding: '1rem 0', fontSize: '0.88rem' }}>
                      <span style={{ background: color + '22', color, borderRadius: 5, padding: '0.2rem 0.55rem', fontSize: '0.78rem', fontWeight: 600 }}>
                        {expense.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{expense.title}</td>
                    <td style={{ padding: '1rem 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      ₹{expense.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                <td colSpan={3} style={{ padding: '0.9rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Total</td>
                <td style={{ padding: '0.9rem 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  ₹{totalMonthPaid.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2.5rem 0' }}>
            No payment log for this period.
          </div>
        )}
      </div>

    </div>
  );
}
