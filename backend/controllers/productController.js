import Product from '../models/Product.js';
import { Op } from 'sequelize';
import { uploadImage, uploadModel } from '../utils/media.js';

// Get all products (public)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
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
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.findAll({ where: { category } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get seller's products
export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const products = await Product.findAll({ where: { sellerId } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create product (seller)
export const createProduct = async (req, res) => {
  try {
    const sellerId = req.seller?.id; // From auth middleware
    const productData = { ...req.body, sellerId: sellerId || null };

    // Handle colors (comma-separated string or JSON array)
    if (req.body.colors) {
      let colors = req.body.colors;
      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch (e) {
          colors = colors.split(',').map(c => c.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(colors)) {
        productData.colors = colors.filter(Boolean);
      }
    }

    // Handle file uploads
    if (req.files) {
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
      const modelFile = req.files.find(f => f.fieldname === 'model');
      if (modelFile) {
        const uploadedModel = await uploadModel(modelFile, 'artistry/models');
        productData.modelUrl = uploadedModel?.url || null;
      }

      // Handle iOS model file (USDZ)
      const iosModelFile = req.files.find(f => f.fieldname === 'iosModel');
      if (iosModelFile) {
        const uploadedIosModel = await uploadModel(iosModelFile, 'artistry/models');
        productData.iosModel = uploadedIosModel?.url || null;
      }
    }

    const newProduct = await Product.create(productData);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
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
        } catch (e) {
          colors = colors.split(',').map(c => c.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(colors)) {
        updateData.colors = colors.filter(Boolean);
      }
    }

    // Handle existing images passed from frontend (for removal/reordering)
    let existingImages = [];
    if (updateData.existingImages) {
      try {
        existingImages = typeof updateData.existingImages === 'string' 
          ? JSON.parse(updateData.existingImages) 
          : updateData.existingImages;
      } catch (e) {
        existingImages = [];
      }
      delete updateData.existingImages; // Remove from updateData
    } else {
      // Keep all existing images if not specified
      existingImages = Array.isArray(product.image) ? product.image : [];
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
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
      const modelFile = req.files.find(f => f.fieldname === 'model');
      if (modelFile) {
        const uploadedModel = await uploadModel(modelFile, 'artistry/models');
        updateData.modelUrl = uploadedModel?.url || null;
      }

      // Handle iOS model file (USDZ)
      const iosModelFile = req.files.find(f => f.fieldname === 'iosModel');
      if (iosModelFile) {
        const uploadedIosModel = await uploadModel(iosModelFile, 'artistry/models');
        updateData.iosModel = uploadedIosModel?.url || null;
      }
    } else {
      // If no files uploaded, use existing images
      updateData.image = existingImages;
    }

    await product.update(updateData);
    res.json(product);
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
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
