'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  glass?: boolean;
  gradient?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hoverable = false, bordered = true, compact = false, glass = true, gradient = false, children, ...props }, ref) => {
    const classes = cn(
      'card rounded-xl transition-all duration-300',
      bordered ? 'border border-white/10' : '',
      compact ? 'p-4' : 'p-6',
      hoverable ? 'hover:shadow-lg hover:-translate-y-1' : '',
      glass ? 'backdrop-blur-md' : '',
      gradient ? 'bg-gradient-to-br from-white/60 to-white/20' : '',
      className
    );

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={cn('card-header', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  gradient?: boolean;
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', gradient = false, ...props }, ref) => (
    <h3 
      ref={ref} 
      className={cn(
        'font-semibold leading-none tracking-tight', 
        gradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600' : '',
        className
      )} 
      {...props} 
    />
  )
);
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={cn('card-content', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={cn('card-footer border-t border-white/10 pt-4 mt-4', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
