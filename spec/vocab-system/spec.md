# Feature Specification: IELTS 雅思背单词系统

**Created**: 2026-07-14  
**Status**: Draft  
**Input**: 用户描述："设计一个背单词系统，复用原网页中的背单词资源，新增一个标签页'单词'，支持记忆，测试等，所有都需要保存数据，以供后续复习。也设计一个AI分析系统，可挑出易错且常考的单词提供定制化测试。"

## Overview

为雅思学习平台新增一个「单词」主标签页，整合记忆（SM-2间隔重复）、测试（英→中、中→英、拼写、语境填空、同义辨析五种题型）和AI分析（本地预筛+AI精排，生成定制测试卷）三大功能模块。所有学习进度、测试结果、AI分析结果均持久化存储，支持跨会话复习。复用现有的IELTS核心词表(3,610词)、vocabulary.json(348词)、ECDICT词典(22,000+词条)、阅读高亮生词列表等数据源，以及已有的VocabScheduler SM-2调度算法。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 每日单词记忆复习 (Priority: P1)

用户打开「单词」标签页，系统根据SM-2算法展示到期复习的单词和今日新词。用户通过卡片翻转模式（先看英文回想中文释义，再自评easy/good/hard）完成记忆复习，系统自动计算下次复习时间并持久化进度。用户可随时切换词表（IELTS核心、阅读高亮词、自定义等）。

**Why this priority**: 记忆是单词学习的基础，是整个系统的核心价值。没有记忆模块，测试和AI分析无从谈起。

**Independent Test**: 可通过切换到「单词」标签、开始一次记忆复习会话、完成若干单词评级来独立测试，能验证SM-2调度是否正确更新复习间隔。

**Acceptance Scenarios**:

1. **Given** 用户首次打开「单词」标签页且无学习记录, **When** 点击"开始复习", **Then** 系统从IELTS核心词表按频率降序挑选新词展示记忆卡片
2. **Given** 用户有到期复习单词, **When** 进入记忆模式, **Then** 优先展示到期复习词，复习完毕后再展示新词
3. **Given** 用户在记忆卡片上评级为"hard", **When** 评级完成, **Then** 系统按SM-2算法缩短该词复习间隔（EF降低，1天后再复习），进度已持久化
4. **Given** 用户切换词表为"阅读高亮词", **When** 重新进入记忆, **Then** 系统加载对应词表数据，展示该词表下的到期词和新词

---

### User Story 2 - 多题型单词测试 (Priority: P2)

用户在「单词」标签页切换到"测试"子视图，选择测试范围（全部词/到期词/特定词表/自定义范围）和题型组合，系统生成测试卷。支持5种题型：英→中（看英文选中文释义）、中→英（看中文选英文单词）、拼写（听/看释义写单词）、语境填空（根据例句填入正确单词）、同义辨析（AI生成的同义/近义词辨析选择题）。测试完成后显示得分和逐题结果，错题自动收录到错词列表。

**Why this priority**: 测试是检验记忆效果和发现薄弱环节的关键手段，在记忆模块可用后优先实现。

**Independent Test**: 可通过选择测试范围和题型、完成一轮测试、查看结果和错题收录来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户选择"英→中"题型和"到期词"范围(20题), **When** 开始测试, **Then** 系统从到期词中随机选取20词，每题展示英文+4个中文选项
2. **Given** 测试进行中用户答错一题, **When** 答题完成, **Then** 该词标记为错误，自动收录到单词错题列表，并在记忆模块的下次复习中出现
3. **Given** 用户选择"同义辨析"题型, **When** 系统生成题目, **Then** AI实时生成同义/近义词辨析选项（或使用缓存的AI生成题），用户选择正确答案
4. **Given** 用户完成全部测试, **When** 测试结束, **Then** 显示总得分、正确率、逐题回顾（含正确答案和用户答案），错题自动保存到复习队列
5. **Given** 用户选择"语境填空"题型, **When** 系统生成题目, **Then** 展示例句并挖空目标单词，用户填入正确拼写

---

### User Story 3 - AI单词分析与定制测试卷 (Priority: P3)

用户在「单词」标签页切换到"AI分析"子视图。系统先从本地数据预筛候选词（错误率高、复习次数多、频率高、来自阅读/听力错题标签的词），再调用AI精细分析学习规律，生成包含综合评估、薄弱类别诊断、逐词分析的完整报告。用户可点击"生成定制测试卷"，AI根据分析结果自动挑选20-50个易错常考词，生成包含多种题型的完整测试卷。

**Why this priority**: AI分析是高级功能，在记忆和测试基础数据充足后才能发挥最大价值。

