import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

/**
 * ARModelViewer Component
 * Interactive 3D model viewer with dimension overlay
 */
const ARModelViewer = ({ product, autoRotate = true }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [modelError, setModelError] = useState(null)
  const [showDimensions, setShowDimensions] = useState(true)
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })

  const { width, height, depth, modelUrl, iosModel } = product

  useEffect(() => {
    if (!modelUrl && !iosModel) {
      setModelError('No 3D model available for this product')
      return
    }

    setIsLoading(true)
    // Simulate model loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [modelUrl, iosModel])

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate) return

    const interval = setInterval(() => {
      setRotation((prev) => ({
        ...prev,
        y: (prev.y + 1) % 360,
      }))
    }, 50)

    return () => clearInterval(interval)
  }, [autoRotate])

  const getModelUrl = () => {
    // Use appropriate model based on platform
    return modelUrl || iosModel
  }

  const maxDim = Math.max(width || 0, height || 0, depth || 0)
  const scale = maxDim > 0 ? 50 / maxDim : 1

  return (
    <div className='ar-model-viewer border rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800'>
      {/* Viewer Header */}
      <div className='bg-gray-800 px-4 py-3 flex justify-between items-center'>
        <h3 className='text-white font-semibold text-sm'>3D Model Viewer</h3>
        <div className='flex gap-2'>
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className='px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition'
          >
            {showDimensions ? 'Hide' : 'Show'} Dimensions
          </button>
          {getModelUrl() && (
            <a
              href={getModelUrl()}
              target='_blank'
              rel='noopener noreferrer'
              className='px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition'
            >
              View Model
            </a>
          )}
        </div>
      </div>

      {/* Viewer Container */}
      <div className='relative w-full bg-gray-900 aspect-square overflow-hidden'>
        {isLoading && (
          <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20'>
            <div className='text-center'>
              <div className='inline-block animate-spin mb-3'>
                <div className='w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full'></div>
              </div>
              <p className='text-white text-sm'>Loading 3D Model...</p>
            </div>
          </div>
        )}

        {modelError ? (
          <div className='absolute inset-0 flex items-center justify-center bg-gray-800'>
            <div className='text-center p-6'>
              <svg
                className='w-12 h-12 text-gray-500 mx-auto mb-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <p className='text-gray-400 text-sm'>{modelError}</p>
            </div>
          </div>
        ) : (
          <>
            {/* 3D Model Area - Placeholder */}
            <div
              className='absolute inset-0 flex items-center justify-center perspective'
              style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              }}
            >
              {/* Isometric 3D Representation */}
              <svg viewBox='0 0 200 200' width='200' height='200' className='drop-shadow-lg'>
                {/* Front face */}
                <rect
                  x='40'
                  y='50'
                  width={50 * scale}
                  height={60 * scale}
                  fill='#4f46e5'
                  fillOpacity='0.8'
                  stroke='#818cf8'
                  strokeWidth='2'
                />
                {/* Top face */}
                <polygon
                  points={`40,50 ${40 + 25 * scale},${50 - 15 * scale} ${40 + 50 * scale + 25 * scale},${50 - 15 * scale} ${40 + 50 * scale},50`}
                  fill='#818cf8'
                  fillOpacity='0.9'
                  stroke='#c7d2fe'
                  strokeWidth='2'
                />
                {/* Right face */}
                <polygon
                  points={`${40 + 50 * scale},50 ${40 + 50 * scale + 25 * scale},${50 - 15 * scale} ${40 + 50 * scale + 25 * scale},${50 - 15 * scale + 60 * scale} ${40 + 50 * scale},${50 + 60 * scale}`}
                  fill='#6366f1'
                  fillOpacity='0.85'
                  stroke='#a5b4fc'
                  strokeWidth='2'
                />
              </svg>
            </div>

            {/* Controls Overlay */}
            <div className='absolute bottom-4 left-4 right-4 flex gap-2'>
              <button
                onClick={() =>
                  setRotation((prev) => ({
                    ...prev,
                    y: (prev.y - 15) % 360,
                  }))
                }
                className='flex-1 px-2 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition'
              >
                ← Rotate
              </button>
              <button
                onClick={() => setRotation({ x: 0, y: 0, z: 0 })}
                className='flex-1 px-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition'
              >
                Reset
              </button>
              <button
                onClick={() =>
                  setRotation((prev) => ({
                    ...prev,
                    y: (prev.y + 15) % 360,
                  }))
                }
                className='flex-1 px-2 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition'
              >
                Rotate →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Dimensions Overlay */}
      {showDimensions && width && height && depth && (
        <div className='bg-gray-800 p-4 border-t border-gray-700'>
          <div className='grid grid-cols-3 gap-3 text-center'>
            <div>
              <p className='text-gray-400 text-xs uppercase mb-1'>Width</p>
              <p className='text-white font-bold'>{width.toFixed(1)}</p>
              <p className='text-gray-500 text-xs'>cm</p>
            </div>
            <div>
              <p className='text-gray-400 text-xs uppercase mb-1'>Height</p>
              <p className='text-white font-bold'>{height.toFixed(1)}</p>
              <p className='text-gray-500 text-xs'>cm</p>
            </div>
            <div>
              <p className='text-gray-400 text-xs uppercase mb-1'>Depth</p>
              <p className='text-white font-bold'>{depth.toFixed(1)}</p>
              <p className='text-gray-500 text-xs'>cm</p>
            </div>
          </div>
        </div>
      )}

      {/* AR Launch Button */}
      {getModelUrl() && (
        <div className='bg-gradient-to-r from-indigo-600 to-purple-600 p-3'>
          <button className='w-full px-4 py-2 bg-white text-indigo-600 font-semibold rounded hover:bg-gray-100 transition flex items-center justify-center gap-2'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M10 12a2 2 0 100-4 2 2 0 000 4z' />
              <path
                fillRule='evenodd'
                d='M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z'
                clipRule='evenodd'
              />
            </svg>
            View in AR
          </button>
        </div>
      )}
    </div>
  )
}

ARModelViewer.propTypes = {
  product: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
    depth: PropTypes.number,
    modelUrl: PropTypes.string,
    iosModel: PropTypes.string,
  }).isRequired,
  autoRotate: PropTypes.bool,
}

export default ARModelViewer
