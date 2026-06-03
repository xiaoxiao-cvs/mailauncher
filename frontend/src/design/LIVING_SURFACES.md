# 生息(Living Surfaces)设计铁律

> 适用范围:mailauncher 前端全部 UI(分支 `revival/frontend-rewrite`)。
> 事实源:`frontend/src/design/tokens.css`、`frontend/src/design/motion.ts`、`frontend/src/components/ls/*`、`frontend/src/pages/home/HomeView.tsx`(参考样板)。
> 本文档为强制规范。每个转换 agent 把任意页面/组件迁移到生息风格时,必须逐条照做。出现冲突时,以事实源代码为准,本文档为其权威解读。

---

## 一、核心原则(不可妥协)

1. **暖 · 哑光 · 零玻璃。** 背景是暖中性纸色(`--ls-bg #f3efe9` / 暗 `#17140f`),不是冷灰、不是纯白、不是纯黑。层级感**只**靠「柔和扩散投影 + 发丝边 + 纸面顶高光」三件套表达,**绝不**用任何模糊/玻璃。
2. **发丝线分隔。** 区块、分组、表格行之间用 `1px solid var(--ls-hairline)` 的极淡发丝线划界,而非粗边框或重底色块。
3. **柔扩散阴影。** 阴影只用两档 token:`--ls-shadow-soft`(常态)与 `--ls-shadow-lift`(浮起/激活)。它们是低不透明度、大模糊、负扩散的「散开」式投影,营造纸张悬浮感,**禁止**自造硬阴影或描边光晕(状态点的 ring 除外)。
4. **生命色克制点缀。** `--ls-life`(绿)是「运行/活着/正向」的唯一信号色,只在进度、运行态、正向动作、活跃数据上**点状**使用;它是页面里最克制的一抹绿,不是主题色,**不**拿来刷大面积背景。语义梯度:正常=life、警示=`--ls-warn`、危险=`--ls-danger`。
5. **数字一律 tabular-nums。** 任何会刷新/轮询/跳动的数值(读数、计数、百分比、速率、时长、金额)必须挂 `.ls-num`(等宽数字),杜绝刷新抖动。
6. **HyperOS「快抛快收」弹簧手感。** 所有过渡用 `motion.ts` 的弹簧 token,不用线性/缓动 duration(少数填充画出动画除外,见动效规范)。感知时长 0.22~0.35s、极低过冲,脆而不晃。
7. **安静优先。** 不做循环呼吸/常驻动画。动效只在「交互发生」与「数据入场」时出现一次,随即归于静止。

---

## 二、Token 速查(逐条来自 `tokens.css`,明/暗双值)

### 背景与面(由底到高的层级)
| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--ls-bg` | `#f3efe9` | `#17140f` | 页面最底背景(`body` 已设),也是凹陷轨道之外的底 |
| `--ls-bg-2` | `#ece7df` | `#120f0b` | 次级底:凹陷面 `.ls-inset` 背景、Meter/进度轨道底、`.ls-item:hover` 底 |
| `--ls-surface` | `#fbf8f3` | `#211c16` | 标准面:`.ls-panel` / `.ls-card` 的卡面 |
| `--ls-surface-hi` | `#ffffff` | `#2a241d` | 最高面:分段滑块、IconMenu 展开面、solid 按钮、悬浮 chip |
| `--ls-top-hi` | `rgba(255,255,255,.7)` | `rgba(255,255,255,.04)` | 纸面顶高光(`inset 0 1px 0`),给面顶一道光使其「鼓」起来 |

### 墨色(文字层级)
| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--ls-ink` | `#2b2722` | `#efe8dd` | 主文字、标题、主数值 |
| `--ls-ink-soft` | `#79716a` | `#a99e90` | 次要文字:标签、副文案、读数文字 |
| `--ls-ink-faint` | `#a89f95` | `#6e655a` | 最弱:元信息、占位、单位、辅助百分比、停止态点 |
| `--ls-hairline` | `rgba(43,39,34,.08)` | `rgba(239,232,221,.09)` | 发丝分隔线、卡片/控件 1px 边框、环底轨 |

