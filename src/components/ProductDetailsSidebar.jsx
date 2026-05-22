import React, { useState } from 'react';

export default function ProductDetailsSidebar({
  product,
  onARClick,
  onAddToCart,
  onBuyNow,
}) {
  const [quantity, setQuantity] = useState(1);
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  const handleQuantityChange = (value) => {
    if (value > 0) setQuantity(value);
  };

  const toggleAccordion = (section) => {
    setExpandedAccordion(expandedAccordion === section ? null : section);
  };

  const originalPrice = product.originalPrice || product.price * 1.25;

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Product Title */}
      <div>
        <h1 className="text-4xl font-light tracking-wide text-gray-900">
          {product.name}
        </h1>
      </div>

      {/* Price Section */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-gray-900">
          ₱{product.price.toLocaleString()}
        </span>
        <span className="text-lg text-gray-400 line-through">
          ₱{originalPrice.toLocaleString()}
        </span>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Quantity</span>
        <div className="flex items-center border border-gray-300 rounded-lg w-fit">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            className="w-16 text-center border-0 focus:ring-0 outline-none"
            min="1"
          />
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Button Stack */}
      <div className="flex flex-col gap-3 w-full">
        {/* View AR Button */}
        <button
          onClick={onARClick}
          className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          🔍 View AR
        </button>

        {/* Add to Cart Button */}
        <button
          onClick={() => onAddToCart(quantity)}
          className="w-full px-6 py-3 border-2 border-black bg-white text-black font-semibold rounded-lg hover:bg-black hover:text-white transition-all duration-300"
        >
          ADD TO CART
        </button>

        {/* Buy Now Button */}
        <button
          onClick={() => onBuyNow(quantity)}
          className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors duration-300"
        >
          BUY NOW
        </button>
      </div>

      {/* Accordions Section */}
      <div className="space-y-0 pt-4">
        {/* Materials Accordion */}
        <div className="border-t border-b border-gray-200">
          <button
            onClick={() => toggleAccordion('materials')}
            className="w-full py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">Materials</span>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
                expandedAccordion === 'materials' ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
          {expandedAccordion === 'materials' && (
            <div className="pb-4 text-sm text-gray-600">
              <p>{product.materials || 'High-quality materials for durability and comfort.'}</p>
            </div>
          )}
        </div>

        {/* Size Chart Accordion */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleAccordion('sizeChart')}
            className="w-full py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">Size Chart</span>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
                expandedAccordion === 'sizeChart' ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
          {expandedAccordion === 'sizeChart' && (
            <div className="pb-4 text-sm text-gray-600">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-2">Size</th>
                      <th className="py-2 px-2">Chest</th>
                      <th className="py-2 px-2">Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-2">XS</td>
                      <td className="py-2 px-2">32"</td>
                      <td className="py-2 px-2">28"</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-2">S</td>
                      <td className="py-2 px-2">34"</td>
                      <td className="py-2 px-2">29"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Description Accordion */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleAccordion('description')}
            className="w-full py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">Description</span>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
                expandedAccordion === 'description' ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
          {expandedAccordion === 'description' && (
            <div className="pb-4 text-sm text-gray-600 leading-relaxed">
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
