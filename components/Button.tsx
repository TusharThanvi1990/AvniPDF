import React from 'react'

interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
}

const Button: React.FC<ButtonProps> = ({ onClick, children, className }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded shadow hover:scale-105 transition-transform bg-gradient-to-r from-blue-500 to-purple-600 text-white ${className}`}
    >
      {children}
    </button>
  )
}

export default Button
