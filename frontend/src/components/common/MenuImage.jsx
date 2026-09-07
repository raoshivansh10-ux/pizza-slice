import React, { useState } from 'react';

export const CATEGORY_FALLBACKS = {
  pizza: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
  'garlic-bread': 'https://images.unsplash.com/photo-1549611016-3a70d82b5040?auto=format&fit=crop&w=600&q=80',
  sides: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=600&q=80',
  drinks: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
  desserts: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
  dips: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
  combos: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
};

const MenuImage = ({
  src,
  alt = 'Food item',
  category = 'pizza',
  className = '',
  containerClassName = '',
  style = {},
  imgStyle = {},
}) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fallbackUrl = CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.pizza;
  const imageSource = hasError || !src ? fallbackUrl : src;

  return (
    <div
      className={`menu-img-container ${!loaded ? 'skeleton-loading' : ''} ${containerClassName}`}
      style={style}
    >
      <img
        src={imageSource}
        alt={alt}
        className={`menu-product-img ${loaded ? 'img-loaded' : 'img-loading'} ${className}`}
        style={imgStyle}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!hasError) {
            setHasError(true);
          }
        }}
      />
    </div>
  );
};

export default MenuImage;
