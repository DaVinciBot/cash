/** @type {import('tailwindcss').Config} */
export default {
  mode: 'jit',
  content: ['./src/**/**/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { "50": "#92B5F8", "100": "#76A2F6", "200": "#5B90F4", "300": "#407DF3", "400": "#246BF1", "500": "#0958EF", "600": "#084ED4", "700": "#0744BA", "800": "#063B9F", "900": "#010128" },
        "blue-gray": "#575e7d",
        "light-blue": "#D9E0FF",
        "blue-peps": "#0232FF",
        "dark-blue-gray": "#828AB6",
        "dark-blue": "#010128",
        "dark-light-blue": "#B3C2FF",
        "dark-light-blue-faded": "#5A6294",
        "main-blue": "#0232FF",

      }
    }
  },
};