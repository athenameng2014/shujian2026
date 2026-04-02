# 「书间」产品需求文档 (PRD) — V1.0

> 最后更新：2026-03-31 | 版本基于已上线的 V1.0 实现

## 1. 产品概述

### 1.1 产品名称
**书间 (Between Books)**

### 1.2 产品定位
一款**记录阅读轨迹、构建知识星图**的轻量级陪伴式工具。通过极简的打卡交互和可视化的专题星图，帮你把散乱的阅读行为具象化为清晰的"阅读地图"，在长期积累中看见自己的知识版图逐步点亮。

### 1.3 适用平台
- **移动端优先的 Web 应用**：无需下载 App，扫码或点击链接即可使用
- 已部署至 Vercel，通过 GitHub 仓库自动构建发布
- 可添加至手机主屏幕，体验贴近原生应用

---

## 2. 技术架构

### 2.1 技术栈

| 层面 | 选型 | 说明 |
|------|------|------|
| 构建工具 | Vite 8 | 极速开发体验 |
| 前端框架 | React 19 + TypeScript | 类型安全，组件化开发 |
| 样式方案 | Tailwind CSS v4 | 原子化 CSS，自定义莫兰迪色系主题 |
| 路由 | React Router 7 | Tab 导航 + 子页面 |
| 本地存储 | localForage (IndexedDB) | 结构化数据持久化，无需后端 |
| 状态管理 | Zustand | 轻量响应式 store |
| 封面获取 | Google Books API | 免费、无需鉴权 |
| 部署 | Vercel + GitHub | 推送即部署，自动化 CI/CD |

### 2.2 设计规范
- **色彩体系**：莫兰迪底色 + 5 色跳色（coral/ocean/sage/sun/berry），每本书自动分配代表色
- **交互规范**：所有可点击元素使用 `active:scale-95` / `active:scale-[0.98]` 按压反馈
- **动效规范**：CSS @keyframes（呼吸脉冲、节点揭示、辉光），轻量不花哨
- **底部弹窗**：统一使用 `rounded-t-3xl` + `safe-area-inset-bottom` + `z-[60]` 模式

### 2.3 数据模型

**Book（书籍）**
```typescript
interface Book {
  id: string; title: string; author?: string;
  coverUrl?: string; color: string; isFiction?: boolean;
  createdAt: number;
}
```

**Log（打卡记录）**
```typescript
interface Log {
  id: string; bookId: string;
  date: string; // "YYYY-MM-DD"
  note?: string; // 随想（选填）
  createdAt: number;
}
```

**Topic（专题）**
```typescript
interface Topic {
  id: string; name: string; description?: string;
  bookIds: string[]; createdAt: number;
}
```

**KnowledgeNode（知识节点）**
```typescript
interface KnowledgeNode {
  id: string; name: string; description: string;
  categoryIndex: number;
  linkedBookIds: string[]; // 多对多：哪些书支撑此概念
  recommendedBook?: { title: string; author?: string };
}
```

---

## 3. 核心功能模块

### 3.1 模块一：阅读日历与打卡流

**核心目标**：提供无压力的轻量化记录体验，生成极具视觉美感的月度数据。

#### 功能详情

1. **书籍搜索与录入**
   - 通过 Google Books API 搜索书名，自动获取封面、作者信息
   - 每本书自动分配莫兰迪色系代表色（5 色轮转），用于日历格子填色
   - 无封面时显示首字 + 代表色的极简色块

2. **日历打卡机制**
   - **两条打卡路径**（已统一交互）：
     - 路径 A：点击日历日期 → 弹出打卡面板 → 快速选择已有书 / 搜索新书 → 填写感想（选填）→ 完成
     - 路径 B：点击右下角浮动"+"按钮 → 直接搜索添加 → 自动进入感想填写 → 完成
   - 每日支持多条打卡，支持补打历史日期
   - 可删除打卡记录（自动清理"孤儿书"：无打卡记录的书从书库移除）

3. **月历视图**
   - 日历格子以书籍代表色色块标记阅读日
   - 同一天读多本书时显示拼色
   - 今日高亮，支持上/下月切换和"回到今天"

4. **本月书单**
   - 日历下方展示当月所有在读书籍，按打卡频次降序排列
   - 每本书显示封面缩略图（或色块）、书名、当月打卡次数

---

### 3.2 模块二：专题与知识星图

**核心目标**：将阅读串联为知识网络，以星图探索的游戏化体验驱动主题阅读。

#### 3.2.1 专题列表页

- 以卡片形式展示所有专题
- 每张卡片包含：
  - 专题名称 + 描述
  - 渐变底纹 + 星点装饰（按卡片索引轮转 5 种配色）
  - 探索度进度条（点亮节点数 / 总节点数）
  - 统计信息：N 本书 · N 本已读 · 点亮 N/N 知识点
  - 最近解锁成就（如有）

#### 3.2.2 专题详情页 — 知识星图

**星图结构**（纯 SVG，无外部图表库）：
- 三层径向布局：中心（专题名） → 分类星系（虚线圈） → 概念节点
- 支持内联预览 + 全屏拖拽/缩放（pointer events + wheel）
- 探索度进度徽章实时显示

**概念节点状态**：
- **未探索节点**：灰色半透明，微弱呼吸脉冲动画
- **已探索节点**：使用所属分类的主题色（与外围虚线圈颜色一致），实心圆 + 辉光动画
- **高密度节点**：当 linkedBookIds > 1（多本书共同支撑此概念），外层加虚线同心圆光环，表示"该概念知识密度较高"

