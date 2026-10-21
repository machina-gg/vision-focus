module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('./scripts/postcss-woff2-only.cjs')
  ]
};
