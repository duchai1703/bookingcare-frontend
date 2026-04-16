// tailwind.config.js
// [Phase 10] — Tailwind CSS v3 config
// ĐẶC BIỆT: prefix 'tw-' để tránh xung đột với Bootstrap 5 + SCSS cũ

/** @type {import('tailwindcss').Config} */
export default {
  // QUAN TRỌNG: prefix tránh xung đột Bootstrap
  prefix: 'tw-',

  // TẮT preflight (CSS Reset) — để Bootstrap + SCSS cũ không bị ghi đè
  corePlugins: {
    preflight: false,
  },

  // BẬT !important — đảm bảo class Tailwind luôn thắng Bootstrap specificity
  // ⚠️ [v1.9] KỶ LUẬT: `important` chỉ để thắng Bootstrap specificity.
  // Dev PHẢI tự kỷ luật phạm vi class khi refactor — TUYỆT ĐỐI KHÔNG dùng
  // Tailwind để override các thuộc tính layout toàn cục của Phase 1-9
  // (VD: KHÔNG dùng tw-* để ghi đè width/height/margin của .system-layout,
  // .system-sidebar, .system-content đã định nghĩa trong SCSS cũ).
  important: true,

  // [AUDIT FIX — Future-proof] Quét tất cả JS/JSX/TS/TSX files trong src/
  // Bao phủ cả TypeScript để sẵn sàng migrate trong tương lai
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Đồng bộ với $primary trong _variables.scss
        primary: {
          DEFAULT: '#45c3d2',
          dark: '#39a8b5',
          light: '#e8f7f9',
        },
        secondary: '#ffc107',
        success: '#28a745',
        danger: '#dc3545',
        info: '#17a2b8',
        sidebar: '#1a1a2e',
        'text-main': '#333333',
        'text-sub': '#666666',
        'text-light': '#999999',
        'bg-light': '#f5f5f5',
        'bg-page': '#f0f2f5',
        // Dashboard riêng
        'chart-blue': '#4F46E5',
        'chart-green': '#10B981',
        'chart-amber': '#F59E0B',
        'chart-rose': '#F43F5E',
      },
      fontFamily: {
        primary: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'badge': '20px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.12)',
      },
    },
  },

  plugins: [],
};
