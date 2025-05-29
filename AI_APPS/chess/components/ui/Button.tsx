import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantStyle = '';
  switch (variant) {
    case 'secondary':
      variantStyle = 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-400';
      break;
    case 'danger':
      variantStyle = 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-400';
      break;
    case 'ghost':
      variantStyle = 'bg-transparent hover:bg-gray-700 text-gray-300 hover:text-white focus:ring-gray-500 border border-gray-600';
      break;
    case 'primary':
    default:
      variantStyle = 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-purple-400';
      break;
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
