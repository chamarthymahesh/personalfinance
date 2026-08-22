import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Settings2, Edit2, Check, X } from 'lucide-react';

import { API_URL } from '../config';


export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryModule, setNewCategoryModule] = useState('expenses');
  const [isCustomModule, setIsCustomModule] = useState(false);
  const [customModuleName, setCustomModuleName] = useState('');
  
  const [newField, setNewField] = useState({
    categoryId: '',
    name: '',
    label: '',
    type: 'text',
    options: '', // comma separated string
    required: false
  });

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryModule, setEditCategoryModule] = useState('');


  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const finalModule = isCustomModule ? customModuleName.trim() : newCategoryModule;
    if (!finalModule) return alert('Please specify a module name.');

    try {
      await axios.post(`${API_URL}/categories`, { name: newCategoryName, module: finalModule, fields: [] });
      setNewCategoryName('');
      setCustomModuleName('');
      setIsCustomModule(false);
      setNewCategoryModule('expenses');
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Error creating category. It might already exist.');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`${API_URL}/categories/${id}`);
      setCategories(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    }
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setEditCategoryName(category.name);
    setEditCategoryModule(category.module || 'expenses');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryModule('');
  };

  const saveEditCategory = async (id) => {
    if (!editCategoryName.trim()) return alert('Category name cannot be empty');
    try {
      const res = await axios.put(`${API_URL}/categories/${id}`, {
        name: editCategoryName.trim(),
        module: editCategoryModule
      });
      setCategories(prev => prev.map(c => c._id === id ? res.data : c));
      setEditingCategoryId(null);
    } catch (err) {
      console.error('Edit error:', err);
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddField = async (categoryId) => {
    if (!newField.name || !newField.label) return alert("Name and Label are required");
    
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;

    const updatedFields = [...category.fields, { 
      name: newField.name, 
      label: newField.label, 
      type: newField.type, 
      required: newField.required,
      options: newField.type === 'select' ? newField.options.split(',').map(o => o.trim()).filter(o => o) : []
    }];

    try {
      await axios.put(`${API_URL}/categories/${categoryId}`, { fields: updatedFields });
      setNewField({ categoryId: '', name: '', label: '', type: 'text', options: '', required: false });
      fetchCategories();
    } catch (err) {
      console.error('Add field error:', err);
      alert('Failed to add field: ' + (err.response?.data?.error || err.message));
    }
  };

  const removeField = async (categoryId, fieldName) => {
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;
    
    const updatedFields = category.fields.filter(f => f.name !== fieldName);
    
    try {
      await axios.put(`${API_URL}/categories/${categoryId}`, { fields: updatedFields });
      fetchCategories();
    } catch (err) {
      console.error('Remove field error:', err);
      alert('Failed to remove field: ' + (err.response?.data?.error || err.message));
    }
  };

  // Group categories by module
  const groupedCategories = categories.reduce((acc, cat) => {
    const mod = cat.module || 'expenses';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(cat);
    return acc;
  }, {});

  const moduleNames = {
    expenses: 'Bills & Expenses',
    insurances: 'Insurances',
    investments: 'Investments',
    loans: 'Loans',
    properties: 'Properties'
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Admin Settings</h1>
        <p className="page-subtitle">Configure dynamic categories and custom required fields.</p>
      </div>

      <div className="dashboard-grid" style={{gridTemplateColumns: '1fr 2fr'}}>
        
        {/* ADD CATEGORY */}
        <div className="glass-card" style={{alignSelf: 'start', position: 'sticky', top: '2rem'}}>
          <h2 style={{marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Settings2 size={24} color="var(--accent-primary)" />
            Add New Category
          </h2>
          <form onSubmit={handleAddCategory}>
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="e.g., Car Insurance"
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Module / Section</label>
              <select 
                className="form-select" 
                value={isCustomModule ? 'custom' : newCategoryModule} 
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomModule(true);
                  } else {
                    setIsCustomModule(false);
                    setNewCategoryModule(e.target.value);
                  }
                }}
              >
                <option value="expenses">Bills & Expenses</option>
                <option value="insurances">Insurances</option>
                <option value="investments">Investments</option>
                <option value="loans">Loans</option>
                <option value="properties">Properties</option>
                {/* Dynamically add any custom modules already in the DB */}
                {Object.keys(groupedCategories).filter(k => !['expenses', 'insurances', 'investments', 'loans', 'properties'].includes(k)).map(customMod => (
                  <option key={customMod} value={customMod}>{customMod}</option>
                ))}
                <option value="custom" style={{fontWeight: 'bold', color: 'var(--accent-primary)'}}>+ Add Custom Module...</option>
              </select>
            </div>
            
            {isCustomModule && (
              <div className="form-group" style={{marginTop: '0.5rem'}}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={customModuleName} 
                  onChange={(e) => setCustomModuleName(e.target.value)} 
                  placeholder="Enter new module name (e.g. Travel)"
                  required 
                  autoFocus
                />
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem'}}>
              <Plus size={18} /> Create Category
            </button>
          </form>
        </div>

        {/* CATEGORY LIST & FIELD CONFIG */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
          {Object.entries(groupedCategories).map(([moduleKey, moduleCategories]) => (
            <div key={moduleKey}>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', paddingBottom: '0.5rem'}}>
                {moduleNames[moduleKey] || moduleKey} Categories
              </h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {moduleCategories.map(category => (
                  <div key={category._id} className="glass-card">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                      {editingCategoryId === category._id ? (
                        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, marginRight: '1rem'}}>
                          <div style={{flex: 1}}>
                            <label style={{fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>Name</label>
                            <input
                              type="text"
                              className="form-input"
                              style={{padding: '0.4rem 0.6rem', fontSize: '0.95rem'}}
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div style={{minWidth: '140px'}}>
                            <label style={{fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>Module</label>
                            <select
                              className="form-select"
                              style={{padding: '0.4rem 0.6rem', fontSize: '0.95rem'}}
                              value={editCategoryModule}
                              onChange={(e) => setEditCategoryModule(e.target.value)}
                            >
                              <option value="expenses">Bills & Expenses</option>
                              <option value="insurances">Insurances</option>
                              <option value="investments">Investments</option>
                              <option value="loans">Loans</option>
                              <option value="properties">Properties</option>
                              {Object.keys(groupedCategories).filter(k => !['expenses','insurances','investments','loans','properties'].includes(k)).map(cm => (
                                <option key={cm} value={cm}>{cm}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <h3 style={{fontSize: '1.25rem', color: 'var(--text-main)'}}>{category.name}</h3>
                      )}
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        {editingCategoryId === category._id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEditCategory(category._id)}
                              className="btn"
                              style={{background: 'rgba(34,197,94,0.15)', color: 'var(--accent-success)', padding: '0.5rem', cursor: 'pointer'}}
                              title="Save"
                            >
                              <Check size={18} style={{pointerEvents: 'none'}} />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditCategory}
                              className="btn"
                              style={{background: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)', padding: '0.5rem', cursor: 'pointer'}}
                              title="Cancel"
                            >
                              <X size={18} style={{pointerEvents: 'none'}} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); startEditCategory(category); }}
                              className="btn"
                              style={{background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '0.5rem', cursor: 'pointer'}}
                              title="Edit Category"
                            >
                              <Edit2 size={18} style={{pointerEvents: 'none'}} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category._id); }}
                              className="btn"
                              style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '0.5rem', cursor: 'pointer'}}
                              title="Delete Category"
                            >
                              <Trash2 size={18} style={{pointerEvents: 'none'}} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Existing Fields */}
                    <div style={{marginBottom: '1.5rem'}}>
                      <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Configured Fields:</h4>
                      {category.fields && category.fields.length > 0 ? (
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                          {category.fields.map(field => (
                            <div key={field.name} style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                              <div>
                                <div style={{fontWeight: '500', fontSize: '0.9rem'}}>{field.label}</div>
                                <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Type: {field.type} | Req: {field.required ? 'Yes' : 'No'}</div>
                              </div>
                              <button onClick={() => removeField(category._id, field.name)} style={{background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer'}}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>No custom fields defined.</div>
                      )}
                    </div>

                    {/* Add New Field Form */}
                    <div style={{background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)'}}>
                      <h4 style={{fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-primary)'}}>+ Add Custom Field</h4>
                      <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                        <div style={{flex: 1, minWidth: '130px'}}>
                          <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem'}}>DB Name (no spaces)</label>
                          <input type="text" className="form-input" style={{padding: '0.5rem'}} placeholder="e.g. termYears"
                            value={newField.categoryId === category._id ? newField.name : ''}
                            onChange={e => setNewField({...newField, categoryId: category._id, name: e.target.value})} />
                        </div>
                        <div style={{flex: 1, minWidth: '130px'}}>
                          <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem'}}>Display Label</label>
                          <input type="text" className="form-input" style={{padding: '0.5rem'}} placeholder="e.g. Term (Years)"
                            value={newField.categoryId === category._id ? newField.label : ''}
                            onChange={e => setNewField({...newField, categoryId: category._id, label: e.target.value})} />
                        </div>
                        <div style={{minWidth: '120px'}}>
                          <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem'}}>Field Type</label>
                          <select className="form-select" style={{padding: '0.5rem'}}
                            value={newField.categoryId === category._id ? newField.type : 'text'}
                            onChange={e => setNewField({...newField, categoryId: category._id, type: e.target.value})}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date / Calendar</option>
                            <option value="select">Dropdown</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone Number</option>
                            <option value="textarea">Long Text / Notes</option>
                            <option value="url">URL / Link</option>
                            <option value="checkbox">Yes / No (Checkbox)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                        </div>
                        {newField.categoryId === category._id && newField.type === 'select' && (
                          <div style={{flex: 2, minWidth: '200px'}}>
                            <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem'}}>Options (comma separated)</label>
                            <input type="text" className="form-input" style={{padding: '0.5rem'}} placeholder="e.g. Monthly, Quarterly, Yearly"
                              value={newField.options}
                              onChange={e => setNewField({...newField, options: e.target.value})} />
                          </div>
                        )}
                        <div style={{paddingTop: '1.5rem'}}>
                          <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem'}}>Req?</label>
                          <input type="checkbox" style={{width: '20px', height: '20px'}}
                            checked={newField.categoryId === category._id ? newField.required : false}
                            onChange={e => setNewField({...newField, categoryId: category._id, required: e.target.checked})} />
                        </div>
                        <button onClick={() => handleAddField(category._id)} className="btn" style={{background: 'var(--accent-success)', color: 'white', padding: '0.5rem 1rem', marginTop: '1.25rem'}}>
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
