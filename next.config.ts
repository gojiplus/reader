import type { NextConfig } from 'next';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins ??= [];
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(
                path.dirname(require.resolve('pdfjs-dist/package.json')),
                'build/pdf.worker.min.mjs'
              ),
              to: path.join(config.output.path || '', 'static/chunks'),
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;
