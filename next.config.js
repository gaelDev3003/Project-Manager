/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Make OpenAI and Anthropic SDKs optional for build-time
    // These are only needed at runtime when the respective providers are used
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        openai: 'commonjs openai',
        '@anthropic-ai/sdk': 'commonjs @anthropic-ai/sdk',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
