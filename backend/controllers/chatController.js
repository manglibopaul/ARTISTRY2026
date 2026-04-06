import ChatMessage from '../models/ChatMessage.js'
import User from '../models/User.js'
import Seller from '../models/Seller.js'

const SUPPORT_SELLER_EMAIL = 'admin.support@artistry.local'

const ensureSupportSeller = async () => {
  let supportSeller = await Seller.findOne({ where: { email: SUPPORT_SELLER_EMAIL }, paranoid: false })
  if (supportSeller) {
    if (supportSeller.deletedAt) await supportSeller.restore()
    return supportSeller
  }

  supportSeller = await Seller.create({
    name: 'Admin Support',
    email: SUPPORT_SELLER_EMAIL,
    password: `Support#${Date.now()}`,
    storeName: 'Admin Support',
    isVerified: true,
    description: 'System support account for admin conversations',
  })
  return supportSeller
}

const toPublicUploadPath = (filePath, filename) => {
  if (!filePath) return filename ? `/uploads/images/${filename}` : null
  const normalized = String(filePath).replace(/\\/g, '/')
  const marker = '/uploads/'
  const idx = normalized.lastIndexOf(marker)
  if (idx >= 0) return normalized.slice(idx)
  return filename ? `/uploads/images/${filename}` : null
}

const previewMessage = (msg) => {
  const meta = msg?.meta || {}
  if (meta.imageUrl) return msg?.message && msg.message !== '[image]' ? `Image: ${msg.message}` : 'Sent an image'
  return msg?.message || ''
}

// Seller: get conversations (distinct users with last message)
export const getSellerConversations = async (req, res) => {
  try {
    const sellerId = req.seller?.id
    if (!sellerId) return res.status(401).json({ message: 'Unauthorized' })

    // Get last message per user
    const messages = await ChatMessage.findAll({
      where: { sellerId },
      order: [['createdAt', 'DESC']],
    })
    // group by either userId or guestId
    const map = new Map()
    for (const m of messages) {
      const key = m.userId ? `u:${m.userId}` : `g:${m.guestId || 'guest'}`
      if (!map.has(key)) map.set(key, m)
    }

    const results = []
    for (const [key, lastMsg] of map.entries()) {
      if (key.startsWith('u:')) {
        const userId = Number(key.split(':')[1])
        const user = await User.findByPk(userId)
        const unreadCount = await ChatMessage.count({ where: { sellerId, userId, sender: 'user', read: false } })
        results.push({ userId, guestId: null, name: user?.name || 'User', lastMessage: previewMessage(lastMsg), lastAt: lastMsg.createdAt, unreadCount, isGuest: false })
      } else {
        const guestId = key.split(':')[1]
        const unreadCount = await ChatMessage.count({ where: { sellerId, guestId, sender: 'user', read: false } })
        results.push({ userId: null, guestId, name: lastMsg.guestName || 'Guest', lastMessage: previewMessage(lastMsg), lastAt: lastMsg.createdAt, unreadCount, isGuest: true })
      }
    }

    // sort by lastAt desc
    results.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
    return res.json(results)
  } catch (error) {
    console.error('getSellerConversations', error)
    return res.status(500).json({ message: 'Failed to fetch conversations' })
  }
}

// Seller: get messages with a specific user
export const getConversationMessagesForSeller = async (req, res) => {
  try {
    const sellerId = req.seller?.id
    const { userId } = req.params
    if (!sellerId) return res.status(401).json({ message: 'Unauthorized' })
    let where = { sellerId }
    if (/^\d+$/.test(String(userId))) {
      where.userId = Number(userId)
    } else {
      // treat as guestId (or read from query)
      const guestId = req.query.guestId || userId
      where.guestId = guestId
    }

    const messages = await ChatMessage.findAll({ where, order: [['createdAt', 'ASC']] })
    const productId = req.query?.productId
    let messagesFiltered = messages
    if (productId) {
      messagesFiltered = messages.filter(m => {
        const meta = m.meta || {}
        return (meta && String(meta.productId) === String(productId)) || (m.orderId && String(m.orderId) === String(productId))
      })
    }

    // mark user's/guest's messages as read for returned messages
    const messageIdsToMark = messagesFiltered.filter(m => m.sender === 'user' && !m.read).map(m => m.id)
    if (messageIdsToMark.length) await ChatMessage.update({ read: true }, { where: { id: messageIdsToMark } })

    return res.json(messagesFiltered)
  } catch (error) {
    console.error('getConversationMessagesForSeller', error)
    return res.status(500).json({ message: 'Failed to fetch messages' })
  }
}

