/**
 * AR Dimensions Utility
 * Provides helper functions for managing 3D model dimensions and AR visualization
 */

/**
 * Calculate scale factor for AR model display
 * Normalizes dimensions to fit optimal AR viewing size
 * @param {number} width - Width in cm
 * @param {number} height - Height in cm
 * @param {number} depth - Depth in cm
 * @returns {object} - { maxDimension, scaleFactor, recommendedViewDistance }
 */
export const calculateARScale = (width, height, depth) => {
  if (!width || !height || !depth) {
    return {
      maxDimension: 0,
      scaleFactor: 1,
      recommendedViewDistance: 50,
    };
  }

  const maxDimension = Math.max(width, height, depth);
  
  // Scale factor: normalize to ~50cm reference size for AR viewing
  const targetSize = 50; // cm
  const scaleFactor = targetSize / maxDimension;
  
  // Recommended viewing distance based on size
  // Larger objects should be viewed from further away
  const recommendedViewDistance = Math.max(50, maxDimension * 1.5);

  return {
    maxDimension,
    scaleFactor,
    recommendedViewDistance,
  };
};

/**
 * Get normalized dimensions for web display
 * @param {number} width - Width in cm
 * @param {number} height - Height in cm
 * @param {number} depth - Depth in cm
 * @param {number} maxDisplaySize - Max size for display (in pixels, default 500)
 * @returns {object} - Normalized dimensions for display
 */
export const getNormalizedDimensions = (width, height, depth, maxDisplaySize = 500) => {
  if (!width || !height || !depth) {
    return {
      displayWidth: 0,
      displayHeight: 0,
      displayDepth: 0,
      ratio: 1,
    };
  }

  const maxDimension = Math.max(width, height, depth);
  const ratio = maxDisplaySize / maxDimension;

  return {
    displayWidth: width * ratio,
    displayHeight: height * ratio,
    displayDepth: depth * ratio,
    ratio,
  };
};

/**
 * Format dimensions for human-readable display
 * @param {object} product - Product object with width, height, depth
 * @returns {string} - Formatted dimension string
 */
export const formatDimensions = (product) => {
  if (!product.width || !product.height || !product.depth) {
    return 'Dimensions not specified';
  }
  return `${product.width} × ${product.height} × ${product.depth} cm`;
};

/**
 * Calculate volume of the 3D model
 * @param {number} width - Width in cm
 * @param {number} height - Height in cm
 * @param {number} depth - Depth in cm
 * @returns {number} - Volume in cm³
 */
export const calculateVolume = (width, height, depth) => {
  if (!width || !height || !depth) return 0;
  return width * height * depth;
};

/**
 * Get AR model properties for realistic visualization
 * @param {object} product - Product object
 * @returns {object} - AR properties including scale, position, and view settings
 */
export const getARModelProperties = (product) => {
  const { width, height, depth } = product;
  
  if (!width || !height || !depth) {
    return {
      scale: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: 0, z: 0 },
      viewDistance: 50,
      rotationHint: 'auto',
      boundingBox: { width: 0, height: 0, depth: 0 },
    };
  }

  const { scaleFactor, recommendedViewDistance } = calculateARScale(width, height, depth);

  // Determine optimal rotation hint based on dimensions
  let rotationHint = 'auto';
  if (width > height && width > depth) rotationHint = 'landscape';
  else if (height > width && height > depth) rotationHint = 'portrait';
  else rotationHint = 'balanced';

  return {
    scale: {
      x: scaleFactor,
      y: scaleFactor,
      z: scaleFactor,
    },
    position: {
      x: 0,
      y: height * scaleFactor * 0.5, // Center vertically
      z: 0,
    },
    viewDistance: recommendedViewDistance,
    rotationHint,
    boundingBox: {
      width: width * scaleFactor,
      height: height * scaleFactor,
      depth: depth * scaleFactor,
    },
    volume: calculateVolume(width, height, depth),
  };
};

/**
 * Get dimension categories for filtering/classification
 * @param {number} volume - Volume in cm³
 * @returns {string} - Size category
 */
export const getSizeCategory = (volume) => {
  if (!volume || volume <= 0) return 'Unknown';
  if (volume <= 100) return 'Tiny';
  if (volume <= 1000) return 'Small';
  if (volume <= 10000) return 'Medium';
  if (volume <= 100000) return 'Large';
  return 'Extra Large';
};

/**
 * Convert dimensions between units
 * @param {object} dimensions - { width, height, depth }
 * @param {string} fromUnit - Source unit ('cm', 'in', 'mm')
 * @param {string} toUnit - Target unit ('cm', 'in', 'mm')
 * @returns {object} - Converted dimensions
 */
export const convertDimensions = (dimensions, fromUnit = 'cm', toUnit = 'cm') => {
  if (!dimensions || !dimensions.width) return dimensions;

  const conversionRates = {
    'cm-to-in': 0.3937,
    'in-to-cm': 2.54,
    'cm-to-mm': 10,
    'mm-to-cm': 0.1,
    'in-to-mm': 25.4,
    'mm-to-in': 0.0394,
  };

  const key = `${fromUnit}-to-${toUnit}`;
  const rate = conversionRates[key] || 1;

  return {
    width: dimensions.width * rate,
    height: dimensions.height * rate,
    depth: dimensions.depth * rate,
    unit: toUnit,
  };
};

/**
 * Validate dimensions
 * @param {number} width - Width in cm
 * @param {number} height - Height in cm
 * @param {number} depth - Depth in cm
 * @returns {object} - { isValid, errors }
 */
export const validateDimensions = (width, height, depth) => {
  const errors = [];

  if (!width || width <= 0) errors.push('Width must be greater than 0');
  if (!height || height <= 0) errors.push('Height must be greater than 0');
  if (!depth || depth <= 0) errors.push('Depth must be greater than 0');

  if (width > 500) errors.push('Width exceeds maximum (500 cm)');
  if (height > 500) errors.push('Height exceeds maximum (500 cm)');
  if (depth > 500) errors.push('Depth exceeds maximum (500 cm)');

  return {
    isValid: errors.length === 0,
    errors,
  };
};
