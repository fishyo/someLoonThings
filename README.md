# 自用 Loon 资源库

本项目主要存放自用的 Loon 的插件、规则及脚本资源。大部分是ai写的，所以不做审核负责和维护。规则也是基于 acl4ssr 之上补充自己用到的规则。

## 📍 快捷添加

点击下方链接可直接跳转并一键添加对应资源到 Loon 中（需在 iOS 设备上操作）。

### 🔌 插件 (Plugins)

| 资源名称     | 功能描述                             | 一键添加                                                                                                                            | 原始链接                                                                                               |
| :----------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **节点信息** | 查询节点 IPv4/IPv6、地理位置及运营商 | [点击添加](loon://import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2Fplugin%2FnodeIpInfo.lpx) | [复制链接](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/nodeIpInfo.lpx)         |
| **广告拦截** | 基础广告拦截插件                     | [点击添加](loon://import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2Fplugin%2Fad-block.lpx)   | [复制链接](https://raw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2Fplugin%2Fad-block.lpx) |

### 📜 规则 (Rules)

| 资源名称     | 功能描述         | 一键添加                                                                                                                     | 原始链接                                                                                 |
| :----------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **直连规则** | 通用直连规则列表 | [点击添加](loon://import?rules=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2Floon%2Fdirect.lsr) | [复制链接](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/direct.lsr) |
| **代理规则** | 通用代理规则列表 | [点击添加](loon://import?rules=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2Floon%2Fproxy.lsr)  | [复制链接](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr)  |

---

## 🛠 手动配置指南

### 1. 插件安装

**方法一：一键添加（推荐）**

- 在 iOS 设备上点击上方表格中的"点击添加"链接
- 自动跳转到 Loon 并弹出导入确认框

**方法二：手动添加**

- 进入 Loon 的 `插件` 页面
- 点击右上角 `+`
- 选择 `从链接安装`
- 复制并粘贴上方表格中的"原始链接"

### 2. 规则订阅

**方法一：一键添加（推荐）**

- 在 iOS 设备上点击上方表格中的"点击添加"链接
- 自动跳转到 Loon 并弹出导入确认框

**方法二：手动添加**

- 进入 Loon 的 `规则` 页面
- 点击右上角 `+`
- 选择 `订阅规则`
- 复制并粘贴上方表格中的"原始链接"

### 3. 脚本使用说明

#### 节点信息查询

安装"节点信息"插件后：

1. 在 **节点列表** 中 **长按** 任意节点
2. 在弹出的菜单中选择 **脚本 (Script)**
3. 点击 **节点信息** 即可查看该节点的网络详细信息

查询结果包括：

- IPv4/IPv6 地址（双栈竞速查询）
- 地理位置（国家/地区）
- 运营商信息（ISP/ASN）

---

## 📚 资源说明

### 插件列表

- **nodeIpInfo.lpx** - 节点IP信息查询工具
- **ad-block.lpx** - 基础广告拦截规则

### 规则列表

- **direct.lsr** - 直连规则（基于 ACL4SSR 补充）
- **proxy.lsr** - 代理规则（基于 ACL4SSR 补充）

---

## 🔗 相关资源

- [GitHub 仓库](https://github.com/fishyo/someLoonThings)
- [Loon 官方文档](https://nsloon.app/docs/Scheme/)
- [问题反馈](https://github.com/fishyo/someLoonThings/issues)