**Independent Test**: 可通过积累一定学习数据后点击AI分析、查看分析报告、生成定制测试卷来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户有50+条学习记录(含错误记录), **When** 点击"AI分析", **Then** 系统预筛候选词（错误率>30%或复习>5次或高频词或带错题标签），发送给AI分析，在独立窗口展示报告
2. **Given** AI分析报告已生成, **When** 用户查看报告, **Then** 报告包含：综合评估(词汇掌握等级)、错误类型分布图表、薄弱类别(如拼写混淆/近义混淆/学术词汇)、逐词分析、分阶段学习计划、改进建议
3. **Given** AI分析报告已生成, **When** 用户点击"生成定制测试卷", **Then** AI挑选20-50个易错常考词，生成包含英→中/中→英/拼写/语境填空/同义辨析的完整测试卷，用户可直接开始测试
4. **Given** AI生成的定制测试卷已完成, **When** 提交测试, **Then** 结果自动反馈回记忆模块和AI分析数据，用于下次分析的依据

---

### User Story 4 - 单词数据管理与跨模块联动 (Priority: P4)

用户可在「单词」标签页管理自己的词表（查看各词表统计、导入/导出、删除自定义词表）。阅读练习中的高亮生词自动同步到"阅读高亮词"列表。听力/阅读拼写错误自动收录到"拼写错误词表"。用户可从任何词表将词添加到自定义词表。

**Why this priority**: 数据管理是系统维护的基础，跨模块联动增强整体学习体验，但属于完善性功能。

**Independent Test**: 可通过在阅读练习中高亮生词、返回单词页查看高亮词表、导入/导出词表来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户在阅读练习中高亮一个生词, **When** 返回「单词」标签页, **Then** 该词出现在"阅读高亮词"词表中，可进行记忆复习
2. **Given** 用户在测试中拼写错误一个词, **When** 返回记忆模式, **Then** 该词的复习优先级提高，下次复习时出现
3. **Given** 用户点击"导出词表", **When** 选择目标词表, **Then** 系统生成JSON文件供下载，包含词表元数据和学习进度

---

### Edge Cases

- 无学习数据时点击AI分析 → 提示"需要至少50条学习记录才能进行分析"
- 词表中单词数不足测试题目数 → 按实际可用词数量生成，告知用户
- 同义辨析题AI生成失败 → 降级为英→中题型，显示提示
- 网络不可用时AI相关功能 → 提示网络错误，记忆和测试功能正常可用（非AI题型）
- IndexedDB不可用 → 降级到localStorage存储，限制词表大小
- 大量到期复习词（>200）→ 分批展示，提示"今日有X词到期，建议分批复习"

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须在主导航栏新增「单词」标签页（data-view="vocab"），与总览/题库浏览/练习记录/错题/更多/设置并列
- **FR-002**: 标签页内必须包含三个子视图（记忆/测试/AI分析），通过顶部子标签切换
- **FR-003**: 记忆模块必须复用现有VocabScheduler的SM-2+Leitner+艾宾浩斯调度算法
- **FR-004**: 记忆模块必须支持词表切换（IELTS核心词/vocabulary.json/阅读高亮词/拼写错误词/自定义词表）
- **FR-005**: 记忆模块必须持久化每个单词的学习进度（EF/interval/repetitions/lastReview/nextReview等）
- **FR-006**: 测试模块必须支持5种题型：英→中选择题、中→英选择题、拼写填空、语境填空、同义辨析选择题
- **FR-007**: 测试模块必须支持选择测试范围（全部/到期/特定词表/自定义）
- **FR-008**: 测试模块必须在测试完成后显示逐题回顾和总体统计（得分/正确率/用时）
- **FR-009**: 测试模块必须将测试中的错误单词自动收录到单词错题列表，并影响记忆模块的复习优先级
- **FR-010**: 测试结果必须持久化存储，包含每题的单词、题型、用户答案、正确答案、是否正确、时间戳
- **FR-011**: 同义辨析题必须由AI实时生成（使用SenseNova API），生成失败时降级为英→中题型
- **FR-012**: AI分析模块必须先从本地数据预筛候选词（错误率>30%或复习次数>5或频率TOP200或带错题标签），再发送给AI精细分析
- **FR-013**: AI分析模块必须生成本地预筛所需的统计维度：每词错误率、复习次数、频率等级、来源标签（阅读/听力/拼写错误）
- **FR-014**: AI分析报告必须在独立浏览器窗口中展示（复用window.open模式，类似错题AI报告）
- **FR-015**: AI分析报告必须包含：综合评估(掌握等级)、错误类型分布、薄弱类别诊断、逐词精析、分阶段学习计划、改进建议
- **FR-016**: AI分析结果必须持久化到IndexedDB（新DB: ielts_vocab_analysis，store: vocab_analysis_results）
- **FR-017**: 用户可通过AI分析界面点击"生成定制测试卷"，AI挑选20-50个易错常考词生成完整多题型测试
- **FR-018**: 定制测试卷的测试结果必须反馈回记忆模块和AI分析数据
- **FR-019**: 阅读练习中的高亮生词必须自动同步到"阅读高亮词"词表
- **FR-020**: 听力/阅读拼写错误必须自动收录到对应拼写错误词表
- **FR-021**: 系统必须复用现有SenseNova API代理（/api/proxy/v1/chat/completions），使用deepseek-v4-flash模型
- **FR-022**: AI提示词必须支持外部文件（assets/prompts/vocab-analysis.md）+ 内置fallback双模式
- **FR-023**: AI分析请求必须支持去重（同一scope不重复发起请求）和强制重新分析
- **FR-024**: 所有单词相关的存储操作必须通过统一的存储层（IndexedDB优先，localStorage降级）