### 语义色
| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--ls-life` | `#45a079` | `#5fbf92` | 生命/运行/正向/活跃数据;进度填充、运行点、life 按钮、波形下行 |
| `--ls-life-soft` | `rgba(69,160,121,.16)` | `rgba(95,191,146,.18)` | 生命色低浓度底:徽标药丸底、状态点光环 |
| `--ls-warn` | `#cf9442` | `#e0a65a` | 警示:planning/规划态等 |
| `--ls-warn-soft` | `rgba(207,148,66,.16)` | `rgba(224,166,90,.18)` | 警示色低浓度底:warn 药丸底、校验提示底 |
| `--ls-danger` | `#c5563e` | `#d9694f` | 危险/失败/破坏性动作(删除菜单项、failed 队列) |
| `--ls-danger-soft` | `rgba(197,86,62,.16)` | `rgba(217,105,79,.18)` | 危险色低浓度底:danger 药丸底、校验失败外环 |

### 阴影 / 圆角 / 数字工具
| Token | 值要点 | 用途 |
|---|---|---|
| `--ls-shadow-soft` | 1px 近影 + 大模糊负扩散远影,极低不透明度 | 常态卡/面/控件投影 |
| `--ls-shadow-lift` | 比 soft 更深更远 | 浮起/激活(IconMenu 展开面) |
| `--ls-r-panel` | `22px` | 大面板圆角(`.ls-panel`) |
| `--ls-r-card` | `16px` | 卡片/凹陷面圆角(`.ls-card` / `.ls-inset`) |
| `--ls-r-control` | `12px` | 控件圆角(按钮、分段轨道) |

### 锁定工具类(`tokens.css` 内,直接 className 用)
- `.ls-panel`:大面板(surface 背景 + 发丝边 + soft 影 + 顶高光 + 22px 圆角)。
- `.ls-card`:卡片(同上,16px 圆角)。优先用 `<Card>` 组件而非裸类。
- `.ls-inset`:凹陷面(`--ls-bg-2` 背景 + 发丝边 + 16px 圆角,**无投影**),用于「嵌进面里」的内格。
- `.ls-item` + `.ls-item:hover`:可悬停行,hover 时背景过渡到 `--ls-bg-2`(150ms ease,这是全库唯一允许的非弹簧微过渡,因属 CSS hover 反馈)。
- `.ls-num`:等宽数字(`tabular-nums` + `tnum`)。所有数值必挂。

> 主题切换:`body` 已对 `background`/`color` 做 0.5s `cubic-bezier(.16,1,.3,1)` 过渡,并在 `prefers-reduced-motion` 下关闭。暗色由 `.dark` 类覆盖(tokens.css 已对齐 tailwind `darkMode:['class']` 与 ThemeProvider 的 `classList`),**写组件时一律用 `var(--ls-*)`,自动适配明暗,严禁写死任一套色值。**

---

## 三、组件用法(props 与组合范式,全部来自 `components/ls`)

### 容器层

**`<Surface variant>`** — 哑光面基元。`variant: "panel" | "card" | "inset"`(默认 `panel`),映射到三个锁定类。需要「面」但不需要 Card 的入场/悬停语义时用它(如自定义内格、侧栏面)。透传 `className` 与原生 div 属性。

**`<Card>`** — 数据看板的标准卡片(`.ls-card` + `p-4`)。
- 自带:`whileHover={{ y: -2 }}`(微抬跟手)+ `springTap`;`variants=cardChild`(`hidden: {opacity:0,y:12}` → `show` 用 `springSettle`)。
- **组合范式(看板交错入场):** 父级 `motion.div` 设 `initial="hidden" animate="show"` 与 `variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.05, delayChildren:0.04 } } }}`,子 `<Card>` 不必再写 initial/animate,自动被父级编排逐张淡入上移(见 HomeView 第 727-735 行)。
- 透传 `HTMLMotionProps<"div">` 与 `className`(常用栅格类如 `col-span-12 lg:col-span-4`)。

