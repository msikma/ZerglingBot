module.exports = {
  apps : [{
    name: 'ZerglingBot',
    script: './bin/zerglingbot.mjs',
    instances: '1',
    autorestart: true,
    watch: false,
    max_memory_restart: '4G'
  }]
}
