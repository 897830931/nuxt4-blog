/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./app/pages/**/*.{vue,ts}'],
    // 是否清除默认属性
    corePlugins: {
        preflight: true,
    },
    theme: {
        extend: {
            // 屏幕尺寸
            screens: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
            },
            // container默认样式
            container: {
                padding: {
                    DEFAULT: '1rem',
                    sm: '2rem',
                    lg: '4rem',
                    xl: '5rem',
                    '2xl': '6rem',
                },
            },
            // 颜色 可自己定义颜色
            colors: {
                transparent: 'transparent',
                black: '#000',
                white: '#fff',
                gray: {
                    100: '#f7fafc',
                    // ...
                    900: '#1a202c',
                },
                'time-color': 'rgb(0, 167, 224)',
            },
            // 间距 padding, margin, width, minWidth, maxWidth, height, minHeight, maxHeight, gap, inset, space, translate, p-2为padding:12px
            spacing: {
                '1': '8px',
                '2': '12px',
                '3': '16px',
                '4': '24px',
                '5': '32px',
                '6': '48px',
            },
            // 字体配置
            fontFamily: {
                title: 'TsangerYuYang', // Adds a new `font-display` class
                xia: 'dianziqianxia',
            },
            backgroundSize: {
                full: '100% 100%', // 添加自定义背景尺寸
            },
        },
    },
    plugins: [],
}
