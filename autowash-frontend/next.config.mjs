import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const isDevelopment = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: isDevelopment ? '.next-dev' : '.next',
    images: {
        unoptimized: true,
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
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
        ],
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
        workerThreads: false,
        cpus: 1,
    },
};

export default withNextIntl(nextConfig);
