import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';

const CartTotal = ({ shippingFee: shippingFeeProp }) => {

    const {currency, delivery_fee, getCartAmount} = useContext(ShopContext);

    const subtotal = getCartAmount();
    const shippingFee = shippingFeeProp != null ? shippingFeeProp : delivery_fee;
    const total = subtotal === 0 ? 0 : subtotal + shippingFee;

  return (
    <div className='w-full'>
      <div className='text-2xl'>
        <Title text1={"CART"} text2={'TOTAL'}/>
      </div>

      <div className='flex flex-col gap-2 mt-2 text-sm'>
        
        <div className='flex justify-between'>
            <p>Subtotal</p>
            <p>{currency} {subtotal.toFixed(2)}</p>
        </div>

        <hr />

        <div className='flex justify-between'>
            <p>Shipping Fee</p>
            <p>{shippingFee === 0 ? <span className='text-green-600'>FREE</span> : `${currency} ${shippingFee.toFixed(2)}`}</p>
        </div>

        <hr />

        <div className='flex justify-between mt-4'>
            <b>Total</b>
            <b>{currency} {total.toFixed(2)}</b>
        </div>

      </div>

    </div>
  )
}

export default CartTotal
