module.exports = {
  apps: [
    {
      name: "IFA-API",
      script: "./server.js",
      env: {
        NODE_ENV: "prod",
        PORT: 3000,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY
      }
    }
  ]
};
