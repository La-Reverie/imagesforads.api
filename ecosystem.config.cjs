module.exports = {
  apps: [
    {
      name: "LaReverieVPS",
      script: "./server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY
      }
    }
  ]
};
