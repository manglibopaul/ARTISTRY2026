import React from 'react'

const Title = ({text1, text2, size = 'md'}) => {
  const sizes = {
    sm: { label: 'text-xs', title: 'text-xl sm:text-2xl md:text-3xl', rule: 'max-w-[220px]' },
    md: { label: 'text-sm', title: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl', rule: 'max-w-[300px]' },
    xl: { label: 'text-sm', title: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl', rule: 'max-w-[420px]' }
  }
  const s = sizes[size] || sizes.md

  return (
    <div className='flex flex-col items-center mb-6'>
      <div className='flex items-center gap-6'>
        <div className='text-center'>
          <p className={`${s.label} tracking-wider uppercase text-gray-500 mb-1`}>{text1}</p>
          <p className={`${s.title} font-extrabold text-gray-900 leading-tight`}>{text2}</p>
        </div>
        <div className={`hidden sm:block flex-1 ${s.rule}`}>
          <div className='h-1 bg-gradient-to-r from-pink-400 via-amber-300 to-transparent rounded' />
        </div>
      </div>
    </div>
  )
}

export default Title
