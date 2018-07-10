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
    "code": "0",
    "message": "成功",
    "result": {
        "totalCount": 2,
        "distributionBatchId": "20180630165848157"
    }
}
```
- response desc：

| 字段                   | 类型   | 说明               |
| ---------------------- | ------ | ------------------ |
| totalCount            | number | 该批次打币用户总数       |
| distributionBatchId   | string | 打币批次ID   |

## 获取打币进度

- url : /token/distribute/progress
- method：get
- request body：

```
{
	"projectGid":"123",
	"distributionBatchId":"20180630165848157" //批次id
}
```

- response body：

```
{ code: '0',
  message: '成功',
  result:
   { totalCount: 2,
     txSuccessCount: 0,
     txFailedCount: 0,
     txPendingCount: 2,
     notStartCount: 0
   }
}
```
- response desc：

| 字段                   | 类型   | 说明               |
| ----------------------| ------ | ------------------ |
| totalCount            | number | 批次用户总数       |
| txSuccessCount        | number | 打币完成用户数     |
| txFailedCount         | number | 打币失败用户数       |
| txPendingCount        | number | 打币中用户数     |
| notStartCount         | number | 未开始打币的用户数 |

## 获取当前gas价格

- url : /gas/current
- method：get
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

## 获取token的基本信息

- url : /token/{address}
- method：get
- request parameter：
```
{address} => token的地址
```
- response body：

```
{
    "code": "0",
    "message": "成功",
    "result": {
        "name": "Bee Honey Token",
        "symbol": "HONEY",
        "decimal": "9"
    }
}
```

- response desc：

| 字段         | 类型   | 说明                   |
| ------------ | ------ | ---------------------- |
| name         | string | token的全称  |
| symbol         | string | token的名称 |
| decimal  | string | token的精度  |

# 定时任务

## 定时检查校验认筹用户的真实性

- 每天扫描用户提交认筹申请的记录表，检查用户地址和交易号是否匹配，认购金额是否正确，对于校验成功的记录更新应该分发的token数量



