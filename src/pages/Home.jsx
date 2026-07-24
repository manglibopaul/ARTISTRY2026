import React from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import LatestCollection from '../components/LatestCollection'
import FeaturedCollections from '../components/FeaturedCollections'
import NewsletterBox from '../components/NewsletterBox'

const Home = () => {
  const highlights = [
    {
      title: 'Thoughtful gifts',
      description: 'Handmade pieces that feel personal, warm, and lasting.'
    },
    {
      title: 'Support real creators',
      description: 'Shop directly from artists who pour heart and skill into every detail.'
    },
    {
      title: 'Beautifully curated',
      description: 'Every item is selected to bring character and charm into everyday spaces.'
    },
    {
      title: 'Friendly guidance',
      description: 'Ask questions, explore stories, and connect with artists before you buy.'
    }
  ]

  return (
    <div>
      <Hero/>

      <section className='mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8'>
        <div className='rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8'>
          <div className='grid gap-6 lg:grid-cols-[1.05fr_0.95fr]'>
            <div className='space-y-4'>
              <p className='text-sm font-semibold uppercase tracking-[0.3em] text-stone-500'>Why shoppers love ARTISTRY</p>
              <h2 className='prata-regular text-3xl text-stone-900 sm:text-4xl'>A warm marketplace for thoughtful gifts and timeless pieces.</h2>
              <p className='max-w-2xl text-base text-stone-600'>
                From handmade home accents to beautifully made accessories, every item is chosen to feel personal, meaningful, and made with care.
              </p>
              <Link to='/artisans' className='inline-flex items-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700'>
                Explore the artist community
              </Link>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              {highlights.map((item) => (
                <div key={item.title} className='rounded-2xl border border-stone-200 bg-stone-50 p-4'>
                  <h3 className='text-lg font-semibold text-stone-900'>{item.title}</h3>
                  <p className='mt-2 text-sm text-stone-600'>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FeaturedCollections/>
      <NewsletterBox/>
      {/* Full-page chat removed; floating ChatWidget remains mounted in App.jsx */}
    </div>
  )
}

export default Home
