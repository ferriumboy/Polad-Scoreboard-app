import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform active:scale-95 shadow-md flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500",
    secondary: "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600",
    danger: "bg-red-600 hover:bg-red-500 text-white border border-red-500",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};