import React from 'react'
import { useSearchParams } from 'react-router-dom'
import UserChat from '../components/UserChat'

const Chat = () => {
  const [searchParams] = useSearchParams()
  const sellerIdParam = searchParams.get('sellerId')
  const sellerNameParam = searchParams.get('sellerName')
  const sellerId = sellerIdParam ? Number(sellerIdParam) : null

  return (
    <div className='py-4 sm:py-6'>
      <UserChat
        defaultSellerId={Number.isFinite(sellerId) ? sellerId : null}
        defaultSellerName={sellerNameParam || null}
      />
    </div>
  )
}

export default Chat
