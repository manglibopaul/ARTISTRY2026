import React, { useContext, useRef } from 'react'
import { Link } from 'react-router-dom'
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
        <div className='w-full max-w-full overflow-x-hidden bg-white py-12 sm:py-16'>
            <div className='mx-auto w-full max-w-6xl px-4 sm:px-6 xl:max-w-[1400px]'>
                <div className='mb-6 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 sm:p-6'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                        <div>
                            <div className='mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-stone-500'>
                                <span className='h-2.5 w-2.5 rounded-full bg-amber-500' />
                                New favorites
                            </div>
                            <Title size='xl' text1={'FEATURED'} text2={'PRODUCTS'} />
                            <p className='mt-3 max-w-2xl text-sm text-stone-600 sm:text-base'>
                                Freshly curated handmade pieces that feel as special as the stories behind them.
                            </p>
                        </div>
                        <Link to='/collection' className='inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50'>
                            View all items
                        </Link>
                    </div>
                </div>

                <div className='flex items-center gap-1 sm:gap-3 w-full overflow-x-hidden'>
                    {/* Left Arrow */}
                    <button
                        type='button'
                        onClick={() => scrollByAmount(-1)}
                        aria-label='Scroll left'
                        className='flex items-center justify-center flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition z-10'
                    >
                        <svg className='w-4 h-4' viewBox='0 0 20 20' fill='currentColor'>
                            <path d='M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z' />
                        </svg>
                    </button>

                    {/* Carousel Container */}
                    <div className='flex-1 relative w-full min-w-0 overflow-hidden'>
                        <div
                            ref={scrollerRef}
                            className='flex gap-2 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 sm:pb-6 px-2 sm:px-4 lg:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                        >
                            {featuredProducts.map((item, index) => (
                                <div
                                    key={index}
                                    className='snap-center shrink-0 w-full sm:w-[90%] md:w-[48%] lg:w-[32%] max-w-full'
                                >
                                    <div className='w-full max-w-full p-0'>
                                        <ProductItem
                                            id={item._id || item.id}
                                            image={item.image}
                                            name={item.name}
                                            price={item.price}
                                            sellerId={item.sellerId}
                                            sellerName={item.sellerName}
                                            artisanType={item.artisanType}
                                            stock={item.stock}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Arrow */}
                    <button
                        type='button'
                        onClick={() => scrollByAmount(1)}
                        aria-label='Scroll right'
                        className='flex items-center justify-center flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition z-10'
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
