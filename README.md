# JointSearch

搜索客户端工具，当前支持 Elasticsearch。

# 组件

- [Tauri](https://tauri.app/)
- [Next.js](https://nextjs.org/)
- [AntD](https://ant-design.antgroup.com/)
- [Spinners React By Adexin](https://adexin.github.io/spinners/)

# 运行、编译环境

## 安装依赖

[参考链接](https://tauri.app/start/prerequisites/#_top)

- 注意：

国内安装 rust 由于网络原因，会很慢，会很容易失败。如果失败了，可以在当前用户目录下，找到 `.cargo` 目录，新建配置文件 `cargo.toml`，填写国内镜像源地址后再安装，中国科学技术大学的镜像源示例如下：

```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"

[net]
git-fetch-with-cli = true
```

# 本地开发、运行
```
# 安装依赖
pnpm install

# 启动tauri客户端版
pnpm tauri dev

# 启动web版
pnpm dev
```