### 数据展示层

**`<Stat label value sub? className?>`** — 卡内紧凑读数(标签 + 大号等宽值 + 可选副文案),内部就是一个 `<Card>`。KPI 网格、小指标用。`value`/`sub` 必须传入**已格式化的字符串**。

**`<Readout label value>`** — 凹陷面里的「标签 + 等宽值」小卡(基于 `<Surface variant="inset">`)。比 Stat 更轻,用于嵌入式读数(运行时长、单条内存等)。

**`<Meter label used total valueText>`** — 占用条(标签 + 右侧读数 + 生命色进度条)。
- 百分比由 `used/total` 算并钳到 0~100;`total<=0` 时为 0%。
- `valueText` 是右上角**已格式化**读数(如 `"6.2 GB / 16.0 GB"`),组件不绑定单位 → 内存/磁盘/任意比率通用。
- 填充入场:`width 0→pct%`,`springSettle` + `delay:0.25`。

**`<Ring value size? stroke? centerLabel?>`** — 生命色描边进度环 + 中心等宽百分数。
- `value` 0~100;默认 `size=60 stroke=6`;`centerLabel` 省略时显示 `${value}%`(传入则可显示负载值等)。
- 入场:弧长 `springSettle` + `delay:0.2` 从空环画到目标。

**`<Sparkline values className?>`** — 迷你折线图(生命色描边 + 渐隐填充),随容器宽拉伸。
- `values` 至少两点(HomeView 在 `history.length>1` 时才渲染,见下「反模式」)。
- `className` 默认 `h-16 w-full`。渐变 id 用 `useId` 唯一化。

**`<MirrorGraph top bottom topColor? bottomColor? className?>`** — 上下镜像波形,共享峰值标尺,幅度可直接对比。
- `top` 朝上填充(默认生命色)、`bottom` 朝下(默认 `--ls-ink-soft`)。典型:网络下/上行。
- 默认 `className="h-20 w-full"`;描边 `non-scaling-stroke` 恒定粗细。
- **范式:** 外层 `relative`,可在 `absolute inset-0` 居中叠一个分流图标 chip(见 HomeView 第 297-313 行)。

### 控件层

**`<SegmentControl options value onChange>`** — 凹陷轨道里的互斥分段,选中项用 `layout` 高面滑块跟随。
- 泛型 `T extends string`,`options: readonly T[]`,`onChange(value:T)` 类型安全。
- 滑块:`--ls-surface-hi` 背景 + soft 影,`layoutId` 用 `useId` 唯一化,`springSettle` 跟随。
- 用于:时间窗(`24h/7d/30d`)、Tab 切换(系统/网络)、任意 2~4 项互斥选择。**禁用**裸 shadcn Tabs / 单选按钮组替代。

**`<TactileButton variant>`** — 通用跟手按压按钮。
- `variant: "ghost" | "solid" | "life"`(默认 `ghost`)。ghost=透明无影;solid=`--ls-surface-hi`+soft 影;life=绿底白字,**仅用于「启动」类正向动作**。
- 自带 `whileTap={{scale:0.95}}` + `whileHover={{y:-1}}` + `springTap`。透传 `HTMLMotionProps<"button">`。color/背景全来自 token。**所有可点击动作按钮一律用它,禁用裸 `<button>` 或 shadcn Button。**

**`<IconMenu items align?>`** — 招牌交互:`···` chip 非线性形变长成菜单(`springMorph`)。
- `items: IconMenuItem[]`(`{ icon: LucideIcon, label, danger?, onSelect? }`);`align: "left"|"right"`(默认 right)。
- `danger:true` 的项用 `--ls-danger`。这是「卡片右上角更多操作」的标准件,**禁用** shadcn DropdownMenu 替代。

**`<StatusDot running>`** — 运行态点。`running:true` → 生命色 + `--ls-life-soft` 光环;`false` → `--ls-ink-faint` 无环。切换时一次性 `springTap` 弹入,**刻意不做循环呼吸**(保持安静)。

