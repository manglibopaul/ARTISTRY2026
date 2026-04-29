import React, { useEffect } from 'react'

const FlyToCart = () => {
  useEffect(() => {
    const handler = (e) => {
      try {
        const { image, start } = e.detail || {};
        if (!image || !start) return;

        const startX = (start.left || 0) + (start.width || 0) / 2 + window.scrollX;
        const startY = (start.top || 0) + (start.height || 0) / 2 + window.scrollY;

        const img = document.createElement('img');
        img.src = image;
        img.className = 'fly-img';
        img.style.position = 'absolute';
        img.style.left = `${startX - 32}px`;
        img.style.top = `${startY - 32}px`;
        img.style.width = '64px';
        img.style.height = '64px';
        img.style.borderRadius = '8px';
        img.style.objectFit = 'cover';
        img.style.zIndex = '9999';
        img.style.transition = 'transform 800ms cubic-bezier(.2,.8,.2,1), opacity 600ms ease';
        img.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
        img.style.pointerEvents = 'none';

        document.body.appendChild(img);

        // find cart icon
        const cartEl = document.querySelector("[aria-label='Cart']");
        let targetX = window.innerWidth - 40;
        let targetY = 40;
        if (cartEl) {
          const r = cartEl.getBoundingClientRect();
          targetX = r.left + r.width / 2 + window.scrollX;
          targetY = r.top + r.height / 2 + window.scrollY;
        }

        const dx = targetX - startX;
        const dy = targetY - startY;

        // force layout
        void img.offsetWidth;

        img.style.transform = `translate(${dx}px, ${dy}px) scale(0.18)`;
        img.style.opacity = '0.0';

        setTimeout(() => {
          try { document.body.removeChild(img); } catch (err) {}
        }, 900);
      } catch (err) {
        // silent
      }
    };

    window.addEventListener('cart:add', handler);
    return () => window.removeEventListener('cart:add', handler);
  }, []);

  return null;
}

export default FlyToCart
