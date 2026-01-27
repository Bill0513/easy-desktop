import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    build: {
        rollupOptions: {
            external: ['@cloudflare/puppeteer'],
            output: {
                manualChunks: {
                    // Vue核心库
                    'vue-vendor': ['vue', 'pinia'],
                    // 编辑器库
                    'editor-vendor': ['codemirror', '@codemirror/state', '@codemirror/view'],
                    // Office预览库（最大的依赖）
                    'office-vendor': ['@vue-office/docx', '@vue-office/excel', '@vue-office/pdf'],
                    // 思维导图库
                    'mindmap-vendor': ['simple-mind-map'],
                    // 工具库
                    'utils-vendor': ['uuid', 'marked', 'lucide-vue-next']
                }
            }
        },
        // 增加chunk大小警告限制
        chunkSizeWarningLimit: 1000
    },
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                ws: true,
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, _res) {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', function (proxyReq, req, _res) {
                        console.log('Sending Request to the Target:', req.method, req.url);
                    });
                    proxy.on('proxyRes', function (proxyRes, req, _res) {
                        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                    });
                },
            },
            '/scheduled': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            }
        }
    }
});
