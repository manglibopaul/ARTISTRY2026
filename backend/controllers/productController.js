import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import { Op } from 'sequelize';
import { uploadImage, uploadModel, deleteBlobByUrl } from '../utils/media.js';


// Removed file size validation for GLB and USDZ model uploads

const normalizeImageEntry = (entry) => {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeImageEntry(parsed);
      } catch {
        // Keep going and treat it as a plain string URL/path.
      }
    }

    if (trimmed.startsWith('http')) return { url: trimmed };
    if (trimmed.startsWith('//')) return { url: `https:${trimmed}` };
    if (trimmed.startsWith('/')) return { url: trimmed };
    return { url: `/uploads/images/${trimmed}` };
  }

  if (typeof entry === 'object') {
    const candidate = entry.url || entry.secure_url || entry.path || null;
    if (typeof candidate === 'string' && candidate.trim()) {
      const value = candidate.trim();
      if (value.startsWith('//')) return { ...entry, url: `https:${value}` };
      if (value.startsWith('http') || value.startsWith('/')) return { ...entry, url: value };
      return { ...entry, url: `/uploads/images/${value}` };
    }
    return null;
  }

  return null;
};

const normalizeProductImages = (imageValue) => {
  if (!imageValue) return [];

  let parsed = imageValue;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [parsed];
    }
  }

  if (!Array.isArray(parsed)) parsed = [parsed];

  return parsed
    .map(normalizeImageEntry)
    .filter(Boolean);
};

const normalizeProductPayload = (product) => {
  const plain = typeof product?.toJSON === 'function' ? product.toJSON() : { ...product };
  plain.image = normalizeProductImages(plain.image);
  if (plain.Seller && !plain.seller) {
    plain.seller = plain.Seller;
  }
  if (plain.seller) {
    plain.sellerName = plain.seller.storeName || plain.seller.name || plain.sellerName || null;
    plain.artisanType = plain.seller.artisanType || plain.artisanType || null;
  }
  return plain;
};

const toDimensionNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Number(num.toFixed(3));
};

const normalizeSizeDimensions = (value) => {
  if (!value) return {};

  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const normalized = {};
  for (const [rawSize, rawDimensions] of Object.entries(parsed)) {
    const sizeKey = String(rawSize || '').trim();
    if (!sizeKey) continue;
    if (!rawDimensions || typeof rawDimensions !== 'object') continue;

    const width = toDimensionNumber(rawDimensions.width);
    const height = toDimensionNumber(rawDimensions.height);
    const depth = toDimensionNumber(rawDimensions.depth);

    if (width && height && depth) {
      normalized[sizeKey] = { width, height, depth, unit: 'cm' };
    }
  }

  return normalized;
};

