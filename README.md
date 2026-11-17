<h1 align="center"> <img width="256" height="256" alt="liankao-ng logo" src="https://github.com/user-attachments/assets/d4bab2ab-2788-4e5c-8b3d-a7ed590b446d" /> <br /> <a href="https://liankao.index545.com">liankao-ng</a> </h1>

## 这是什么？

`liankao-ng` 是「小视野」的配套评分站。

平时吃完联考，大家经常会讨论哪场题质量高、哪道题值得补、或者某道题是不是根本不是题。在搬联考的时候，也经常有查找原题的需要。`liankao-ng` 把**联考/题目评分、题面浏览、全文检索**以及**基于大模型的「原题机」语义搜题**整合到一起，希望能让找题、评分~~和骂出题人~~更省心。

除此之外，评分站还加入了 Rating 功能！我们联考也是终于有自己的 Rating 了。

## 主要功能

- **比赛与题目评价**：对联考比赛和单题进行打分与评价，内置用户系统与 Rating 机制。支持一键复制 LaTeX 题面。
- **全文检索**：接入 Meilisearch，支持按关键词快速搜索题库与比赛。
- **原题机**：利用 LLM 提炼题目核心题意，结合向量相似度寻找相似原题。
- **小视野数据同步**：支持自动拉取比赛与题面，由于小视野根本不是人，禁止海外 IP 访问，因此还附带了一个轻量级的腾讯云函数代理用于在国内爬取网站。
- **轻量易部署**：基于 Bun + SQLite + Prisma 构建，本地一条命令即可跑起完整前后端，自带 OpenAPI 文档。

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
