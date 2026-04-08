import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';

const CAT_COLORS = {
  all:         '#A78BFA',
  Rackets:     '#F4C430',
  Socks:       '#34D399',
  Accessories: '#60A5FA',
  Clothes:     '#F472B6',
};

const CATS = ['all', 'Rackets', 'Socks', 'Accessories', 'Clothes'];

export default function Products({ onNew, onEdit }) {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [q,           setQ]           = useState('');
  const [cat,         setCat]         = useState('all');
  const [delId,       setDelId]       = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');
  const [draggingIdx, setDraggingIdx] = useState(null); // for visual highlight

  // ── Pointer-based drag refs ────────────────────────────────────────
  const dragIdx   = useRef(null);   // index currently being dragged
  const gridRef   = useRef(null);   // reference to the grid container

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.search = q;
      const data = await api.getProducts(params);
      const sorted   = [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const filtered = cat === 'all' ? sorted : sorted.filter(p => p.category === cat);
      setProducts(filtered);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [q, cat]);

  useEffect(() => { load(); }, [load]);

  // ── Pointer Events drag implementation ────────────────────────────
  // This works for BOTH mouse and touch/finger with no browser interference.
  // Key: we never use the HTML5 drag API or touch events.

  const swapItems = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setProducts(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragIdx.current = toIdx;
  }, []);

  const handlePointerDown = useCallback((e, i) => {
    if (!reorderMode) return;
    // Only main button (mouse left) or touch/pen
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // keep tracking even outside element

    dragIdx.current = i;
    setDraggingIdx(i);
  }, [reorderMode]);

  const handlePointerMove = useCallback((e) => {
    if (!reorderMode || dragIdx.current === null) return;
    e.preventDefault();

    // Release capture temporarily to hit-test, then re-capture
    const captureEl = e.currentTarget;
    captureEl.releasePointerCapture(e.pointerId);

    const below = document.elementFromPoint(e.clientX, e.clientY);

    captureEl.setPointerCapture(e.pointerId);

    const card = below?.closest('[data-drag-idx]');
    if (!card) return;

    const targetIdx = Number(card.dataset.dragIdx);
    if (!isNaN(targetIdx) && targetIdx !== dragIdx.current) {
      swapItems(dragIdx.current, targetIdx);
      setDraggingIdx(targetIdx);
    }
  }, [reorderMode, swapItems]);

  const handlePointerUp = useCallback((e) => {
    if (!reorderMode) return;
    dragIdx.current = null;
    setDraggingIdx(null);
  }, [reorderMode]);

  // ── Save reorder ───────────────────────────────────────────────────
  const saveOrder = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const items = products.map((p, i) => ({ id: p._id, sortOrder: i }));
      await api.reorderProducts(items);
      setSaveMsg('✓ Order saved!');
      setTimeout(() => setSaveMsg(''), 2500);
      setReorderMode(false);
    } catch (e) {
      setSaveMsg('⚠ ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Other handlers ─────────────────────────────────────────────────
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saveMsg && (
            <span style={{
              fontSize: '.82rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8,
              background: saveMsg.startsWith('✓') ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)',
              color:      saveMsg.startsWith('✓') ? '#34D399'             : '#F87171',
              border:     `1px solid ${saveMsg.startsWith('✓') ? 'rgba(52,211,153,.3)' : 'rgba(248,113,113,.3)'}`,
            }}>{saveMsg}</span>
          )}
          {reorderMode ? (
            <>
              <button className="btn-ghost" onClick={() => { setReorderMode(false); setDraggingIdx(null); load(); }} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveOrder} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Order'}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-ghost"
                onClick={() => { setReorderMode(true); setQ(''); setSearch(''); setCat('all'); }}
                title="Drag products to reorder them on the store"
              >
                ↕ Reorder
              </button>
              <button className="btn-primary" onClick={onNew}>+ New Product</button>
            </>
          )}
        </div>
      </div>

      {/* Reorder mode banner */}
      {reorderMode && (
        <div style={{
          background: 'rgba(244,196,48,.08)', border: '1px solid rgba(244,196,48,.25)',
          borderRadius: 10, padding: '12px 18px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '.84rem', color: 'rgba(255,255,255,.7)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>↕</span>
          <span>
            <strong style={{ color: '#F4C430' }}>Reorder mode</strong> —
            hold &amp; drag any card to change its position.
            Hit <strong style={{ color: '#F4C430' }}>Save Order</strong> when done.
          </span>
        </div>
      )}

      {/* Filters row — hidden in reorder mode */}
      {!reorderMode && (
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
      )}

      {loading ? <div className="page-loading"><div className="spinner"/></div> : (
        <div ref={gridRef} className={`products-grid${reorderMode ? ' reorder-mode' : ''}`}>
          {products.map((p, i) => {
            const img      = p.variants?.[0]?.images?.[0] || '';
            const allSizes = [...new Set(p.variants?.flatMap(v => v.sizes?.map(s => s.label || s)) || [])];
            const catColor = CAT_COLORS[p.category] || '#888';
            const isBeingDragged = draggingIdx === i;

            return (
              <div
                key={p._id}
                data-drag-idx={i}
                className={`product-card${!p.active ? ' inactive' : ''}${reorderMode ? ' draggable' : ''}${isBeingDragged ? ' is-dragging' : ''}`}
                style={{
                  position: 'relative',
                  // CRITICAL: touch-action none stops the browser scroll/zoom
                  // gesture from firing and stealing the pointer away
                  ...(reorderMode ? {
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'none',     // ← prevents scroll steal on mobile
                    WebkitUserSelect: 'none',
                  } : {}),
                }}
                onPointerDown={reorderMode ? (e) => handlePointerDown(e, i) : undefined}
                onPointerMove={reorderMode ? handlePointerMove : undefined}
                onPointerUp={reorderMode ? handlePointerUp : undefined}
                onPointerCancel={reorderMode ? handlePointerUp : undefined}
              >
                {/* Position badge — only in reorder mode */}
                {reorderMode && (
                  <div style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 10,
                    background: 'rgba(0,0,0,.82)', borderRadius: 6,
                    padding: '3px 9px', fontSize: '.72rem', color: '#F4C430',
                    fontWeight: 800, letterSpacing: '.04em',
                    display: 'flex', alignItems: 'center', gap: 5,
                    pointerEvents: 'none', border: '1px solid rgba(244,196,48,.2)',
                  }}>
                    ⠿ #{i + 1}
                  </div>
                )}

                <div className="pc-img-wrap" style={{ pointerEvents: 'none' }}>
                  {img
                    ? <img src={img} alt={p.name} className="pc-img" draggable={false} onError={e => e.target.style.opacity='0.1'}/>
                    : <div className="pc-img-placeholder">No image</div>
                  }
                  {p.badge && <div className="pc-badge">{p.badge}</div>}
                  {!p.active && <div className="pc-inactive-tag">HIDDEN</div>}
                  <div className="pc-sport-tag" style={{ background: catColor+'33', color: catColor }}>
                    {p.category || 'Uncategorised'}
                  </div>
                </div>

                <div className="pc-info" style={reorderMode ? { pointerEvents: 'none' } : {}}>
                  <div className="pc-brand">{p.brand}</div>
                  <div className="pc-name">{p.name}</div>
                  {p.subtitle && <div className="pc-subtitle">{p.subtitle}</div>}
                  <div className="pc-price">{(p.price || 0).toLocaleString()} EGP</div>
                  <div className="pc-variants">
                    {p.variants?.length > 0 && (
                      <div className="pc-colors">
                        {p.variants.slice(0,5).map((v,j) => (
                          <div key={j} className="color-dot" style={{ background: v.colorHex||'#888' }} title={v.color}/>
                        ))}
                        {p.variants.length > 5 && <span className="more-colors">+{p.variants.length-5}</span>}
                      </div>
                    )}
                    {allSizes.length > 0 && (
                      <div className="pc-sizes">{allSizes.slice(0,6).join(' · ')}{allSizes.length>6?'…':''}</div>
                    )}
                  </div>
                </div>

                {/* Action buttons hidden in reorder mode */}
                {!reorderMode && (
                  <div className="pc-actions">
                    <button className="btn-icon" onClick={() => onEdit(p._id)} title="Edit">✏️</button>
                    <button className={`btn-icon ${p.active?'yellow':'green'}`} onClick={e => handleToggle(p._id,e)} title={p.active?'Hide':'Show'}>
                      {p.active ? '👁' : '🚫'}
                    </button>
                    <button className="btn-icon red" onClick={() => setDelId(p._id)} title="Delete">🗑</button>
                  </div>
                )}
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

      {/* Delete confirm modal */}
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