> 图标:**新建 bespoke 组件统一用 `lucide-react`**(见 HomeView / IconMenu),尺寸用 px 数字(`size={16}` 等),颜色用 `style={{ color: "var(--ls-*)" }}`。**例外:已有用 Iconify 的图标契约(如侧栏 `ph:*-thin`)予以保留,只把颜色/尺寸改走 token,不为统一而强行替换为 lucide(替换需单独立项改 constants 图标映射,属越界)。**

---

## 四、动效规范(`motion.ts` 五枚 spring + 入场/AnimatePresence/layout)

### 五枚 spring token 的用途绑定
| Token | duration / bounce | 用在哪 |
|---|---|---|
| `springMorph` | 0.35 / 0.14 | **招牌形变**:图标 ⇄ 菜单(IconMenu 面的 width/height/radius)。仅此类「一物变另一物」用。 |
| `springTap` | 0.22 / 0 | **按压回弹**:`whileTap`/`whileHover` 的脆回弹(Card 微抬、TactileButton、StatusDot 弹入)。零过冲。 |
| `springSettle` | 0.26 / 0.1 | **落定**:列表/菜单项归位、分段滑块跟随、Meter/Ring 填充、Card 入场子变体。最常用的「东西到位」。 |
| `springPop` | 0.32 / 0.2 | **轻回弹归位**:小元素复位的一点点 overshoot(IconMenu 的 `···` 关闭后弹回)。 |
| `springSoft` | 0.34 / 0.12 | **较重浮起/位移**:整页/大块入场(HomeView 根容器淡入上移)。 |

**选型口诀:** 整页入场→`springSoft`;卡片群落定→`springSettle`(配父级 stagger);点击/悬停→`springTap`;形变→`springMorph`;归位小回弹→`springPop`。

### 入场动画规范
- **整页根容器**:`initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={springSoft}`(HomeView 第 704-708 行)。
- **卡片群交错**:父 `motion.div` 用 `variants` + `staggerChildren:0.05, delayChildren:0.04`,子 `<Card>` 复用自带 `cardChild` 变体(见三·Card)。新页迁移**优先复用这套 stagger 编排**,不要每张卡各写一套 initial/animate。
- **数据填充(进度/环/折线)**:由组件自身负责,调用方只管传值。Meter/Ring 用 `springSettle` + 短 `delay`;Sparkline 折线 `pathLength 0→1` 用 `duration:0.9 ease:[0.16,1,0.3,1]`、填充 `opacity` `duration:0.5`(这是**唯一允许的非弹簧入场**,因为是「画出/淡入」而非「物体运动」)。

### AnimatePresence 用法(Tab/视图切换)
- 切换两块互斥内容(如系统/网络 Tab)用 `<AnimatePresence mode="wait" initial={false}>`(HomeView 第 218 行)。
  - `mode="wait"`:旧的先退场、新的再进场,不重叠。
  - `initial={false}`:**首帧不播入场**,避免页面刚加载就闪一下;只有后续切换才动。
- 每个分支 `motion.div` 必须有稳定 `key`,并写 `initial`/`animate`/`exit`(参考:`initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.2, ease:[0.22,1,0.36,1]}}`)。
- 切换区给固定 `min-h`(如 `min-h-[156px]`)+ 垂直居中,**防止内容高度差导致跳动**(HomeView 第 217 行)。

### layout 动画用法
- 「滑块/指示器在选项间平移」用 `layout` 系:`<motion.span layoutId={唯一id}>` + `springSettle`(SegmentControl 即此模式)。`layoutId` 必须 `useId` 唯一化,防同页多控件抢动画。
- 不要用 `left`/`margin` 手动算滑块位置;交给 `layout`。

### 通用纪律
- 所有 SVG `<defs>` 渐变 id、`layoutId` 一律 `React.useId()` 唯一化(Sparkline/MirrorGraph/SegmentControl/IconMenu 均已如此),严禁硬编码字符串 id。
- 不写循环/无限动画;动效在交互或入场后归静。
- 尊重 `prefers-reduced-motion`(token 层已对 body 过渡做了降级,新增大动效时同理考虑)。

