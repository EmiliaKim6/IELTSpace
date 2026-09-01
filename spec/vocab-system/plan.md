# Implementation Plan: IELTS 雅思背单词系统

**Input**: Feature specification from `spec/vocab-system/spec.md`

## Summary

为雅思学习Web应用新增「单词」主标签页，整合记忆（复用VocabScheduler SM-2算法）、测试（5种题型：英→中、中→英、拼写、语境填空、同义辨析）、AI分析（本地预筛+AI精排→定制测试卷）三大子视图。技术上遵循现有项目架构：IIFE模块注册到window、bundle文件打包、IndexedDB+localStorage存储、Node.js API代理+独立窗口展示AI报告。新增VocabQuizModule（测试引擎）、VocabAIModule（AI分析+定制测试卷）、改造现有VocabSessionView为三合一标签页。

## Technical Context

**Language/Version**: JavaScript (ES5/ES6混合，IIFE模块模式，无构建工具转换)  
**Primary Dependencies**: 现有bundle系统（手写IIFE拼接）、VocabScheduler (SM-2)、SenseNova API (deepseek-v4-flash via /api/proxy)、AppLazyLoader、HybridStorageManager  
**Storage**: IndexedDB (ielts_vocab_analysis DB + 现有keyValueStore) → localStorage降级  
**Testing**: 手动测试（无自动化测试框架）  
**Target Platform**: 现代浏览器（Chrome 90+），通过Node.js本地服务器(8080端口)访问  
**Project Type**: 单页Web应用（HTML+CSS+拼接bundle JS）  
**Performance Goals**: 词表加载<2s，AI分析<60s，存储写入<1s  
**Constraints**: 离线可用（非AI功能）、file://不支持API调用、bundle文件需手工编辑  
**Scale/Scope**: 3600+核心词、5种题型、3个子视图、1个AI分析流程

## Project Structure

### Documentation (this feature)

```text
spec/vocab-system/
├── spec.md              # 需求规格
├── plan.md              # 本文件（架构与设计规划）
└── tasks.md             # 任务分解（Phase 3生成）
```

### Source Code (repository root)

```text
E:\雅思学习\
├── index.html                                    # 新增「单词」导航按钮 + vocab-main-view容器
├── css/
│   └── main.css                                  # 新增vocab-main样式（子标签、测试、AI分析UI）
├── js/
│   └── bundles/
│       ├── more.bundle.js                        # 修改：VocabSessionView迁移适配、handleVocabEntry重定向
│       ├── practice.bundle.js                    # 修改：WrongbookAI保持不变，新增VocabAIModule
│       └── legacy-app.bundle.js                  # 修改：导航map增加vocab、showView增加vocab子视图刷新
├── assets/
│   ├── prompts/
│   │   ├── wrongbook-analysis.md                 # 已有，不修改
│   │   └── vocab-analysis.md                     # 新增：AI词汇分析提示词模板
│   ├── generated/
│   │   └── reading-exams/
│   │       ├── ai-report.html                    # 已有，不修改
│   │       └── vocab-ai-report.html              # 新增：词汇AI分析报告独立窗口页面
│   └── wordlists/
│       ├── ielts_core.bundle.js                  # 已有，不修改
│       ├── ielts_core.json                       # 已有，不修改
│       ├── ecdict_reading.bundle.js              # 已有，不修改
│       └── cet4.json                             # 已有，不修改
├── server.js                                     # 不修改（已有API代理支持）
└── 启动服务器.bat                                # 不修改
```

**Structure Decision**: 遵循现有项目架构。项目不是HarmonyOS/ArkTS，而是纯前端Web应用（HTML+CSS+拼接bundle JS），采用IIFE模块模式注册到window对象。所有新功能代码内联到现有bundle文件中，不创建新的bundle文件，保持与项目现有组织方式一致。主要修改3个bundle文件（more.bundle.js、practice.bundle.js、legacy-app.bundle.js），新增2个HTML/MD文件（vocab-ai-report.html、vocab-analysis.md），修改1个CSS文件和1个HTML文件。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| practice.bundle.js同时包含错题AI和词汇AI | 两个AI模块共享API调用基础设施（请求构造、响应解析、IndexedDB操作），拆分到不同bundle会增加重复代码 | 拆分为独立vocab.bundle.js需修改build脚本和HTML引用，且共享代码需抽公共模块，当前项目无此基础设施 |

