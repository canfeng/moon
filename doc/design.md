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

##分发token接口

- url : /token/distruibute

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



# 定时任务

## 定时检查校验认筹用户的真实性

- 每天扫描用户提交认筹申请的记录表，检查用户地址和交易号是否匹配，认购金额是否正确，对于校验成功的记录更新应该分发的token数量



# 核心业务逻辑

## token分发流程

- A. 检查条件
1. 项目是否未完成，是否未达到硬顶
2. 
