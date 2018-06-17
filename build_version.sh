json='{'
### run.host
host=$(hostname)
json=$json'"build.hostname":"'$host'",'
### build.tag
build_tag=`git describe --tags`
json=$json'"build.tag":"'$build_tag'",'
### build.module
json=$json'"build.module":"moon",'
### build.revision
build_revision='r'`git rev-list --count HEAD`-`git rev-parse --short HEAD`
json=$json'"build.revision":"'$build_revision'",'
### build.datetime
datetime=$(date "+%Y-%m-%d %H:%M:%S")
json=$json'"build.datetime":"'$datetime'"}'
echo $json > ./conf/build.json

### run.remote,run.host 动态获取


