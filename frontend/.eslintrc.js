module.exports = {
  extends: 'next/core-web-vitals',
  ignorePatterns: ['src/lib/fonts/*.js'],
  rules: {
    // Disable specific rules that are causing issues
    '@typescript-eslint/ban-ts-comment': 'off',
    'react-hooks/exhaustive-deps': 'warn'
  }
}
