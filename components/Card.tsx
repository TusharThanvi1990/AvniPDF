import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface CardProps {
  title: string;
  link: string;
}

const Card = ({ title, link }: CardProps) => {
  return (
    <Link 
      href={link}
      className="block w-full"
    >
      <div className="card group">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              {title}
            </h2>
            <p className="text-sm opacity-75">
              Click to use {title.toLowerCase()}
            </p>
          </div>
          <ArrowRight 
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
            size={20} 
          />
        </div>
      </div>
    </Link>
  );
};

export default Card;