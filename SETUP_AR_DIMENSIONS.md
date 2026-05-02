# 3D AR Dimensions - Quick Setup Guide

## What's Been Created

A complete 3D dimensions system for AR (Augmented Reality) visualization of products with:

✅ **Backend Components**:
- `setupArDimensions.js` - Automated dimension population script
- `arDimensions.js` - Utility functions for AR calculations
- `arDimensionRoutes.js` - API endpoints for AR data
- Database migration for new fields
- Updated Product model with AR fields

✅ **Frontend Components**:
- `ARDimensions.jsx` - Display component with 3D visualization
- `ARModelViewer.jsx` - Interactive 3D viewer with controls

✅ **Documentation**:
- `AR_DIMENSIONS_GUIDE.md` - Complete system documentation

---

## Installation Steps

### Step 1: Run Database Migrations

```bash
cd backend
npm run migrate
```

**What this does**: Creates new database columns for dimensions and AR metadata.

### Step 2: Populate Product Dimensions

```bash
npm run setup:ar-dimensions
```

**What this does**: Automatically assigns realistic 3D dimensions to all products based on their artisan type.

**Example output**:
```
✓ Database connection successful
✓ Dimension columns verified
✓ Found 25 total products

  ✓ "Wooden Shelf" (Woodwork)
    → 60×30×20 cm
  ✓ "Crochet Blanket" (Crochet)
    → 120×150×3 cm
  ...

✓ Setup complete!
  Updated: 20 products
  Skipped: 5 products
  Total: 25 products
```

### Step 3: Register API Routes (Backend)

In `backend/server.js`, add:

```javascript
import arDimensionRoutes from './routes/arDimensionRoutes.js'

// Add this line in your route setup (after other routes):
app.use('/api/ar', arDimensionRoutes)
```

### Step 4: Use Components in Frontend

Import and use the components in your product pages:

```jsx
import ARDimensions from '../components/ARDimensions'
import ARModelViewer from '../components/ARModelViewer'

export default function ProductDetail({ product }) {
  return (
    <div className="product-container">
      <h1>{product.name}</h1>
      
      {/* Show 3D dimensions */}
      <ARDimensions product={product} displayUnit="cm" />
      
      {/* Show interactive 3D model viewer */}
      <ARModelViewer product={product} autoRotate={true} />
    </div>
  )
}
```

---

## Available Features

### 1. **Dimension Display Component**
Shows a beautiful 3D visualization with:
- Isometric 3D box display
- Width × Height × Depth measurements
- Volume calculation
- Size category (Tiny, Small, Medium, Large, Extra Large)
- AR model availability indicator

### 2. **Interactive 3D Viewer**
Provides:
- Rotating 3D model preview
- Manual rotation controls
- Dimension overlay toggle
- "View in AR" button for device-based AR

### 3. **API Endpoints**

**Get Single Product AR Data:**
```
GET /api/ar/product/1
```

**Get All Products with Dimensions:**
```
GET /api/ar/products
```

**Filter by Category:**
```
GET /api/ar/products?category=Woodwork
```

**Compare Multiple Products:**
```
GET /api/ar/compare?ids=1,2,3
```

**Validate Dimensions:**
```
GET /api/ar/validate?width=30&height=40&depth=20
```

---

## Dimension Standards

Each artisan type has predefined realistic dimensions:

| Type | Examples |
|------|----------|
| **Crochet** | 8×10×6 cm (Amigurumi), 120×150×3 cm (Blanket) |
| **Woodwork** | 15×12×10 cm (Box), 80×100×40 cm (Cabinet) |
| **Painting** | 20×25×2 cm (Small), 60×90×3 cm (Large) |
| **Jewelry** | 2×1.5×1.5 cm (Ring), 2×45×1 cm (Necklace) |
| **Weaving** | 40×60×2 cm (Tapestry), 120×180×2 cm (Rug) |
| **Pottery** | 8×10×8 cm (Mug), 30×35×30 cm (Pot) |

---

## Key Files Created

```
backend/
├── scripts/
│   └── setupArDimensions.js          # Setup script
├── utils/
│   └── arDimensions.js               # Utility functions
├── routes/
│   └── arDimensionRoutes.js          # API endpoints
├── migrations/
│   └── 20260502_add_ar_metadata...   # Database schema
└── models/
    └── Product.js                    # Updated with AR fields

src/
└── components/
    ├── ARDimensions.jsx              # Display component
    └── ARModelViewer.jsx             # Viewer component

AR_DIMENSIONS_GUIDE.md                # Full documentation
```

---

## Testing the System

### 1. Check Database
```bash
# Connect to your database and run:
SELECT id, name, width, height, depth, artisanType 
FROM "Products" 
LIMIT 5;
```

### 2. Test API
```bash
# Get AR data for product 1
curl http://localhost:5000/api/ar/product/1

# Get all products with dimensions
curl http://localhost:5000/api/ar/products
```

### 3. Test Component
Visit any product detail page and verify:
- ✓ Dimensions display correctly
- ✓ 3D box visualization appears
- ✓ Volume is calculated
- ✓ Size category is shown

---

## Customization

### Add Custom Dimensions for a Product

```javascript
// In backend database or via API:
const product = await Product.findByPk(1)
await product.update({
  width: 25.5,
  height: 35.0,
  depth: 15.5,
  sizeCategory: 'Medium'
})
```

### Adjust Display Unit

```jsx
// Show dimensions in inches instead of cm
<ARDimensions product={product} displayUnit="in" />
```

### Disable Auto-Rotate in Viewer

```jsx
<ARModelViewer product={product} autoRotate={false} />
```

---

## Troubleshooting

**Q: "Dimensions not specified" message?**
- A: Run `npm run setup:ar-dimensions` to populate dimensions

**Q: API endpoints return 404?**
- A: Make sure to register arDimensionRoutes in server.js

**Q: Component shows empty state?**
- A: Verify product object has width, height, depth fields

**Q: Migration errors?**
- A: Check database connection and ensure migrations directory exists

---

## Next Steps

1. ✅ Setup dimensions (done!)
2. 📋 Add components to product pages
3. 🎨 Customize styling to match your theme
4. 📱 Test AR features on mobile devices
5. 🔄 Consider adding weight/material density calculations

---

For detailed documentation, see: **AR_DIMENSIONS_GUIDE.md**