## Research & Decisions

### Decision 1: VocabQuizModule放置位置

**Decision**: 放入more.bundle.js，与VocabSessionView/VocabStore/VocabScheduler同bundle  
**Rationale**: 测试模块与记忆模块紧密耦合（共享VocabStore、VocabScheduler、词表数据），放同一bundle避免跨bundle依赖问题。more.bundle.js已包含所有词汇相关代码。  
**Alternatives considered**: 
- 独立vocab-quiz.bundle.js → 需修改HTML script引用和build脚本，且需解决VocabStore跨bundle访问问题
- 放入practice.bundle.js → practice.bundle.js已很大（错题+录音），测试逻辑与practice无关

### Decision 2: VocabAIModule放置位置

**Decision**: 放入practice.bundle.js，与WrongbookAI同bundle  
**Rationale**: VocabAIModule与WrongbookAI共享完全相同的API调用基础设施（请求构造、响应解析、fence剥离、IndexedDB操作模式），且practice.bundle.js已有AI模块的完整模式可参考和复用。  
**Alternatives considered**: 
- 独立vocab-ai.bundle.js → 同上，需修改build脚本
- 放入more.bundle.js → more.bundle.js已很大（6700+行），加入AI逻辑会使其过于臃肿

### Decision 3: 主标签页与子视图切换方案

**Decision**: 在index.html新增导航按钮（data-view="vocab"），标签页内容区使用子标签栏（记忆/测试/AI分析），子视图通过CSS class切换显示/隐藏  
**Rationale**: 与现有wrongbook标签页模式一致——主标签控制视图级切换，子标签控制子视图切换。不需要路由系统，纯CSS+JS控制。  
**Alternatives considered**: 
- 直接复用现有vocab-view → 现有vocab-view是空壳（只有vocab-view-shell），且访问路径是从"更多"页面进入，不符合主标签页需求
- 使用iframe嵌入 → 增加通信复杂度，不符合项目风格

### Decision 4: 现有VocabSessionView的迁移策略

**Decision**: 保留VocabSessionView不变（作为记忆子视图的核心引擎），在其外层包装新的VocabMainView（负责子标签切换和三个子视图的容器）。VocabSessionView.mount()的目标从#vocab-view改为VocabMainView内的记忆子容器。  
**Rationale**: VocabSessionView是6700+行代码的完整闪卡引擎，重写代价巨大。只需调整mount目标即可在新的三合一布局中复用。  
**Alternatives considered**: 
- 重写VocabSessionView → 工作量巨大且风险高
- 将VocabSessionView拆分为更小的组件 → 项目无组件化基础设施

### Decision 5: 同义辨析题的AI调用策略

**Decision**: 批量预生成+缓存。当用户选择包含同义辨析的测试时，先一次性批量调用AI生成所有辨析题（每批10-20题），结果缓存到IndexedDB。测试时直接从缓存读取，无需逐题等待。  
**Rationale**: 逐题实时调用AI会导致测试中断、等待时间长（每题3-5秒），用户体验差。批量预生成+缓存方案将AI调用与测试展示解耦。  
**Alternatives considered**: 
- 逐题实时生成 → 用户体验差，等待时间长
- 预生成所有词的辨析题 → 3600词全量生成不现实，API成本过高

### Decision 6: 测试结果反馈到记忆模块的机制

**Decision**: 测试完成后，对每个错误单词调用VocabScheduler.scheduleAfterResult(word, 'wrong')重置其复习进度，并标记tags增加'quiz-error'标签。正确单词不做调整（测试是检验而非学习）。  
**Rationale**: 测试中答错意味着记忆不牢固，应重置复习间隔。答对不需要额外奖励（SM-2算法已通过日常复习处理）。与错题本的重练逻辑一致。  
**Alternatives considered**: 
- 测试答对也调整EF → 会导致SM-2数据混乱（日常复习和测试的评级标准不同）
- 不影响记忆模块 → 错词无法得到加强复习，失去测试的纠正价值

## Data Model

