/**
 * 提取状态
 * @type {{INIT: number, QUALIFY_VALIDATE_SUCCESS: number, QUALIFY_VALIDATE_FAIL_PHONE_ADDRESS_MISMATCH: number, QUALIFY_VALIDATE_FAIL_USER_NOT_FOUND: number, QUALIFY_VALIDATE_FAIL_NO_AUTH: number, QUALIFY_VALIDATE_FAIL_HONEY_INSUFFICIENT: number, EXTRACTING: number, EXTRACT_SUCCESS: number, EXTRACT_FAIL_TX_FAILED: number, EXTRACT_FAIL_TX_DISCARD: number, DEDUCT_SUCCESS: number, DEDUCT_FAIL: number, FINAL_VALIDATE_SUCCESS: number, FINAL_VALIDATE_FAIL: number}}
 */
const STATUS = {
    /**
     * 初始状态，提币申请中
     */
    INIT: 0,
    /**
     * 提币资格验证通过
     */
    QUALIFY_VALIDATE_SUCCESS: 1,
    /**
     * 提币资格验证失败-->phone和不匹配
     */
    QUALIFY_VALIDATE_FAIL_PHONE_ADDRESS_MISMATCH: 11,
    /**
     * 提币资格验证失败-->手机号未注册
     */
    QUALIFY_VALIDATE_FAIL_USER_NOT_FOUND: 12,
    /**
     * 提币资格验证失败-->未实名
     */
    QUALIFY_VALIDATE_FAIL_NO_AUTH: 13,
    /**
     * 提币资格验证失败-->honey数量不足
     */
    QUALIFY_VALIDATE_FAIL_HONEY_INSUFFICIENT: 14,
    /**
     * 提币资格验证失败-->大量重复提币地址
     */
    QUALIFY_VALIDATE_FAIL_MANY_REPEAT_ETH_ADDRESS: 15,
    /**
     * 提取中
     */
    EXTRACTING: 2,
    /**
     * 提取成功
     */
    EXTRACT_SUCCESS: 21,
    /**
     * 提取失败-->交易失败
     */
    EXTRACT_FAIL_TX_FAILED: 22,
    /**
     * 提取失败-->交易作废
     */
    EXTRACT_FAIL_TX_DISCARD: 23,
    /**
     * 扣蜜成功
     */
    DEDUCT_SUCCESS: 3,
    /**
     * 扣蜜失败
     */
    DEDUCT_FAIL: 31,
    /**
     * 最终验证成功
     */
    FINAL_VALIDATE_SUCCESS: 4,
    /**
     * 最终验证失败
     */
    FINAL_VALIDATE_FAIL: 41
};

module.exports = STATUS;



/* sql==>

ALTER TABLE user_pickup_honey modify COLUMN `status` tinyint(2) NOT NULL DEFAULT '0' COMMENT
'0：初始状态，未提取；
1：提币资格验证通过；11：提币资格验证失败-->phone和不匹配；12：提币资格验证失败-->手机号未注册；13：提币资格验证失败-->未实名；14：提币资格验证失败-->honey数量不足；
2：提取中；21：提取成功；22：提取失败-->交易失败；23：提取失败-->交易作废；
3：扣蜜成功；31：扣蜜失败；
4：最终验证成功；41：最终验证失败；';

 */
