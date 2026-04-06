import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { assets } from '../assets/assets';
import CartTotal from '../components/CartTotal';


const Cart = () => {

  const { products, currency, cartsItems , updateQuantity, navigate, parseCartKey} = useContext(ShopContext);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const [cartData,setCartData] = useState([]);

  useEffect(()=>{

    const tempData = [];
    for(const items in cartsItems){
       if (cartsItems[items] > 0) {
        tempData.push({
          _id: items,
          quantity:cartsItems[items]
        })
       }
    }
    setCartData(tempData);
    
  },[cartsItems])

  return (
    <div className='border-t pt-8 sm:pt-14 px-4 sm:px-0'>
      <div className='text-xl sm:text-2xl mb-3'>

        <Title text1={'YOUR'} text2={'CART'}/>

      </div>

      <div>
        {
          cartData.map((item,index) => {

            const { id: productId, color } = parseCartKey(item._id);

            // find product by either _id (string) or id (number)
            const productData = products.find((product)=> {
              if (product._id && String(product._id) === String(productId)) return true;
              if (product.id && String(product.id) === String(productId)) return true;
              return false;
            }); 

            if (!productData) return null;

            // Resolve image URL (handle both object and string formats)
            const firstImg = Array.isArray(productData.image) && productData.image.length > 0 ? productData.image[0] : null;
            let imgSrc = '/path/to/placeholder.jpg';
            if (firstImg) {
              if (typeof firstImg === 'object' && firstImg.url) {
                imgSrc = firstImg.url.startsWith('http') ? firstImg.url : `${apiUrl}${firstImg.url}`;
              } else if (typeof firstImg === 'string') {
                imgSrc = firstImg.startsWith('http') ? firstImg : `${apiUrl}${firstImg}`;
              }
            }

            return (
              <div key={index} className='py-3 sm:py-4 border-t border-b border border-black text-gray-700 grid grid-cols-[3fr_1fr_0.5fr] sm:grid-cols-[4fr_2fr_0.5fr] items-center gap-2 sm:gap-4 bg-pink-100'>
                <div className='flex items-start gap-3 sm:gap-6'>
                  <img className='w-14 h-14 sm:w-20 sm:h-20 object-cover rounded' src={imgSrc} alt="" />
                  <div>
                    <p className='text-sm sm:text-lg font-medium'>{productData.name}</p>
                    {color && <p className='text-xs text-gray-600 mt-1'>Color: {color}</p>}
                    <div className='flex items-center gap-3 sm:gap-5 mt-1 sm:mt-2'>
                      <p className='text-sm sm:text-base'>{currency}{productData.price}</p>
                    </div>
                  </div>
                </div>
                <input onChange={(e)=> e.target.value === '' || e.target.value === '0' ? null : updateQuantity(item._id,Number(e.target.value))} className='border border-black w-12 sm:w-16 h-10 px-2 py-1 bg-violet-100 text-center text-sm' type="number" min={1} defaultValue={item.quantity} />
                <img onClick={()=>updateQuantity(item._id,0)} className='w-5 sm:w-5 cursor-pointer justify-self-center' src={assets.bin_icon} alt="" />
              </div>
            )

          })
        }
      </div>
      <div className='flex justify-end my-12 sm:my-20'>
        <div className='w-full sm:w-[450px]'>
          <CartTotal/>
          <div className='w-full flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-3 mt-4'>
            <button onClick={() => {
              const token = localStorage.getItem('token')
              if (!token) return navigate('/login')
              navigate('/orders')
            }} className='bg-gray-200 text-gray-800 text-sm px-6 py-3 rounded w-full sm:w-auto'>
              View Orders
            </button>
            <button onClick={()=>navigate('/place-order')} className='bg-black text-white text-sm px-8 py-3 w-full sm:w-auto'>PROCEED TO CHECKOUT</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
