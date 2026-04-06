// Hero.jsx
import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

const Hero = () => {
  //  fixed header height 
  const HEADER_OFFSET = 0; 

  const scrollToCollection = () => {
    const target = document.getElementById('latest-collection');
    if (!target) {
      console.warn('Target #latest-collection not found in DOM.');
      return;
    }

    // scrollIntoView 
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // fixed header, adjust after a short delay
      if (HEADER_OFFSET) {
        // small timeout to allow scrollIntoView to run then adjust offset
        setTimeout(() => {
          const absoluteTop = target.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({ top: absoluteTop - HEADER_OFFSET, behavior: 'smooth' });
        }, 100);
      }
    } catch (e) {
      
      const absoluteTop = target.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: absoluteTop - HEADER_OFFSET, behavior: 'smooth' });
    }
  };

  return (
    <div className='bg-gradient-to-r from-yellow-100 via-amber-50 to-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm'>
      <div className='flex flex-col sm:flex-row'>
        {/* Hero left side */}
        <img className='w-full sm:w-1/2 object-cover' src={assets.hero_img} alt="Preview crochet" />

        {/* Hero right side */}
        <div className='w-full sm:w-1/2 flex items-center justify-center py-10 sm:py-0 px-6 sm:px-10 bg-white/40'>
          <div className='text-[#414141] space-y-3 max-w-md'>
            <div className='flex items-center gap-3'>
              <p className='w-10 md:w-12 h-[2px] bg-[#414141]'></p>
              <p className='font-medium text-sm md:text-base uppercase tracking-wide'>Our Bestsellers</p>
            </div>

            <h1 className='prata-regular text-3xl sm:text-4xl lg:text-5xl leading-tight'>New Products</h1>

            <p className='text-sm sm:text-base text-gray-600'>Preview handmade pieces in AR, browse unique artisan creations, and chat with makers directly.</p>

            <div className='flex items-center gap-4'>
              <Link
                to='/collection'
                aria-label="Go to products collection"
                className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-pink-700 transition-colors'
              >
                Shop products
                <span className='text-lg'>↓</span>
              </Link>
              <button
                onClick={scrollToCollection}
                aria-label="Scroll to Latest Products"
                className='inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition'
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 14a1 1 0 01-.707-.293l-4-4a1 1 0 011.414-1.414L10 11.586l3.293-3.293a1 1 0 011.414 1.414l-4 4A1 1 0 0110 14z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero
