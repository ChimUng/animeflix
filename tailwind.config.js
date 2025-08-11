const { nextui } = require('@nextui-org/react');

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
		"./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"
	],
	future: {
		hoverOnlyWhenSupported: true,
	},
	theme: {
		extend: {
			backgroundSize: {
				'200%': '200% 100%'
			},
			keyframes: {
				'gradient-x': {
					'0%, 100%': {
						backgroundPosition: '0% 50%'
					},
					'50%': {
						backgroundPosition: '100% 50%'
					}
				},
				// Định nghĩa animation cho nút nhảy vào
				slideInRight: {
				'0%': { transform: 'translateX(100%)', opacity: '0' }, // Bắt đầu ngoài màn hình, ẩn
				'100%': { transform: 'translateX(0)', opacity: '1' },   // Kết thúc ở vị trí ban đầu, hiện rõ
				},
				// Định nghĩa animation cho nút nhảy ra
				slideOutRight: {
				'0%': { transform: 'translateX(0)', opacity: '1' },    // Bắt đầu ở vị trí ban đầu, hiện rõ
				'100%': { transform: 'translateX(100%)', opacity: '0' }, // Kết thúc ngoài màn hình, ẩn
				},
			},
			animation: {
				'gradient-x': 'gradient-x 5s ease-in-out infinite',
				'slide-in-right': 'slideInRight 0.3s ease-out forwards', // 0.3s là thời gian, ease-out là hàm thời gian, forwards giữ trạng thái cuối cùng
				'slide-out-right': 'slideOutRight 0.3s ease-in forwards',
			},
			colors: {
				d234: '#D23434',
				d656: '#656264',
				d148: '#4d148c',
			},
			screens: {
				xxs: '375px',
				xs: '440px',
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1536px'
			},
		}
	},
	darkMode: "class",
	plugins: [
		nextui(),
		// require("@vidstack/react/tailwind.cjs")({
		//   prefix: "media",
		// }),
		require('tailwindcss-animate'),
		customVariants
	]
}

function customVariants({ addVariant, matchVariant }) {
  // Strict version of `.group` to help with nesting.
	matchVariant('parent-data', (value) => `.parent[data-${value}] > &`);

	addVariant('hocus', ['&:hover', '&:focus-visible']);
	addVariant('group-hocus', ['.group:hover &', '.group:focus-visible &']);
}
