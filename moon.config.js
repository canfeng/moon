module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [

        // First application
        {
            name: 'moon',
            script: 'bin/www',
            env: {
                COMMON_VARIABLE: 'true',
                PORT: 4000
            },
            env_production: {
                NODE_ENV: 'dev'
            }
        },
    ],

    /**
     * Deployment section
     * http://pm2.keymetrics.io/docs/usage/deployment/
     */
    deploy: {
        production: {
            user: 'node',
            host: '212.83.163.1',
            ref: 'origin/master',
            repo: 'git@172.16.50.222:bari',
            path: '/var/www/production',
            'post-deploy': 'npm install && pm2 reload moon.config.js --env production'
        },
        dev: {
            user: 'node',
            host: '127.0.0.1',
            ref: 'origin/master',
            repo: 'git@172.16.50.222:bari',
            path: 'D:\\work\\java_workspace\\block_chain_workspace\\bari',
            'post-deploy': 'npm install && pm2 reload moon.config.js --env dev',
            env: {
                NODE_ENV: 'dev'
            }
        }
    }
};
