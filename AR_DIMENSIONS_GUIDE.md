# 3D AR Dimensions System Documentation

## Overview

This documentation covers the complete 3D AR dimensions system for the Artistry project, enabling realistic visualization of artisan products in augmented reality.

## Components Overview

### 1. **Backend Files**

#### `backend/scripts/setupArDimensions.js`
- **Purpose**: Populates realistic 3D dimensions based on artisan types
- **Features**:
  - Automatically assigns dimensions to products without them
  - Supports 7 artisan types: Crochet, Woodwork, Painting, Jewelry, Weaving, Pottery, Sculpture
  - Generates varied, realistic dimensions for each type

**Usage**:
```bash
npm run setup:ar-dimensions
```

#### `backend/utils/arDimensions.js`
Core utility functions for AR dimension calculations:

- `calculateARScale()` - Computes scale factor and viewing distance
- `getNormalizedDimensions()` - Converts dimensions for web display
- `formatDimensions()` - Creates human-readable dimension strings
- `calculateVolume()` - Computes 3D volume (cm³)
- `getARModelProperties()` - Generates complete AR model properties
- `getSizeCategory()` - Classifies products by size (Tiny, Small, Medium, Large, Extra Large)
- `convertDimensions()` - Converts between units (cm, inches, mm)
- `validateDimensions()` - Validates dimension data
- `calculateARScale()` - Determines optimal viewing parameters

#### `backend/models/Product.js`
**New Fields Added**:
```javascript
{
  width: FLOAT,              // Width in cm
  height: FLOAT,             // Height in cm
  depth: FLOAT,              // Depth in cm
  volume: FLOAT,             // Calculated volume in cm³
  sizeCategory: ENUM,        // Size classification
  arMetadata: JSON,          // AR model configuration
  boundingBox: JSON,         // Collision detection box
}
```

#### `backend/routes/arDimensionRoutes.js`
API endpoints for AR data:

**Endpoints**:

1. **GET `/ar/product/:id`**
   - Returns complete AR data for a specific product
   - Includes: dimensions, scale, viewing properties, bounding box
   ```json
   {
     "id": 1,
     "name": "Product Name",
     "dimensions": { "width": 30, "height": 40, "depth": 20, ... },
     "arProperties": { "scale": {...}, "position": {...}, ... },
     "sizeCategory": "Medium",
     "scaling": { "maxDimension": 40, "scaleFactor": 1.25, ... }
   }
   ```

2. **GET `/ar/products`**
   - Lists all products with dimensions
   - Optional filters: `category`, `minSize`, `maxSize`, `sort`
   - Example: `/ar/products?category=Woodwork&minSize=1000&maxSize=50000`

3. **GET `/ar/validate`**
   - Validates dimension values
   - Query params: `width`, `height`, `depth`
   - Returns validation results and errors

4. **GET `/ar/compare`**
   - Compares multiple products' dimensions
   - Query params: `ids=1,2,3`
   - Returns side-by-side comparison data

#### `backend/migrations/20260502_add_ar_metadata_to_products.cjs`
Database migration that adds:
- `arMetadata` - JSON field for model configuration
- `boundingBox` - JSON field for collision detection
- `volume` - Pre-calculated volume
- `sizeCategory` - Size classification

### 2. **Frontend Components**

#### `src/components/ARDimensions.jsx`
**React component for displaying AR dimensions**

**Props**:
```jsx
<ARDimensions 
  product={productObject}
  displayUnit="cm"  // 'cm' or 'in'
/>
```

**Features**:
- 3D isometric box visualization
- Dimension details in cards
- Volume and size category display
- AR model availability indicator
- Responsive design with Tailwind CSS
- Unit conversion (cm/inches)

**Usage Example**:
```jsx
import ARDimensions from '../components/ARDimensions'

export default function ProductDetail({ product }) {
  return (
    <div>
      <ARDimensions product={product} displayUnit="cm" />
    </div>
  )
}
```

## How to Use

### Step 1: Setup Database Schema

Run the migrations:
```bash
cd backend
npm run migrate
```

This creates the necessary columns for dimensions and AR metadata.

### Step 2: Populate Dimensions

Run the setup script to add realistic dimensions to products:
```bash
npm run setup:ar-dimensions
```

Expected output:
```
✓ Database connection successful
✓ Dimension columns verified
✓ Found 25 total products

  ✓ "Wooden Box" (Woodwork)
    → 15×12×10 cm
  ✓ "Crochet Blanket" (Crochet)
    → 120×150×3 cm
  ...

✓ Setup complete!
  Updated: 20 products
  Skipped: 5 products (already have dimensions)
  Total: 25 products
```

### Step 3: Enable API Endpoints

Add to `backend/server.js`:
```javascript
import arDimensionRoutes from './routes/arDimensionRoutes.js'

// In your app setup:
app.use('/api/ar', arDimensionRoutes)
```

### Step 4: Display in Frontend

Update your product detail page:
```jsx
import ARDimensions from '../components/ARDimensions'

function ProductDetail({ productId }) {
  const [product, setProduct] = useState(null)

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => setProduct(data))
  }, [productId])

  return (
    <div className="product-container">
      {product && <ARDimensions product={product} />}
    </div>
  )
}
```