**多对多数据绑定**（当前 Mock 阶段）：
- 概念节点通过 `linkedBookIds` 关联多本书
- 书籍通过 `linkedConceptIds` 关联多个概念
- Mock 示例数据：
  - 《牛奶可乐经济学》→ 点亮 4 个微观经济学概念
  - 《思考，快与慢》→ 点亮 4 个行为经济学概念
  - 《推力》→ 与《思考，快与慢》共同支撑"损失厌恶"、"心理账户"、"禀赋效应"（密度环）
- 匹配策略：先按书名关键词匹配，匹配不到则按顺序自动分配

**节点点击交互 — ConceptSheet（底部抽屉）**：
- 已探索节点：
  - 概念名称 + 状态徽章（已点亮）
  - 概念定义解释
  - "构筑此基石的阅读"区块：横向滑动展示所有关联书籍的微缩卡片（封面 + 书名）
  - 底部文字："是这 N 本书帮你点亮了这个概念"
- 未探索节点：
  - 概念名称 + 状态徽章（未探索）
  - 概念定义解释
  - AI 推荐阅读 + "加入想读"按钮

**底部书籍列表**：
- 移除了旧版彩色左边框，改为纯白卡片
- 每本书下方显示**关联概念 Tag（胶囊标签）**
- Tag 颜色与星图中对应概念节点的分类色完全一致
- 直白展示：这本书帮你解锁了哪几个星图拼图

---

### 3.3 模块三：个人中心（预留）

- 当前为基础页面框架
- 预留入口：阅读人格图谱、书籍库管理
- V1.0 暂未实现深度功能

---

## 4. 信息架构

底部三大 Tab 导航：

| Tab | 路由 | 内容 |
|-----|------|------|
| 日历 | `/` (首页) | 月历视图 + 浮动打卡按钮 + 本月书单 |
| 专题 | `/topic` | 专题卡片列表 |
| 专题详情 | `/topic/:id` | 知识星图 + 书籍列表（从列表页点击进入） |
| 我的 | `/profile` | 个人中心（V1.0 基础框架） |

---

## 5. 交互设计原则

1. **极简录入**：打卡限制在 2-3 步内（选书 → 填感想（选填）→ 完成），绝不强迫用户写笔记
2. **审美驱动**：大量留白、莫兰迪底色 + 高饱和跳色、呼吸感动效，界面需要"呼吸感"
3. **数据即反馈**：每一步操作都有即时视觉反馈（节点点亮、进度条增长、Tag 出现）
4. **游戏化探索**：星图未探索区域保持神秘感，点亮节点时有成就感，"构筑此基石的阅读"让用户看到知识积累的具体路径

---

## 6. 当前状态与路线图

### V1.0 已完成

- [x] 日历打卡流（搜索书籍 + Google Books 封面 + 打卡 + 补打 + 删除）
- [x] 月历视图（色块标记 + 多书拼色 + 月份切换）
- [x] 本月书单（打卡频次排序）
- [x] 专题创建与管理
- [x] 知识星图可视化（SVG 三层布局 + 拖拽缩放 + 全屏模式）
- [x] 多对多概念-书籍绑定（Mock 数据）
- [x] 概念节点状态（已探索/未探索 + 密度环）
- [x] ConceptSheet 底部抽屉（多书展示 + 推荐阅读）
- [x] 书籍列表概念 Tag（分类色一致）
- [x] Vercel 部署 + GitHub CI/CD

### V1.1 计划中

- [ ] 知识星图接入真实 AI（替换 Mock 数据，自动生成概念节点和关联）
- [ ] 阅读人格图谱（打卡频次分析、虚构/非虚构比例、专题偏好）
- [ ] 截图分享功能
- [ ] 书籍库管理优化（去重、合并同名书）
- [ ] PWA 离线支持增强

---

## 7. 文件结构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 根组件 + 路由
├── index.css                   # 全局样式 + Tailwind + 星图动画
├── types/index.ts              # 类型定义（Book, Log, Topic, KnowledgeNode...）
├── db/index.ts                 # localForage CRUD
├── store/index.ts              # Zustand stores（book, log, topic）
├── services/googleBooks.ts     # Google Books API 封装
├── data/mockStarMap.ts         # 星图 Mock 数据 + 多对多关联函数
├── components/
│   ├── Layout/TabBar.tsx       # 底部 Tab 导航
│   ├── Book/BookSearch.tsx     # 书籍搜索组件
│   ├── Calendar/MonthView.tsx  # 月历网格
│   ├── CheckIn/CheckInModal.tsx# 打卡弹窗（含感想输入）
│   └── Topic/
│       ├── TopicCard.tsx       # 专题卡片（列表页用）
│       ├── StarMap.tsx         # 星图主组件（含全屏模式）
│       ├── StarMapLayer.tsx    # 分类区域渲染
│       ├── StarMapNode.tsx     # 单个概念节点
│       ├── ConceptSheet.tsx    # 节点详情底部抽屉
│       └── usePanZoom.ts       # 拖拽/缩放 hook
└── pages/
    ├── Calendar/index.tsx      # 日历首页
    ├── Topic/index.tsx         # 专题列表页
    ├── Topic/TopicDetail.tsx   # 专题详情页
    └── Profile/index.tsx       # 个人中心
```