### WordRecord（单词学习记录）

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| id | string | 主键，格式"word-{hash}" | 系统生成 |
| word | string | 英文单词 | 词表数据 |
| meaning | string | 中文释义（含词性） | 词表数据 |
| example | string | 例句 | 词表数据(可选) |
| freq | number | 频率0-1 | ielts_core数据 |
| easeFactor | number | SM-2 EF (1.3-3.0) | VocabScheduler |
| interval | number | 复习间隔天数 | VocabScheduler |
| repetitions | number | 成功复习次数 | VocabScheduler |
| correctCount | number | 正确计数 | 测试+记忆 |
| incorrectCount | number | 错误计数 | 测试+记忆 |
| lastReviewed | ISO string | 上次复习时间 | 系统更新 |
| nextReview | ISO string | 下次应复习时间 | VocabScheduler |
| source | string | 来源词表ID | 初始导入 |
| tags | string[] | 标签(阅读/听力/拼写错误/quiz-error等) | 多源聚合 |
| masteryLevel | string | 掌握等级: new/learning/reviewing/mastered | 系统计算 |
| createdAt | ISO string | 创建时间 | 系统生成 |
| updatedAt | ISO string | 更新时间 | 系统更新 |

**存储位置**: 与现有VocabStore共用，key为`vocab_words`（默认词表）或各词表对应的localStorage key

**masteryLevel计算规则**:
- new: repetitions=0, correctCount=0
- learning: 0 < repetitions < 3 或 correctCount < masteryCount
- reviewing: repetitions >= 3 且 correctCount >= masteryCount
- mastered: consecutive correct >= masteryCount(默认5)

### QuizSession（测试会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 主键，格式"quiz-{timestamp}-{random}" |
| scope | string | 测试范围: all/due/listId/custom |
| scopeDetail | string | 范围详情(词表ID或自定义描述) |
| questionTypes | string[] | 包含的题型: en2cn/cn2en/spelling/context-fill/synonym |
| totalQuestions | number | 总题数 |
| correctCount | number | 正确数 |
| incorrectCount | number | 错误数 |
| nearCorrectCount | number | 近似正确数(拼写) |
| score | number | 百分制得分 |
| startedAt | ISO string | 开始时间 |
| completedAt | ISO string | 完成时间 |
| duration | number | 用时(秒) |

**存储位置**: IndexedDB `ielts_vocab_quiz` → store `quiz_sessions`，keyPath: sessionId

### QuizQuestion（测试题目）

| 字段 | 类型 | 说明 |
|------|------|------|
| questionId | string | 主键，格式"q-{sessionId}-{index}" |
| sessionId | string | 关联的QuizSession ID |
| word | string | 目标单词 |
| meaning | string | 目标释义 |
| questionType | string | 题型: en2cn/cn2en/spelling/context-fill/synonym |
| prompt | string | 题目展示内容 |
| options | string[] | 选项(选择题)或null(填空题) |
| correctAnswer | string | 正确答案 |
| userAnswer | string | 用户答案 |
| isCorrect | boolean | 是否正确 |
| isNearCorrect | boolean | 是否近似正确(拼写) |
| timeSpent | number | 作答用时(秒) |
| aiGenerated | boolean | 是否AI生成(同义辨析) |
| answeredAt | ISO string | 作答时间 |

**存储位置**: IndexedDB `ielts_vocab_quiz` → store `quiz_questions`，keyPath: questionId，index: sessionId

### VocabAnalysisResult（AI分析结果）

| 字段 | 类型 | 说明 |
|------|------|------|
| analysisId | string | 主键，词表ID或"__all__" |
| parsed | object | 解析后的JSON对象 |
| raw | string | AI原始响应文本 |
| analyzedAt | ISO string | 分析时间 |
| scope | string | 分析范围描述 |
| candidateCount | number | 预筛候选词数 |
| customPaper | object | 关联的定制测试卷(null或CustomTestPaper) |

**存储位置**: IndexedDB `ielts_vocab_analysis` → store `vocab_analysis_results`，keyPath: analysisId，index: analyzedAt

