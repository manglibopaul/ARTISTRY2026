import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className='min-h-[70vh] flex flex-col items-center justify-center text-center px-4'>
      <h1 className='text-6xl font-bold text-gray-800 mb-4'>404</h1>
      <p className='text-xl text-gray-600 mb-2'>Page Not Found</p>
      <p className='text-gray-500 mb-8'>The page you're looking for doesn't exist or has been moved.</p>
      <Link
        to='/'
        className='bg-black text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors'
      >
        Go back home
      </Link>
    </div>
  );
};

export default NotFound;
