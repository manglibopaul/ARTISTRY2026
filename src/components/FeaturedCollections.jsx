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
            <div className='max-w-6xl xl:max-w-[1400px] mx-auto px-4 sm:px-6'>
                <div className='text-center py-6 sm:py-8'>
                    <Title text1={'FEATURED'} text2={'PRODUCTS'} />
                    <p className='w-full sm:w-3/4 lg:w-2/3 m-auto sm:text-base md:text-lg text-gray-600 mt-3'>
                        Explore our curated handmade products
                    </p>
                </div>

                <div className='relative'>
                    <div
                        ref={scrollerRef}
                        className='flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-6 pl-4 sm:pl-6 lg:pl-0 pr-4 sm:pr-6 lg:pr-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                    >
                        {featuredProducts.map((item, index) => (
                            <div
                                key={index}
                                className='snap-center shrink-0 w-[80%] sm:w-[46%] md:w-[32%] lg:w-[24%] px-2'
                            >
                                <div className='p-1'>
                                    <ProductItem
                                        id={item._id || item.id}
                                        image={item.image}
                                        name={item.name}
                                        price={item.price}
                                        sellerId={item.sellerId}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type='button'
                        onClick={() => scrollByAmount(-1)}
                        aria-label='Scroll left'
                        className='flex items-center justify-center absolute left-2 md:left-0 top-1/2 -translate-y-1/2 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50 z-10'
                    >
                        <svg className='w-4 h-4' viewBox='0 0 20 20' fill='currentColor'>
                            <path d='M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z' />
                        </svg>
                    </button>
                    <button
                        type='button'
                        onClick={() => scrollByAmount(1)}
                        aria-label='Scroll right'
                        className='flex items-center justify-center absolute right-2 md:right-0 top-1/2 -translate-y-1/2 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50 z-10'
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
