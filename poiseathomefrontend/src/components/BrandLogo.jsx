import React from 'react';

const BrandLogo = ({ inverse = false, imageClassName = 'h-10 w-10', textClassName = '' }) => (
  <span className="inline-flex items-center gap-2.5">
    <img
      src="/poiseathome.png"
      alt=""
      aria-hidden="true"
      className={`${imageClassName} shrink-0 object-contain`}
    />
    <span className={`font-bold tracking-tight ${inverse ? 'text-white' : 'text-primary-deep'} ${textClassName}`}>
      PoiseAtHome
    </span>
  </span>
);

export default BrandLogo;
