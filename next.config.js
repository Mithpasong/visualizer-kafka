/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['kafkajs'],
  },
  webpack: (config, { dev }) => {
    // Dev 모드에서는 webpack filesystem cache 를 사용하지 않는다.
    // Windows + OneDrive + 경로에 쉼표(`kafka,rabbitMQ`) 가 섞이면
    // .next/cache/webpack/*.pack.gz 가 자주 깨져서
    //   "Restoring pack from ... failed: Cannot read properties of
    //    undefined (reading 'hasStartTime')"
    // 와 그 뒤이은 Fast Refresh full-reload 가 반복된다.
    // 메모리 캐시는 corruption 자체가 발생하지 않는다 (첫 컴파일만 조금 느려짐).
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

module.exports = nextConfig;
