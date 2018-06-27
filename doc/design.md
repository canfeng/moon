<!-- toc -->

# API

## 通用说明

### 1. 接口地址

- 正式环境：
- 测试环境：
- 开发环境：

### 2. 请求格式

- get请求：直接在url后拼接参数

- post请求：使用json格式的字符串附在request body中传入，需要在header中指定 "Content-Type:application/json;charset=UTF-8"

##打币接口

- url : /token/distribute
- method：post
- request body：
```
{
	"projectGid":"123",
	"password":"123"
}
```

- response body：

```
{
    "code":"0",
    "message": "success",
    "result": null
}
```
## 获取打币进度

- url : /token/distribute/progress
- method：get
- request body：

```
{
	"projectGid":"123"
}
```

- response body：

```
{
    "code": "0",
    "message": "成功",
    "result": {
        "allCount": 2000000000,
        "validateSuccessCount": 21000,
        "distributeSuccessCount":0,
        "distributeFailedCount":0,
        "distributingCount":0,
        "notStartCount":0
    }
}
```

- response desc：

| 字段                   | 类型   | 说明               |
| ---------------------- | ------ | ------------------ |
| allCount               | number | 认购用户总数       |
| validateSuccessCount   | number | 验证通过的用户数   |
| distributeSuccessCount | number | 打币完成用户数     |
| distributeFailedCount  | number | 打币中用户数       |
| distributingCount      | number | 打币失败用户数     |
| notStartCount          | number | 未开始打币的用户数 |

## 获取当前gas价格

- url : /gas/current
- method：get
- request body：

```
{
	"projectGid":"123"
}
```

- response body：

```
{
    "code": "0",
    "message": "成功",
    "result": {
        "gasPrice": 1000000000,
        "gasPriceGWei": "1gwei",
        "ethGasLimit": 21000
    }
}
```

- response desc：

| 字段         | 类型   | 说明                   |
| ------------ | ------ | ---------------------- |
| gasPrice     | number | 当前gasPrice，单位wei  |
| gasPriceGWei | string | 当前gasPrice，单位gwei |
| ethGasLimit  | number | ETH转账默认的gasLimit  |

# 定时任务

## 定时检查校验认筹用户的真实性

- 每天扫描用户提交认筹申请的记录表，检查用户地址和交易号是否匹配，认购金额是否正确，对于校验成功的记录更新应该分发的token数量