**parsed对象结构（AI输出JSON Schema）**:
```
{
  summary: { overallLevel, keyInsight, overallLevelDescription, totalWords, masteredCount, learningCount, errorRate },
  patternAnalysis: { errorTypeDistribution, masteryDistribution, frequencyVsErrorCorrelation, topWeakWords, patternSummary },
  wordAnalyses: [{ wordId, word, errorType, errorCount, reviewCount, difficulty, analysis, tip, relatedWords }],
  weakPoints: [{ point, description, severity, rootCause, impact, affectedWords }],
  studyPlan: { shortTerm: { period, goals, actions }, midTerm: { period, goals, actions }, longTerm: { period, goals, actions } },
  suggestions: [{ target, method, direction, priority, notes }]
}
```

### CustomTestPaper（定制测试卷）

| 字段 | 类型 | 说明 |
|------|------|------|
| paperId | string | 主键，格式"paper-{timestamp}" |
| sourceAnalysisId | string | 关联的AI分析ID |
| questions | object[] | 题目列表(QuizQuestion格式) |
| totalQuestions | number | 总题数 |
| generatedAt | ISO string | 生成时间 |
| completed | boolean | 是否已完成 |
| result | object | 完成后的统计(QuizSession格式子集) |

**存储位置**: 嵌入VocabAnalysisResult.customPaper字段

### SynonymCache（同义辨析题缓存）

| 字段 | 类型 | 说明 |
|------|------|------|
| word | string | 主键，目标单词 |
| choices | string[] | 选项(含正确答案) |
| correctIndex | number | 正确答案索引 |
| distractors | string[] | 干扰项单词列表 |
| explanation | string | 辨析解释 |
| generatedAt | ISO string | 生成时间 |

**存储位置**: IndexedDB `ielts_vocab_quiz` → store `synonym_cache`，keyPath: word

## Contracts & Interfaces

### VocabQuizModule（测试引擎 — more.bundle.js）

对外公开API注册到 `window.VocabQuizModule`:

```
VocabQuizModule = {
  // 测试配置与启动
  createSession(scope, questionTypes, options) → Promise<QuizSession>
  // scope: 'all' | 'due' | listId | { wordIds: [] }
  // questionTypes: ['en2cn','cn2en','spelling','context-fill','synonym']
  // options: { count: 20, timeLimit: null }
  // 返回: 包含sessionId和questions的QuizSession
  
  // 答题
  submitAnswer(sessionId, questionId, userAnswer, timeSpent) → Promise<QuizQuestion>
  
  // 完成测试
  completeSession(sessionId) → Promise<{ session, results, errorWords }>
  // 自动将errorWords反馈到VocabStore/VocabScheduler
  
  // 获取测试结果
  getSession(sessionId) → Promise<QuizSession>
  getSessionQuestions(sessionId) → Promise<QuizQuestion[]>
  getSessionHistory(limit) → Promise<QuizSession[]>
  
  // 同义辨析AI生成
  generateSynonymQuestions(words, count) → Promise<SynonymCache[]>
  // 批量预生成，返回缓存结果
  
  // UI渲染
  renderQuizSetup(containerEl) → void
  renderQuizSession(containerEl, sessionId) → void
  renderQuizResult(containerEl, sessionId) → void
}
```

### VocabAIModule（AI分析 — practice.bundle.js）

对外公开API注册到 `window.VocabAI`:

```
VocabAI = {
  // 分析
  analyze(scopeKey, forceNew) → Promise<VocabAnalysisResult>
  // scopeKey: 词表ID 或 "__all__"
  
  // 获取结果
  getResult(analysisId) → Promise<VocabAnalysisResult>
  
  // 保存结果
  saveResult(analysisId, parsed, raw, candidateCount) → Promise<void>
  
  // 本地预筛
  prefilterCandidates(scopeKey) → Promise<{ words, stats }>
  // 返回: 错误率>30% / 复习>5次 / 高频TOP200 / 带错题标签的词 + 统计摘要
  
  // 生成定制测试卷
  generateCustomPaper(analysisId, options) → Promise<CustomTestPaper>
  // options: { questionCount: 30, questionTypes: [...] }
  // 基于AI分析结果挑选词，调用VocabQuizModule.createSession
  
  // 提示词
  loadPrompt() → Promise<string>
  
  // 请求去重
  isPending(analysisId) → boolean
  forceNew(analysisId) → void
}
```

