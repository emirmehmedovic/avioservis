'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  initiallyExpanded?: boolean;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className, initiallyExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className || ''}`}>
      <div 
        className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] px-4 py-3 flex justify-between items-center cursor-pointer text-white"
        onClick={handleToggle}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2 text-[#F08080]/80">{icon}</span>}
          <h2 className="text-lg font-medium">{title}</h2>
        </div>
        <div>
          {isExpanded ? (
            <FiChevronUp className="h-5 w-5 text-white" />
          ) : (
            <FiChevronDown className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-white border border-gray-100 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  );
};

export default Card;
