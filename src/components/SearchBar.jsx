import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { getProductPath } from '../utils/productUrl';

const SearchBar = () => {

    const { search, setSearch, showSearch, setShowSearch, products } = useContext(ShopContext);
    const [searchResults, setSearchResults] = useState([]);
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

    // Helper function to get image URL
    const getImageUrl = (image) => {
        if (!image || (Array.isArray(image) && image.length === 0)) {
            return '/path/to/placeholder.jpg';
        }

        const firstImage = Array.isArray(image) ? image[0] : image;
        
        if (typeof firstImage === 'object' && firstImage.url) {
            return firstImage.url.startsWith('http') 
                ? firstImage.url 
                : `${apiUrl}${firstImage.url}`;
        } else if (typeof firstImage === 'string') {
            if (firstImage.startsWith('http')) {
                return firstImage;
            } else if (firstImage.startsWith('/')) {
                return `${apiUrl}${firstImage}`;
            } else {
                return `${apiUrl}/uploads/images/${firstImage}`;
            }
        }
        return '/path/to/placeholder.jpg';
    };

    // Filter products based on search
    useEffect(() => {
        if (search.trim()) {
            const results = products.filter(product =>
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.description.toLowerCase().includes(search.toLowerCase())
            ).slice(0, 8);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [search, products]);

    const handleProductClick = (product) => {
        navigate(getProductPath(product));
        setShowSearch(false);
        setSearch('');
    };

    return showSearch ? (
        <div className='border-t border-b bg-gray-50'>
            <div className='max-w-2xl mx-auto px-4 py-4'>
                <div className='flex items-center gap-2 min-w-0'>
                    <div className='flex-1 flex items-center min-w-0 border border-gray-300 rounded-full px-4 py-3 bg-white hover:border-gray-400 transition'>
                        <img className='w-5 h-5 text-gray-400' src={assets.search_icon} alt="search" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className='flex-1 min-w-0 outline-none bg-transparent text-sm ml-3 placeholder-gray-400'
                            type="text"
                            placeholder='Search products by name or description...'
                            autoFocus
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className='text-gray-400 hover:text-gray-600 transition'
                            >
                                <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowSearch(false)}
                        className='text-gray-500 hover:text-gray-700 transition p-2'
                        aria-label='Close search'
                    >
                        <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                        </svg>
                    </button>
                </div>

                {/* Search Results */}
                {search.trim() && (
                    <div className='mt-4'>
                        {searchResults.length > 0 ? (
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                {searchResults.map((product) => (
                                    <button
                                        key={product.id || product._id}
                                        onClick={() => handleProductClick(product)}
                                        className='flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition text-left border border-gray-100 hover:border-gray-300'
                                    >
                                        <img
                                            src={getImageUrl(product.image)}
                                            alt={product.name}
                                            className='w-12 h-12 object-cover rounded'
                                            onError={(e) => { e.target.src = '/path/to/placeholder.jpg'; }}
                                        />
                                        <div className='flex-1 min-w-0'>
                                            <p className='font-medium text-sm text-gray-800 truncate'>{product.name}</p>
                                            <p className='text-sm font-semibold text-gray-900'>₱{product.price}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className='text-center py-8'>
                                <svg className='w-12 h-12 mx-auto text-gray-300 mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                                </svg>
                                <p className='text-gray-500 text-sm'>No products found matching "{search}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    ) : null;
}

export default SearchBar;