### VocabMainView（主视图控制器 — more.bundle.js）

对外公开API注册到 `window.VocabMainView`:

```
VocabMainView = {
  // 挂载到容器
  mount(containerSelector) → void
  // 创建三合一布局：子标签栏 + 三个子容器
  
  // 子视图切换
  switchSubView(subViewId) → void
  // subViewId: 'memory' | 'quiz' | 'analysis'
  
  // 刷新
  refresh() → void
  
  // 获取当前状态
  getActiveSubView() → string
}
```

### 导航系统集成

```
// legacy-app.bundle.js 修改点：
// 1. navMap 增加: 'vocab': '[data-view="vocab"]'
// 2. viewMap 增加: 'vocab': '#vocab-view'  
// 3. showView() 增加 vocab 分支:
//    - 调用 VocabMainView.mount() 和 refresh()
//    - 处理 VocabMainView 未就绪的重试（同wrongbook模式）
// 4. onViewActivated() 增加 case 'vocab'
// 5. setupEventListeners() 的导航按钮处理无需修改（自动匹配data-view）

// index.html 修改点：
// 1. nav增加: <button class="nav-btn" data-view="vocab">📖 单词</button>
// 2. 将现有 <section id="vocab-view"> 改造为三合一容器
//    - 移除 hidden 属性
//    - 内部增加子标签栏和三个子容器
```

### 数据流合约

```
记忆模块 ──(评级结果)──→ VocabStore ──(持久化)──→ IndexedDB/localStorage
    ↑                                                    |
    └──(到期词+新词)───────────────────────────────────┘

测试模块 ──(答题结果)──→ VocabQuizModule ──(错词反馈)──→ VocabStore
    |                     ──(会话持久化)──→ IndexedDB(ielts_vocab_quiz)
    └──(同义辨析请求)──→ VocabAIModule ──(AI调用)──→ SenseNova API
                            ──(缓存)──→ IndexedDB(synonym_cache)

AI分析 ──(预筛请求)──→ VocabStore + VocabQuizModule ──(统计)──→ 本地数据
    ──(分析结果)──→ IndexedDB(ielts_vocab_analysis)
    ──(定制测试卷)──→ VocabQuizModule.createSession()
    
阅读练习 ──(高亮生词)──→ VocabStore(阅读高亮词表)
听力练习 ──(拼写错误)──→ VocabStore(拼写错误词表)
```

### AI提示词合约 (assets/prompts/vocab-analysis.md)

模板变量:
- `{{analysisScope}}` → "全局词表" 或 "XX词表"
- `{{totalWords}}` → 总词数
- `{{masteredCount}}` → 已掌握数
- `{{learningCount}}` → 学习中数
- `{{errorRate}}` → 整体错误率
- `{{candidateWords}}` → 预筛候选词列表(含word/meaning/errorCount/reviewCount/freq/tags/lastErrors)
- `{{quizHistory}}` → 近期测试历史摘要(最近5次session的scope/正确率/题型)
- `{{weakCategories}}` → 本地统计的薄弱类别(spelling-error/synonym-confusion/academic-vocab等)

JSON输出Schema: 见Data Model中VocabAnalysisResult.parsed结构

### vocab-ai-report.html 合约

- URL参数: `?analysisId=<analysisId>`
- 数据源: 直接从IndexedDB `ielts_vocab_analysis` → `vocab_analysis_results` 读取
- 渲染: 独立HTML页面，包含完整CSS，与ai-report.html模式一致
- 窗口: 80%屏幕尺寸，居中，scrollbars=yes

### 定制测试卷生成流程

```
1. 用户点击"生成定制测试卷"
2. VocabAI.generateCustomPaper(analysisId, options)
3. 从analysisResult.parsed.wordAnalyses中按priority排序挑选20-50词
4. 按题型分配题目：en2cn(30%) + cn2en(20%) + spelling(20%) + context-fill(15%) + synonym(15%)
5. 对synonym题型：调用VocabQuizModule.generateSynonymQuestions()预生成
6. 调用VocabQuizModule.createSession()创建测试会话
7. 返回paperId，UI切换到测试子视图开始测试
8. 测试完成后结果反馈回VocabStore和AI分析数据
```
