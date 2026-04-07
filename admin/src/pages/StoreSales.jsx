// StoreSales — log items sold in the physical store
// Manager picks product + color + size + qty + price → saves as a "store_sale" order
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function StoreSales() {
  const [products,  setProducts]  = useState([]);
  const [sales,     setSales]     = useState([]);  // recent store sales
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize,    setSelectedSize]    = useState('');
  const [qty,             setQty]             = useState(1);
  const [customPrice,     setCustomPrice]     = useState('');
  const [customerName,    setCustomerName]    = useState('');
  const [note,            setNote]            = useState('');

  useEffect(() => {
    Promise.all([
      api.getProducts(),
      api.getOrders({ source: 'store', limit: 20, sort: '-createdAt' })
        .then(d => d.orders || [])
        .catch(() => []),
    ]).then(([p, o]) => {
      setProducts(p);
      setSales(o);
    }).finally(() => setLoading(false));
  }, []);

  const handleProductChange = (productId) => {
    const p = products.find(p => p._id === productId || p.slug === productId);
    setSelectedProduct(p || null);
    setSelectedVariant(p?.variants?.[0] || null);
    setSelectedSize('');
    setCustomPrice(p?.price || '');
  };

  const handleVariantChange = (idx) => {
    setSelectedVariant(selectedProduct.variants[idx]);
    setSelectedSize('');
  };

  const sizes = selectedVariant?.sizes?.map(s => s.label || s) || [];

  const handleLog = async () => {
    if (!selectedProduct) return alert('Pick a product');
    if (sizes.length > 0 && !selectedSize) return alert('Pick a size');

    setSaving(true);
    try {
      await api.createOrder({
        customer: {
          firstName: customerName || 'Walk-in',
          lastName:  'Customer',
          phone:     '00000000000',
        },
        delivery: {
          address:     'In-Store Sale',
          apt:         '',
          city:        'Shebin El Kom',
          governorate: 'Menoufiya',
        },
        items: [{
          productId: selectedProduct._id || selectedProduct.slug,
          name:      selectedProduct.name,
          brand:     selectedProduct.brand || '',
          sport:     selectedProduct.sport || 'padel',
          color:     selectedVariant?.color || '',
          colorHex:  selectedVariant?.colorHex || '',
          size:      selectedSize || 'One Size',
          qty:       Number(qty),
          price:     Number(customPrice) || selectedProduct.price,
          image:     selectedVariant?.images?.[0] || '',
        }],
        source: 'store',  // marks it as physical store sale
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Reset form
      setSelectedProduct(null);
      setSelectedVariant(null);
      setSelectedSize('');
      setQty(1);
      setCustomPrice('');
      setCustomerName('');
      setNote('');

      // Refresh sales list
      api.getOrders({ source: 'store', limit: 20, sort: '-createdAt' })
        .then(d => setSales(d.orders || []))
        .catch(() => {});

    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = n => Number(n||0).toLocaleString();
  const fmtDate = s => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

  if (loading) return <div className="page-loading"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Store Sales</h1>
          <p className="page-desc">Log items sold at the physical shop in Shebin El Kom</p>
        </div>
        {saved && (
          <div style={{ background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.3)', borderRadius:10, padding:'10px 20px', color:'#22C55E', fontWeight:700, fontSize:14 }}>
            ✓ Sale recorded!
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'flex-start' }}>

        {/* ── LEFT: Log form ── */}
        <div className="chart-card">
          <div className="chart-title" style={{ marginBottom:20 }}>📦 Log a Sale</div>

          {/* Product picker */}
          <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>
            Product *
          </label>
          <select
            value={selectedProduct?._id || ''}
            onChange={e => handleProductChange(e.target.value)}
            className="field"
            style={{ width:'100%', marginBottom:16 }}
          >
            <option value="">— Choose product —</option>
            {products.map(p => (
              <option key={p._id} value={p._id}>{p.name} — {p.brand}</option>
            ))}
          </select>

          {/* Color variant */}
          {selectedProduct?.variants?.length > 1 && (
            <>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>
                Color
              </label>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
                {selectedProduct.variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => handleVariantChange(i)}
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'8px 14px', borderRadius:8,
                      border: selectedVariant === v ? '2px solid #F4C430' : '1.5px solid rgba(255,255,255,.15)',
                      background: selectedVariant === v ? 'rgba(244,196,48,.1)' : 'transparent',
                      color: '#F2F2F2', cursor:'pointer', fontSize:13, fontWeight:600,
                      fontFamily:'inherit',
                    }}
                  >
                    <div style={{ width:14, height:14, borderRadius:'50%', background:v.colorHex||'#888', flexShrink:0 }}/>
                    {v.color}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>
                Size *
              </label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                {sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    style={{
                      padding:'8px 16px', borderRadius:8,
                      border: selectedSize===s ? '2px solid #F4C430' : '1.5px solid rgba(255,255,255,.15)',
                      background: selectedSize===s ? 'rgba(244,196,48,.1)' : 'transparent',
                      color: selectedSize===s ? '#F4C430' : '#F2F2F2',
                      cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Qty + Price row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>Qty</label>
              <input
                type="number" min="1" value={qty}
                onChange={e => setQty(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 14px', color:'#F2F2F2', fontSize:14, fontFamily:'inherit', outline:'none' }}
              />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>
                Price (EGP) {selectedProduct && <span style={{ color:'rgba(255,255,255,.3)', textTransform:'none', letterSpacing:0 }}>default: {selectedProduct.price}</span>}
              </label>
              <input
                type="number" value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                placeholder={selectedProduct?.price || '0'}
                style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 14px', color:'#F2F2F2', fontSize:14, fontFamily:'inherit', outline:'none' }}
              />
            </div>
          </div>

          {/* Customer name (optional) */}
          <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:6 }}>
            Customer Name <span style={{ color:'rgba(255,255,255,.2)', textTransform:'none' }}>(optional)</span>
          </label>
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Walk-in customer"
            style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 14px', color:'#F2F2F2', fontSize:14, fontFamily:'inherit', outline:'none', marginBottom:16 }}
          />

          {/* Total preview */}
          {selectedProduct && (
            <div style={{ background:'rgba(244,196,48,.08)', border:'1px solid rgba(244,196,48,.2)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'rgba(255,255,255,.5)', fontSize:13 }}>Total</span>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:'#F4C430' }}>
                {fmt((Number(customPrice)||selectedProduct.price) * qty)} EGP
              </span>
            </div>
          )}

          <button
            onClick={handleLog}
            disabled={saving || !selectedProduct}
            style={{ width:'100%', background: saving ? 'rgba(244,196,48,.5)' : '#F4C430', color:'#000', border:'none', borderRadius:12, padding:'13px', fontWeight:800, fontSize:15, cursor: saving||!selectedProduct ? 'not-allowed' : 'pointer', fontFamily:'inherit', letterSpacing:'.06em', transition:'all .2s' }}
          >
            {saving ? 'Saving…' : '✓ Record Sale'}
          </button>
        </div>

        {/* ── RIGHT: Recent store sales ── */}
        <div className="chart-card">
          <div className="chart-title" style={{ marginBottom:16 }}>🏪 Recent Store Sales</div>
          {sales.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)', fontSize:13 }}>
              No store sales recorded yet.<br/>
              <span style={{ fontSize:11, marginTop:8, display:'block' }}>Use the form to log your first sale.</span>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {sales.map(s => (
                <div key={s._id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontFamily:'monospace', color:'#F4C430', fontSize:12 }}>{s.orderNumber}</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{fmtDate(s.createdAt)}</span>
                  </div>
                  {s.items?.map((it, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:'rgba(255,255,255,.7)' }}>{it.name} · {it.color} · {it.size} × {it.qty}</span>
                      <span style={{ fontWeight:700 }}>{fmt(it.price * it.qty)} EGP</span>
                    </div>
                  ))}
                  {s.customer?.firstName !== 'Walk-in' && (
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:4 }}>
                      {s.customer.firstName} {s.customer.lastName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}