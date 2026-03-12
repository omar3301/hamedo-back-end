// Admin Settings — control shipping price, free threshold, WhatsApp, etc.
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null); // key being saved
  const [saved,    setSaved]    = useState(null); // key just saved (for ✓ flash)
  const [values,   setValues]   = useState({});

  useEffect(() => {
    api.getAdminSettings()
      .then(data => {
        setSettings(data);
        const map = {};
        data.forEach(s => { map[s.key] = s.value; });
        setValues(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key) => {
    setSaving(key);
    try {
      await api.updateSetting(key, values[key]);
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"/></div>;

  // Group settings nicely
  const GROUPS = [
    {
      title: '🚚 Shipping',
      keys: ['shipping_cost', 'free_shipping_above', 'delivery_days'],
    },
    {
      title: '📞 Contact',
      keys: ['whatsapp_number'],
    },
    {
      title: '🏪 Store',
      keys: ['store_open'],
    },
  ];

  const byKey = {};
  settings.forEach(s => { byKey[s.key] = s; });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Control prices, shipping, and store info</p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:600 }}>
        {GROUPS.map(group => (
          <div key={group.title} className="chart-card">
            <div className="chart-title" style={{ marginBottom:20 }}>{group.title}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {group.keys.map(key => {
                const s = byKey[key];
                if (!s) return null;
                return (
                  <div key={key}>
                    {/* Label */}
                    <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:8 }}>
                      {s.label}
                    </label>

                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      {/* Input — type depends on setting */}
                      {s.type === 'boolean' ? (
                        <button
                          onClick={() => setValues(v => ({ ...v, [key]: !v[key] }))}
                          style={{
                            padding:'10px 20px', borderRadius:10, border:'1.5px solid',
                            borderColor: values[key] ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.15)',
                            background: values[key] ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.04)',
                            color: values[key] ? '#22C55E' : 'rgba(255,255,255,.4)',
                            fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .2s',
                          }}
                        >
                          {values[key] ? '✓ Open' : '✕ Closed'}
                        </button>
                      ) : (
                        <input
                          type={s.type === 'number' ? 'number' : 'text'}
                          value={values[key] ?? ''}
                          onChange={e => setValues(v => ({
                            ...v,
                            [key]: s.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))}
                          style={{
                            flex:1, background:'rgba(255,255,255,.06)',
                            border:'1.5px solid rgba(255,255,255,.12)',
                            borderRadius:10, padding:'10px 14px',
                            color:'#F2F2F2', fontSize:14, fontFamily:'inherit',
                            outline:'none',
                          }}
                          onFocus={e => e.target.style.borderColor='rgba(244,196,48,.5)'}
                          onBlur={e => e.target.style.borderColor='rgba(255,255,255,.12)'}
                        />
                      )}

                      {/* Save button */}
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving === key}
                        style={{
                          padding:'10px 18px', borderRadius:10, border:'none',
                          background: saved === key ? 'rgba(34,197,94,.2)' : '#F4C430',
                          color: saved === key ? '#22C55E' : '#000',
                          fontWeight:800, fontSize:13, cursor:'pointer',
                          transition:'all .2s', whiteSpace:'nowrap', flexShrink:0,
                        }}
                      >
                        {saving === key ? '…' : saved === key ? '✓ Saved' : 'Save'}
                      </button>
                    </div>

                    {/* Helper text */}
                    {key === 'shipping_cost' && (
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:6 }}>
                        Cost charged per order when below free threshold
                      </p>
                    )}
                    {key === 'free_shipping_above' && (
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:6 }}>
                        Orders above this amount get free shipping automatically
                      </p>
                    )}
                    {key === 'whatsapp_number' && (
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:6 }}>
                        Include country code, no + sign (e.g. 201001234567)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}