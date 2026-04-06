import Cart from '../models/Cart.js';

// Get cart for authenticated user
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ where: { userId: req.user.id } });
    if (!cart) return res.json({ items: {} });
    // items is stored as a JSON object (productId::color -> quantity)
    res.json({ items: cart.items || {} });
  } catch (error) {
    console.error('getCart error:', error);
    res.status(500).json({ message: 'Failed to load cart' });
  }
};

// Save / sync cart for authenticated user
export const saveCart = async (req, res) => {
  try {
    const { items } = req.body;
    const [cart, created] = await Cart.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id, items: items || {} },
    });

    if (!created) {
      await cart.update({ items: items || {} });
    }

    res.json({ items: cart.items });
  } catch (error) {
    console.error('saveCart error:', error);
    res.status(500).json({ message: 'Failed to save cart' });
  }
};

// Clear cart after order placed
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ where: { userId: req.user.id } });
    if (cart) {
      await cart.update({ items: {}, totalPrice: 0 });
    }
    res.json({ items: {} });
  } catch (error) {
    console.error('clearCart error:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};
