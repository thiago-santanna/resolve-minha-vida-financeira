/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#6366f1', // Indigo 500
                secondary: '#0f172a', // Slate 900
                accent: '#10b981', // Emerald 500
                danger: '#ef4444', // Red 500
            }
        },
    },
    plugins: [],
}
