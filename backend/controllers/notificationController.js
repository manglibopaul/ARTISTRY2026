import Notification from '../models/Notification.js'

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 100,
    })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id)
    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    if (notification.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    await notification.update({ read: true })
    res.json(notification)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { userId: req.user.id, read: false } })
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id)
    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    if (notification.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    await notification.destroy()
    res.json({ message: 'Notification deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.destroy({ where: { userId: req.user.id } })
    res.json({ message: 'All notifications deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