### Key Entities

- **WordRecord（单词记录）**: 一个单词的完整学习状态 — word(单词)、meaning(释义)、example(例句)、freq(频率)、easeFactor(SM-2 EF)、interval(复习间隔天数)、repetitions(成功复习次数)、correctCount/incorrectCount(正确/错误计数)、lastReviewed(上次复习时间)、nextReview(下次复习时间)、source(来源词表)、tags(标签：阅读/听力/拼写错误等)、masteryLevel(掌握等级：new/learning/reviewing/mastered)
- **QuizSession（测试会话）**: 一次测试的完整记录 — sessionId、scope(测试范围)、questionTypes(包含的题型)、totalQuestions、correctCount、incorrectCount、startedAt、completedAt、duration
- **QuizQuestion（测试题目）**: 单个测试题目 — questionId、sessionId、word(目标单词)、questionType(题型)、userAnswer、correctAnswer、isCorrect、timeSpent、aiGenerated(是否AI生成)
- **VocabAnalysisResult（AI分析结果）**: AI分析的完整结果 — analysisId(分析标识：词表ID或"__all__")、parsed(解析后的JSON对象)、raw(AI原始响应)、analyzedAt(分析时间)、scope(分析范围描述)、candidateCount(预筛候选词数)
- **CustomTestPaper（定制测试卷）**: AI生成的定制测试 — paperId、sourceAnalysisId(关联的AI分析)、questions(题目列表)、totalQuestions、generatedAt、completed(是否已完成)、result(完成后的统计)
- **WordList（词表）**: 词表元数据 — listId、name、source(来源：builtin/custom/highlight/error)、totalWords、masteredWords、reviewingWords、newWords、updatedAt

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户在3次点击内从任何页面进入记忆复习（1次点击标签页，1次切换子视图，1次开始复习）
- **SC-002**: 记忆复习完成后，所有评级结果在1秒内持久化并可跨会话恢复
- **SC-003**: 测试完成后，错题在2秒内自动收录到复习队列，下次记忆复习时优先出现
- **SC-004**: AI分析从点击到报告展示在60秒内完成（不含网络延迟异常情况）
- **SC-005**: AI生成的定制测试卷包含至少20个题目，覆盖至少3种题型
- **SC-006**: 同义辨析题AI生成成功率>90%（网络正常时）
- **SC-007**: 词表切换后数据加载在2秒内完成
- **SC-008**: 离线状态下记忆和本地题型测试功能完全可用

## Assumptions

- 用户通过Node.js本地服务器（端口8080）访问应用，AI功能依赖该服务器的API代理
- 现有VocabScheduler模块可直接被新标签页引用，不需要重写算法逻辑
- ECDICT词典数据（22,000+词条）已通过ecdict_reading.bundle.js预加载到内存
- IELTS核心词表(3,610词)和vocabulary.json(348词)已嵌入到ielts_core.bundle.js中
- 阅读高亮生词和拼写错误的自动收集机制已在现有代码中实现
- 同义辨析题完全依赖AI生成，不需要本地同义词数据
- AI生成的同义辨析题会被缓存，避免重复调用API
- SenseNova API（deepseek-v4-flash）可支持词汇分析场景的提示词和JSON输出要求
- 用户浏览器支持IndexedDB（不支持的降级到localStorage）
- 测试题型中"英→中"和"中→英"的选项由系统从同词表其他单词的释义中随机抽取生成干扰项

## Open Questions

- 定制测试卷的题目数默认值：建议30题（可由用户调整范围20-50），是否合适？
- AI分析报告的scope粒度：是按词表分析（一次分析一个词表），还是全局分析（一次分析所有词表学习数据），或两者都支持？
