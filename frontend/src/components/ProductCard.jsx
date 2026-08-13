import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, ShieldCheck, Cpu } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useWishlistStore from '../store/wishlistStore';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';

import { getImageUrl, handleImageError } from '../utils/imageHelper';

const ProductCard = ({ product }) => {
  const { addItem } = useCartStore();
  const { addProduct, removeProduct, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const { getProductPrice, getProductPriceRaw, formatPrice, exchangeRate, currency } = useCurrencyStore();

  const imageUrl = getImageUrl(product.productLink || product.images?.[0]) || 'https://via.placeholder.com/400x400?text=Smart+Product';
  const secondaryImageUrl = getImageUrl(product.images?.[1] || product.productLink || product.images?.[0]) || imageUrl;
  const storeName = product.storeId?.name || 'Mobile Hub Boutique';
  const wishlisted = user && isInWishlist(product._id);
  const inStock = product.stock > 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) {
      toast.error('Product is out of stock');
      return;
    }
    try {
      await addItem(product, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      toast.error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Sign in to use wishlist');
      return;
    }
    try {
      if (wishlisted) {
        await removeProduct(product._id);
        toast.info('Removed from wishlist');
      } else {
        await addProduct(product._id);
        toast.success('Added to wishlist!');
      }
    } catch (err) {
      toast.error('Wishlist error');
    }
  };

  return (
    <Link to={`/product/${product._id}`} className="block group h-full">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col group-hover:border-blue-300">
        <div className="relative overflow-hidden bg-slate-50 aspect-square flex items-center justify-center p-3 sm:p-6">
          <div className="w-full h-full relative">
            <img 
              src={imageUrl} 
              alt={product.name} 
              className="w-full h-full object-contain absolute inset-0 transition-opacity duration-500 opacity-100 group-hover:opacity-0" 
              loading="lazy" 
              onError={(e) => handleImageError(e, 'Product')}
            />
            <img 
              src={secondaryImageUrl} 
              alt={product.name} 
              className="w-full h-full object-contain absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 scale-105" 
              loading="lazy" 
              onError={(e) => handleImageError(e, 'Product')}
            />
          </div>
          
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1.5 sm:gap-2">
            {product.discount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] sm:text-[10px] uppercase font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm tracking-wider">
                -{product.discount}% OFF
              </span>
            )}
            {product.isFeatured && (
              <span className="bg-slate-900 text-white text-[9px] sm:text-[10px] uppercase font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm tracking-wider">
                Featured
              </span>
            )}
          </div>

          <button onClick={handleToggleWishlist}
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${
              wishlisted ? 'bg-rose-50 text-rose-500' : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white backdrop-blur-sm'
            }`}
          >
            <Heart size={15} className={wishlisted ? 'fill-rose-500' : ''} />
          </button>
        </div>
        
        <div className="p-3 sm:p-5 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="text-[10px] sm:text-xs font-semibold text-blue-600 m-0 uppercase tracking-wider">{product.category?.name || 'Device'}</p>
            <div className="flex items-center gap-1">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700">{product.averageRating || '4.8'}</span>
            </div>
          </div>
          
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1 mt-0 leading-tight line-clamp-2 min-h-[2.2rem] sm:min-h-[2.5rem] group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4 line-clamp-2 hidden sm:block">
            {product.description || 'Premium high-performance device with latest technology features.'}
          </p>

          {/* Quick Specs */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 mb-4">
            <div className="flex items-center gap-1 bg-slate-50 text-slate-600 text-[10px] font-medium px-2 py-1 rounded-md">
              <ShieldCheck size={12} className="text-emerald-500" /> 1Yr Warranty
            </div>
            <div className="flex items-center gap-1 bg-slate-50 text-slate-600 text-[10px] font-medium px-2 py-1 rounded-md">
              <Cpu size={12} className="text-blue-500" /> Original
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 sm:pt-4 border-t border-slate-100 gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium mb-0.5 m-0 flex items-center gap-1">
                {inStock ? (
                  <span className="text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock</span>
                ) : (
                  <span className="text-rose-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Out of Stock</span>
                )}
              </p>
              <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                <span className="text-sm sm:text-lg font-extrabold text-slate-900 truncate">{getProductPrice(product)}</span>
                {product.mrp > product.price && (
                  <span className="text-[10px] sm:text-xs font-medium text-slate-400 line-through">
                    {currency === 'USD' ? `$${(product.mrp / exchangeRate).toFixed(2)}` : `Rs. ${product.mrp.toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>
            <button onClick={handleAddToCart}
              disabled={!inStock}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                inStock 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
