import React, { useState } from 'react';

export default function ProductMediaColumn({ productData, apiUrl }) {
  const [mainImageIndex, setMainImageIndex] = useState(0);

  const getImageUrl = (img) => {
    if (!img) return '/path/to/placeholder.jpg';
    const base = apiUrl && apiUrl.length ? apiUrl : (typeof window !== 'undefined' ? window.location.origin : '');

    if (typeof img === 'object' && img.url) {
      return img.url.startsWith('http') ? img.url : `${base}${img.url}`;
    } else if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      if (img.startsWith('/')) return `${base}${img}`;
      return `${base}/uploads/images/${img}`;
    }
    return '/path/to/placeholder.jpg';
  };

  if (!productData || !productData.image || productData.image.length === 0) {
    return (
      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">No image available</span>
        </div>
      </div>
    );
  }

  const images = productData.image;
  const mainImage = getImageUrl(images[mainImageIndex]);
  const supportingImages = images.slice(1, 5); // Show up to 4 supporting images

  return (
    <div className="w-full md:w-1/2 flex flex-col gap-4">
      {/* Main Image Container */}
      <div className="w-full bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
          <img
            loading="eager"
            decoding="async"
            className="w-full h-full object-contain"
            src={mainImage}
            alt="Product main view"
          />
        </div>
      </div>

      {/* Supporting Images Grid */}
      {supportingImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {supportingImages.map((img, index) => (
            <button
              key={index + 1}
              onClick={() => setMainImageIndex(index + 1)}
              className="aspect-square overflow-hidden bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-all duration-200 cursor-pointer group"
            >
              <img
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                src={getImageUrl(img)}
                alt={`Product view ${index + 2}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
