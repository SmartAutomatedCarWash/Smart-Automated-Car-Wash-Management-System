/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/minio-api/:path*',
                destination: 'http://127.0.0.1:9000/:path*'
            }
        ];
    },
};

export default nextConfig;
