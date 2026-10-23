# 第一周练习

## 环境

这次使用 Windows x64、Node.js v24.19.0、OffCKB 0.4.13 和 CKB 0.210.0。

将 [CKB 0.210.0 的 Windows 压缩包](https://github.com/nervosnetwork/ckb/releases/tag/v0.210.0)解压到本地，再安装 OffCKB：

```sh
npm install --prefix .local/tools @offckb/cli@0.4.13 --no-audit --no-fund
```

以下命令都在仓库根目录运行。启动前确认 8114、28114 端口空闲。

## 启动开发链

在 PowerShell 中，将 `$ckbBinary` 改为解压得到的 `ckb.exe` 路径：

```powershell
$offckbCli = (Resolve-Path '.local/tools/node_modules/@offckb/cli/build/index.js').Path
$ckbBinary = 'C:\path\to\ckb.exe'
node exercises/week-01/offckb.mjs $offckbCli node --binary-path $ckbBinary --daemon
```

`offckb.mjs` 把子进程的配置和数据目录放进本仓库的 `.local/offckb`，不会改动其他项目的 OffCKB 配置。这个启动脚本适用于 Windows。

## 运行练习

```sh
node exercises/week-01/capacity.mjs
node exercises/week-01/rpc-check.mjs
```

RPC 检查会查询链名称、区块头和创世块，等待区块高度增长，并按哈希读回一个区块头。原始请求和响应保存到 `evidence/week-01/devnet-rpc.json`。

默认 RPC 代理是 `http://127.0.0.1:28114`，也可直接查询节点：

```sh
node exercises/week-01/rpc-check.mjs http://127.0.0.1:8114 evidence/week-01/direct-rpc.json
```

生成的矿工配置每 5 秒出一个块。检查脚本每秒查询一次，最多等 15 秒，避免两次查询落在同一个区块上。

## 查看与截图

```sh
node exercises/week-01/view-rpc.mjs
```

浏览器打开 `http://127.0.0.1:18914/`。页面会查询运行中的节点，显示当前区块头、已保存的 RPC 检查结果，并重新运行容量计算练习。

[本次运行截图](../../evidence/week-01/devnet-rpc.png)

查看完成后，在运行查看服务的终端按 Ctrl+C。停止开发链使用同一个启动脚本，以便找到对应的数据目录：

```powershell
node exercises/week-01/offckb.mjs $offckbCli node stop
```

停止后链数据会保留，后续使用相同命令启动即可继续。

这台 Windows 没有安装 WMIC，OffCKB 0.4.13 的 `node stop` 因此未能识别进程。遇到同样的问题，可以使用下面的备用脚本；它会先核对 PID、OffCKB 命令路径和子进程的数据目录，再停止对应的进程树。

```powershell
& ./exercises/week-01/stop-devnet.ps1
```
