import React, { useEffect, useState, useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import ProductItem from './ProductItem';

const LatestCollection = () => {

    const { products } = useContext(ShopContext);
    const [latestProducts, setLatestProducts] = useState([]);

    useEffect(()=>{
        setLatestProducts(products.slice(0,10));
    },[products])

    return (
        <div id="latest-collection" className='py-12 sm:py-14 bg-gradient-to-b from-white via-pink-50 to-white rounded-2xl'>
            <div className='max-w-6xl xl:max-w-[1400px] mx-auto px-5 sm:px-10'>
                <div className='text-center py-6 sm:py-8 text-3xl'>
                    <Title text1={'CROCHET'} text2={'PRODUCTS'} />
                    <p className='w-full sm:w-3/4 lg:w-2/3 m-auto sm:text-sm md:text-base text-gray-600 mt-2'>
                        Soft, stylish, and crafted to perfection—discover handmade pieces that bring comfort and charm into every corner of your home.
                    </p>
                </div>

                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 md:gap-7'>
                    {latestProducts.map((item, index) => (
                        <div key={index} className='bg-white rounded-xl shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition'>
                            <ProductItem id={item._id || item.id} image={item.image} name={item.name} price={item.price} sellerId={item.sellerId}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default LatestCollection