const toProductSlug = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Get all products (public)
export const getAllProducts = async (req, res) => {
  try {
    // Support pagination for performance: ?page=1&limit=24
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 24);
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      include: [{
        model: Seller,
        attributes: ['id', 'name', 'storeName', 'artisanType', 'avatar'],
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows.map(normalizeProductPayload),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: Seller,
        attributes: ['id', 'name', 'storeName', 'artisanType', 'avatar'],
      }],
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(normalizeProductPayload(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Find single product by name slug (public)
export const getProductByName = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    const decodedName = decodeURIComponent(name);
    const idSuffixMatch = decodedName.match(/-p(\d+)$/i);
    if (idSuffixMatch) {
      const productById = await Product.findByPk(idSuffixMatch[1], {
        include: [{
          model: Seller,
          attributes: ['id', 'name', 'storeName', 'artisanType', 'avatar'],
        }],
      });
      if (!productById) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(normalizeProductPayload(productById));
    }

    // Query by name directly instead of fetching all products
    const product = await Product.findOne({
      where: { name: decodedName },
      include: [{
        model: Seller,
        attributes: ['id', 'name', 'storeName', 'artisanType', 'avatar'],
      }],
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(normalizeProductPayload(product));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 24);
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: { category },
      include: [{
        model: Seller,
        attributes: ['id', 'name', 'storeName', 'artisanType', 'avatar'],
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows.map(normalizeProductPayload),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get seller's products
export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 24);
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: { sellerId },
      include: [{
        model: Seller,
        attributes: ['id', 'name', 'storeName', 'artisanType', 'avatar'],
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows.map(normalizeProductPayload),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create product (seller)
export const createProduct = async (req, res) => {
  try {
    console.log('CREATE PRODUCT: req.files:', req.files);
    console.log('CREATE PRODUCT: req.body:', req.body);
    console.log('CREATE PRODUCT: req.seller:', req.seller);
    
    if (!req.seller || !req.seller.id) {
      console.error('CREATE PRODUCT: req.seller is missing or invalid:', req.seller);
      return res.status(401).json({ message: 'Seller authentication failed' });
    }
    
    const sellerId = req.seller.id;
    const productData = { ...req.body, sellerId };
    delete productData.sizeDimensions;

    // Handle colors (comma-separated string or JSON array)
    if (req.body.colors) {
      let colors = req.body.colors;
      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch {
          colors = colors.split(',').map(c => c.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(colors)) {
        productData.colors = colors.filter(Boolean);
      }
    }

    // Handle colorableParts (comma-separated string or JSON array)
    if (req.body.colorableParts) {
      let parts = req.body.colorableParts
      if (typeof parts === 'string') {
        try {
          parts = JSON.parse(parts)
        } catch {
          parts = parts.split(',').map(p => p.trim()).filter(Boolean)
        }
      }
      if (Array.isArray(parts)) {
        productData.colorableParts = parts.filter(Boolean)
      }
    }

    // Handle colorExclusions (comma-separated string or JSON array)
    if (req.body.colorExclusions) {
      let ex = req.body.colorExclusions
      if (typeof ex === 'string') {
        try {
          ex = JSON.parse(ex)
        } catch {
          ex = ex.split(',').map(p => p.trim()).filter(Boolean)
        }
      }
      if (Array.isArray(ex)) {
        productData.colorExclusions = ex.filter(Boolean)
      }
    }

    // colorChangeable boolean
    if (typeof req.body.colorChangeable !== 'undefined') {
      const val = req.body.colorChangeable
      productData.colorChangeable = (String(val) === 'true' || val === true)
    }

    // Handle colorPartNames (JSON object mapping originalName->friendlyName)
    if (req.body.colorPartNames) {
      let map = req.body.colorPartNames
      if (typeof map === 'string') {
        try { map = JSON.parse(map) } catch { map = {} }
      }
      if (map && typeof map === 'object') productData.colorPartNames = map
    }

    if (req.body.sizes) {
      let sizes = req.body.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch {
          sizes = sizes.split(',').map(size => size.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(sizes)) {
        productData.sizes = sizes.filter(Boolean);
      }
    } else if (req.body.size && !req.body.sizes) {
      productData.sizes = [req.body.size].filter(Boolean);
    }

    // Handle materials (string)
    if (req.body.materials && typeof req.body.materials === 'string') {
      productData.materials = req.body.materials.trim();
    }

    // Handle sizeChart (JSON array with size, chest, length)
    if (req.body.sizeChart) {
      let sizeChart = req.body.sizeChart;
      if (typeof sizeChart === 'string') {
        try {
          sizeChart = JSON.parse(sizeChart);
        } catch {
          sizeChart = [];
        }
      }
      if (Array.isArray(sizeChart)) {
        productData.sizeChart = sizeChart.filter(row => row.size && row.chest && row.length);
      }
    }

    if (typeof req.body.sizeDimensions !== 'undefined') {
      const sizeDimensions = normalizeSizeDimensions(req.body.sizeDimensions);
      if (Object.keys(sizeDimensions).length > 0) {
        const baseArMetadata = (req.body.arMetadata && typeof req.body.arMetadata === 'object')
          ? req.body.arMetadata
          : {};
        productData.arMetadata = {
          ...baseArMetadata,
          sizeDimensions,
        };
      }
    }

    // Handle file uploads
    if (req.files) {
      try {
        const modelFile = req.files.find(f => f.fieldname === 'model');
        const iosModelFile = req.files.find(f => f.fieldname === 'iosModel');

        // No file size validation for model uploads

        // Handle multiple images
        const imageFiles = req.files.filter(f => f.fieldname === 'image');
        if (imageFiles.length > 0) {
          try {
            const uploadedImages = await Promise.all(
              imageFiles.map((f) => uploadImage(f, 'artistry/products'))
            );
            productData.image = uploadedImages.filter(Boolean).map((f) => ({
              url: f.url,
              filename: f.filename,
            }));
          } catch (imgErr) {
            console.error('Image upload error:', imgErr);
            return res.status(400).json({ message: `Image upload failed: ${imgErr.message}` });
          }
        }

        // Handle model file (GLB)
        if (modelFile) {
          try {
            console.log('Uploading GLB model file:', modelFile.originalname);
            const uploadedModel = await uploadModel(modelFile, 'artistry/models');
            if (!uploadedModel) {
              return res.status(400).json({ message: 'Failed to upload 3D model. Please check file format.' });
            }
            console.log('Uploaded model result:', uploadedModel);
            productData.modelUrl = uploadedModel.url || null;
            console.log('Set productData.modelUrl:', productData.modelUrl);
          } catch (modelErr) {
            console.error('Model upload error:', modelErr);
            return res.status(400).json({ message: `Model upload failed: ${modelErr.message}` });
          }
        }

        // Handle iOS model file (USDZ)
        if (iosModelFile) {
          try {
            const uploadedIosModel = await uploadModel(iosModelFile, 'artistry/models');
            if (!uploadedIosModel) {
              return res.status(400).json({ message: 'Failed to upload iOS model. Please check file format.' });
            }
            productData.iosModel = uploadedIosModel.url || null;
          } catch (iosErr) {
            console.error('iOS model upload error:', iosErr);
            return res.status(400).json({ message: `iOS model upload failed: ${iosErr.message}` });
          }
        }
      } catch (fileErr) {
        console.error('File handling error:', fileErr);
        return res.status(400).json({ message: `File handling error: ${fileErr.message}` });
      }
    }

    const newProduct = await Product.create(productData);
    res.status(201).json(normalizeProductPayload(newProduct));
  } catch (error) {
    console.error('CREATE PRODUCT ERROR:', error);
    res.status(400).json({ message: error.message || 'Failed to create product' });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    console.log('UPDATE PRODUCT: req.files:', req.files);
    console.log('UPDATE PRODUCT: req.body:', req.body);
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if seller owns this product
    if (req.seller && product.sellerId !== req.seller.id) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    const previousModelUrl = product.modelUrl;
    const previousIosModelUrl = product.iosModel;

    const updateData = { ...req.body };
    delete updateData.sizeDimensions;

    // Handle colors (comma-separated string or JSON array)
    if (req.body.colors) {
      let colors = req.body.colors;
      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch {
          colors = colors.split(',').map(c => c.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(colors)) {
        updateData.colors = colors.filter(Boolean);
      }
    }

    // Update colorableParts
    if (req.body.colorableParts) {
      let parts = req.body.colorableParts
      if (typeof parts === 'string') {
        try { parts = JSON.parse(parts) } catch { parts = parts.split(',').map(p => p.trim()).filter(Boolean) }
      }
      if (Array.isArray(parts)) updateData.colorableParts = parts.filter(Boolean)
    }

    // Update colorExclusions
    if (req.body.colorExclusions) {
      let ex = req.body.colorExclusions
      if (typeof ex === 'string') {
        try { ex = JSON.parse(ex) } catch { ex = ex.split(',').map(p => p.trim()).filter(Boolean) }
      }
      if (Array.isArray(ex)) updateData.colorExclusions = ex.filter(Boolean)
    }

    // Update colorChangeable
    if (typeof req.body.colorChangeable !== 'undefined') {
      const val = req.body.colorChangeable
      updateData.colorChangeable = (String(val) === 'true' || val === true)
    }

    // Update colorPartNames
    if (req.body.colorPartNames) {
      let map = req.body.colorPartNames
      if (typeof map === 'string') {
        try { map = JSON.parse(map) } catch { map = {} }
      }
      if (map && typeof map === 'object') updateData.colorPartNames = map
    }

    if (req.body.sizes) {
      let sizes = req.body.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch {
          sizes = sizes.split(',').map(size => size.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(sizes)) {
        updateData.sizes = sizes.filter(Boolean);
      }
    } else if (req.body.size && !req.body.sizes) {
      updateData.sizes = [req.body.size].filter(Boolean);
    }

    // Handle materials (string)
    if (req.body.materials && typeof req.body.materials === 'string') {
      updateData.materials = req.body.materials.trim();
    }

    // Handle sizeChart (JSON array with size, chest, length)
    if (req.body.sizeChart) {
      let sizeChart = req.body.sizeChart;
      if (typeof sizeChart === 'string') {
        try {
          sizeChart = JSON.parse(sizeChart);
        } catch {
          sizeChart = [];
        }
      }
      if (Array.isArray(sizeChart)) {
        updateData.sizeChart = sizeChart.filter(row => row.size && row.chest && row.length);
      }
    }

    if (typeof req.body.sizeDimensions !== 'undefined') {
      const sizeDimensions = normalizeSizeDimensions(req.body.sizeDimensions);
      const currentArMetadata = (product.arMetadata && typeof product.arMetadata === 'object' && !Array.isArray(product.arMetadata))
        ? { ...product.arMetadata }
        : {};

      if (Object.keys(sizeDimensions).length > 0) {
        currentArMetadata.sizeDimensions = sizeDimensions;
      } else {
        delete currentArMetadata.sizeDimensions;
      }

      updateData.arMetadata = currentArMetadata;
    }

    // Handle existing images passed from frontend (for removal/reordering)
    let existingImages = [];
    if (updateData.existingImages) {
      try {
        existingImages = typeof updateData.existingImages === 'string' 
          ? JSON.parse(updateData.existingImages) 
          : updateData.existingImages;
      } catch {
        existingImages = [];
      }
      delete updateData.existingImages; // Remove from updateData
    } else {
      // Keep all existing images if not specified
      existingImages = Array.isArray(product.image) ? product.image : [];
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const modelFile = req.files.find(f => f.fieldname === 'model');
      const iosModelFile = req.files.find(f => f.fieldname === 'iosModel');

      // Handle multiple images - append new images to existing ones
      const imageFiles = req.files.filter(f => f.fieldname === 'image');
      if (imageFiles.length > 0) {
        const uploadedImages = await Promise.all(
          imageFiles.map((f) => uploadImage(f, 'artistry/products'))
        );
        const newImages = uploadedImages.filter(Boolean).map((f) => ({
          url: f.url,
          filename: f.filename,
        }));
        // Merge existing images with new images
        updateData.image = [...existingImages, ...newImages];
      } else {
        // No new images, just use existing
        updateData.image = existingImages;
      }

      // Handle model file (GLB)
      if (modelFile) {
        console.log('Uploading GLB model file (update):', modelFile.originalname);
        const uploadedModel = await uploadModel(modelFile, 'artistry/models');
        if (!uploadedModel?.url) {
          return res.status(400).json({ message: 'Failed to upload 3D model. Please check file format.' });
        }
        console.log('Uploaded model result (update):', uploadedModel);
        updateData.modelUrl = uploadedModel.url;
        console.log('Set updateData.modelUrl:', updateData.modelUrl);
      } else {
        // No new model file, preserve existing
        updateData.modelUrl = product.modelUrl;
      }

      // Handle iOS model file (USDZ)
      if (iosModelFile) {
        const uploadedIosModel = await uploadModel(iosModelFile, 'artistry/models');
        if (!uploadedIosModel?.url) {
          return res.status(400).json({ message: 'Failed to upload iOS model. Please check file format.' });
        }
        updateData.iosModel = uploadedIosModel.url;
      } else {
        // No new iOS model file, preserve existing
        updateData.iosModel = product.iosModel;
      }
    } else {
      // If no files uploaded, use existing images and models
      updateData.image = existingImages;
      updateData.modelUrl = product.modelUrl;
      updateData.iosModel = product.iosModel;
    }

    await product.update(updateData);

    const cleanupTasks = [];
    if (req.files?.some((f) => f.fieldname === 'model') && previousModelUrl && updateData.modelUrl !== previousModelUrl) {
      cleanupTasks.push(deleteBlobByUrl(previousModelUrl));
    }
    if (req.files?.some((f) => f.fieldname === 'iosModel') && previousIosModelUrl && updateData.iosModel !== previousIosModelUrl) {
      cleanupTasks.push(deleteBlobByUrl(previousIosModelUrl));
    }
    if (cleanupTasks.length > 0) {
      await Promise.allSettled(cleanupTasks);
    }

    res.json(normalizeProductPayload(product));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if seller owns this product
    if (req.seller && product.sellerId !== req.seller.id) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    const modelUrlsToDelete = [product.modelUrl, product.iosModel].filter(Boolean);

    await product.destroy();

    if (modelUrlsToDelete.length > 0) {
      await Promise.allSettled(modelUrlsToDelete.map((url) => deleteBlobByUrl(url)));
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 24);
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
        ],
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows.map(normalizeProductPayload),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