---

## 五、反模式黑名单(出现即判编码违纪,必须改)

1. **禁止毛玻璃。** 任何 `backdrop-blur` / `backdrop-filter` / 半透明玻璃面 / `bg-white/30` 之类。层级只用 `--ls-surface*` 实色面 + 阴影 + 发丝边。
2. **禁止蓝紫渐变与光斑。** 不准蓝紫/霓虹渐变背景、径向光晕、装饰性 blob/光斑、`bg-gradient-to-*` 彩色渐变作背景。生息只有暖中性面 + 克制生命色。
3. **禁止裸 shadcn 观感。** 不直接堆 shadcn `Card/Button/Dialog/Dropdown/Tabs/Badge` 的默认样式。一律换成 ls 组件(见六·映射表)。
4. **禁止任何 emoji 与彩色圆点符号。** 代码/注释/文案/commit 全程零 emoji(含 ✅❌🔴 等);严重度/状态用纯文本(Critical/PASS/FAIL、运行中/已停止)或 ASCII。状态可视化用 `<StatusDot>` / 语义色点,不用 emoji。
5. **禁止裸 Tailwind 色。** 不准 `text-blue-500` / `bg-indigo-600` / `border-gray-200` / `text-red-500` 等调色板裸色。颜色**只**能 `style={{ color: "var(--ls-*)" }}` 或经 token 的工具类。结构性中性类(`text-sm`、`font-semibold`、`flex`、`grid`、间距、`truncate`)可用 Tailwind;**颜色不行**。
6. **禁止 `?? 0` / `|| "Unknown"` 在业务层掩盖空值。** 真·无数据态用显式占位(HomeView 用 `PLACEHOLDER = "—"`,数值用受控 `num()` 仅挡 NaN/Infinity 并在注释说明这是无数据合理呈现,而非吞业务异常)。迁移时:有数据渲染真值、无数据渲染 `—` 占位或专门空态文案(如「暂无模型调用记录」),**不要**用兜底默认值伪装成有数据。
7. **禁止给会变的数值不挂 `.ls-num`。** 任何刷新/轮询数值漏挂等宽即判违规。
8. **禁止重影/重边框/硬阴影。** 不自造 `shadow-lg`/`shadow-xl`/`ring-2 ring-blue` 等;阴影只用两枚 token,边框只用 `--ls-hairline`。
9. **禁止数据不足仍硬画图表。** 序列 `length<2` 不渲染 Sparkline/MirrorGraph(HomeView 在 `history.length>1` 才渲染),改显占位/汇总文案,**不编造序列**。
10. **禁止循环呼吸/常驻动画**装饰静态信息(违背「安静」)。

---

## 六、旧 → 新 映射表

