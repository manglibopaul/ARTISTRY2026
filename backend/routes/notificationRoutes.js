import express from 'express'
import { verifyUser } from '../middleware/auth.js'
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notificationController.js'

const router = express.Router()

router.get('/my', verifyUser, getMyNotifications)
router.put('/read-all', verifyUser, markAllNotificationsRead)
router.delete('/all', verifyUser, deleteAllNotifications)
router.put('/:id/read', verifyUser, markNotificationRead)
router.delete('/:id', verifyUser, deleteNotification)

export default router
