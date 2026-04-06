import express from 'express'
import { verifySeller } from '../middleware/sellerAuth.js'
import { verifyUserOptional, verifyUser, verifyAdmin } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import {
  getSellerConversations,
  getConversationMessagesForSeller,
  sellerSendMessage,
  getUserConversations,
  getConversationMessagesForUser,
  userSendMessage,
  getRecentMessagesDev,
  sellerDeleteConversation,
  getUserAdminConversation,
  userSendAdminSupportMessage,
  getSellerAdminConversation,
  sellerSendAdminSupportMessage,
  getAdminSupportConversations,
  getAdminSupportConversationMessages,
  adminSendSupportMessage,
  adminDeleteSupportConversation,
} from '../controllers/chatController.js'

const router = express.Router()

// Seller routes
router.get('/seller/conversations', verifySeller, getSellerConversations)
router.get('/seller/conversation/:userId', verifySeller, getConversationMessagesForSeller)
router.post('/seller/:userId/message', verifySeller, upload.single('image'), sellerSendMessage)
router.delete('/seller/conversation/:userId', verifySeller, sellerDeleteConversation)

// User routes (support authenticated users and guests)
router.get('/user/conversations', verifyUserOptional, getUserConversations)
router.get('/user/conversation/:sellerId', verifyUserOptional, getConversationMessagesForUser)
router.post('/user/:sellerId/message', verifyUserOptional, upload.single('image'), userSendMessage)

// Support chat routes (customer/seller <-> admin)
router.get('/support/user/conversation', verifyUser, getUserAdminConversation)
router.post('/support/user/message', verifyUser, upload.single('image'), userSendAdminSupportMessage)
router.get('/support/seller/conversation', verifySeller, getSellerAdminConversation)
router.post('/support/seller/message', verifySeller, upload.single('image'), sellerSendAdminSupportMessage)
router.get('/support/admin/conversations', verifyAdmin, getAdminSupportConversations)
router.get('/support/admin/conversation/:threadKey', verifyAdmin, getAdminSupportConversationMessages)
router.post('/support/admin/:threadKey/message', verifyAdmin, upload.single('image'), adminSendSupportMessage)
router.delete('/support/admin/:threadKey', verifyAdmin, adminDeleteSupportConversation)

// DEV-only: recent chat messages (for debugging) - NOT for production
router.get('/dev/messages', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed in production' })
  return getRecentMessagesDev(req, res)
})

export default router
