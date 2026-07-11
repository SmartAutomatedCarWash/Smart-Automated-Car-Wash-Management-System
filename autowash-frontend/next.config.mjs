/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'pub-53125d1cbb7b41ea8e7c431698de4b92.r2.dev',
            },
            {
                protocol: 'https',
                hostname: '**.r2.dev',
            },
            {
                protocol: 'https',
                hostname: '**.cloudflarestorage.com',
            },
        ],
    },
};

export default nextConfig;
