import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import UserChat from '../components/UserChat'

const Chat = () => {
  const { sellerRef } = useParams()
  const [searchParams] = useSearchParams()
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
  const [sellerId, setSellerId] = useState(null)
  const [sellerName, setSellerName] = useState(null)

  useEffect(() => {
    let cancelled = false

    const resolveDefaultSeller = async () => {
      const sellerIdParam = searchParams.get('sellerId')
      const sellerNameParam = searchParams.get('sellerName')
      const querySellerId = sellerIdParam ? Number(sellerIdParam) : null

      if (!sellerRef) {
        setSellerId(Number.isFinite(querySellerId) ? querySellerId : null)
        setSellerName(sellerNameParam || null)
        return
      }

      if (/^\d+$/.test(String(sellerRef))) {
        const numericId = Number(sellerRef)
        setSellerId(Number.isFinite(numericId) ? numericId : null)
        setSellerName(sellerNameParam || null)
        return
      }

      try {
        const res = await fetch(`${apiUrl}/api/sellers/by-name/${encodeURIComponent(sellerRef)}`)
        if (!cancelled && res.ok) {
          const data = await res.json()
          setSellerId(Number(data?.id) || null)
          setSellerName(data?.storeName || sellerNameParam || null)
          return
        }
      } catch {
        // Fall back to query params below.
      }

      if (!cancelled) {
        setSellerId(Number.isFinite(querySellerId) ? querySellerId : null)
        setSellerName(sellerNameParam || null)
      }
    }

    resolveDefaultSeller()
    return () => { cancelled = true }
  }, [apiUrl, sellerRef, searchParams])

  return (
    <div className='py-4 sm:py-6'>
      <UserChat
        defaultSellerId={Number.isFinite(sellerId) ? sellerId : null}
        defaultSellerName={sellerName || null}
      />
    </div>
  )
}

export default Chat
