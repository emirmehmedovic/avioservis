/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: "#0073ff",
        secondary: "#f3f4f6",
        background: "#ffffff",
        foreground: "#111827",
        muted: "#6b7280",
        accent: "#60a5fa",
        border: "#e5e7eb",
        destructive: "#ef4444",
        'destructive-foreground': "#ffffff",
        "muted-foreground": "#6b7280",
        
        // AvioBlue colors
        avioBlue: {
          50: "#e6f1ff",
          100: "#cce3ff",
          200: "#99c7ff",
          300: "#66abff",
          400: "#338fff",
          500: "#0073ff",
          600: "#005ccc",
          700: "#004599",
          800: "#002e66",
          900: "#001733",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-in-out",
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}
