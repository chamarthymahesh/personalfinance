import { useState, useEffect } from 'react';
import axios from 'axios';
import { Home, Zap, Smartphone, Wifi, GraduationCap, CreditCard, Package, Edit2, Check, X, History, IndianRupee } from 'lucide-react';
import LendingLedgerModal from './LendingLedgerModal';
import InvestmentLedgerModal from './InvestmentLedgerModal';
import ExpenseLedgerModal from './ExpenseLedgerModal';
import { API_URL, SERVER_URL } from '../config';


export default function Bills({ selectedCategory, pendingPaymentBill, clearPendingPayment }) {
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uniqueBillersByCategory, setUniqueBillersByCategory] = useState({});
  const [isNewBiller, setIsNewBiller] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lendingLedgerBill, setLendingLedgerBill] = useState(null);
  const [investmentLedgerBill, setInvestmentLedgerBill] = useState(null);
  const [expenseLedgerBill, setExpenseLedgerBill] = useState(null);

  // --- Payment History Modal State ---
  const [historyModalBill, setHistoryModalBill] = useState(null);
  const [historyData, setHistoryData] = useState({ records: [], totalPaid: 0, count: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [backfillForm, setBackfillForm] = useState({ startDate: '', paymentMode: 'Cash' });
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [showBackfillForm, setShowBackfillForm] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsDrawerOpen(true);
    const handleOpenPayment = (e) => {
      openPaymentModal(e.detail);
    };
    
    window.addEventListener('open-new-entry', handleOpen);
    window.addEventListener('open-payment-modal-for-bill', handleOpenPayment);
    return () => {
      window.removeEventListener('open-new-entry', handleOpen);
      window.removeEventListener('open-payment-modal-for-bill', handleOpenPayment);
    };
  }, []);

  useEffect(() => {
    if (pendingPaymentBill) {
      openPaymentModal(pendingPaymentBill);
      if (clearPendingPayment) clearPendingPayment();
    }
  }, [pendingPaymentBill]);

  // UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMode: 'UPI / PhonePe',
    paidDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    cardUsed: '',
    paymentProofFile: null
  });

  // Edit bill state
  const [isDrawerEditMode, setIsDrawerEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'House Rent',
    amount: '',
    frequency: 'Monthly',
    dueDate: '',
    remarks: '',
    details: {},
    paymentProofFile: null
  });

  useEffect(() => {
    fetchBills();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(res.data);
      if (res.data.length > 0 && !selectedCategory) {
        setFormData(prev => ({ ...prev, category: res.data[0].name }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        category: selectedCategory.name,
        title: '',
        details: {}
      }));
    }
  }, [selectedCategory]);

  useEffect(() => {
    const grouped = {};
    const processedTitles = new Set();
    
    bills.forEach(bill => {
      if (!processedTitles.has(bill.title)) {
        processedTitles.add(bill.title);
        if (!grouped[bill.category]) {
          grouped[bill.category] = [];
        }
        grouped[bill.category].push(bill);
      }
    });
    
    setUniqueBillersByCategory(grouped);
  }, [bills]);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      setBills(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFormData({
      ...formData,
      category: newCategory,
      title: '', 
      details: {} 
    });
    setIsNewBiller(true);
  };

  const handleBillerSelection = (e) => {
    const selectedTitle = e.target.value;
    
    if (selectedTitle === "NEW_BILLER" || selectedTitle === "") {
      setIsNewBiller(true);
      setFormData({
        ...formData,
        title: '',
        amount: '',
        details: {}
      });
      return;
    }

    setIsNewBiller(false);
    
    const template = uniqueBillersByCategory[formData.category]?.find(b => b.title === selectedTitle);
    if (template) {
      let nextDueDate = '';
      if (template.dueDate && template.frequency === 'Monthly') {
        const d = new Date(template.dueDate);
        d.setMonth(d.getMonth() + 1);
        nextDueDate = d.toISOString().split('T')[0];
      }

      setFormData({
        ...formData,
        title: template.title,
        amount: template.amount,
        frequency: template.frequency,
        dueDate: nextDueDate,
        details: template.details || {}
      });
    }
  };

  const handleDetailsChange = (field, value) => {
    setFormData({
      ...formData,
      details: {
        ...formData.details,
        [field]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let autoTitle = formData.category;
      if (formData.details && Object.keys(formData.details).length > 0) {
         const firstKey = Object.keys(formData.details)[0];
         if (formData.details[firstKey]) {
            autoTitle = String(formData.details[firstKey]);
         }
      }
      if (formData.title && formData.title !== formData.category) {
         autoTitle = formData.title;
      }

      const hasFiles = Object.values(formData.details).some(val => val instanceof File) || !!formData.paymentProofFile;

      let requestData;
      let requestConfig = {};

      if (hasFiles) {
        const data = new FormData();
        data.append('title', autoTitle);
        data.append('category', formData.category);
        data.append('amount', formData.amount);
        data.append('frequency', formData.frequency);
        if (formData.dueDate) data.append('dueDate', formData.dueDate);
        if (formData.remarks) data.append('remarks', formData.remarks);
        // Attach payment proof if provided
        if (formData.paymentProofFile) data.append('paymentProof', formData.paymentProofFile);

        const textDetails = {};
        Object.keys(formData.details).forEach(key => {
          const val = formData.details[key];
          if (val instanceof File) {
            data.append(`file_${key}`, val);
          } else {
            textDetails[key] = val;
          }
        });
        data.append('details', JSON.stringify(textDetails));
        requestData = data;
        requestConfig = { headers: { 'Content-Type': 'multipart/form-data' } };
      } else {
        requestData = { ...formData, title: autoTitle };
      }

      if (isDrawerEditMode && editingBillId) {
        await axios.put(`${API_URL}/expenses/${editingBillId}`, requestData, requestConfig);
      } else {
        await axios.post(`${API_URL}/expenses`, requestData, requestConfig);
      }

      setFormData({
        title: '', category: selectedCategory ? selectedCategory.name : (categories[0]?.name || ''), amount: '', frequency: 'Monthly', dueDate: '', remarks: '', details: {}, paymentProofFile: null
      });
      setIsNewBiller(true);
      setIsDrawerOpen(false);
      setIsDrawerEditMode(false);
      setEditingBillId(null);
      fetchBills();
    } catch (err) {
      console.error(err);
      alert("Error saving entry: " + (err.response?.data?.error || err.message));
    }
  };

  const openPaymentModal = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentDetails({
      paymentMode: 'UPI / PhonePe',
      paidDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      cardUsed: '',
      paymentProofFile: null
    });
    setIsPaymentModalOpen(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    try {
      // Build FormData to support optional file upload
      const fd = new FormData();
      fd.append('paymentMode', paymentDetails.paymentMode);
      fd.append('paidDate', paymentDetails.paidDate);
      if (paymentDetails.referenceNumber) fd.append('referenceNumber', paymentDetails.referenceNumber);
      if (paymentDetails.cardUsed) fd.append('cardUsed', paymentDetails.cardUsed);
      if (paymentDetails.paymentProofFile) fd.append('paymentProof', paymentDetails.paymentProofFile);

      await axios.put(`${API_URL}/expenses/${selectedBillForPayment._id}/pay`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (paymentDetails.paymentMode === 'Credit Card' && paymentDetails.cardUsed) {
        await axios.post(`${API_URL}/expenses`, {
          title: `${selectedBillForPayment.title}`,
          category: 'Credit Card Spends',
          amount: selectedBillForPayment.amount,
          frequency: 'One-time',
          remarks: `Auto-generated from payment for ${selectedBillForPayment.title}`,
          details: {
            cardName: paymentDetails.cardUsed,
            merchant: selectedBillForPayment.title
          }
        });
      }

      setIsPaymentModalOpen(false);
      fetchBills();
    } catch (err) {
      console.error(err);
      alert('Failed to log payment.');
    }
  };

  // Edit bill handlers
  const startEditBill = (bill) => {
    setEditingBillId(bill._id);
    setIsDrawerEditMode(true);
    setFormData({
      title: bill.title || '',
      category: bill.category || 'House Rent',
      amount: bill.amount || '',
      frequency: bill.frequency || 'Monthly',
      dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '',
      remarks: bill.remarks || '',
      details: bill.details || {}
    });
    setIsDrawerOpen(true);
  };

  const deleteBill = async (id) => {
    // Removed window.confirm because browser popup blocker was silencing it
    // Immediately remove from local state for instant UI feedback
    setBills(prev => prev.filter(b => b._id !== id));
    try {
      await axios.delete(`${API_URL}/expenses/${id}`);
      // Refetch to stay in sync with server
      fetchBills();
    } catch (err) {
      console.error('Delete bill error:', err);
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
      // Restore on error
      fetchBills();
    }
  };

  const uploadProofForBill = async (id, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('paymentProof', file);
      await axios.put(`${API_URL}/expenses/${id}/attach-proof`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchBills();
    } catch (err) {
      console.error('Upload proof error:', err);
      alert('Failed to attach proof: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Payment History functions ---
  const fetchPaymentHistory = async (bill) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/expenses/history`, {
        params: { title: bill.title, category: bill.category }
      });
      setHistoryData(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = (bill) => {
    setHistoryModalBill(bill);
    setBackfillResult(null);
    setShowBackfillForm(false);
    setBackfillForm({ startDate: '', paymentMode: 'Cash' });
    setHistoryData({ records: [], totalPaid: 0, count: 0 });
    fetchPaymentHistory(bill);
  };

  const submitBackfill = async () => {
    if (!historyModalBill || !backfillForm.startDate) return;
    setBackfillLoading(true);
    try {
      const res = await axios.post(`${API_URL}/expenses/history-backfill`, {
        title: historyModalBill.title,
        category: historyModalBill.category,
        amount: historyModalBill.amount,
        frequency: historyModalBill.frequency || 'Monthly',
        startDate: backfillForm.startDate,
        details: historyModalBill.details || {}
      });
      setBackfillResult(res.data);
      setShowBackfillForm(false);
      fetchPaymentHistory(historyModalBill);
      fetchBills();
    } catch (err) {
      console.error('Backfill failed', err);
      alert('Backfill failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setBackfillLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'House Rent': return <Home size={24} color="var(--accent-primary)" />;
      case 'Godown Rent': return <Package size={24} color="#f59e0b" />;
      case 'Electricity': return <Zap size={24} color="#eab308" />;
      case 'Phone': return <Smartphone size={24} color="#10b981" />;
      case 'Internet': return <Wifi size={24} color="#06b6d4" />;
      case 'School Fees': return <GraduationCap size={24} color="#8b5cf6" />;
      default: return <CreditCard size={24} color="var(--text-muted)" />;
    }
  };

  const renderDynamicFields = () => {
    const selectedCat = categories.find(c => c.name === formData.category);
    if (!selectedCat || !selectedCat.fields || selectedCat.fields.length === 0) return null;

    return selectedCat.fields.map(field => {
      const value = formData.details[field.name] || '';
      const handleChange = (e) => handleDetailsChange(field.name, e.target.value);

      switch (field.type) {
        case 'select':
          return (
            <div key={field.name} className="form-group">
              <label className="form-label">{field.label}</label>
              <select className="form-select" value={value} onChange={handleChange} required={field.required}>
                <option value="">-- Select {field.label} --</option>
                {field.options && field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          );

        case 'date':
          return (
            <div key={field.name} className="form-group">
              <label className="form-label">{field.label}</label>
              <input type="date" className="form-input" value={value} onChange={handleChange} required={field.required} />
            </div>
          );

        case 'textarea':
          return (
            <div key={field.name} className="form-group">
              <label className="form-label">{field.label}</label>
              <textarea className="form-input" value={value} onChange={handleChange} required={field.required} rows={3} style={{resize: 'vertical', minHeight: '80px'}} />
            </div>
          );

        case 'checkbox':
          return (
            <div key={field.name} className="form-group" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <input type="checkbox" id={`field-${field.name}`} checked={value === 'true' || value === true} 
                onChange={(e) => handleDetailsChange(field.name, e.target.checked ? 'true' : 'false')} 
                style={{width: '20px', height: '20px', accentColor: 'var(--accent-primary)'}} />
              <label htmlFor={`field-${field.name}`} className="form-label" style={{marginBottom: 0, cursor: 'pointer'}}>{field.label}</label>
            </div>
          );

        case 'percentage':
          return (
            <div key={field.name} className="form-group">
              <label className="form-label">{field.label}</label>
              <div style={{position: 'relative'}}>
                <input type="number" className="form-input" value={value} onChange={handleChange} required={field.required} min="0" max="100" step="0.01" style={{paddingRight: '2.5rem'}} />
                <span style={{position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600}}>%</span>
              </div>
            </div>
          );

        default:
          // text, number, email, tel, url
          return (
            <div key={field.name} className="form-group">
              <label className="form-label">{field.label}</label>
              <input 
                type={field.type || 'text'} 
                className="form-input" 
                value={value} 
                onChange={handleChange} 
                required={field.required} 
              />
            </div>
          );
      }
    });
  };

  const currentCategoryBillers = uniqueBillersByCategory[formData.category] || [];

  const categoryName = selectedCategory ? selectedCategory.name : 'Bills & Expenses';
  const categoryModule = selectedCategory ? selectedCategory.module : '';
  const filteredBills = selectedCategory ? bills.filter(b => b.category === selectedCategory.name) : bills;
  const searchedBaseBills = searchQuery.trim() !== ''
    ? filteredBills.filter(b => {
        const q = searchQuery.toLowerCase();
        if (b.title?.toLowerCase().includes(q)) return true;
        if (b.category?.toLowerCase().includes(q)) return true;
        if (b.details) {
          return Object.values(b.details).some(val => String(val).toLowerCase().includes(q));
        }
        return false;
      })
    : filteredBills;

  const displayBills = showClosed ? searchedBaseBills : searchedBaseBills.filter(b => b.status === 'Unpaid');

  const isInsuranceCategory = selectedCategory?.module === 'insurances';
  const isLoanCategory = selectedCategory?.module === 'loans';
  const hasPaymentHistory = isInsuranceCategory || isLoanCategory;
  const activeRecords = searchedBaseBills.filter(b => b.status === 'Unpaid').length;
  const normalizedMonthlyTotal = searchedBaseBills.filter(b => b.status === 'Unpaid').reduce((sum, b) => sum + b.amount, 0);
  const totalPaidAllTime = hasPaymentHistory
    ? searchedBaseBills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.amount, 0)
    : 0;

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)'}}>
      
      {/* HEADER SECTION */}
      <div style={{marginBottom: '2rem'}}>
        {selectedCategory && (
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem'}}>
            {categoryModule}
          </div>
        )}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <div style={{color: 'var(--accent-secondary)'}}>
               {getCategoryIcon(categoryName)}
            </div>
            <h1 className="page-title" style={{margin: 0}}>{categoryName}</h1>
          </div>
          <button className="btn" onClick={() => setIsDrawerOpen(true)} style={{background: 'var(--bg-sidebar)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '500'}}>
            <span>+</span> Add current {categoryName.toLowerCase()}
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
        <div className="glass-card" style={{flex: '1', minWidth: '250px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', borderRadius: '8px'}}>
          <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Active records</div>
          <div style={{fontSize: '2rem', fontWeight: '600', color: 'var(--accent-secondary)', fontFamily: 'Merriweather, serif'}}>{activeRecords}</div>
        </div>
        <div className="glass-card" style={{flex: '1', minWidth: '250px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-danger)', boxShadow: 'var(--glass-shadow)', borderRadius: '8px'}}>
          <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Normalized monthly total</div>
          <div style={{fontSize: '2rem', fontWeight: '600', color: 'var(--accent-secondary)', fontFamily: 'Merriweather, serif'}}>₹{normalizedMonthlyTotal.toLocaleString()}</div>
        </div>
        {hasPaymentHistory && (
          <div className="glass-card" style={{flex: '1', minWidth: '250px', padding: '1.5rem', background: 'linear-gradient(135deg, #064e3b, #065f46)', border: '1px solid #059669', borderLeft: '4px solid #4ade80', boxShadow: 'var(--glass-shadow)', borderRadius: '8px'}}>
            <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem'}}>Total Paid (All Time)</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#4ade80', fontFamily: 'Merriweather, serif'}}>₹{totalPaidAllTime.toLocaleString()}</div>
            <div style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem'}}>{searchedBaseBills.filter(b => b.status === 'Paid').length} instalment(s) recorded</div>
          </div>
        )}
        <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto', padding: '1rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.8rem'}}>
             <span style={{color: 'var(--text-muted)'}}>🔍</span>
             <input 
               type="text" 
               placeholder="Filter by name..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-main)', width: '180px'}}
             />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <input 
              type="checkbox" 
              id="showClosed" 
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              style={{width: '16px', height: '16px', accentColor: 'var(--accent-secondary)'}}
            />
            <label htmlFor="showClosed" style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>Show closed / one-time settled</label>
          </div>
        </div>
      </div>
      
      {/* MODERN LIST VIEW */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        {displayBills.length === 0 && (
          <div className="glass-card" style={{textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--glass-shadow)'}}>
            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic'}}>No {categoryName.toLowerCase()} records yet. Add the first one.</p>
          </div>
        )}

        {displayBills.map(bill => (
          <div key={bill._id} className="glass-card" style={{
            display: 'flex', alignItems: 'center', padding: '1.5rem', 
            transition: 'transform 0.2s, background 0.2s', cursor: 'default',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--glass-shadow)',
            borderRadius: '12px'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
          >
            {/* 1. Category Icon Box */}
            <div style={{
              width: '50px', height: '50px', borderRadius: '12px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginRight: '1.5rem'
            }}>
              {getCategoryIcon(bill.category)}
            </div>

            {/* 2. Vendor Name & Specifics */}
            <div style={{flex: 1, minWidth: '200px'}}>
              <h3 style={{fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.25rem', letterSpacing: '0.5px'}}>{bill.title}</h3>
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center'}}>
                <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{bill.category} &bull; {bill.frequency}</span>
                {bill.details && Object.entries(bill.details).map(([k,v]) => (
                  <span key={k} style={{
                    fontSize: '0.75rem', background: 'var(--bg-main)', 
                    border: '1px solid var(--border-color)',
                    padding: '0.15rem 0.5rem', borderRadius: '12px', color: 'var(--text-muted)'
                  }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Due Date & Payment Info */}
            <div style={{flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              {bill.status === 'Unpaid' ? (
                <>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem'}}>Due Date</div>
                  <div style={{fontWeight: '500'}}>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem'}}>Paid Via {bill.paymentMode}</div>
                  <div style={{fontWeight: '500', color: 'var(--accent-success)'}}>{bill.paidDate ? new Date(bill.paidDate).toLocaleDateString() : 'N/A'}</div>
                  {bill.paymentProof && (
                    <a
                      href={`${SERVER_URL}/${bill.paymentProof.replace(/\\/g, '/')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginTop: '0.35rem',
                        fontSize: '0.75rem',
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: '4px',
                        padding: '0.15rem 0.5rem',
                        fontWeight: '500'
                      }}
                    >
                      📎 View Proof
                    </a>
                  )}
                </>
              )}
            </div>

            {/* 4. Amount */}
            <div style={{textAlign: 'right', minWidth: '120px'}}>
              <div style={{fontSize: '1.4rem', fontWeight: '700', color: bill.status === 'Paid' ? 'var(--text-main)' : 'var(--accent-danger)'}}>
                ₹{bill.amount.toLocaleString()}
              </div>
              <span className={`badge ${bill.status === 'Paid' ? 'badge-success' : 'badge-danger'}`} style={{marginTop: '0.5rem', display: 'inline-block'}}>
                {bill.status}
              </span>
            </div>

            {/* 5. Actions */}
            <div style={{minWidth: '140px', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingLeft: '1rem', alignItems: 'center'}}>
              {bill.status === 'Unpaid' ? (
                <>
                  {/* Edit / Cancel buttons */}
                  <button
                    type="button"
                    onClick={() => startEditBill(bill)}
                    style={{
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                      color: 'var(--accent-primary)', padding: '0.45rem', borderRadius: '6px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Edit Amount / Details"
                  >
                    <Edit2 size={16} />
                  </button>

                    {/* Delete bill button */}
                    <button
                      type="button"
                      onClick={() => deleteBill(bill._id)}
                      style={{
                        background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                        color: '#dc2626', padding: '0.45rem', borderRadius: '6px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Delete this entry"
                    >
                      🗑
                    </button>

                    {/* Payment History button for insurance and loan categories */}
                    {hasPaymentHistory && (
                      <button
                        onClick={() => openHistoryModal(bill)}
                        title="View payment history"
                        style={{
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.4)',
                          color: '#6366f1', padding: '0.45rem 0.75rem', borderRadius: '6px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                          fontWeight: '600', fontSize: '0.82rem', whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#6366f1'; }}
                      >
                        <History size={14} /> History
                      </button>
                    )}

                    {/* Show 'View Ledger' for lending/borrowing categories */}
                    {(bill.category?.toLowerCase().includes('lending') || 
                      bill.category?.toLowerCase().includes('interest given') ||
                      bill.category?.toLowerCase().includes('borrowing') ||
                      bill.category?.toLowerCase().includes('interest taken')) ? (
                      <button onClick={() => setLendingLedgerBill(bill)} style={{
                        background: '#fef3c7', border: '1px solid #f59e0b',
                        color: '#92400e', padding: '0.5rem 1rem', borderRadius: '6px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                      }}>
                        📒 View Ledger
                      </button>
                    ) : bill.category?.toLowerCase().includes('mutual funds') ? (
                      <button onClick={() => setInvestmentLedgerBill(bill)} style={{
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.4)',
                        color: 'var(--accent-primary)', padding: '0.5rem 1rem', borderRadius: '6px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                      }}>
                        📈 View Ledger
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setExpenseLedgerBill(bill)} style={{
                          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#10b981', padding: '0.5rem 1rem', borderRadius: '6px',
                          fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                        }}>
                          📒 View Ledger
                        </button>
                        <button onClick={() => openPaymentModal(bill)} style={{
                          background: 'transparent', border: '1px solid var(--accent-success)',
                          color: 'var(--accent-success)', padding: '0.5rem 1rem', borderRadius: '6px',
                          fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-success)'; }}
                        >
                          Pay Now
                        </button>
                      </>
                    )}
                  </>
              ) : (
                /* Paid bill actions */
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                  {!bill.paymentProof ? (
                    <label style={{
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
                      color: 'var(--accent-primary)', padding: '0.45rem 0.75rem', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap'
                    }} title="Attach payment proof">
                      📎 Attach Proof
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        style={{display: 'none'}}
                        onChange={(e) => uploadProofForBill(bill._id, e.target.files[0])}
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteBill(bill._id)}
                    style={{
                      background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                      color: '#dc2626', padding: '0.45rem', borderRadius: '6px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Delete this entry"
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* NEW ENTRY MODAL */}
      {/* ============================================================ */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fffdf6',
              borderRadius: '12px',
              width: '680px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              color: 'var(--text-main)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.75rem 2rem 1.25rem',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <h2 style={{ fontFamily: 'Merriweather, serif', fontSize: '1.4rem', color: '#1e293b', margin: 0 }}>{isDrawerEditMode ? 'Edit entry' : 'New entry'}</h2>
              <button
                onClick={() => { setIsDrawerOpen(false); setIsDrawerEditMode(false); setEditingBillId(null); }}
                style={{
                  background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1
                }}
              >×</button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>

              {/* ---- Category (grouped select) ---- */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Category</label>
                {(() => {
                  // Group categories by module
                  const moduleLabel = { expenses: 'Fixed bills', insurances: 'Insurance', investments: 'Investments', loans: 'Loans', properties: 'Property & family', lending: 'Lending & borrowing', other: 'Other' };
                  const grouped = categories.reduce((acc, cat) => {
                    const m = cat.module || 'expenses';
                    if (!acc[m]) acc[m] = [];
                    acc[m].push(cat);
                    return acc;
                  }, {});
                  return (
                    <select
                      value={formData.category}
                      onChange={handleCategoryChange}
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        border: '1px solid var(--border-color)', borderRadius: '8px',
                        background: 'white', fontSize: '0.95rem',
                        color: '#1e293b', cursor: 'pointer',
                        appearance: 'auto'
                      }}
                    >
                      {Object.entries(grouped).map(([mod, cats]) => (
                        <optgroup key={mod} label={moduleLabel[mod] || mod}>
                          {cats.map(cat => (
                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* ---- Dynamic Category-specific fields (rendered as 2-col grid) ---- */}
              {(() => {
                const selectedCat = categories.find(c => c.name === formData.category);
                if (!selectedCat?.fields?.length) return null;
                // Pair fields into rows of 2
                const rows = [];
                for (let i = 0; i < selectedCat.fields.length; i += 2) {
                  rows.push(selectedCat.fields.slice(i, i + 2));
                }
                return rows.map((pair, ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    {pair.map(field => {
                      const value = formData.details[field.name] || '';
                      const onChange = (e) => handleDetailsChange(field.name, e.target.value);
                      const inputStyle = { width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' };
                      return (
                        <div key={field.name}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{field.label}</label>
                          {field.type === 'select' ? (
                            <select value={value} onChange={onChange} style={inputStyle}>
                              <option value="">Choose...</option>
                              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea value={value instanceof File ? '' : value} onChange={onChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                          ) : field.type === 'file' ? (
                            <input type="file" onChange={(e) => handleDetailsChange(field.name, e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg" style={{...inputStyle, padding: '0.5rem 1rem'}} />
                          ) : (
                            <input type={field.type || 'text'} value={value instanceof File ? '' : value} onChange={onChange} placeholder={field.label} style={inputStyle} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              {/* ---- Amount + Frequency ---- */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                  >
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Half-Yearly</option>
                    <option>Yearly</option>
                    <option>One-time</option>
                  </select>
                </div>
              </div>

              {/* ---- Next due date ---- */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Next due date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                  />
                </div>
                <div></div>
              </div>

              {/* ---- Remarks ---- */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Remarks</label>
                <textarea
                  placeholder="Any remarks..."
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b', resize: 'vertical' }}
                />
              </div>

              {/* ---- Payment Proof Upload (shown for Other expenses) ---- */}
              {formData.category === 'Other expenses' && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(16,185,129,0.05)', border: '1px dashed rgba(16,185,129,0.4)', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#059669', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📎 Payment Proof (optional)
                  </label>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Upload a screenshot or PDF of the payment made (UPI receipt, bank transfer, etc.)
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setFormData({ ...formData, paymentProofFile: e.target.files[0] || null })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'white', fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}
                  />
                  {formData.paymentProofFile && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      ✅ {formData.paymentProofFile.name}
                      <button type="button" onClick={() => setFormData({ ...formData, paymentProofFile: null })} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.3rem' }}>✕ Remove</button>
                    </div>
                  )}
                </div>
              )}

              {/* ---- Footer buttons ---- */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: '1rem',
                paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); setIsDrawerEditMode(false); setEditingBillId(null); }}
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'white',
                    color: '#1e293b', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '500'
                  }}
                >Cancel</button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '8px',
                    border: 'none', background: '#1e293b',
                    color: 'white', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600'
                  }}
                >{isDrawerEditMode ? 'Save Changes' : 'Add to register'}</button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && selectedBillForPayment && (
        <div
          onClick={() => setIsPaymentModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fffdf6', borderRadius: '12px', width: '500px',
              maxWidth: '95vw', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--text-main)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid var(--border-color)'
            }}>
              <h2 style={{ fontFamily: 'Merriweather, serif', fontSize: '1.4rem', color: '#1e293b', margin: 0 }}>Log Payment</h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{
                  background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1
                }}
              >×</button>
            </div>

            <form onSubmit={submitPayment} style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Paying for</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>{selectedBillForPayment.title}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-primary)' }}>₹{selectedBillForPayment.amount.toLocaleString()}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Payment Mode</label>
                  <select 
                    value={paymentDetails.paymentMode} 
                    onChange={(e) => setPaymentDetails({...paymentDetails, paymentMode: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                  >
                    <option>UPI / PhonePe</option>
                    <option>Google Pay</option>
                    <option>Internet Banking</option>
                    <option>Credit Card</option>
                    <option>Debit Card</option>
                    <option>Cash</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Date Paid</label>
                  <input 
                    type="date" 
                    required 
                    value={paymentDetails.paidDate} 
                    onChange={(e) => setPaymentDetails({...paymentDetails, paidDate: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                  />
                </div>
              </div>

              {paymentDetails.paymentMode === 'Credit Card' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select Credit Card</label>
                  <select 
                    value={paymentDetails.cardUsed} 
                    required
                    onChange={(e) => setPaymentDetails({...paymentDetails, cardUsed: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                  >
                    <option value="">Choose a card...</option>
                    <option>HDFC Millennia</option>
                    <option>SBI SimplyClick</option>
                    <option>ICICI Amazon Pay</option>
                    <option>Axis Ace</option>
                    <option>Other</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Reference / Transaction ID</label>
                <input 
                  type="text" 
                  placeholder="Optional (e.g. UTR Number)" 
                  value={paymentDetails.referenceNumber} 
                  onChange={(e) => setPaymentDetails({...paymentDetails, referenceNumber: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', fontSize: '0.95rem', color: '#1e293b' }}
                />
              </div>

              {/* Payment Proof Upload */}
              <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f0fdf4', border: '1px dashed #86efac', borderRadius: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#15803d', marginBottom: '0.5rem' }}>📎 Payment Proof (Screenshot / PDF)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setPaymentDetails({...paymentDetails, paymentProofFile: e.target.files[0]})}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem', color: '#1e293b' }}
                />
                <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.4rem' }}>Optional — attach your payment screenshot or receipt PDF</div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: '1rem',
                paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'white',
                    color: '#1e293b', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '500'
                  }}
                >Cancel</button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '8px',
                    border: 'none', background: '#10b981',
                    color: 'white', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600'
                  }}
                >Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LENDING LEDGER MODAL */}
      {lendingLedgerBill && (
        <LendingLedgerModal 
          bill={lendingLedgerBill} 
          onClose={() => setLendingLedgerBill(null)} 
        />
      )}

      {/* INVESTMENT LEDGER MODAL */}
      {investmentLedgerBill && (
        <InvestmentLedgerModal 
          bill={investmentLedgerBill} 
          onClose={() => setInvestmentLedgerBill(null)} 
        />
      )}

      {/* EXPENSE LEDGER MODAL (INTERNET, RENT, ETC) */}
      {expenseLedgerBill && (
        <ExpenseLedgerModal 
          bill={expenseLedgerBill} 
          onClose={() => setExpenseLedgerBill(null)} 
        />
      )}

      {/* ============================================================ */}
      {/* PAYMENT HISTORY MODAL */}
      {/* ============================================================ */}
      {historyModalBill && (
        <div
          onClick={() => setHistoryModalBill(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: '16px', width: '700px',
              maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto',
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)', color: 'var(--text-main)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            {/* ---- Header ---- */}
            <div style={{
              padding: '1.75rem 2rem 1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '16px 16px 0 0',
              flexShrink: 0
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div>
                  <div style={{fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem'}}>Payment History</div>
                  <h2 style={{fontSize: '1.3rem', fontWeight: '700', color: 'white', margin: 0, fontFamily: 'Merriweather, serif'}}>{historyModalBill.title}</h2>
                  <div style={{fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.4rem'}}>
                    {historyModalBill.category} &bull; {historyModalBill.frequency} &bull; ₹{historyModalBill.amount?.toLocaleString()}/instalment
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalBill(null)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px', width: '34px', height: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0
                  }}
                >×</button>
              </div>

              {/* ---- Stats banner ---- */}
              <div style={{marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem'}}>
                <div style={{background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.08)'}}>
                  <div style={{fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Total Paid</div>
                  <div style={{fontSize: '1.4rem', fontWeight: '800', color: '#4ade80'}}>₹{historyData.totalPaid.toLocaleString()}</div>
                </div>
                <div style={{background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.08)'}}>
                  <div style={{fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Instalments Paid</div>
                  <div style={{fontSize: '1.4rem', fontWeight: '800', color: '#60a5fa'}}>{historyData.count}</div>
                </div>
                <div style={{background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.08)'}}>
                  <div style={{fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Per Instalment</div>
                  <div style={{fontSize: '1.4rem', fontWeight: '800', color: '#f9a8d4'}}>₹{(historyModalBill.amount || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* ---- Body ---- */}
            <div style={{padding: '1.5rem 2rem', flex: 1}}>

              {/* Backfill prompt */}
              {!showBackfillForm && !backfillResult && (
                <div style={{
                  marginBottom: '1.5rem', padding: '1rem 1.25rem',
                  background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'
                }}>
                  <div>
                    <div style={{fontWeight: '700', fontSize: '0.9rem', color: '#92400e'}}>📅 Fill payment history from {historyModalBill?.category?.toLowerCase().includes('loan') ? 'loan' : 'policy'} start date</div>
                    <div style={{fontSize: '0.78rem', color: '#b45309', marginTop: '0.25rem'}}>Auto-generates all past paid months. Won't create duplicates.</div>
                  </div>
                  <button
                    onClick={() => setShowBackfillForm(true)}
                    style={{
                      background: '#f59e0b', border: 'none', color: 'white',
                      padding: '0.6rem 1.2rem', borderRadius: '8px',
                      fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >+ Backfill History</button>
                </div>
              )}

              {/* Backfill form */}
              {showBackfillForm && (
                <div style={{
                  marginBottom: '1.5rem', padding: '1.25rem',
                  background: '#fefce8', border: '1px solid #fde047', borderRadius: '10px'
                }}>
                  <div style={{fontWeight: '700', fontSize: '0.95rem', color: '#713f12', marginBottom: '1rem'}}>📅 Backfill Payment History</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                    <div>
                      <label style={{display: 'block', fontSize: '0.78rem', color: '#92400e', marginBottom: '0.4rem', fontWeight: '600'}}>{historyModalBill?.category?.toLowerCase().includes('loan') ? 'Loan' : 'Policy'} Start Date *</label>
                      <input
                        type="date"
                        value={backfillForm.startDate}
                        onChange={e => setBackfillForm({...backfillForm, startDate: e.target.value})}
                        style={{width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #fde047', borderRadius: '7px', background: 'white', fontSize: '0.9rem', color: '#1e293b', boxSizing: 'border-box'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', fontSize: '0.78rem', color: '#92400e', marginBottom: '0.4rem', fontWeight: '600'}}>Default Payment Mode</label>
                      <select
                        value={backfillForm.paymentMode}
                        onChange={e => setBackfillForm({...backfillForm, paymentMode: e.target.value})}
                        style={{width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #fde047', borderRadius: '7px', background: 'white', fontSize: '0.9rem', color: '#1e293b'}}
                      >
                        <option>Cash</option>
                        <option>UPI / PhonePe</option>
                        <option>Internet Banking</option>
                        <option>Salary Deduction</option>
                        <option>Post Office</option>
                      </select>
                    </div>
                  </div>
                  {backfillForm.startDate && (
                    <div style={{fontSize: '0.8rem', color: '#92400e', marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(245,158,11,0.12)', borderRadius: '7px'}}>
                      ⚠️ Will create approximately <strong>{Math.max(0, Math.ceil((new Date() - new Date(backfillForm.startDate)) / (30.44 * 24 * 3600 * 1000)))}</strong> monthly entries &times; <strong>₹{(historyModalBill.amount || 0).toLocaleString()}</strong> each. Existing months are skipped automatically.
                    </div>
                  )}
                  <div style={{display: 'flex', gap: '0.75rem'}}>
                    <button
                      onClick={submitBackfill}
                      disabled={!backfillForm.startDate || backfillLoading}
                      style={{
                        background: backfillLoading || !backfillForm.startDate ? '#d1d5db' : '#15803d',
                        border: 'none', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '8px',
                        fontWeight: '700', cursor: backfillLoading || !backfillForm.startDate ? 'not-allowed' : 'pointer', fontSize: '0.9rem'
                      }}
                    >{backfillLoading ? '⏳ Creating entries...' : '✅ Confirm Backfill'}</button>
                    <button
                      onClick={() => setShowBackfillForm(false)}
                      style={{background: 'white', border: '1px solid #d1d5db', color: '#374151', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem'}}
                    >Cancel</button>
                  </div>
                </div>
              )}

              {/* Backfill result banner */}
              {backfillResult && (
                <div style={{
                  marginBottom: '1.5rem', padding: '1rem 1.25rem',
                  background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{fontWeight: '700', color: '#15803d', fontSize: '0.95rem'}}>✅ Backfill Complete!</div>
                    <div style={{fontSize: '0.82rem', color: '#16a34a', marginTop: '0.25rem'}}>
                      Created <strong>{backfillResult.created}</strong> new entries &bull; <strong>{backfillResult.skipped}</strong> existing month(s) skipped
                    </div>
                  </div>
                  <button onClick={() => setBackfillResult(null)} style={{background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1}}>×</button>
                </div>
              )}

              {/* Payment records */}
              {historyLoading ? (
                <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                  <div style={{fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite'}}>⏳</div>
                  <div>Loading payment history...</div>
                </div>
              ) : historyData.records.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '3rem 2rem',
                  background: 'var(--bg-main)', border: '1px dashed var(--border-color)',
                  borderRadius: '12px', color: 'var(--text-muted)'
                }}>
                  <div style={{fontSize: '2.5rem', marginBottom: '0.75rem'}}>📭</div>
                  <div style={{fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-main)'}}>No payment history found</div>
                  <div style={{fontSize: '0.85rem'}}>Use <strong>"Backfill History"</strong> above to auto-generate all past paid records from your policy start date.</div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em'}}>
                    {historyData.count} payment{historyData.count !== 1 ? 's' : ''} recorded
                  </div>

                  {/* Records list */}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.25rem'}}>
                    {[...historyData.records].reverse().map((record, idx) => {
                      const d = record.paidDate || record.dueDate;
                      const date = d ? new Date(d) : null;
                      const isEven = idx % 2 === 0;
                      return (
                        <div key={record._id} style={{
                          display: 'flex', alignItems: 'center',
                          padding: '0.7rem 1rem',
                          background: isEven ? 'var(--bg-main)' : 'var(--bg-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          transition: 'background 0.15s'
                        }}>
                          {/* Serial number */}
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: '#dcfce7', color: '#15803d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: '800', flexShrink: 0, marginRight: '0.85rem'
                          }}>{historyData.count - idx}</div>

                          {/* Month & mode */}
                          <div style={{flex: 1}}>
                            <div style={{fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)'}}>
                              {date ? date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'N/A'}
                            </div>
                            {record.paymentMode && (
                              <div style={{fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem'}}>via {record.paymentMode}</div>
                            )}
                          </div>

                          {/* Amount + badge */}
                          <div style={{textAlign: 'right'}}>
                            <div style={{fontWeight: '700', color: '#15803d', fontSize: '0.92rem'}}>₹{(record.amount || 0).toLocaleString()}</div>
                            <div style={{display: 'inline-block', fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.45rem', borderRadius: '10px', fontWeight: '700', marginTop: '0.2rem', letterSpacing: '0.05em'}}>✓ PAID</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand total footer */}
                  <div style={{
                    marginTop: '1rem', padding: '1rem 1.25rem',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem'}}>Total {historyModalBill?.category?.toLowerCase().includes('loan') ? 'EMI' : 'Premium'} Paid (All Time)</div>
                      <div style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem'}}>{historyData.count} instalments &times; ₹{(historyModalBill.amount || 0).toLocaleString()}</div>
                    </div>
                    <div style={{color: '#4ade80', fontWeight: '800', fontSize: '1.5rem', fontFamily: 'Merriweather, serif'}}>₹{historyData.totalPaid.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
