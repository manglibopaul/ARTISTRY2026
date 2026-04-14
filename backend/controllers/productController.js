import Product from '../models/Product.js';
import { Op } from 'sequelize';
import { uploadImage, uploadModel } from '../utils/media.js';
import fs from 'fs';


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
  return plain;
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
    const products = await Product.findAll();
    res.json(products.map(normalizeProductPayload));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
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
      const productById = await Product.findByPk(idSuffixMatch[1]);
      if (!productById) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(normalizeProductPayload(productById));
    }

    const wantedSlug = toProductSlug(decodedName);
    const products = await Product.findAll();
    const match = products.find((p) => toProductSlug(p.name) === wantedSlug);

    if (!match) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(normalizeProductPayload(match));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.findAll({ where: { category } });
    res.json(products.map(normalizeProductPayload));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get seller's products
export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const products = await Product.findAll({ where: { sellerId } });
    res.json(products.map(normalizeProductPayload));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create product (seller)
export const createProduct = async (req, res) => {
  try {
    console.log('CREATE PRODUCT: req.files:', req.files);
    console.log('CREATE PRODUCT: req.body:', req.body);
    const sellerId = req.seller?.id; // From auth middleware
    const productData = { ...req.body, sellerId: sellerId || null };

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

    // Handle file uploads
    if (req.files) {
      const modelFile = req.files.find(f => f.fieldname === 'model');
      const iosModelFile = req.files.find(f => f.fieldname === 'iosModel');

      // No file size validation for model uploads

      // Handle multiple images
      const imageFiles = req.files.filter(f => f.fieldname === 'image');
      if (imageFiles.length > 0) {
        const uploadedImages = await Promise.all(
          imageFiles.map((f) => uploadImage(f, 'artistry/products'))
        );
        productData.image = uploadedImages.filter(Boolean).map((f) => ({
          url: f.url,
          filename: f.filename,
        }));
      }

      // Handle model file (GLB)
      if (modelFile) {
        console.log('Uploading GLB model file:', modelFile.originalname);
        const uploadedModel = await uploadModel(modelFile, 'artistry/models');
        console.log('Uploaded model result:', uploadedModel);
        productData.modelUrl = uploadedModel?.url || null;
        console.log('Set productData.modelUrl:', productData.modelUrl);
      }

      // Handle iOS model file (USDZ)
      if (iosModelFile) {
        const uploadedIosModel = await uploadModel(iosModelFile, 'artistry/models');
        productData.iosModel = uploadedIosModel?.url || null;
      }
    }

    const newProduct = await Product.create(productData);
    res.status(201).json(normalizeProductPayload(newProduct));
  } catch (error) {
    res.status(400).json({ message: error.message });
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

    const updateData = { ...req.body };

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
        console.log('Uploaded model result (update):', uploadedModel);
        updateData.modelUrl = uploadedModel?.url || null;
        console.log('Set updateData.modelUrl:', updateData.modelUrl);
      } else {
        // No new model file, preserve existing
        updateData.modelUrl = product.modelUrl;
      }

      // Handle iOS model file (USDZ)
      if (iosModelFile) {
        const uploadedIosModel = await uploadModel(iosModelFile, 'artistry/models');
        updateData.iosModel = uploadedIosModel?.url || null;
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

    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
        ],
      },
    });
    res.json(products.map(normalizeProductPayload));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
