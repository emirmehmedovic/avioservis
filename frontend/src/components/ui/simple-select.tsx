import * as React from "react"
import { cn } from "@/lib/utils"

export interface SimpleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export function SimpleSelect({ className, children, onValueChange, onChange, value, ...props }: SimpleSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onValueChange) {
      onValueChange(e.target.value);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <select
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
        className
      )}
      onChange={handleChange}
      value={value}
      style={{
        backgroundColor: 'white',
        color: '#000000'
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function SimpleSelectItem({ className, children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option
      className={cn("bg-white text-gray-900 py-1.5", className)}
      style={{
        backgroundColor: 'white',
        color: '#000000'
      }}
      {...props}
    >
      {children}
    </option>
  );
}

// Dummy komponente za kompatibilnost sa Radix API
export const SimpleSelectTrigger = ({ children }: { children: React.ReactNode }) => null;
export const SimpleSelectValue = ({ placeholder }: { placeholder?: string }) => null;
export const SimpleSelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

