import React from 'react'

const Title = ({text1, text2}) => {
  return (
    <div className='flex flex-col items-center mb-4'>
      <div className='flex items-center gap-4'>
        <div className='text-center'>
          <p className='text-xs tracking-wider uppercase text-gray-500 mb-1'>{text1}</p>
          <p className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900'>{text2}</p>
        </div>
        <div className='hidden sm:block flex-1 max-w-[220px]'>
          <div className='h-0.5 bg-gradient-to-r from-pink-400 via-amber-300 to-transparent rounded' />
        </div>
      </div>
    </div>
  )
}

export default Title