// Seller sends message to user
export const sellerSendMessage = async (req, res) => {
  try {
    const sellerId = req.seller?.id
    const { userId } = req.params
    const { text, orderId, guestName, guestEmail, guestId: bodyGuestId, productId } = req.body
    if (!sellerId) return res.status(401).json({ message: 'Unauthorized' })
    const imageUrl = req.file ? toPublicUploadPath(req.file.path, req.file.filename) : null
    const cleanedText = String(text || '').trim()
    if (!cleanedText && !imageUrl) return res.status(400).json({ message: 'Message or image required' })

    const baseMeta = { ...(req.body.meta || {}) }
    if (productId) baseMeta.productId = productId
    if (imageUrl) baseMeta.imageUrl = imageUrl

    const messageText = cleanedText || '[image]'
    let message
    if (/^\d+$/.test(String(userId))) {
      message = await ChatMessage.create({ userId: Number(userId), sellerId, message: messageText, sender: 'seller', orderId: orderId || null, meta: baseMeta })
    } else {
      const guestId = bodyGuestId || userId
      message = await ChatMessage.create({ guestId, guestName: guestName || null, guestEmail: guestEmail || null, sellerId, message: messageText, sender: 'seller', orderId: orderId || null, meta: baseMeta })
    }
    console.log('sellerSendMessage created:', { id: message.id, sellerId: message.sellerId, userId: message.userId, guestId: message.guestId, sender: message.sender })
    return res.status(201).json(message)
  } catch (error) {
    console.error('sellerSendMessage', error)
    return res.status(500).json({ message: 'Failed to send message' })
  }
}

// User: get conversations (list of sellers they've chatted with)
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user?.id
    const guestId = req.query?.guestId

    if (!userId && !guestId) return res.status(401).json({ message: 'Provide guestId or sign in' })

    if (userId) {
      const messages = await ChatMessage.findAll({ where: { userId }, order: [['createdAt', 'DESC']] })
      const map = new Map()
      for (const m of messages) if (!map.has(m.sellerId)) map.set(m.sellerId, m)

      const results = []
      for (const [sellerId, lastMsg] of map.entries()) {
        const seller = await Seller.findByPk(sellerId)
        const unreadCount = await ChatMessage.count({ where: { userId, sellerId, sender: 'seller', read: false } })
        results.push({ sellerId, sellerName: seller?.storeName || 'Seller', lastMessage: previewMessage(lastMsg), lastAt: lastMsg.createdAt, unreadCount, isGuest: false })
      }
      results.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
      return res.json(results)
    }

    // guest flow
    const messages = await ChatMessage.findAll({ where: { guestId }, order: [['createdAt', 'DESC']] })
    const map = new Map()
    for (const m of messages) if (!map.has(m.sellerId)) map.set(m.sellerId, m)
    const results = []
    for (const [sellerId, lastMsg] of map.entries()) {
      const seller = await Seller.findByPk(sellerId)
      const unreadCount = await ChatMessage.count({ where: { guestId, sellerId, sender: 'seller', read: false } })
      results.push({ sellerId, sellerName: seller?.storeName || 'Seller', lastMessage: previewMessage(lastMsg), lastAt: lastMsg.createdAt, unreadCount, isGuest: true, guestId })
    }
    results.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
    return res.json(results)
  } catch (error) {
    console.error('getUserConversations', error)
    return res.status(500).json({ message: 'Failed to fetch conversations' })
  }
}

