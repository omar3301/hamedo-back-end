import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const CAT_COLORS = {
  all:         '#A78BFA',
  Rackets:     '#F4C430',
  Shoes:       '#34D399',
  Accessories: '#60A5FA',
  Clothes:     '#F472B6',
};

const CATS = ['all', 'Rackets', 'Shoes', 'Accessories', 'Clothes'];

export default function Products({ onNew, onEdit }) {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [q,        setQ]        = useState('');
  const [cat,      setCat]      = useState('all');
  const [delId,    setDelId]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.search = q;
      const data = await api.getProducts(params);
      // Filter by category client-side
      const filtered = cat === 'all' ? data : data.filter(p => p.category === cat);
      setProducts(filtered);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, cat]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, e) => {
    e.stopPropagation();
    try {
      const updated = await api.toggleProduct(id);
      setProducts(prev => prev.map(p => p._id === id ? updated : p));
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    try { await api.deleteProduct(id); setDelId(null); load(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-desc">{products.length} products in store</p>
        </div>
        <button className="btn-primary" onClick={onNew}>+ New Product</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={e => { e.preventDefault(); setQ(search); }} className="search-form">
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, brand…"/>
          <button type="submit" className="btn-ghost">Search</button>
          {q && <button type="button" className="btn-ghost" onClick={() => { setQ(''); setSearch(''); }}>✕</button>}
        </form>
        <div className="status-tabs">
          {CATS.map(c => (
            <button
              key={c}
              className={`tab${cat === c ? ' active' : ''}`}
              style={cat === c ? { borderColor: CAT_COLORS[c], color: CAT_COLORS[c], background: CAT_COLORS[c]+'22' } : {}}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner"/></div> : (
        <div className="products-grid">
          {products.map(p => {
            const img = p.variants?.[0]?.images?.[0] || '';
            const allSizes = [...new Set(p.variants?.flatMap(v => v.sizes?.map(s => s.label || s)) || [])];
            const catColor = CAT_COLORS[p.category] || '#888';
            return (
              <div key={p._id} className={`product-card${!p.active ? ' inactive' : ''}`}>
                <div className="pc-img-wrap">
                  {img
                    ? <img src={img} alt={p.name} className="pc-img" onError={e => e.target.style.opacity='0.1'}/>
                    : <div className="pc-img-placeholder">No image</div>
                  }
                  {p.badge && <div className="pc-badge">{p.badge}</div>}
                  {!p.active && <div className="pc-inactive-tag">HIDDEN</div>}
                  {/* Category tag — NOT sport */}
                  <div className="pc-sport-tag" style={{ background: catColor+'33', color: catColor }}>
                    {p.category || 'Uncategorised'}
                  </div>
                </div>

                <div className="pc-info">
                  <div className="pc-brand">{p.brand}</div>
                  <div className="pc-name">{p.name}</div>
                  {p.subtitle && <div className="pc-subtitle">{p.subtitle}</div>}
                  <div className="pc-price">{(p.price || 0).toLocaleString()} EGP</div>
                  <div className="pc-variants">
                    {p.variants?.length > 0 && (
                      <div className="pc-colors">
                        {p.variants.slice(0,5).map((v,i) => (
                          <div key={i} className="color-dot" style={{ background: v.colorHex||'#888' }} title={v.color}/>
                        ))}
                        {p.variants.length > 5 && <span className="more-colors">+{p.variants.length-5}</span>}
                      </div>
                    )}
                    {allSizes.length > 0 && (
                      <div className="pc-sizes">{allSizes.slice(0,6).join(' · ')}{allSizes.length>6?'…':''}</div>
                    )}
                  </div>
                </div>

                <div className="pc-actions">
                  <button className="btn-icon" onClick={() => onEdit(p._id)} title="Edit">✏️</button>
                  <button className={`btn-icon ${p.active?'yellow':'green'}`} onClick={e => handleToggle(p._id,e)} title={p.active?'Hide':'Show'}>
                    {p.active ? '👁' : '🚫'}
                  </button>
                  <button className="btn-icon red" onClick={() => setDelId(p._id)} title="Delete">🗑</button>
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No products{cat !== 'all' ? ` in ${cat}` : ''}</div>
              <button className="btn-primary" onClick={onNew}>Add Product</button>
            </div>
          )}
        </div>
      )}

      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <h3>Delete this product?</h3>
            <p>Cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(delId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}