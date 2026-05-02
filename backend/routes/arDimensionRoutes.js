import express from 'express';
import Product from '../models/Product.js';
import {
  calculateARScale,
  getNormalizedDimensions,
  getARModelProperties,
  formatDimensions,
  calculateVolume,
  getSizeCategory,
  validateDimensions,
} from '../utils/arDimensions.js';

const router = express.Router();

/**
 * GET /ar/product/:id
 * Get AR-optimized data for a specific product
 */
router.get('/product/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { width, height, depth } = product;

    if (!width || !height || !depth) {
      return res.status(400).json({
        message: 'Product dimensions not available',
      });
    }

    const arProperties = getARModelProperties(product);
    const volume = calculateVolume(width, height, depth);

    res.json({
      id: product.id,
      name: product.name,
      description: product.description,
      modelUrl: product.modelUrl,
      iosModel: product.iosModel,
      dimensions: {
        width,
        height,
        depth,
        unit: 'cm',
        volume,
        sizeCategory: getSizeCategory(volume),
        formatted: formatDimensions(product),
      },
      arProperties,
      arMetadata: product.arMetadata || {
        modelFormat: 'glb',
        hasTextures: false,
        hasAnimations: false,
        optimized: false,
      },
      scaling: calculateARScale(width, height, depth),
      displayDimensions: getNormalizedDimensions(width, height, depth, 500),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /ar/products
 * Get AR data for all products with dimensions
 */
router.get('/products', async (req, res) => {
  try {
    const { category, minSize, maxSize, sort = 'name' } = req.query;

    let query = {
      where: {
        width: { [Product.sequelize.Sequelize.Op.ne]: null },
        height: { [Product.sequelize.Sequelize.Op.ne]: null },
        depth: { [Product.sequelize.Sequelize.Op.ne]: null },
      },
    };

    // Filter by category
    if (category) {
      query.where.category = category;
    }

    // Filter by size (using volume)
    if (minSize || maxSize) {
      const products = await Product.findAll(query);
      const filtered = products.filter((p) => {
        const volume = calculateVolume(p.width, p.height, p.depth);
        if (minSize && volume < minSize) return false;
        if (maxSize && volume > maxSize) return false;
        return true;
      });

      const arProducts = filtered.map((product) => {
        const volume = calculateVolume(product.width, product.height, product.depth);
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          dimensions: {
            width: product.width,
            height: product.height,
            depth: product.depth,
            volume,
            formatted: formatDimensions(product),
          },
          sizeCategory: getSizeCategory(volume),
          modelUrl: product.modelUrl,
          hasARModel: !!product.modelUrl,
        };
      });

      return res.json(arProducts);
    }

    const products = await Product.findAll(query);

    const arProducts = products.map((product) => {
      const volume = calculateVolume(product.width, product.height, product.depth);
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        dimensions: {
          width: product.width,
          height: product.height,
          depth: product.depth,
          volume,
          formatted: formatDimensions(product),
        },
        sizeCategory: getSizeCategory(volume),
        modelUrl: product.modelUrl,
        hasARModel: !!product.modelUrl,
      };
    });

    res.json(arProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /ar/validate
 * Validate dimensions
 * Query params: width, height, depth
 */
router.get('/validate', (req, res) => {
  try {
    const { width, height, depth } = req.query;

    const validation = validateDimensions(
      parseFloat(width),
      parseFloat(height),
      parseFloat(depth)
    );

    res.json(validation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * GET /ar/compare
 * Compare multiple products' dimensions
 * Query params: ids (comma-separated product IDs)
 */
router.get('/compare', async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ message: 'Please provide product IDs' });
    }

    const productIds = ids.split(',').map((id) => parseInt(id));
    const products = await Product.findAll({
      where: { id: productIds },
    });

    const comparison = products.map((product) => {
      const volume = calculateVolume(
        product.width,
        product.height,
        product.depth
      );
      return {
        id: product.id,
        name: product.name,
        dimensions: {
          width: product.width,
          height: product.height,
          depth: product.depth,
          volume,
          formatted: formatDimensions(product),
        },
        sizeCategory: getSizeCategory(volume),
      };
    });

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