## Dimension Standards by Artisan Type

### Crochet
- Small Amigurumi: 8×10×6 cm
- Medium Blanket: 120×150×3 cm
- Scarf: 20×180×2 cm
- Hat: 22×18×15 cm
- Cushion: 40×40×15 cm

### Woodwork
- Small Box: 15×12×10 cm
- Medium Shelf: 60×30×20 cm
- Large Frame: 50×70×3 cm
- Decorative Stand: 25×35×25 cm
- Cabinet: 80×100×40 cm

### Painting
- Small Canvas: 20×25×2 cm
- Medium Canvas: 40×50×2 cm
- Large Canvas: 60×90×3 cm
- Portrait: 35×45×2 cm
- Landscape: 80×60×3 cm

### Jewelry
- Ring: 2×1.5×1.5 cm
- Necklace: 2×45×1 cm
- Earrings: 3×4×2 cm
- Bracelet: 2×8×1.5 cm
- Pendant: 4×6×2 cm

### Weaving
- Small Tapestry: 40×60×2 cm
- Medium Wall Hanging: 60×80×2 cm
- Large Textile: 100×120×2 cm
- Table Runner: 40×180×1 cm
- Rug: 120×180×2 cm

### Pottery
- Small Mug: 8×10×8 cm
- Bowl: 20×12×20 cm
- Vase: 15×30×15 cm
- Large Pot: 30×35×30 cm
- Decorative Plate: 30×3×30 cm

### Sculpture
- Small Figurine: 10×15×8 cm
- Medium Statue: 20×40×20 cm
- Large Installation: 50×80×50 cm
- Abstract Art: 30×50×30 cm

## API Usage Examples

### Get Product AR Data
```bash
curl http://localhost:5000/api/ar/product/1
```

### Get All AR Products
```bash
curl http://localhost:5000/api/ar/products
```

### Filter by Category
```bash
curl "http://localhost:5000/api/ar/products?category=Woodwork"
```

### Validate Dimensions
```bash
curl "http://localhost:5000/api/ar/validate?width=30&height=40&depth=20"
```

### Compare Multiple Products
```bash
curl "http://localhost:5000/api/ar/compare?ids=1,2,3,4,5"
```

## Utility Function Reference

### calculateARScale(width, height, depth)
Returns optimal scale and viewing distance:
```javascript
const { maxDimension, scaleFactor, recommendedViewDistance } = calculateARScale(30, 40, 20)
// { maxDimension: 40, scaleFactor: 1.25, recommendedViewDistance: 60 }
```

### getARModelProperties(product)
Returns complete AR configuration:
```javascript
const arProps = getARModelProperties(product)
// {
//   scale: { x: 1.25, y: 1.25, z: 1.25 },
//   position: { x: 0, y: 25, z: 0 },
//   viewDistance: 60,
//   rotationHint: 'landscape',
//   boundingBox: { width: 37.5, height: 50, depth: 25 },
//   volume: 24000
// }
```

### getSizeCategory(volume)
Classifies products by size:
```javascript
getSizeCategory(24000)  // "Large"
getSizeCategory(500)    // "Small"
getSizeCategory(50)     // "Tiny"
```

### convertDimensions(dimensions, fromUnit, toUnit)
Converts between units:
```javascript
const inInches = convertDimensions(
  { width: 30, height: 40, depth: 20 },
  'cm',
  'in'
)
// { width: 11.81, height: 15.75, depth: 7.87, unit: 'in' }
```

## AR Display Configuration

The component generates:
- **Scale Factor**: Normalizes large objects (furniture) and tiny objects (jewelry) for optimal AR viewing
- **View Distance**: Recommended distance from camera based on object size
- **Bounding Box**: Virtual box around the model for collision detection
- **Rotation Hint**: Suggested orientation (landscape, portrait, or balanced)

## Integration with 3D Models

The system works seamlessly with existing `modelUrl` and `iosModel` fields:
```javascript
product.modelUrl = "https://example.com/model.glb"     // Android/Web
product.iosModel = "https://example.com/model.usdz"   // iOS
```

Dimensions are automatically used to scale these models appropriately.

## Performance Considerations

- Volume calculations are pre-cached to avoid runtime computation
- Size categories are pre-calculated during setup
- Scale factors are computed once and cached
- API endpoints support pagination for large datasets

## Troubleshooting

### Dimensions Not Appearing
1. Check migration has been run: `npm run migrate`
2. Verify setup script executed: `npm run setup:ar-dimensions`
3. Check database: `SELECT width, height, depth FROM Products LIMIT 5;`

### Incorrect Scale in AR
- Verify dimensions are in centimeters
- Check scale factor calculation: should be between 0.5-2.0 typically
- Ensure 3D model file is properly scaled

### API Endpoints Not Responding
1. Verify route is registered in server.js
2. Check backend port is running
3. Confirm database connection is active

## Future Enhancements

- [ ] Add weight calculations (requires material density data)
- [ ] Implement dynamic LOD (Level of Detail) based on device capability
- [ ] Add physics simulation properties for AR interactions
- [ ] Create 3D model generation from dimensions
- [ ] Add dimension auto-detection from images via ML
- [ ] Support multiple 3D model formats with automatic conversion
