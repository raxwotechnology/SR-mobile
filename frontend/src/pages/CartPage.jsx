import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';
import { getImageUrl, handleImageError } from '../utils/imageHelper';

const CartPage = () => {
  const { items, loading, fetchCart, updateQuantity, removeItem } = useCartStore();
  const { user } = useAuthStore();
  const { convertPrice, formatPrice } = useCurrencyStore();
  const subtotal = useCartStore((s) => s.getSubtotal());
  const deliveryFee = subtotal > 50 ? 0 : 4.99;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + deliveryFee + tax;

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  const handleQuantityChange = (productId, newQty) => {
    if (newQty < 1) return;
    updateQuantity(productId, newQty);
  };

  const handleRemove = (productId, name) => {
    removeItem(productId);
    toast.info(`${name} removed from cart`);
  };

  if (items.length === 0 && !loading) {
    return (
      <div className="base-container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-full mx-auto mb-6 flex items-center justify-center">
            <ShoppingBag size={40} className="text-primary-blue" />
          </div>
          <h2 className="text-2xl font-bold text-dark-navy mb-2 mt-0">Your cart is empty</h2>
          <p className="text-muted-text mb-6">Looks like you haven't added anything to your cart yet.</p>
          <Link
            to="/shop"
            className="bg-primary-blue text-white font-semibold py-3 px-8 rounded-full hover:bg-emerald-600 transition-all inline-flex items-center gap-2 shadow-lg shadow-emerald-200"
          >
            Start Shopping <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="base-container py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-6">
        Shopping Cart <span className="text-muted-text font-normal text-lg">({items.length} items)</span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1">
          <div className="bg-white border border-card-border rounded-2xl overflow-hidden">
            <AnimatePresence>
              {items.map((item, i) => {
                const product = item.productId || {};
                const productId = product._id || item.productId;
                const name = product.name || item.name;
                const price = product.price || item.price;
                const mrp = product.mrp || price;
                const image = getImageUrl(product.productLink || product.images?.[0]) || item.image || '';
                const unit = product.unit || '';
                const stock = product.stock || 99;

                return (
                  <motion.div
                    key={productId}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="flex items-center gap-4 p-4 md:p-5 border-b border-card-border last:border-b-0"
                  >
                    {/* Product Image */}
                    <Link to={`/product/${productId}`} className="flex-shrink-0">
                      <img
                        src={getImageUrl(image) || 'https://via.placeholder.com/100'}
                        alt={name}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover"
                        onError={(e) => handleImageError(e, 'Product')}
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${productId}`} className="font-semibold text-dark-navy hover:text-primary-blue transition-colors text-sm md:text-base block truncate">
                        {name}
                      </Link>
                      {unit && <p className="text-xs text-muted-text m-0 mt-1">per {unit}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-dark-navy">{formatPrice(convertPrice(price))}</span>
                        {mrp > price && (
                          <span className="text-xs text-muted-text line-through">{formatPrice(convertPrice(mrp))}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center border border-card-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 h-8 flex items-center justify-center border-x border-card-border text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={item.quantity >= stock}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="hidden md:block text-right min-w-[80px]">
                      <span className="font-bold text-dark-navy">{formatPrice(convertPrice(price * item.quantity))}</span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(productId, name)}
                      className="text-muted-text hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-96">
          <motion.div
            className="bg-white border border-card-border rounded-2xl p-6 sticky top-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h3 className="font-bold text-dark-navy text-lg mt-0 mb-4">Order Summary</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-text">Subtotal</span>
                <span className="font-medium text-dark-navy">{formatPrice(convertPrice(subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-text">Delivery Fee</span>
                <span className="font-medium text-dark-navy">
                  {deliveryFee === 0 ? (
                    <span className="text-primary-blue">FREE</span>
                  ) : (
                    formatPrice(convertPrice(deliveryFee))
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-text">Tax (8%)</span>
                <span className="font-medium text-dark-navy">{formatPrice(convertPrice(tax))}</span>
              </div>
              {subtotal < 50 && (
                <p className="text-xs text-accent-slate bg-orange-50 rounded-lg px-3 py-2 m-0">
                  Add {formatPrice(convertPrice(50 - subtotal))} more for free delivery!
                </p>
              )}
            </div>

            <div className="border-t border-card-border pt-4 mb-6">
              <div className="flex justify-between">
                <span className="font-bold text-dark-navy text-lg">Total</span>
                <span className="font-bold text-dark-navy text-lg">{formatPrice(convertPrice(total))}</span>
              </div>
            </div>

            {user ? (
              <Link
                to="/checkout"
                className="w-full bg-primary-blue text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="w-full bg-primary-blue text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-center"
              >
                Sign In to Checkout
              </Link>
            )}

            <Link
              to="/shop"
              className="block text-center text-sm text-primary-blue hover:underline mt-4 font-medium"
            >
              Continue Shopping
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
