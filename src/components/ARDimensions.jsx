import React from 'react'

/**
 * ARDimensions Component
 * Displays 3D model dimensions with visual representation
 */
const ARDimensions = ({ product, displayUnit = 'cm' }) => {
  const { width, height, depth, artisanType } = product

  if (!width || !height || !depth) {
    return (
      <div className='ar-dimensions-placeholder'>
        <p className='text-gray-500 text-sm'>3D dimensions not available</p>
      </div>
    )
  }

  // Format dimensions
  const formatDim = (value) => {
    if (displayUnit === 'in') {
      return (value * 0.3937).toFixed(2)
    }
    return value.toFixed(1)
  }

  // Calculate volume
  const volume = (width * height * depth).toFixed(0)

  // Determine size category
  const getSizeCategory = () => {
    const vol = parseFloat(volume)
    if (vol <= 100) return 'Tiny'
    if (vol <= 1000) return 'Small'
    if (vol <= 10000) return 'Medium'
    if (vol <= 100000) return 'Large'
    return 'Extra Large'
  }

  // Normalize dimensions for visual representation
  const maxDim = Math.max(width, height, depth)
  const boxSize = 120 // pixels
  const w = (width / maxDim) * boxSize
  const h = (height / maxDim) * boxSize
  const d = (depth / maxDim) * boxSize

  return (
    <div className='ar-dimensions-container border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h3 className='text-lg font-semibold text-gray-800'>3D Dimensions</h3>
          {artisanType && (
            <p className='text-sm text-gray-600 mt-1'>
              Type: <span className='font-medium'>{artisanType}</span>
            </p>
          )}
        </div>
        <div className='text-right'>
          <div className='text-2xl font-bold text-indigo-600'>
            {formatDim(width)} × {formatDim(height)} × {formatDim(depth)}
          </div>
          <p className='text-xs text-gray-600'>{displayUnit}</p>
        </div>
      </div>

      {/* 3D Box Visualization */}
      <div className='mb-6 p-4 bg-white rounded-lg flex justify-center items-center min-h-[160px]'>
        <div className='relative' style={{ width: boxSize, height: boxSize }}>
          {/* Isometric 3D box representation */}
          <svg viewBox='0 0 200 200' width='150' height='150' className='mx-auto'>
            {/* Front face (width x height) */}
            <rect
              x='40'
              y='50'
              width={w}
              height={h}
              fill='#4f46e5'
              fillOpacity='0.7'
              stroke='#312e81'
              strokeWidth='1.5'
            />
            {/* Top face (width x depth) */}
            <polygon
              points={`40,50 ${40 + w * 0.5},${50 - d * 0.3} ${40 + w + w * 0.5},${50 - d * 0.3} ${40 + w},50`}
              fill='#818cf8'
              fillOpacity='0.9'
              stroke='#312e81'
              strokeWidth='1.5'
            />
            {/* Right face (depth x height) */}
            <polygon
              points={`${40 + w},50 ${40 + w + w * 0.5},${50 - d * 0.3} ${40 + w + w * 0.5},${50 - d * 0.3 + h} ${40 + w},${50 + h}`}
              fill='#6366f1'
              fillOpacity='0.8'
              stroke='#312e81'
              strokeWidth='1.5'
            />
          </svg>
        </div>
      </div>

      {/* Dimension Details Grid */}
      <div className='grid grid-cols-3 gap-4 mb-6'>
        {/* Width */}
        <div className='bg-white rounded-lg p-4 border-l-4 border-blue-500'>
          <p className='text-xs text-gray-600 uppercase tracking-wide mb-1'>Width</p>
          <p className='text-xl font-bold text-gray-800'>{formatDim(width)}</p>
          <p className='text-xs text-gray-500 mt-2'>{displayUnit}</p>
        </div>

        {/* Height */}
        <div className='bg-white rounded-lg p-4 border-l-4 border-indigo-500'>
          <p className='text-xs text-gray-600 uppercase tracking-wide mb-1'>Height</p>
          <p className='text-xl font-bold text-gray-800'>{formatDim(height)}</p>
          <p className='text-xs text-gray-500 mt-2'>{displayUnit}</p>
        </div>

        {/* Depth */}
        <div className='bg-white rounded-lg p-4 border-l-4 border-purple-500'>
          <p className='text-xs text-gray-600 uppercase tracking-wide mb-1'>Depth</p>
          <p className='text-xl font-bold text-gray-800'>{formatDim(depth)}</p>
          <p className='text-xs text-gray-500 mt-2'>{displayUnit}</p>
        </div>
      </div>

      {/* Additional Information */}
      <div className='grid grid-cols-2 gap-4'>
        {/* Volume */}
        <div className='bg-white rounded-lg p-4'>
          <p className='text-xs text-gray-600 uppercase tracking-wide mb-2'>Volume</p>
          <p className='text-lg font-semibold text-gray-800'>{volume}</p>
          <p className='text-xs text-gray-500'>{displayUnit}³</p>
        </div>

        {/* Size Category */}
        <div className='bg-white rounded-lg p-4'>
          <p className='text-xs text-gray-600 uppercase tracking-wide mb-2'>Size Category</p>
          <div className='flex items-center gap-2'>
            <span className='text-lg font-semibold text-gray-800'>{getSizeCategory()}</span>
            <span className='inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded'>
              {parseFloat(volume) > 50000 ? 'Large' : parseFloat(volume) > 5000 ? 'Medium' : 'Small'}
            </span>
          </div>
        </div>
      </div>

      {/* AR Model Info */}
      {product.modelUrl && (
        <div className='mt-6 p-4 bg-white rounded-lg border border-green-200'>
          <div className='flex items-center gap-2 mb-2'>
            <span className='inline-block w-2 h-2 rounded-full bg-green-500'></span>
            <p className='text-sm font-medium text-gray-800'>3D Model Available</p>
          </div>
          <p className='text-xs text-gray-600'>
            This product has a 3D model optimized for AR viewing. Use your device camera to preview it in your space.
          </p>
        </div>
      )}
    </div>
  )
}

export default ARDimensions
