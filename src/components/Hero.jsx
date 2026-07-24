// Hero.jsx
import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

const Hero = () => {
  const HEADER_OFFSET = 0;

  const scrollToCollection = () => {
    const target = document.getElementById('latest-collection');
    if (!target) {
      console.warn('Target #latest-collection not found in DOM.');
      return;
    }

    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (HEADER_OFFSET) {
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

  const stats = [
    ['100+', 'Handmade picks'],
    ['Verified', 'Artists'],
    ['Fast', 'Support']
  ];

  return (
    <section className='relative overflow-hidden rounded-[2rem] border border-amber-100 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),linear-gradient(135deg,_#fffdf8_0%,_#fff7e6_45%,_#ffffff_100%)] py-5 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] sm:py-7'>
      <div className='flex flex-col lg:flex-row items-stretch'>
        <div className='relative m-3 overflow-hidden rounded-[1.5rem] lg:w-[46%] sm:m-4'>
          <img
            className='h-full min-h-[280px] w-full object-cover transition-transform duration-700 hover:scale-105 hero-float'
            src={assets.hero_img}
            alt='Preview of handmade artisan work'
          />
          <div className='absolute left-4 top-4 rounded-full bg-white/90 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur sm:text-sm'>
            Support local artists
          </div>
          <div className='absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur'>
            <p className='text-[11px] uppercase tracking-[0.3em] text-stone-500'>Featured story</p>
            <p className='mt-1 text-sm font-semibold text-stone-800'>Every piece is crafted with purpose, texture, and heart.</p>
          </div>
        </div>

        <div className='flex items-center px-5 py-8 sm:px-8 sm:py-10 lg:w-[54%] lg:px-10'>
          <div className='max-w-2xl space-y-5'>
            <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm'>
              <span className='h-2.5 w-2.5 rounded-full bg-amber-500' />
              Curated by local artisans
            </div>

            <div className='space-y-3'>
              <h1 className='prata-regular text-4xl font-bold leading-[0.95] text-stone-900 sm:text-5xl lg:text-6xl'>
                Handmade pieces with a story.
              </h1>
              <p className='max-w-xl text-base text-stone-600 sm:text-lg'>
                Discover one-of-a-kind creations from talented artists — thoughtfully selected for beauty, craftsmanship, and everyday joy.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Link
                to='/collection'
                aria-label='Shop collection'
                className='inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl'
              >
                Shop the collection
                <span className='text-xl'>→</span>
              </Link>
              <Link
                to='/artisans'
                aria-label='Meet the artists'
                className='inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-3 text-base font-semibold text-stone-700 transition hover:bg-stone-50'
              >
                Meet the artists
              </Link>
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              {stats.map(([value, label]) => (
                <div key={label} className='rounded-2xl border border-stone-200 bg-white/80 p-3 shadow-sm'>
                  <div className='text-lg font-semibold text-stone-900'>{value}</div>
                  <div className='text-sm text-stone-600'>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
