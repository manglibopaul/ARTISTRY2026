import express from 'express'
import { verifyUser } from '../middleware/auth.js'
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js'

const router = express.Router()

router.get('/my', verifyUser, getMyNotifications)
router.put('/read-all', verifyUser, markAllNotificationsRead)
router.put('/:id/read', verifyUser, markNotificationRead)

export default router
