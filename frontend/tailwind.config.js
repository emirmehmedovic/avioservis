/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', '[data-theme="dark"]', "class"],
  theme: {
  	extend: {
  		colors: {
  			// Base colors from visual.md
  			primary: {
  				DEFAULT: 'hsl(var(--primary))', // Accent Red: #e53e3e
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))', // Secondary Blue: #3182ce
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			background: 'hsl(var(--background))', // Main Gradient: #f7f7f7 -> #dedede
  			foreground: 'hsl(var(--foreground))', // text-primary: #1a202c
  			muted: {
  				DEFAULT: 'hsl(var(--muted))', // text-secondary: #4a5568
  				foreground: 'hsl(var(--muted-foreground))' // text-tertiary: #718096
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))', // Same as primary
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			border: 'hsl(var(--border))', // gray-200: #e2e8f0
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))', // Same as primary/accent red
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))', // White background for cards
  				foreground: 'hsl(var(--card-foreground))' // Same as foreground
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))', // White background for popovers
  				foreground: 'hsl(var(--popover-foreground))' // Same as foreground
  			},
  			input: 'hsl(var(--input))', // gray-200: #e2e8f0
  			ring: 'hsl(var(--ring))', // Secondary Blue
  		
  			// Gray scale from visual.md
  			gray: {
  				'50': 'hsl(var(--gray-50))', // #f7fafc
  				'100': 'hsl(var(--gray-100))', // #edf2f7
  				'200': 'hsl(var(--gray-200))', // #e2e8f0
  				'600': 'hsl(var(--gray-600))', // #4a5568
  				'700': 'hsl(var(--gray-700))', // #2d3748
  				'800': 'hsl(var(--gray-800))' // #1a202c
  			},
  		
  			// Custom gradients
  			gradient: {
  				sidebar: 'linear-gradient(to bottom, #333333, #222222, #000000)', // Sidebar Gradient
  				header: 'linear-gradient(to right, #f7fafc, #edf2f7)', // Header Gradient
  				main: 'linear-gradient(to bottom, #f7f7f7, #dedede)' // Main Gradient
  			},
  		
  			// Keep existing hope colors for backward compatibility
  			hope: {
  				'100': '#b9a88f',
  				'200': '#d9cb9e'
  			},
  		
  			// Keep chart colors for backward compatibility
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			avioBlue: {
  				'50': '#e6f1ff',
  				'100': '#cce3ff',
  				'200': '#99c7ff',
  				'300': '#66abff',
  				'400': '#338fff',
  				'500': '#0073ff',
  				'600': '#005ccc',
  				'700': '#004599',
  				'800': '#002e66',
  				'900': '#001733'
  			},
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'fade-in': {
  				from: {
  					opacity: 0
  				},
  				to: {
  					opacity: 1
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 0.3s ease-in-out'
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
      require("tailwindcss-animate")
],
}
