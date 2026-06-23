# GitHub 项目发起人操作清单

这份清单给项目发起人使用。目标是把本地原型变成一个可以公开维护、可以邀请讲师参与、也适合后续申请 Codex for Open Source 的 GitHub 项目。

## 第 1 步：创建公开仓库

1. 登录 GitHub。
2. 点击右上角 `+`，选择 `New repository`。
3. Repository name 建议使用：

```text
calcaneal-case
```

4. Description 建议使用：

```text
Open-source calcaneal fracture case, imaging, measurement, follow-up, and teaching discussion platform.
```

5. 选择 `Public`。
6. 不要勾选自动创建 README、license、gitignore，因为本地项目已经有这些文件。
7. 创建仓库后，把本地代码推上去。

## 第 2 步：邀请 2-4 位讲师

1. 进入 GitHub 仓库。
2. 打开 `Settings`。
3. 找到 `Collaborators` 或 `Collaborators and teams`。
4. 点击邀请协作者。
5. 输入讲师的 GitHub 用户名或邮箱。
6. 权限先给 `Write` 或 `Triage`。

建议：

- 完全不写代码的讲师：`Triage`
- 愿意改文档的讲师：`Write`
- 真正参与长期管理的人：后续再升为 maintainer

## 第 3 步：创建第一批 issues

先创建 8-12 个 issue，不要太复杂：

- 跟骨骨折病例录入字段建议
- Essex-Lopresti 分型说明优化
- Sanders 分型说明优化
- Zwipp 分型采集项优化
- 随访指标建议
- 影像上传分类建议
- 四点矫正体验建议
- 医生准入和隐私规则建议
- 管理员教学流程设想
- 多中心研究流程设想

## 第 4 步：每周维护节奏

每周只做三件事：

1. 你发一个维护主题。
2. 每位讲师至少评论 1 个 issue。
3. 你或 Codex 把讨论整理成文档或小改动。

这样 4 周后，仓库会出现真实维护痕迹：issues、comments、commits、docs、roadmap。

## 第 5 步：第一次 release

第 4 周左右创建 `v0.1.0` release：

- 标题：`v0.1.0 Prototype`
- 内容：说明已有病例录入、影像处理、测量、分型、随访、讨论、实名准入原型
- 说明这是早期原型，不能用于真实患者隐私数据生产环境

## 第 6 步：准备 Codex for Open Source 申请

申请前至少准备：

- 公开仓库链接
- README
- Roadmap
- Governance
- Security Policy
- Contributing Guide
- 维护者名单
- 真实 issue 和讨论记录
- v0.1.0 release
- 你对项目长期目标的说明

申请叙事可以参考：

[docs/CODEX_OSS_APPLICATION.md](CODEX_OSS_APPLICATION.md)
