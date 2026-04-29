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
    } catch {
      
      const absoluteTop = target.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: absoluteTop - HEADER_OFFSET, behavior: 'smooth' });
    }
  };

  return (
    <div className='bg-gradient-to-r from-white to-yellow-50 rounded-3xl border border-amber-100 overflow-hidden shadow-sm py-6'>
      <div className='flex flex-col sm:flex-row items-stretch'>
        {/* Hero left side */}
        <div className='w-full sm:w-1/2 overflow-hidden relative rounded-l-3xl'>
          <img className='w-full h-full object-cover transform transition-transform duration-700 hover:scale-105 hero-float rounded-l-3xl' src={assets.hero_img} alt="Preview crochet" />
          <div className='absolute left-6 top-6 bg-white/90 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm animate-bounce-slow'>Support local artists</div>
        </div>

        {/* Hero right side */}
        <div className='w-full sm:w-1/2 flex items-center justify-center py-12 sm:py-8 px-6 sm:px-12 bg-white/40 rounded-r-3xl overflow-hidden'>
          <div className='text-[#222222] space-y-4 max-w-lg'>
            <div className='flex items-center gap-3'>
              <p className='w-10 md:w-12 h-[2px] bg-[#414141]'></p>
              <p className='font-medium text-sm md:text-base uppercase tracking-wide'>Our Bestsellers</p>
            </div>

            <h1 className='prata-regular text-4xl sm:text-5xl lg:text-6xl leading-tight font-bold'>Handmade. Local. Beautiful.</h1>

            <p className='text-base sm:text-lg text-gray-600'>Discover unique creations from talented artists — curated pieces you won't find anywhere else.</p>

            <div className='flex items-center gap-4 mt-4'>
              <Link
                to='/collection'
                aria-label="Shop collection"
                className='inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 text-white text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition'
              >
                Shop curated pieces
                <span className='text-xl'>→</span>
              </Link>
              <button
                onClick={scrollToCollection}
                aria-label="Scroll to Latest Products"
                className='inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition'
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
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
