import React from 'react'
import Hero from '../components/Hero'
import LatestCollection from '../components/LatestCollection'
import FeaturedCollections from '../components/FeaturedCollections'
import NewsletterBox from '../components/NewsletterBox'

const Home = () => {
  return (
    <div>
      <Hero/>
      <FeaturedCollections/>
      <NewsletterBox/>
      {/* Full-page chat removed; floating ChatWidget remains mounted in App.jsx */}
    </div>
  )
}

export default Home
