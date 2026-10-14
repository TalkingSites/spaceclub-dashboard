// http://localhost:3000
module.exports = {
  apps: [
    {
      name: 'spaceclub-dashboard',
      script: 'npm',
      args: 'run dev',
      cwd: __dirname,
    },
  ],
};
