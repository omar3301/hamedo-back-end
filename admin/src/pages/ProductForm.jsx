import { useState, useEffect } from 'react';
import { api } from '../api.js';

const SPORTS    = ['padel'];
const CATEGORIES = ['Rackets', 'Shoes', 'Accessories', 'Clothes'];
const BADGES    = ['', 'NEW', 'HOT', 'SALE', 'LIMITED', 'BESTSELLER'];
const SIZE_PRESETS = {
  adults:  ['XS','S','M','L','XL','XXL'],
  kids:    ['4Y','6Y','8Y','10Y','12Y','14Y','16Y'],
  shoes:   ['38','39','40','41','42','43','44','45'],
  custom:  [],
};

const emptyVariant = () => ({
  color: '',
  colorHex: '#000000',
  images: [''],
  sizes: [{ label: '', stock: 0 }],
  active: true,
});

export default function ProductForm({ editId, onBack }) {
  const isEdit = !!editId;
  const [loading, setSaving] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    slug: '', sport: 'padel', category: 'Rackets', brand: '',
    name: '', subtitle: '', desc: '', price: '',
    discountPrice: '', discountActive: false,
    badge: '', active: true, featured: false, sortOrder: 0,
    variants: [emptyVariant()],
  });

  // Load existing product for edit
  useEffect(() => {
    if (!editId) return;
    api.getProduct(editId).then(p => {
      setForm({
        slug: p.slug, sport: p.sport, category: p.category, brand: p.brand,
        name: p.name, subtitle: p.subtitle || '', desc: p.desc || '',
        price: p.price, discountPrice: p.discountPrice || '', discountActive: p.discountActive || false,
        badge: p.badge || '', active: p.active,
        featured: p.featured, sortOrder: p.sortOrder || 0,
        variants: p.variants?.length ? p.variants.map(v => ({
          color: v.color,
          colorHex: v.colorHex || '#000000',
          images: v.images?.length ? v.images : [''],
          sizes: v.sizes?.length ? v.sizes : [{ label: '', stock: 0 }],
          active: v.active ?? true,
        })) : [emptyVariant()],
      });
      setFetching(false);
    }).catch(e => { setError(e.message); setFetching(false); });
  }, [editId]);

  // ── Field helpers ────────────────────────────────────────────────
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const name = e.target.value;
    if (!isEdit) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm(f => ({ ...f, name, slug }));
    } else {
      setForm(f => ({ ...f, name }));
    }
  };

  // ── Variant helpers ──────────────────────────────────────────────
  const setVariant = (vi, key, val) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, [key]: val } : v) }));

  const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, emptyVariant()] }));
  const removeVariant = (vi) => setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== vi) }));

  // Image helpers
  const setImage = (vi, ii, val) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, images: v.images.map((img, j) => j === ii ? val : img) } : v) }));
  const addImage = (vi) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, images: [...v.images, ''] } : v) }));
  const removeImage = (vi, ii) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, images: v.images.filter((_, j) => j !== ii) } : v) }));

  // Size helpers
  const setSize = (vi, si, key, val) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, sizes: v.sizes.map((s, j) => j === si ? { ...s, [key]: val } : s) } : v) }));
  const addSize = (vi) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, sizes: [...v.sizes, { label: '', stock: 0 }] } : v) }));
  const removeSize = (vi, si) =>
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, sizes: v.sizes.filter((_, j) => j !== si) } : v) }));

  const applyPreset = (vi, preset) => {
    if (preset === 'custom') return;
    const sizes = SIZE_PRESETS[preset].map(l => ({ label: l, stock: 0 }));
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === vi ? { ...v, sizes } : v) }));
  };

  // ── Submit ───────────────────────────────────────────────────────
  const submit = async () => {
    setError('');
    // Validate
    if (!form.name || !form.brand || !form.price || !form.slug) {
      setError('Name, Brand, Price, and Slug are required'); return;
    }
    if (form.variants.some(v => !v.color)) {
      setError('Every variant needs a color name'); return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discountPrice:  form.discountPrice !== '' ? Number(form.discountPrice) : null,
        discountActive: form.discountActive,
        sortOrder: Number(form.sortOrder),
        badge: form.badge || null,
        variants: form.variants.map(v => ({
          ...v,
          images: v.images.filter(Boolean),
          sizes: v.sizes.filter(s => s.label),
        })),
      };
      if (isEdit) {
        await api.updateProduct(editId, payload);
      } else {
        await api.createProduct(payload);
      }
      onBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return <div className="page-loading"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Products</button>
          <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-ghost" onClick={onBack}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : (isEdit ? '✓ Update Product' : '✓ Create Product')}
          </button>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom:20 }}>{error}</div>}

      <div className="form-layout">
        {/* Left: Basic Info */}
        <div className="form-col">
          <div className="form-section">
            <div className="form-section-title">Basic Info</div>

            <div className="field-group">
              <label>Product Name *</label>
              <input className="field" value={form.name} onChange={handleNameChange} placeholder="e.g. BullPadel × CUPRA Tee"/>
            </div>
            <div className="field-group">
              <label>URL Slug * <span className="field-hint">(auto-generated, must be unique)</span></label>
              <input className="field mono" value={form.slug} onChange={set('slug')} placeholder="bullpadel-cupra-tee"/>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Brand *</label>
                <input className="field" value={form.brand} onChange={set('brand')} placeholder="BullPadel"/>
              </div>
              <div className="field-group">
                <label>Price (EGP) *</label>
                <input className="field" type="number" value={form.price} onChange={set('price')} placeholder="850"/>
              </div>
            </div>

            {/* ── Discount ─────────────────────────────────────── */}
            <div style={{ background:'rgba(244,196,48,.06)', border:'1px solid rgba(244,196,48,.15)', borderRadius:10, padding:'14px 16px', marginBottom:4 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontSize:'.8rem', fontWeight:700, color:'#F4C430', letterSpacing:'.04em' }}>
                  🏷 Discount
                </div>
                <label className="checkbox-label" style={{ gap:8 }}>
                  <input type="checkbox" checked={form.discountActive} onChange={setCheck('discountActive')}/>
                  <span style={{ fontSize:'.8rem', fontWeight:700 }}>
                    {form.discountActive ? '🟢 Active' : '⚪ Off'}
                  </span>
                </label>
              </div>
              <div className="field-group" style={{ marginBottom:0 }}>
                <label>Discounted Price (EGP)</label>
                <input
                  className="field"
                  type="number"
                  value={form.discountPrice}
                  onChange={set('discountPrice')}
                  placeholder="e.g. 650"
                  disabled={!form.discountActive}
                  style={{ opacity: form.discountActive ? 1 : 0.4 }}
                />
              </div>
              {form.discountActive && form.discountPrice && form.price && (
                <div style={{ marginTop:8, fontSize:'.75rem', color:'rgba(255,255,255,.45)' }}>
                  Save {Math.round((1 - Number(form.discountPrice)/Number(form.price))*100)}% off · Customer pays{' '}
                  <strong style={{ color:'#F4C430' }}>{Number(form.discountPrice).toLocaleString()} EGP</strong>
                </div>
              )}
            </div>
            <div className="field-group">
              <label>Subtitle</label>
              <input className="field" value={form.subtitle} onChange={set('subtitle')} placeholder="Premier Padel Circuit Tee"/>
            </div>
            <div className="field-group">
              <label>Description</label>
              <textarea className="field-textarea" value={form.desc} onChange={set('desc')} rows={3} placeholder="Product description…"/>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Category & Tags</div>
            <div className="field-row">
              <div className="field-group">
                <label>Sport</label>
                <select className="field" value={form.sport} onChange={set('sport')}>
                  {SPORTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label>Category</label>
                <select className="field" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Badge</label>
                <select className="field" value={form.badge} onChange={set('badge')}>
                  {BADGES.map(b => <option key={b} value={b}>{b || '— None —'}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label>Sort Order</label>
                <input className="field" type="number" value={form.sortOrder} onChange={set('sortOrder')} placeholder="0"/>
              </div>
            </div>
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.active} onChange={setCheck('active')}/>
                <span>Visible in store</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.featured} onChange={setCheck('featured')}/>
                <span>Featured product</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Variants */}
        <div className="form-col">
          <div className="form-section">
            <div className="form-section-title-row">
              <div className="form-section-title">Color Variants</div>
              <button className="btn-ghost small" onClick={addVariant}>+ Add Color</button>
            </div>
            <p className="field-hint" style={{ marginBottom:16 }}>Each color is a separate variant with its own images and sizes.</p>

            {form.variants.map((v, vi) => (
              <div key={vi} className="variant-block">
                <div className="variant-header">
                  <div className="variant-num">Variant #{vi + 1}</div>
                  {form.variants.length > 1 && (
                    <button className="btn-icon red small" onClick={() => removeVariant(vi)}>✕ Remove</button>
                  )}
                </div>

                {/* Color */}
                <div className="field-row">
                  <div className="field-group" style={{ flex:2 }}>
                    <label>Color Name *</label>
                    <input className="field" value={v.color} onChange={e => setVariant(vi, 'color', e.target.value)} placeholder="e.g. Black / Charcoal"/>
                  </div>
                  <div className="field-group" style={{ flex:1 }}>
                    <label>Color Hex</label>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input type="color" value={v.colorHex} onChange={e => setVariant(vi, 'colorHex', e.target.value)} style={{ width:40, height:38, padding:2, background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, cursor:'pointer' }}/>
                      <input className="field mono" value={v.colorHex} onChange={e => setVariant(vi, 'colorHex', e.target.value)} style={{ flex:1 }}/>
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="field-group">
                  <label>Image URLs</label>
                  {v.images.map((img, ii) => (
                    <div key={ii} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
                      <input className="field" value={img} onChange={e => setImage(vi, ii, e.target.value)} placeholder="https://…" style={{ flex:1 }}/>
                      {img && <img src={img} alt="" style={{ width:36, height:36, objectFit:'cover', borderRadius:4, border:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }} onError={e => e.target.style.opacity='0.1'}/>}
                      {v.images.length > 1 && <button className="btn-icon red small" onClick={() => removeImage(vi, ii)}>✕</button>}
                    </div>
                  ))}
                  <button className="btn-ghost small" onClick={() => addImage(vi)}>+ Add Image URL</button>
                </div>

                {/* Sizes */}
                <div className="field-group">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <label>Sizes & Stock</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {Object.keys(SIZE_PRESETS).filter(p => p !== 'custom').map(preset => (
                        <button key={preset} className="btn-ghost tiny" onClick={() => applyPreset(vi, preset)}>
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sizes-grid">
                    {v.sizes.map((s, si) => (
                      <div key={si} className="size-row">
                        <input className="field size-label" value={s.label} onChange={e => setSize(vi, si, 'label', e.target.value)} placeholder="S"/>
                        <input className="field size-stock" type="number" value={s.stock} onChange={e => setSize(vi, si, 'stock', Number(e.target.value))} placeholder="0" min="0"/>
                        {v.sizes.length > 1 && <button className="btn-icon red tiny" onClick={() => removeSize(vi, si)}>✕</button>}
                      </div>
                    ))}
                  </div>
                  <button className="btn-ghost small" onClick={() => addSize(vi)}>+ Add Size</button>
                </div>

                {/* Variant active toggle */}
                <label className="checkbox-label">
                  <input type="checkbox" checked={v.active} onChange={e => setVariant(vi, 'active', e.target.checked)}/>
                  <span>This variant is available</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="form-bottom">
        {error && <div className="alert-error">{error}</div>}
        <div style={{ display:'flex', gap:12 }}>
          <button className="btn-ghost" onClick={onBack}>Cancel</button>
          <button className="btn-primary large" onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : (isEdit ? '✓ Update Product' : '✓ Create Product')}
          </button>
        </div>
      </div>
    </div>
  );
}