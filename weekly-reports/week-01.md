# 第1周：先理清 Cell 和交易

2026-10-23

今天先看了 CKB 的基础介绍和快速入门，也浏览了 CCC 的介绍。重点放在 Cell、交易的输入输出，以及 Lock Script 和 Type Script 的区别。

Cell 的更新方式是这次学习的重点：数据不是直接在原来的 Cell 上修改，而是消耗旧 Cell，再创建新 Cell。Lock Script 管谁能花费，Type Script 则约束数据或资产的变化规则。后面做数据存储练习时，还要把这套过程实际跑一遍。

## 容量计算练习

练习从转账的容量计算开始。200 CKB 的输入，给收款方 100 CKB，找零 99.999 CKB，剩下 0.001 CKB 作为手续费。代码用 BigInt 计算，避免小数精度问题。另外检查了输出超过输入、负数输入和多个输入求和，4项检查都通过了。

- [练习代码](../exercises/week-01/capacity.mjs)
- [运行记录](../evidence/week-01/run.json)
- 环境：Node.js v24.19.0

在仓库根目录运行：

```sh
node exercises/week-01/capacity.mjs
```

## 接下来

目前完成的是离线计算，开发链还没启动，也没有发送交易。下一次先把 OffCKB 和 RPC 跑通，再做一次带找零的转账，查看交易确认后的输入输出，补上截图和交易记录。

项目方向先记下一个想法：把文件摘要存进 Cell，之后读取出来核对文件有没有变化。先完成基础练习，再决定具体怎么做。

## 参考资料

- [CKB 基础](https://docs.nervos.org/docs/getting-started/how-ckb-works)
- [快速入门](https://docs.nervos.org/docs/getting-started/quick-start)
- [CCC 介绍](https://docs.ckbccc.com/en/docs/getting-started/introduction)
