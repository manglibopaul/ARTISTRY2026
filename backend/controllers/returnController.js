import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { sendEmail } from '../utils/email.js';

// Buyer: create a return request
export const createReturnRequest = async (req, res) => {
  try {
    const { orderId, items, reason, description } = req.body;
    if (!orderId || !reason) {
      return res.status(400).json({ message: 'Order ID and reason are required' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (order.orderStatus === 'cancelled') return res.status(400).json({ message: 'Cannot return a cancelled order' });

    // Determine sellerId from order items
    const orderItems = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    const returnItems = items || orderItems;
    const sellerId = returnItems[0]?.sellerId || orderItems[0]?.sellerId;

    if (!sellerId) return res.status(400).json({ message: 'Could not determine seller for this order' });

    // Calculate refund amount
    const refundAmount = returnItems.reduce((sum, it) => {
      return sum + ((it.price || 0) * (it.quantity || 1));
    }, 0);

    const returnReq = await ReturnRequest.create({
      orderId,
      userId: req.user.id,
      sellerId,
      items: returnItems,
      reason,
      description: description || '',
      refundAmount,
      buyerName: `${order.firstName || ''} ${order.lastName || ''}`.trim(),
      buyerEmail: order.email,
    });

    res.status(201).json(returnReq);
  } catch (error) {
    console.error('createReturnRequest', error);
    res.status(500).json({ message: 'Failed to create return request' });
  }
};

// Buyer: get my return requests
export const getMyReturnRequests = async (req, res) => {
  try {
    const returns = await ReturnRequest.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(returns);
  } catch (error) {
    console.error('getMyReturnRequests', error);
    res.status(500).json({ message: 'Failed to load return requests' });
  }
};

// Seller: get return requests for my products
export const getSellerReturnRequests = async (req, res) => {
  try {
    const returns = await ReturnRequest.findAll({
      where: { sellerId: req.seller.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(returns);
  } catch (error) {
    console.error('getSellerReturnRequests', error);
    res.status(500).json({ message: 'Failed to load return requests' });
  }
};

// Seller: update return request status (approve/reject/refund)
export const updateReturnRequestStatus = async (req, res) => {
  try {
    const { status, sellerNote, refundAmount } = req.body;
    const returnReq = await ReturnRequest.findByPk(req.params.id);

    if (!returnReq) return res.status(404).json({ message: 'Return request not found' });
    if (returnReq.sellerId !== req.seller.id) return res.status(403).json({ message: 'Not authorized' });

    const updateData = {};
    if (status) updateData.status = status;
    if (sellerNote !== undefined) updateData.sellerNote = sellerNote;
    if (refundAmount !== undefined) updateData.refundAmount = Number(refundAmount);

    await returnReq.update(updateData);

    // If approved or refunded, optionally restock items
    if (status === 'approved' || status === 'refunded') {
      const items = Array.isArray(returnReq.items) ? returnReq.items : JSON.parse(returnReq.items || '[]');
      for (const item of items) {
        const prodId = item.productId || item.id;
        if (!prodId) continue;
        try {
          const product = await Product.findByPk(prodId);
          if (product) {
            await product.update({ stock: (product.stock || 0) + (item.quantity || 1) });
          }
        } catch (err) {
          console.error('Failed to restock product', prodId, err.message);
        }
      }
    }

    // Send email notification to buyer
    if (returnReq.buyerEmail && status) {
      const statusLabels = {
        approved: 'Approved',
        rejected: 'Rejected',
        refunded: 'Refunded',
        completed: 'Completed',
      };
      try {
        await sendEmail({
          to: returnReq.buyerEmail,
          subject: `Aninaya — Return Request ${statusLabels[status] || status}`,
          text: `Your return request for Order #${returnReq.orderId} has been ${statusLabels[status] || status}.${sellerNote ? `\n\nSeller note: ${sellerNote}` : ''}`,
          html: `<p>Your return request for <strong>Order #${returnReq.orderId}</strong> has been <strong>${statusLabels[status] || status}</strong>.</p>${sellerNote ? `<p>Seller note: ${sellerNote}</p>` : ''}${refundAmount ? `<p>Refund amount: ₱${Number(refundAmount).toFixed(2)}</p>` : ''}`,
        });
      } catch (emailErr) {
        console.error('Failed to send return status email:', emailErr.message);
      }
    }

    res.json(returnReq);
  } catch (error) {
    console.error('updateReturnRequestStatus', error);
    res.status(500).json({ message: 'Failed to update return request' });
  }
};
