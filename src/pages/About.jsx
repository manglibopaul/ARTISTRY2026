import React from 'react'
import Title from '../components/Title'
import NewsletterBox from '../components/NewsletterBox'
import Footer from '../components/Footer'

const About = () => {
  return (
    <div>
      {/* Header Section */}
      <div className='text-2xl text-center pt-8 border-t'>
        <Title text1={'ABOUT'} text2={'US'} />
      </div>

      {/* Newsletter Section */}
      <NewsletterBox />

      {/* About-only Footer */}
      <Footer />
    </div>
  )
}

export default About