// User: get messages with seller
export const getConversationMessagesForUser = async (req, res) => {
  try {
    const userId = req.user?.id
    const { sellerId } = req.params
    const guestId = req.query?.guestId

    if (!userId && !guestId) return res.status(401).json({ message: 'Provide guestId or sign in' })

    let where = { sellerId: Number(sellerId) }
    if (userId) where.userId = userId
    else where.guestId = guestId

    const messagesAll = await ChatMessage.findAll({ where, order: [['createdAt', 'ASC']] })
    const productId = req.query?.productId
    let messages = messagesAll
    if (productId) {
      // Include messages that either match the productId OR don't have a meta.productId (seller replies from admin don't have it)
      messages = messagesAll.filter(m => {
        const meta = m.meta || {}
        // Show message if it matches the productId, or if it's a seller message without a specific product (applies to all product chats)
        return (meta && String(meta.productId) === String(productId)) || (m.orderId && String(m.orderId) === String(productId)) || (m.sender === 'seller' && !meta.productId)
      })
    }
    // mark seller messages as read for returned messages
    const messageIdsToMark = messages.filter(m => m.sender === 'seller' && !m.read).map(m => m.id)
    if (messageIdsToMark.length) await ChatMessage.update({ read: true }, { where: { id: messageIdsToMark } })
    return res.json(messages)
  } catch (error) {
    console.error('getConversationMessagesForUser', error)
    return res.status(500).json({ message: 'Failed to fetch messages' })
  }
}

// User sends message to seller
export const userSendMessage = async (req, res) => {
  try {
    const userId = req.user?.id
    const { sellerId } = req.params
    const { text, orderId, guestId, guestName, guestEmail, productId } = req.body
    if (!userId && !guestId) return res.status(401).json({ message: 'Provide guestId or sign in' })

    const imageUrl = req.file ? toPublicUploadPath(req.file.path, req.file.filename) : null
    const cleanedText = String(text || '').trim()
    if (!cleanedText && !imageUrl) return res.status(400).json({ message: 'Message or image required' })

    const baseMeta = { ...(req.body.meta || {}) }
    if (productId) baseMeta.productId = productId
    if (imageUrl) baseMeta.imageUrl = imageUrl
    const messageText = cleanedText || '[image]'

    let message
    if (userId) {
      message = await ChatMessage.create({ userId, sellerId: Number(sellerId), message: messageText, sender: 'user', orderId: orderId || null, meta: baseMeta })
    } else {
      message = await ChatMessage.create({ guestId, guestName: guestName || null, guestEmail: guestEmail || null, sellerId: Number(sellerId), message: messageText, sender: 'user', orderId: orderId || null, meta: baseMeta })
    }
    console.log('userSendMessage created:', { id: message.id, sellerId: message.sellerId, userId: message.userId, guestId: message.guestId, sender: message.sender })
    return res.status(201).json(message)
  } catch (error) {
    console.error('userSendMessage', error)
    return res.status(500).json({ message: 'Failed to send message' })
  }
}

// DEV: return recent chat messages for debugging (disabled in production)
export const getRecentMessagesDev = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed in production' })
    const messages = await ChatMessage.findAll({ order: [['createdAt', 'DESC']], limit: 200 })
    return res.json(messages)
  } catch (error) {
    console.error('getRecentMessagesDev', error)
    return res.status(500).json({ message: 'Failed to fetch messages' })
  }
}

// Seller: delete an entire conversation (all messages for a userId or guestId)
export const sellerDeleteConversation = async (req, res) => {
  try {
    const sellerId = req.seller?.id
    const { userId } = req.params
    if (!sellerId) return res.status(401).json({ message: 'Unauthorized' })

    const where = { sellerId }
    if (/^\d+$/.test(String(userId))) {
      where.userId = Number(userId)
    } else {
      where.guestId = userId
    }

    const deleted = await ChatMessage.destroy({ where })
    return res.json({ deleted })
  } catch (error) {
    console.error('sellerDeleteConversation', error)
    return res.status(500).json({ message: 'Failed to delete conversation' })
  }
}

// User: get support conversation with admin
export const getUserAdminConversation = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const supportSeller = await ensureSupportSeller()
    const messages = await ChatMessage.findAll({ where: { sellerId: supportSeller.id, userId }, order: [['createdAt', 'ASC']] })
    const toMark = messages.filter(m => m.sender === 'seller' && !m.read).map(m => m.id)
    if (toMark.length) await ChatMessage.update({ read: true }, { where: { id: toMark } })
    return res.json(messages)
  } catch (error) {
    console.error('getUserAdminConversation', error)
    return res.status(500).json({ message: 'Failed to fetch support conversation' })
  }
}

