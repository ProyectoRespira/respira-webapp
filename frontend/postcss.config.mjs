// Tailwind is wired through PostCSS (picked up by Vite) since @astrojs/tailwind
// does not support Astro 6+. The @tailwind directives live in main.css.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
