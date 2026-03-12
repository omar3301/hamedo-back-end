# 🏆 HamedoSport — Backend + Admin Dashboard

A full-stack backend and admin dashboard for your sports store. Built with Node.js, Express, MongoDB, and React.

---

## 📁 Project Structure

```
hamedosport-backend/
├── src/
│   ├── index.js              ← Main Express server
│   ├── config/db.js          ← MongoDB connection
│   ├── models/
│   │   ├── Order.js          ← Order schema
│   │   ├── Product.js        ← Product schema (with variants)
│   │   └── Admin.js          ← Admin user schema
│   ├── routes/
│   │   ├── orders.js         ← Orders API
│   │   ├── products.js       ← Products API
│   │   └── auth.js           ← Admin auth API
│   └── middleware/auth.js    ← JWT protection
├── admin/                    ← Admin Dashboard (React + Vite)
│   ├── src/
│   │   ├── App.jsx           ← App shell + routing + login
│   │   ├── api.js            ← API client
│   │   ├── styles.css        ← All styles
│   │   └── pages/
│   │       ├── Dashboard.jsx ← Stats, charts, recent orders
│   │       ├── Orders.jsx    ← Orders list + management
│   │       ├── Products.jsx  ← Products grid
│   │       └── ProductForm.jsx ← Create/edit product with variants
│   └── package.json
└── .env.example              ← Environment variables template
```

---

## 🚀 Setup Guide

### Step 1 — MongoDB Atlas (Free)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Sign up free
2. Create a new **cluster** (free M0 tier is fine)
3. Create a **database user** (username + password)
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all) or your server IP
5. Click **Connect** → **Connect your application** → Copy the connection string
   - It looks like: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/`
   - Change `/` at the end to `/hamedosport`

### Step 2 — Backend Setup

```bash
cd hamedosport-backend

# Copy and fill in your env file
cp .env.example .env
# Edit .env with your MongoDB URI and settings

# Install dependencies
npm install

# Start development server
npm run dev
```

Your API will run at **http://localhost:4000**

### Step 3 — Admin Dashboard Setup

```bash
cd hamedosport-backend/admin

# Install dependencies
npm install

# Start admin dashboard
npm run dev
```

Admin dashboard runs at **http://hamedo-back-end-production.up.railway.app**

**Default login:**
- Email: `admin@hamedosport.com`
- Password: `Admin@2025!`
- ⚠️ Change these in your `.env` file!

---

## 🔌 Connect Frontend (hamedosport)

In your **hamedosport** storefront, update `Checkout.jsx` to POST orders to the backend:

```jsx
// In your Checkout.jsx, change step 3 confirmation to:
const placeOrder = async () => {
  const res = await fetch('http://localhost:4000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      },
      delivery: {
        address: form.address,
        apt: form.apt,
        city: form.city,
        governorate: form.governorate,
      },
      items: items.map(i => ({
        productId: i.id,
        name: i.name,
        brand: i.brand,
        sport: i.sport,
        color: i.color,
        colorHex: i.colorHex,
        size: i.size,
        qty: i.qty,
        price: i.price,
        image: i.images?.[0] || '',
      })),
    }),
  });
  const data = await res.json();
  if (data.success) {
    setOrderNumber(data.orderNumber);
    setStep(3);
  }
};
```

Also update your products to load from API instead of the static file:

```jsx
// Replace static PRODUCTS import with:
const [products, setProducts] = useState([]);
useEffect(() => {
  fetch('http://localhost:4000/api/products')
    .then(r => r.json())
    .then(setProducts);
}, []);
```

---

## 🛠️ Admin Dashboard Features

### 📊 Dashboard
- Total revenue, orders, pending count, delivery rate
- Revenue chart (last 7 days)
- Order status breakdown
- Top 5 selling products
- Recent orders table

### 📦 Orders
- Full orders list with search & filter by status
- Click any order to see full details modal
- Update order status (Pending → Confirmed → Processing → Shipped → Delivered)
- Add internal notes
- **WhatsApp button** — opens WhatsApp with pre-filled order confirmation message
- Delete orders
- Pagination

### 🏷️ Products
- Product grid with images, colors, sizes preview
- Filter by sport (Padel / Football)
- Search by name or brand
- Show/hide products (toggle active)
- Edit product
- Delete product

### ✏️ Product Form
- **Multiple color variants** — each with its own images, sizes, and stock
- Size presets: Adults (XS–XXL), Kids (4Y–16Y), Shoes (38–45)
- Custom sizes with stock numbers
- Image URL preview (paste URL, see image instantly)
- Color picker + hex input
- Badge tags (NEW, HOT, SALE, etc.)
- Featured product toggle
- Active/inactive control

---

## 📡 API Endpoints

### Public (no auth needed)
```
POST   /api/orders              → Place order from storefront
GET    /api/products            → Get active products (storefront)
GET    /api/products/slug/:slug → Get product by slug
```

### Admin (requires Bearer token)
```
POST   /api/auth/login          → Admin login
GET    /api/auth/me             → Get current admin

GET    /api/orders              → List all orders (search, filter, paginate)
GET    /api/orders/meta/stats   → Dashboard stats
GET    /api/orders/:id          → Get single order
PATCH  /api/orders/:id          → Update order status/notes
DELETE /api/orders/:id          → Delete order

GET    /api/products/admin/all  → All products including inactive
GET    /api/products/:id        → Get product by ID
POST   /api/products            → Create product
PUT    /api/products/:id        → Update product
DELETE /api/products/:id        → Delete product
PATCH  /api/products/:id/toggle → Toggle active/inactive
```

---

## 🌐 Deployment

### Backend (Railway / Render / VPS)
1. Push code to GitHub
2. Connect to Railway or Render
3. Add environment variables from `.env`
4. Deploy

### Admin Dashboard
```bash
cd admin
npm run build
# Upload the /dist folder to any static host (Netlify, Vercel, etc.)
# Update vite.config.js proxy to point to your live API URL
```

---

## 💡 Ideas for Next Steps
- 📱 SMS notifications when order is placed (Twilio)
- 📧 Email receipts to customers
- 📊 Export orders to Excel
- 🖼️ Image upload (Cloudinary) instead of URL paste
- 📦 Inventory alerts when stock is low
- 🏷️ Coupon/discount codes
- 📍 Order tracking page for customers
