import React from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  let sizeClass = 'max-w-md'; // default md
  if (size === 'sm') sizeClass = 'max-w-sm';
  if (size === 'lg') sizeClass = 'max-w-lg';


  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      style={{ animationName: 'fadeIn', animationDuration: '0.3s', animationTimingFunction: 'ease-out', animationFillMode: 'forwards' }}
    >
      <div
        className={`bg-gray-800 rounded-xl shadow-2xl w-full ${sizeClass} p-6 m-4 transform transition-all duration-300 ease-out animate-slideUp relative border border-gray-700`}
        onClick={(e) => e.stopPropagation()} // Prevent click through to backdrop
        style={{ animationName: 'slideUp', animationDuration: '0.3s', animationTimingFunction: 'ease-out', animationFillMode: 'forwards' }}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-purple-400">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div>{children}</div>
      </div>
      {/* Keyframes for fadeIn and slideUp should be defined in tailwind.config.js or these are standard tailwind animations.
          For CDN usage, if not standard, they might not work without further config.
          The classes animate-fadeIn and animate-slideUp are used.
          The <style jsx> tag was removed as it's not standard React/Tailwind.
          Added inline styles for animations as a fallback if animate-fadeIn/animate-slideUp are not available via CDN and no config.
          Tailwind config for keyframes:
          keyframes: {
            fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
          },
          animation: {
            fadeIn: 'fadeIn 0.3s ease-out forwards',
            slideUp: 'slideUp 0.3s ease-out forwards'
          }
      */}
    </div>
  );
};
