import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface CardProps {
  title: string;
  link: string;
  description?: string;
  icon?: React.ReactNode;
}

const Card = ({ title, link, description, icon,}: CardProps) => {
  return (
    <Link 
      href={link}
      className="block w-full transform transition-all duration-300 hover:-translate-y-1"
    >
      <div 
        className="relative p-6 rounded-xl transition-all duration-300 group hover:shadow-xl"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Top Shine Effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
            borderRadius: "inherit",
          }}
        />

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              {icon && (
                <div 
                  className="p-2 rounded-lg shrink-0"
                  style={{
                    background: "var(--footer-link)",
                    color: "var(--hero-text)",
                  }}
                >
                  {icon}
                </div>
              )}
              <h2 
                className="text-xl font-semibold break-words"
                style={{ color: "var(--card-text)" }}
              >
                {title}
              </h2>
            </div>

            {/* Description - Hidden on Small Devices */}
            <p 
              className="text-sm line-clamp-2 hidden sm:block"
              style={{ color: "var(--card-text)" }}
            >
              {description || `Click to use ${title.toLowerCase()}`}
            </p>
          </div>

          {/* Arrow Icon with Animation */}
          <div className="flex items-center shrink-0">
            <ArrowRight 
              className="transform transition-all duration-300 group-hover:translate-x-1" 
              size={20}
              style={{ color: "var(--footer-link)" }}
            />
          </div>
        </div>

        {/* Interactive Border Effect */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            border: "2px solid var(--footer-link)",
          }}
        />
      </div>
    </Link>
  );
};

export default Card;