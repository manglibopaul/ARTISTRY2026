import React, { useContext, useRef } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import ProductItem from './ProductItem';

const FeaturedCollections = () => {
    const { products } = useContext(ShopContext);
    const scrollerRef = useRef(null);

    // Get featured products (first 8 products or bestsellers)
    const featuredProducts = products.slice(0, 8);

    if (featuredProducts.length === 0) {
        return null;
    }

    const scrollByAmount = (direction) => {
        if (!scrollerRef.current) return;
        const { clientWidth } = scrollerRef.current;
        scrollerRef.current.scrollBy({
            left: direction * Math.max(clientWidth - 80, 240),
            behavior: 'smooth',
        });
    };

    return (
        <div className='py-12 sm:py-16 bg-white'>
            <div className='max-w-6xl xl:max-w-[1400px] mx-auto px-5 sm:px-10'>
                <div className='text-center py-6 sm:py-8 text-3xl'>
                    <Title text1={'FEATURED'} text2={'PRODUCTS'} />
                    <p className='w-full sm:w-3/4 lg:w-2/3 m-auto sm:text-sm md:text-base text-gray-600 mt-2'>
                        Explore our curated handmade products
                    </p>
                </div>

                <div className='relative'>
                    <div
                        ref={scrollerRef}
                        className='flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                    >
                        {featuredProducts.map((item, index) => (
                            <div
                                key={index}
                                className='snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[30%] lg:w-[24%]'
                            >
                                <ProductItem
                                    id={item._id || item.id}
                                    image={item.image}
                                    name={item.name}
                                    price={item.price}
                                    sellerId={item.sellerId}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type='button'
                        onClick={() => scrollByAmount(-1)}
                        aria-label='Scroll left'
                        className='hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50'
                    >
                        <svg className='w-4 h-4' viewBox='0 0 20 20' fill='currentColor'>
                            <path d='M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z' />
                        </svg>
                    </button>
                    <button
                        type='button'
                        onClick={() => scrollByAmount(1)}
                        aria-label='Scroll right'
                        className='hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50'
                    >
                        <svg className='w-4 h-4' viewBox='0 0 20 20' fill='currentColor'>
                            <path d='M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z' />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeaturedCollections;
