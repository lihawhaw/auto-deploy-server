module.exports = {
  apps: [
    {
      name: 'auto-deploy-server',
      script: 'dist/main.js',
      interpreter: 'node',
      watch: false,
      error_log: 'logs/auto-deploy-server.err.log',
      out_log: 'logs/auto-deploy-server.out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '256M',
      min_uptime: '5s',
      max_restarts: 3,
      restart_delay: 2000,
      exec_mode: 'fork',
      instances: 1,
    },
  ],
};
