



# FocusLog

FocusLog 是一个面向个人学习与任务管理的 Web 应用，强调“低负担记录 + 周期复盘”。系统把任务、里程碑与目标纳入同一结构，通过日志与番茄记录沉淀执行过程，从而形成可持续的学习闭环。它关注“真实投入”而不是单纯打卡，既能记录日常任务，也能让周报与阶段目标形成清晰关联。

项目的交互设计以“快速记录、减少负担”为核心：任务完成只需一次点击，计时或计数任务可在当日直接记录；周报与学习汇总自动生成，避免重复整理；提醒机制帮助保持节奏。适合日常学习、备考训练、长期习惯养成与周期复盘等场景。

## 在线体验

[体验地址](https://todo.palon.cn)

## 适用场景

- 备考与课程学习的日常任务记录
- 番茄专注与学习时长统计
- 周/月目标拆解与阶段性复盘
- 习惯养成与执行节奏跟踪

## 主要功能

- 今日任务与习惯记录：勾选完成、计时记录、计数记录。
- 周期规划：周/月/长期目标拆解为里程碑与任务，支持依赖关系。
- 周报与健康度：自动汇总执行次数、学习时长与完成率，生成可持续性评分。
- 学习汇总：今日/近 7 天/近 30 天统计与图表展示。
- 番茄计时与提醒：专注/短休/长休模式与系统通知提醒。
- 外观设置：背景、字体大小、模糊度、磨砂度与字体颜色可配置。

## 技术栈

- 前端：Vue 3 + Vite + Pinia + Vue Router
- 后端：Cloudflare Pages Functions + Hono
- 数据库：Cloudflare D1（SQLite）

## 通过 Cloudflare Pages Connect to Git 部署

### 部署步骤

1. Fork 或上传本仓库到 GitHub。
2. 打开 Cloudflare Pages，创建项目并选择 “Connect to Git”，选中你的仓库。

3. 配置构建参数：
   - 构建命令：`npm install && npm run build`
   - 输出目录：`dist`
   - 根目录：留空或 `/`
4. 配置环境变量：

   - `VITE_API_BASE_URL=/api`（前后端同一 Pages 项目时）
5. 创建D1数据库并初始化

   - 在 D1 控制台执行 `schema.sql`（一次性初始化）
6. 绑定 D1 数据库：
   - 绑定变量名：`DB`
   - 选择刚刚创建的数据库
7. 重新部署项目

具体步骤如下：(配图)

1.登录GitHub，访问[FocusLog](https://github.com/YforC/FocusLog)，fork本项目

![0](images\0.png)

2.登录[cf](https://dash.cloudflare.com/)，选择workers&pages后，点击右上角创建程序

![1](images\1.png)

3.点击下面的Get Started创建Pages

![2](images\2.png)

4.选择从GitHub上拉取项目

![3](images\3.png)

5.配置项目如图，构建命令，输出文件夹和环境变量必须跟图中一样(命令都在上面)，配置完成后点击右下角的保存并部署

![5](images\5.png)

6.项目部署成功如图所示

![6](images\6.png)

7.现在，左侧栏点击储存与数据库，点击D1 SQL，然后点击右上角创建数据库

![7](images\7.png)

8.数据库创建配置如图所示

![8](images\8.png)

9.点击创建数据库后，点击上面的控制台，在下面输入GitHub代码仓库中[schema.sql](https://github.com/YforC/FocusLog/blob/main/schema.sql)的代码，然后点击执行

![9](images\9.png)

10.执行成功后验表操作如图

![10](images\10.png)

11.如图，左侧回到刚刚的Pages，选择刚刚部署的项目

![11](images\11.png)

12.如图，先点击设置，然后点击绑定，在Bindings中新增，选择D1 数据库

![12](images\12.png)

13.配置D1，变量名为DB，数据库选择刚刚创建的数据库，然后保存

![13](images\13.png)

14.保存之后点击第一个，然后点击查看详细

![14](images\14.png)

15.进入详细内容后，点击重新部署Retry

![15](images\15.png)

16.在这个界面可以查看cf大善人提供的项目域名(默认被墙，如何使用自己的域名请自行完成)

![16](images\16.png)

17.项目完成效果

![18](images\18.png)

## 项目成员

#### ZZ!   GY!   YBL!

## 许可证

MIT