// User: send support message to admin
export const userSendAdminSupportMessage = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const supportSeller = await ensureSupportSeller()
    const imageUrl = req.file ? toPublicUploadPath(req.file.path, req.file.filename) : null
    const cleanedText = String(req.body?.text || '').trim()
    if (!cleanedText && !imageUrl) return res.status(400).json({ message: 'Message or image required' })

    const meta = imageUrl ? { imageUrl, channel: 'admin-support' } : { channel: 'admin-support' }
    const message = await ChatMessage.create({
      sellerId: supportSeller.id,
      userId,
      sender: 'user',
      message: cleanedText || '[image]',
      meta,
    })
    return res.status(201).json(message)
  } catch (error) {
    console.error('userSendAdminSupportMessage', error)
    return res.status(500).json({ message: 'Failed to send support message' })
  }
}

// Seller: get support conversation with admin
export const getSellerAdminConversation = async (req, res) => {
  try {
    const sellerId = req.seller?.id
    if (!sellerId) return res.status(401).json({ message: 'Unauthorized' })

    const supportSeller = await ensureSupportSeller()
    const sellerThreadId = `seller:${sellerId}`
    const messages = await ChatMessage.findAll({ where: { sellerId: supportSeller.id, guestId: sellerThreadId }, order: [['createdAt', 'ASC']] })
    const toMark = messages.filter(m => m.sender === 'seller' && !m.read).map(m => m.id)
    if (toMark.length) await ChatMessage.update({ read: true }, { where: { id: toMark } })
    return res.json(messages)
  } catch (error) {
    console.error('getSellerAdminConversation', error)
    return res.status(500).json({ message: 'Failed to fetch support conversation' })
  }
}

// Seller: send support message to admin
export const sellerSendAdminSupportMessage = async (req, res) => {
  try {
    const sellerId = req.seller?.id
    if (!sellerId) return res.status(401).json({ message: 'Unauthorized' })

    const supportSeller = await ensureSupportSeller()
    const seller = await Seller.findByPk(sellerId)
    const imageUrl = req.file ? toPublicUploadPath(req.file.path, req.file.filename) : null
    const cleanedText = String(req.body?.text || '').trim()
    if (!cleanedText && !imageUrl) return res.status(400).json({ message: 'Message or image required' })

    const meta = imageUrl ? { imageUrl, channel: 'admin-support', actorType: 'seller' } : { channel: 'admin-support', actorType: 'seller' }
    const message = await ChatMessage.create({
      sellerId: supportSeller.id,
      guestId: `seller:${sellerId}`,
      guestName: seller?.storeName || seller?.name || `Seller #${sellerId}`,
      sender: 'user',
      message: cleanedText || '[image]',
      meta,
    })
    return res.status(201).json(message)
  } catch (error) {
    console.error('sellerSendAdminSupportMessage', error)
    return res.status(500).json({ message: 'Failed to send support message' })
  }
}

// Admin: list support conversations from users and sellers
export const getAdminSupportConversations = async (req, res) => {
  try {
    const supportSeller = await ensureSupportSeller()
    const messages = await ChatMessage.findAll({ where: { sellerId: supportSeller.id }, order: [['createdAt', 'DESC']] })

    const map = new Map()
    for (const m of messages) {
      const key = m.userId ? `u:${m.userId}` : (m.guestId?.startsWith('seller:') ? `s:${m.guestId.split(':')[1]}` : null)
      if (!key) continue
      if (!map.has(key)) map.set(key, m)
    }

    const results = []
    for (const [key, lastMsg] of map.entries()) {
      if (key.startsWith('u:')) {
        const userId = Number(key.split(':')[1])
        const user = await User.findByPk(userId)
        const unreadCount = await ChatMessage.count({ where: { sellerId: supportSeller.id, userId, sender: 'user', read: false } })
        results.push({ threadKey: key, actorType: 'customer', name: user?.name || `Customer #${userId}`, lastMessage: previewMessage(lastMsg), lastAt: lastMsg.createdAt, unreadCount })
      } else {
        const sellerActorId = Number(key.split(':')[1])
        const seller = await Seller.findByPk(sellerActorId)
        const threadGuestId = `seller:${sellerActorId}`
        const unreadCount = await ChatMessage.count({ where: { sellerId: supportSeller.id, guestId: threadGuestId, sender: 'user', read: false } })
        results.push({ threadKey: key, actorType: 'seller', name: seller?.storeName || seller?.name || `Seller #${sellerActorId}`, lastMessage: previewMessage(lastMsg), lastAt: lastMsg.createdAt, unreadCount })
      }
    }

    results.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
    return res.json(results)
  } catch (error) {
    console.error('getAdminSupportConversations', error)
    return res.status(500).json({ message: 'Failed to fetch support conversations' })
  }
}

