import React from 'react'

const Title = ({text1, text2}) => {
  return (
    <div className='flex flex-col items-center mb-6'>
      <div className='flex items-center gap-6'>
        <div className='text-center'>
          <p className='text-sm tracking-wider uppercase text-gray-500 mb-1'>{text1}</p>
          <p className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight'>{text2}</p>
        </div>
        <div className='hidden sm:block flex-1 max-w-[300px]'>
          <div className='h-1 bg-gradient-to-r from-pink-400 via-amber-300 to-transparent rounded' />
        </div>
      </div>
    </div>
  )
}

export default Title
