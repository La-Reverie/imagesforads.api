module.exports = {
  apps: [
    {
      name: "IFA-API",
      script: "./server.js",
      env: {
        NODE_ENV: "prod",
        PORT: 3000,
	BASE_URL: "https://api.4ads.ai",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        BUNNYCDN_APY_KEY: process.env.BUNNYCDN_APY_KEY,
      }
    }
  ]
};