| 旧写法(典型 shadcn / 自由 Tailwind) | 生息写法 |
|---|---|
| `<div className="bg-white/30 backdrop-blur-md rounded-xl shadow-lg">` 毛玻璃卡 | `<Card>` 或 `<Surface variant="card">`(实色面 + 发丝边 + token 阴影) |
| 嵌套小格 `<div className="bg-gray-100 rounded-lg">` | `<Surface variant="inset">` / `<Readout>` / `.ls-inset` |
| shadcn `<Button>` 主操作 | `<TactileButton variant="solid">`;正向「启动」类 → `variant="life"`;弱操作 → `variant="ghost"` |
| 蓝紫主按钮 `bg-indigo-600 text-white` | `<TactileButton variant="life">`(绿生命色,且仅限正向动作)或 `variant="solid"` 中性主按钮 |
| shadcn `<Tabs>` / 单选按钮组 | `<SegmentControl options value onChange>` |
| shadcn `<DropdownMenu>`(卡片右上「更多」) | `<IconMenu items align="right">`,危险项 `danger:true` |
| shadcn `<Dialog>` 默认遮罩 + 卡 | 遮罩:**不**用 `backdrop-blur`,用半透明纯暗遮罩;对话面用 `.ls-panel` / `<Surface variant="panel">`;进出场用 `AnimatePresence`(遮罩 fade、面 `springSoft`/`springMorph` 升起);关闭按钮等用 `<TactileButton>` |
| shadcn `<Badge>` / 彩色 pill | 药丸:`rounded-full px-2 py-0.5 text-[11px]` + `style={{ background:"var(--ls-life-soft)", color:"var(--ls-life)" }}`(HomeView「回复」徽标第 454-459 行);非生命语义换对应 warn/danger token |
| 进度条 `<Progress>` / `bg-blue-500` 填充 | `<Meter label used total valueText>`(生命色填充 + 等宽读数);圆形 → `<Ring value>` |
| 折线/趋势图(重型图表库) | 单序列 → `<Sparkline values>`;双向对比 → `<MirrorGraph top bottom>` |
| 在线状态 `🟢`/`<span className="bg-green-500 rounded-full">` | `<StatusDot running>` |
| `text-gray-500` / `text-muted-foreground` | `style={{ color:"var(--ls-ink-soft)" }}`(次要)或 `var(--ls-ink-faint)`(最弱) |
| `text-red-500` 错误、`text-yellow-500` 警告 | `style={{ color:"var(--ls-danger)" }}` / `var(--ls-warn)` |
| 计数/金额 `<span>{n}</span>` | `<span className="ls-num">…</span>`(或用 `<Stat>`/`<Readout>`) |
| `value ?? 0` / `name || "Unknown"` 渲染 | 显式三元:`data ? fmt(data.x) : "—"`;数值经受控 `num()` 仅挡非有限值并注释说明 |
| 整块内容 `initial/animate` 各写一套 | 根容器 `springSoft` 入场 + 卡群父级 `staggerChildren` + 子 `<Card>` 复用 `cardChild` |
| Tab 切换直接条件渲染(无过渡/会跳动) | `<AnimatePresence mode="wait" initial={false}>` + 固定 `min-h` 容器 + 每分支稳定 `key` |
| 硬编码渐变/`layoutId` 字符串 | `React.useId()` 唯一化 |

---

## 七、迁移自检清单(每个 agent 收尾必过)

- [ ] 零 `backdrop-blur` / 玻璃 / 彩色渐变背景 / 光斑。
- [ ] 零裸 Tailwind 颜色类(蓝紫红黄灰),颜色全走 `var(--ls-*)`。
- [ ] 零 emoji / 彩色圆点符号(代码 + 文案 + 注释)。
- [ ] 容器→`Card`/`Surface`;按钮→`TactileButton`;分段→`SegmentControl`;更多菜单→`IconMenu`;状态→`StatusDot`;进度→`Meter`/`Ring`;图→`Sparkline`/`MirrorGraph`;读数→`Stat`/`Readout`。
- [ ] 所有会变数值挂 `.ls-num`。
- [ ] 阴影仅 `--ls-shadow-soft`/`-lift`,边框仅 `--ls-hairline`。
- [ ] 动效全用 `motion.ts` 五枚 spring(画出/淡入类除外);Tab 切换用 `AnimatePresence mode="wait" initial={false}` + 固定高;`layoutId`/渐变 id 用 `useId`。
- [ ] 无数据用显式 `—`/空态文案,**无** `?? 0` / `|| "Unknown"` 掩盖。
- [ ] 明暗双主题均靠 `var(--ls-*)` 自动适配,无写死色值。
- [ ] 改完跑 `npx tsc --noEmit` 与 lint,零新增错误。

---

### 事实源文件清单(绝对路径)
- `D:\Repo\mailauncher\frontend\src\design\tokens.css`
- `D:\Repo\mailauncher\frontend\src\design\motion.ts`
- `D:\Repo\mailauncher\frontend\src\components\ls\` (Surface / Card / Stat / Readout / Meter / Ring / Sparkline / MirrorGraph / SegmentControl / TactileButton / IconMenu / StatusDot / index.ts)
- `D:\Repo\mailauncher\frontend\src\pages\home\HomeView.tsx`(组合参考样板)

