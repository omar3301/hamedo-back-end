import { Router } from 'express';
import Settings from '../models/Settings.js';
import { protect } from '../middleware/auth.js';

const router = Router();

export const DEFAULTS = [
  { key: 'shipping_cost',       value: 70,    label: 'Shipping Cost (EGP)',               type: 'number'  },
  { key: 'free_shipping_above', value: 1000,  label: 'Free Shipping Above (EGP)',         type: 'number'  },
  { key: 'whatsapp_number',     value: '201000000000', label: 'WhatsApp Number',          type: 'string'  },
  { key: 'store_open',          value: true,  label: 'Store Open',                        type: 'boolean' },
  { key: 'delivery_days',       value: '3-5', label: 'Delivery Days (shown to customers)',type: 'string'  },
];

export const seedSettings = async () => {
  for (const s of DEFAULTS) {
    await Settings.findOneAndUpdate({ key: s.key }, { $setOnInsert: s }, { upsert: true });
  }
};

// Helper used by orders route
export const getSetting = async (key, fallback) => {
  const s = await Settings.findOne({ key });
  return s ? s.value : fallback;
};

// PUBLIC — frontend reads shipping_cost, free_shipping_above
router.get('/', async (req, res) => {
  try {
    const all = await Settings.find({});
    const map = {};
    all.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN — full list with labels
router.get('/admin', protect, async (req, res) => {
  try {
    res.json(await Settings.find({}).sort('key'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADMIN — update one setting
router.put('/:key', protect, async (req, res) => {
  try {
    const s = await Settings.findOneAndUpdate({ key: req.params.key }, { value: req.body.value }, { new: true });
    if (!s) return res.status(404).json({ message: 'Setting not found' });
    res.json(s);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