// Admin: get messages for a support thread
export const getAdminSupportConversationMessages = async (req, res) => {
  try {
    const { threadKey } = req.params
    const supportSeller = await ensureSupportSeller()

    const where = { sellerId: supportSeller.id }
    if (String(threadKey).startsWith('u:')) {
      where.userId = Number(String(threadKey).slice(2))
    } else if (String(threadKey).startsWith('s:')) {
      where.guestId = `seller:${String(threadKey).slice(2)}`
    } else {
      return res.status(400).json({ message: 'Invalid thread key' })
    }

    const messages = await ChatMessage.findAll({ where, order: [['createdAt', 'ASC']] })
    const toMark = messages.filter(m => m.sender === 'user' && !m.read).map(m => m.id)
    if (toMark.length) await ChatMessage.update({ read: true }, { where: { id: toMark } })
    return res.json(messages)
  } catch (error) {
    console.error('getAdminSupportConversationMessages', error)
    return res.status(500).json({ message: 'Failed to fetch support messages' })
  }
}

// Admin: send message in support thread
export const adminSendSupportMessage = async (req, res) => {
  try {
    const { threadKey } = req.params
    const supportSeller = await ensureSupportSeller()
    const imageUrl = req.file ? toPublicUploadPath(req.file.path, req.file.filename) : null
    const cleanedText = String(req.body?.text || '').trim()
    if (!cleanedText && !imageUrl) return res.status(400).json({ message: 'Message or image required' })

    const payload = {
      sellerId: supportSeller.id,
      sender: 'seller',
      message: cleanedText || '[image]',
      meta: imageUrl ? { imageUrl, channel: 'admin-support', fromAdmin: true } : { channel: 'admin-support', fromAdmin: true },
    }

    if (String(threadKey).startsWith('u:')) {
      payload.userId = Number(String(threadKey).slice(2))
    } else if (String(threadKey).startsWith('s:')) {
      const sellerActorId = Number(String(threadKey).slice(2))
      const seller = await Seller.findByPk(sellerActorId)
      payload.guestId = `seller:${sellerActorId}`
      payload.guestName = seller?.storeName || seller?.name || `Seller #${sellerActorId}`
    } else {
      return res.status(400).json({ message: 'Invalid thread key' })
    }

    const message = await ChatMessage.create(payload)
    return res.status(201).json(message)
  } catch (error) {
    console.error('adminSendSupportMessage', error)
    return res.status(500).json({ message: 'Failed to send support reply' })
  }
}

// Admin: delete all messages in a support thread
export const adminDeleteSupportConversation = async (req, res) => {
  try {
    const { threadKey } = req.params
    const supportSeller = await ensureSupportSeller()

    const where = { sellerId: supportSeller.id }
    if (String(threadKey).startsWith('u:')) {
      where.userId = Number(String(threadKey).slice(2))
    } else if (String(threadKey).startsWith('s:')) {
      where.guestId = `seller:${String(threadKey).slice(2)}`
    } else {
      return res.status(400).json({ message: 'Invalid thread key' })
    }

    const deleted = await ChatMessage.destroy({ where })
    if (!deleted) {
      return res.status(404).json({ message: 'Support conversation not found or already deleted', deleted: 0 })
    }
    return res.json({ deleted })
  } catch (error) {
    console.error('adminDeleteSupportConversation', error)
    return res.status(500).json({ message: 'Failed to delete support conversation' })
  }
}
