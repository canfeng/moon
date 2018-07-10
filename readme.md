## 安装步骤
- 运行环境
1. node 版本 v8.9 或以上
2. 安装pm2
```
sudo npm install -g pm2
```
- 安装依赖
```
npm install
```
- 配置文件
1. 将mysql_conf.json,redis_conf.json,config.json移到fixed_config.json中“normal_config”指定的目录下
2. 修改mysql,redis以及config.json中的“ibeesaas”和“eth”的相关配置
- 启动执行
```
sh build_version.sh
pm2 start moon.config.js
```