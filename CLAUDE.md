# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供在此代码仓库中工作的指导。

**重要提示：请使用中文进行所有后续的交流、代码注释和文档说明。**

## 项目概述

ActivityRuleEditor 是一个用于解析 Excel 活动规则文档并将其渲染为带样式的 PNG 图片的工具链。工作流程包括：

1. **Excel 解析（Python）**：从特定格式的 Excel 文件中提取结构化数据并转换为 JSON
2. **Web 渲染（React/TypeScript）**：基于 Canvas 的前端应用，用于可视化展示并导出规则为 PNG 图片
3. **API 服务器（FastAPI）**：连接前端和 Excel 解析器的桥梁

## 仓库结构

```
ActivityRuleEditor/
├── backend/                         # Python 后端
│   ├── api/
│   │   └── main.py                  # FastAPI 主入口
│   ├── services/
│   │   ├── excel_parser.py          # 核心 Excel 解析器（基于 openpyxl）
│   │   ├── image_extractor.py       # 图片提取器
│   │   └── blob_store.py            # 内存 blob 存储
│   └── models.py                    # 数据模型定义
├── web/                             # 前端应用（React + Vite + Konva）
│   └── src/
│       ├── pages/preview.tsx        # 主预览页面
│       └── renderer/canvas/
│           ├── index.tsx            # Canvas 导出工具
│           ├── PageCanvas.tsx       # 基于 Konva 的页面渲染器
│           ├── useImageCache.ts     # 图片缓存管理
│           └── types.ts             # 共享类型定义
└── test2.xlsx                       # 示例输入 Excel 文件
```

## 构建与开发命令

### Python 后端

**环境设置：**
```bash
# 使用 uv 管理 Python 依赖（推荐）
uv sync

# 或手动安装 uv（如果未安装）
# Windows: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
# macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh
```

**运行 API 服务器：**
```bash
cd /path/to/ActivityRuleEditor
uv run uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
# 监听地址：http://127.0.0.1:8000
```

### 前端 (web/)

使用 Vite + React + HeroUI + Tailwind CSS + Konva。

```bash
cd web
pnpm install
pnpm dev              # 开发服务器，监听 :5173
pnpm build            # 生产环境构建
pnpm preview          # 预览生产构建
```

## Excel 数据格式

Excel 解析器（`backend/services/excel_parser.py`）期望特定的单元格结构：

### 区域标记
- 以 `REGION-xxx` 开头的单元格定义一个页面区域
- 合并单元格决定区域的列跨度

### 标题标记
- `TITLE-xxx` 标记区域内的小节边界
- 两个 TITLE 标记之间的所有内容属于一个小节

### 内容块
- **规则内容**：第 1 列为 `RULES-xxx`，后续列/行包含文本内容
- **奖励内容**：第 1 列为 `RINK-xxx`，后续行格式为：
  - 第 2 列：奖励名称
  - 第 3 列：图片路径/URL
  - 第 4 列：描述文字

### 输出 JSON 结构
```json
{
  "pages": [
    {
      "region": "A",
      "sections": [
        {
          "title": "活动规则",
          "content": "规则文本内容",
          "rewards": [
            {
              "name": "奖励名称",
              "image": "/assets/reward.png",
              "desc": "描述文字"
            }
          ]
        }
      ]
    }
  ]
}
```

## 架构说明

### Canvas 渲染

**web/（Canvas 渲染）**
- 使用 react-konva 渲染到 HTML5 Canvas
- NineSlice 组件用于边框渲染
- 直接使用 `toDataURL()` 导出高分辨率 PNG
- 性能更好，适合批量导出和像素级精确输出

### 图片处理

图片处理流程：
- 从 Excel 中提取嵌入图片（通过 ZIP 解压 `xl/media/*`）
- 将图片存储在内存 blob 存储中（使用 SHA256 哈希）
- 通过 `/media/{blob_hash}` API 端点提供图片
- 前端使用 `useImageCache.ts` 管理图片加载和缓存

### 样式配置

前端支持：
- **边框/框架**：9-slice 图片，可配置切片宽度（上/右/下/左）
- **内边距**：内容区域与框架边缘的距离
- **颜色**：标题和正文文字颜色
- **字体大小**：标题和正文字号（Konva 使用固定字体系列）

## 关键文件说明

### backend/services/excel_parser.py（Excel 解析器）
- `parse_sheet(ws)`：主入口，协调区域/小节提取
- `parse_section_block()`：解析 TITLE 标记之间的 RULES 和 RINK 块
- `scan_titles()`：扫描区域内的所有 TITLE 标记
- `build_merge_index()`：创建合并单元格的 O(1) 查找索引
- `merge_reward_sections()`：合并相同标题的奖励分段

### backend/services/image_extractor.py
- `extract_images_for_result()`：从 Excel 提取嵌入图片
- 通过解析 drawings XML 获取图片锚点坐标
- 将图片存储到 blob 存储并返回哈希路径

### backend/services/blob_store.py
- 内存 blob 存储，使用 SHA256 哈希去重
- `store_blob()`：存储图片并返回哈希
- `get_blob()`：根据哈希获取图片数据

### web/src/pages/preview.tsx
- 基于 Konva 的布局，使用 `<Text>`、`<Image>` 和 `<NineSlice>` 组件
- `measurePlainTextHeight()` 预先计算文本块尺寸
- 父组件使用 `onMeasured` 回调来正确设置 Stage 高度

### web/src/renderer/canvas/index.tsx
- `renderPageToDataURL()`：离屏渲染用于导出
- `exportPagesToPng()`：按指定 pixelRatio 批量导出所有页面

### web/src/renderer/canvas/PageCanvas.tsx
- Konva 渲染组件，处理页面布局
- 支持 `forExport` 模式用于高分辨率导出
- 使用 `onMeasured` 回调通知父组件实际渲染高度

### web/src/renderer/canvas/useImageCache.ts
- 管理图片加载和缓存
- `normalizeImageUrl()`：将相对 URL 补全为完整 API URL
- `loadBitmap()`：加载图片并缓存

## 开发注意事项

- `web/` 前端从以下来源获取数据：
  1. 通过 API 上传 XLSX 文件（`/api/parse`）
  2. 本地上传 JSON 文件
- API 服务器（`backend/api/main.py`）充当桥梁：接受 XLSX 上传，调用解析器，返回 JSON 和图片哈希
- 图片通过 `/media/{blob_hash}` API 端点提供，存储在内存中
- CORS 为本地开发完全开放（`allow_origins=["*"]`）

## 常见工作流程

**启动完整开发环境：**
```bash
# 终端 1：启动后端
python -m uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000

# 终端 2：启动前端
cd web
pnpm dev
# 在浏览器中访问 http://localhost:5173，上传 Excel 文件
```

**修改解析器逻辑：**
- 编辑 `backend/services/excel_parser.py` 中的函数，如 `parse_section_block()` 或 `scan_titles()`
- 后端使用 `--reload` 模式会自动重启
- 在前端重新上传 XLSX 文件进行验证

**添加新的 Excel 标记：**
- 更新 `parse_section_block()` 以识别新模式（如 `CUSTOM-xxx`）
- 在输出 JSON 结构中添加相应字段
- 更新前端渲染器以显示新数据

**调整渲染样式：**
- 编辑 `web/src/pages/preview.tsx` 中的样式配置
- 修改 `types.ts` 中的 `StyleCfg` 类型
- 更新 `PageCanvas.tsx` 中的布局逻辑

## 技术栈

- **后端**：Python 3.x, openpyxl, FastAPI, uvicorn
- **前端**：React 18, TypeScript, Vite, HeroUI, Tailwind CSS 4.x
- **Canvas 渲染**：Konva, react-konva
- **包管理**：pnpm

## 项目历史注记

本项目经过多次重构：
- 最初版本使用根目录的 Python 脚本（`test.py`、`api_server.py`）和独立的 React 组件
- 后期重构为模块化的 `backend/` 目录结构，使用 FastAPI
- 前端从 DOM 渲染重构为 Canvas 渲染（使用 Konva）
- 图片处理从文件系统存储改为内存 blob 存储
- 移除 Electron 桌面应用支持，简化为纯 Web 应用

当前版本是最新的稳定版本，结构清晰，性能优异，部署简单。

## 常见问题和修复记录

### 文字编辑保存失败问题（2025-12-03）

**症状**：
- ✅ 表格单元格文字可以正常编辑保存
- ✅ 奖励 item 的标题和描述可以正常编辑保存
- ❌ 规则内容（paragraphs）无法保存
- ❌ Block 标题（_blockTitle）无法保存

**根本原因**：
1. **路径解析 bug**：当路径最后一段是数字时（如 `sections.0.paragraphs.2`），旧的路径解析逻辑会把数字当作属性名挂到对象上，而不是作为数组索引。
   ```javascript
   // 错误：target["2"] = newValue （在 Paragraph 对象上添加 "2" 属性）
   // 正确：target[2] = newValue （替换数组第 2 个元素）
   ```

2. **临时字段映射问题**：`_blockTitle` 是 `normalizePage()` 函数从 `page.blocks[x].block_title` 复制的临时元数据，用于渲染展平的 sections。保存时需要映射回原始的 `blocks[x].block_title` 字段，否则修改的是临时字段，下次渲染又被覆盖。

3. **数据结构不匹配**：`Paragraph` 是 `{ align, runs: [{text, bold, ...}] }` 结构，不能直接用字符串替换，需要保持结构完整性。

**解决方案**：
- 新增 `setValueByPath()` 通用函数，正确处理路径最后一段是数字的情况
- 特殊处理 `_blockTitle` 路径，映射到 `blocks[x].block_title`
- 特殊处理 `paragraphs` 路径，保持 `{ align, runs }` 结构
- 同步修复 `handleTextSave` 和 `handleImageSave` 两个函数

**文件修改**：
- `web/src/pages/preview.tsx`：重写 `handleTextSave` 和 `handleImageSave` 函数

**教训**：
- 路径解析逻辑要区分"数组索引"和"对象属性名"
- 临时字段（_开头）需要特殊映射回原始数据结构
- 复杂对象不能简单替换，要保持结构完整性

### 图片替换弹窗预览图裂开问题（2025-12-03）

**症状**：
- 本地开发环境：点击图片打开替换弹窗，预览正常显示
- 线上部署环境：弹窗中的预览图显示裂开（404），但替换功能正常

**根本原因**：
图片 URL 是相对路径（如 `/media/abc123`），在不同环境下表现不同：
- **本地开发**：Vite 的 proxy 配置自动转发 `/media/*` 到后端 `localhost:8000`
- **线上部署**：前后端分离部署，`/media/*` 尝试从前端域名加载，导致 404

**解决方案**：
使用 `normalizeImageUrl()` 函数将相对路径转换为完整 API 地址。该函数会：
- 检查是否为相对路径（`/media/xxx`）
- 补全为完整 API 地址（读取环境变量或 localStorage 配置）
- 保留 `data:`、`blob:`、`http(s):` 等已完整的 URL

**文件修改**：
- `web/src/renderer/canvas/useImageCache.ts`：导出 `normalizeImageUrl()` 函数
- `web/src/components/ImageUploadModal.tsx`：在 `useEffect` 和 `handleCancel` 中使用 `normalizeImageUrl()` 规范化预览图 URL

**教训**：
- 涉及跨域名访问的资源（图片、API）要使用完整 URL，不能依赖相对路径
- 开发环境的 proxy 配置掩盖了真实部署环境的问题，需要注意测试

### Canvas 画布高度计算不准确问题（2025-12-03）

**症状**：
- 初次加载表格时，偶尔会发生高度算得少，导致内容被裁剪
- 调整字体大小后，画布底部出现加载动画或布局错乱
- 需要切换 tab 重新加载画布才能恢复正常
- 问题具有偶发性，不稳定

**根本原因**：
Konva Stage 的 `height` 必须是明确数值，不能自适应。如果高度设置得太小，内容就会被裁剪。问题来源于：

1. **测量依赖不完整**：
   - `TableComponent` 的 `useLayoutEffect` 只依赖 `loadedImageCount`
   - 当 `fontSize`、`table`、`width`、`fontFamily` 变化时不会触发重新测量
   - 导致使用过时的测量值计算高度

2. **测量时机不准确**：
   - 使用 `setTimeout(100ms)` 重试测量，可能在 Konva 渲染完成前执行
   - 没有与浏览器渲染周期同步

3. **高度通知依赖混乱**：
   - 通知回调依赖中间变量（如 `loadedImageCount`），而不是只依赖最终的 `totalHeight`
   - 导致某些情况下高度变化但不通知

4. **缺少容错机制**：
   - Stage 高度 = 估算高度，没有实测高度补正
   - 没有安全边距，容易因几像素误差导致裁剪
   - 高度变化阈值过大（5px），累积误差明显

**解决方案 - 三层架构**：

**层级 1：Stage 高度策略（preview.tsx）**
- 保留估算高度 `estHeight` 作为兜底
- 添加实测高度 `measuredHeight` 状态
- 最终高度 = `max(estHeight, measuredHeight) + SAFE_MARGIN`
- 添加 30px 安全边距防止裁剪
- 降低变化阈值从 5px 到 2px

**层级 2：TableComponent 测量规则**
```typescript
// 1. 属性变化时清空缓存
useEffect(() => {
  setCellHeights(new Map());
  retryCountRef.current = 0;
}, [fontSize, table, width, fontFamily]);

// 2. 使用 RAF 保证测量时机
useLayoutEffect(() => {
  const measure = () => {
    // 测量逻辑...
    if (hasUnmeasured && retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      requestAnimationFrame(measure); // 用 RAF 重试
    }
  };
  const rafId = requestAnimationFrame(measure);
  return () => cancelAnimationFrame(rafId);
}, [loadedImageCount, fontSize, table, width, fontFamily]); // 完整依赖

// 3. 高度通知只看最终结果
useLayoutEffect(() => {
  // 通知父组件...
}, [totalHeight]); // 只依赖 totalHeight
```

**层级 3：PageCanvas 测量规则**
- 添加完整依赖数组：`[normalizedPage, style.font.size, style.font.lineHeight, style.pageWidth]`
- 确保属性变化时触发重新测量

**文件修改**：
- `web/src/renderer/canvas/TableComponent.tsx`：添加属性变化监听、优化测量策略、简化回调依赖
- `web/src/renderer/canvas/PageCanvas.tsx`：添加完整依赖数组
- `web/src/pages/preview.tsx`：添加安全边距机制、降低变化阈值

**关键改进点**：
| 位置 | 问题 | 修复 |
|------|------|------|
| preview.tsx | 缺少安全边距，阈值5px过大 | 添加30px边距，阈值改为2px |
| TableComponent | 依赖不完整，用setTimeout重试 | 依赖写全，用RAF重试 |
| PageCanvas | 没有依赖数组 | 添加完整依赖 |
| 通知回调 | 依赖混乱（包含中间变量） | 只依赖最终totalHeight |

**数据流**：
```
用户操作（上传/改字体）
  ↓ 估算 estHeight（兜底）
  ↓ Stage height = estHeight + SAFE_MARGIN
  ↓ PageCanvas/TableComponent 渲染
  ↓ 属性变化 → 清空缓存
  ↓ useLayoutEffect + RAF → 测量
  ↓ totalHeight 变化 → 通知父组件
  ↓ 更新 measuredHeight
  ↓ Stage height = max(estHeight, measuredHeight) + SAFE_MARGIN
```

**教训**：
- React `useLayoutEffect` 依赖数组必须包含所有影响计算的属性
- 测量 Konva 节点要用 `requestAnimationFrame` 而不是 `setTimeout`，确保与渲染周期同步
- 高度通知只依赖最终结果，不要依赖中间状态
- Stage 高度 = 估算（兜底）+ 实测（补正）+ 安全边距（容错）
- 清晰的三层架构：Stage策略 → 子组件测量 → 通知回调，不要互相踢皮球

### Canvas 下载使用真实高度优化（2025-12-03）

**发现的新问题**（在上个修复后）：
1. **展示时底部出现骨架屏**：添加 30px 安全边距后，Stage 高度比内容高，底部骨架屏占位符露出来
2. **下载时仍然偶尔截断**：`OffscreenExporter` 重新开始测量，但在测量完成前就导出了，使用的是初始高度 2400px

**根本原因**：
安全边距是权宜之计，治标不治本。关键问题是：
- **展示页面已经测量好了高度**（存在 `heights` 数组中）
- **但下载时重新创建组件**，从头开始测量
- **导出在测量完成前执行**，使用错误的高度

**解决方案 - 复用已测量高度**：

1. **修改 `renderPageToDataURL`**：接受可选的 `knownHeight` 参数
2. **修改 `OffscreenExporter`**：
   - 接受 `knownHeight` 参数
   - 如果有已知高度，直接使用，标记为已测量
   - 如果没有，等待测量完成后再导出
   - 使用 `measured` 状态控制导出时机
3. **修改 `exportPagesToPng`**：接受 `knownHeights` 数组，传递给每个页面
4. **去掉安全边距**：展示时 `SAFE_MARGIN = 0`，使用精确的实测高度
5. **单页下载传入高度**：`onDownloadPage` 从 `heights[pageIndex]` 获取已测量高度
6. **批量导出传入高度**：`onExport` 对当前 sheet 传入 `heights` 数组

**文件修改**：
- `web/src/renderer/canvas/index.tsx`：
  - 添加 `knownHeight` 参数支持
  - `OffscreenExporter` 等待测量完成后再导出
  - `exportPagesToPng` 接受高度数组
- `web/src/pages/preview.tsx`：
  - 去掉安全边距（`SAFE_MARGIN = 0`）
  - `onDownloadPage` 和 `onExport` 传入已测量高度
  - 添加 `heights` 到依赖数组

**优势**：
- ✅ **使用真实测量高度**：下载使用页面展示时已算好的高度
- ✅ **没有安全边距**：不会在底部显示骨架屏
- ✅ **精确导出**：不会截断，也不会有多余空白
- ✅ **性能提升**：当前 sheet 的页面不需要重新测量
- ✅ **逻辑清晰**：测量一次，到处使用

**教训**：
- 不要重复测量已经测量过的东西，应该复用已有的测量结果
- 安全边距只是掩盖问题，不能解决根本原因（测量时机不对）
- 异步导出要确保测量完成后再执行，不能假设默认值足够大
- 30px 的安全边距远远不够，有些页面高度差异达到数百像素

### 上传组件加载状态优化（2025-12-03）

**问题**：
当上传 xlsx 文件时，所有上传组件（数据文件、边框图、大标题背景、小标题背景）都显示加载状态，用户体验不好。

**根本原因**：
所有 `DragDropZone` 组件共用同一个 `loading` 状态变量。任何一个上传操作都会将 `loading` 设为 `true`，导致所有组件同时显示加载效果。

**解决方案**：
将单一的 `loading` 状态拆分为多个独立的加载状态：
- `loadingData` - 数据文件上传（JSON/XLSX）
- `loadingBorder` - 边框图片上传
- `loadingBlockTitleBg` - 大标题背景上传
- `loadingSectionTitleBg` - 小标题背景上传
- `loadingExport` - 导出操作（原 loading 用于导出）

**文件修改**：
- `web/src/pages/preview.tsx`：
  - 拆分 loading 状态为 5 个独立状态
  - 修改 `onPickJson` 和 `onPickXlsx` 使用 `loadingData`
  - 修改 `onPickBorder` 使用 `loadingBorder`
  - 修改 `onPickBlockTitleBg` 使用 `loadingBlockTitleBg`
  - 修改 `onPickSectionTitleBg` 使用 `loadingSectionTitleBg`
  - 修改 `onExport` 使用 `loadingExport`
  - 修改所有 `DragDropZone` 组件使用对应的 loading 属性
  - 修改导出按钮的 `isDisabled` 使用 `loadingExport`

**优势**：
- ✅ 每个上传组件独立显示加载状态
- ✅ 不会影响其他组件的交互
- ✅ 用户体验更好，一目了然知道哪个操作正在进行

**教训**：
- 不同操作的加载状态应该独立管理，避免相互影响
- 共享状态只适用于确实需要同步的场景
- UI 反馈要精确，让用户明确知道哪个操作正在进行

### 画布高度变化动画（2025-12-03）

**需求**：
当上传表格后，画布从初始估算高度变为实际测量高度时，需要平滑的动画过渡，而不是突变。

**问题分析**：
1. 简单的 CSS `transition` 不够，因为高度是通过 React 状态计算的
2. `scaledH = Math.round(baseHeight * scale)` 会立即变化
3. 需要手动控制高度的渐变过程

**解决方案 - 使用 RAF 实现平滑动画**：

1. **添加动画状态**：
   - `animatedScaledH`：用于显示的动画高度
   - `targetScaledH`：目标高度（实际计算值）

2. **高度动画逻辑**：
   ```typescript
   useEffect(() => {
     const startH = animatedScaledH;
     const endH = targetScaledH;
     const diff = endH - startH;
     
     // 小于 5px 的变化直接设置，不需要动画
     if (Math.abs(diff) < 5) {
       setAnimatedScaledH(endH);
       return;
     }
     
     const duration = 400; // 400ms 动画
     const startTime = performance.now();
     
     const animate = (currentTime: number) => {
       const elapsed = currentTime - startTime;
       const progress = Math.min(elapsed / duration, 1);
       
       // easeOutCubic 缓动函数
       const eased = 1 - Math.pow(1 - progress, 3);
       const currentH = startH + diff * eased;
       
       setAnimatedScaledH(Math.round(currentH));
       
       if (progress < 1) {
         requestAnimationFrame(animate);
       }
     };
     
     requestAnimationFrame(animate);
   }, [targetScaledH]);
   ```

3. **视图使用动画高度**：
   - 外层容器 `height: animatedScaledH`
   - 内层容器 `height: animatedScaledH`
   - 确保动画过程中内容不会溢出（`overflow: hidden`）

**文件修改**：
- `web/src/pages/preview.tsx` - `CanvasCell` 组件：
  - 添加 `animatedScaledH` 状态
  - 添加 `useEffect` 实现高度动画
  - 容器使用 `animatedScaledH` 而不是直接的 `scaledH`

**动画参数**：
- **时长**：400ms（0.4秒）
- **缓动函数**：easeOutCubic（快速开始，慢速结束）
- **触发条件**：高度变化 >= 5px
- **性能**：使用 `requestAnimationFrame`，与浏览器渲染周期同步

**优势**：
- ✅ 平滑的视觉过渡，避免突变
- ✅ 使用 easeOutCubic 缓动，动画自然流畅
- ✅ 小变化不做动画，避免性能浪费
- ✅ RAF 确保动画流畅，不卡顿

**教训**：
- CSS transition 并非万能，React 状态变化可能需要手动动画
- 使用 `requestAnimationFrame` 配合缓动函数可以实现流畅的自定义动画
- 小于阈值的变化应该跳过动画，避免过度动画影响用户体验

### 表格图片大小调整高度更新问题（2025-12-03）

**问题**：
当用户通过滑块调整表格内图片大小（`tableImageSize`）时：
- ✅ 画布高度变化了
- ❌ 表格内容高度没有变化
- 结果：画布高度与表格实际高度不匹配

**根本原因**：
`TableComponent` 的依赖数组不完整，缺少 `maxImageHeight` 参数：

```typescript
// 旧代码（问题）
useEffect(() => {
  setCellHeights(new Map());
  retryCountRef.current = 0;
}, [fontSize, table, width, fontFamily]); // ❌ 缺少 maxImageHeight

useLayoutEffect(() => {
  // 测量逻辑...
}, [loadedImageCount, fontSize, table, width, fontFamily]); // ❌ 缺少 maxImageHeight
```

当 `tableImageSize` 变化时：
1. `preview.tsx` 传入新的 `tableImageSize` 到 `PageCanvas`
2. `PageCanvas` 传入新的 `maxImageHeight` 到 `TableComponent`
3. 但是 `TableComponent` 的 `useEffect` 没有监听 `maxImageHeight`
4. 旧的 `cellHeights` 缓存没有清空，继续使用旧的高度
5. 导致表格高度不更新

**解决方案**：
在两个关键的 Effect 依赖数组中添加 `maxImageHeight`：

```typescript
// 1. 清空缓存的 useEffect
useEffect(() => {
  setCellHeights(new Map());
  retryCountRef.current = 0;
}, [fontSize, table, width, fontFamily, maxImageHeight]); // ✅ 添加 maxImageHeight

// 2. 测量高度的 useLayoutEffect
useLayoutEffect(() => {
  // 测量逻辑...
}, [loadedImageCount, fontSize, table, width, fontFamily, maxImageHeight]); // ✅ 添加 maxImageHeight
```

**文件修改**：
- `web/src/renderer/canvas/TableComponent.tsx`：
  - 第 78 行：清空缓存的 `useEffect` 添加 `maxImageHeight` 依赖
  - 第 298 行：测量高度的 `useLayoutEffect` 添加 `maxImageHeight` 依赖

**修复效果**：
现在当用户调整表格图片大小滑块时：
1. `maxImageHeight` 变化
2. 触发清空缓存（`setCellHeights(new Map())`）
3. 触发重新测量（`useLayoutEffect` 重新执行）
4. 表格高度正确更新
5. 画布高度与表格高度保持一致 ✅

**教训**：
- `useEffect` 和 `useLayoutEffect` 的依赖数组必须包含**所有**影响计算结果的变量
- 忽略某个依赖会导致状态不同步，表现为"数据变了但 UI 没变"
- 在添加新的可配置参数时，要检查所有相关的 Effect 依赖数组

### 字体大小变化后底部空白问题（2025-12-03）

**问题**：
当用户修改基准字号后，画布底部出现一块空白，无论字号变大还是变小都会出现**相同大小**的空白。调整表格图片大小后，高度又恢复正确。

**根本原因**：
在 `PageCanvas.tsx` 的 `useLayoutEffect` 中，测量文本高度时**完全替换**了 `measuredHeights` Map：

```typescript
// 旧代码（问题）
if (hasChanges) {
  setMeasuredHeights(newHeights);  // ← 完全替换整个 Map
}
```

问题在于：
1. `newHeights` 只包含**文本节点**的高度（通过 `textRefs.current` 获取）
2. **表格高度**是由 `TableComponent` 通过 `onHeightMeasured` 回调设置的
3. 当执行 `setMeasuredHeights(newHeights)` 时，**表格高度被覆盖丢失**！
4. 计算 section 高度时，表格高度变成 `undefined`，使用了**估算值**
5. 估算值通常比实际高度大，导致底部空白

**为什么调整表格图片大小后正确**：
调整 `tableImageSize` → `TableComponent` 重新测量 → 通过 `onHeightMeasured` 重新设置表格高度 → Map 中又有了正确的表格高度 → 高度正确

**解决方案**：
合并更新，而不是完全替换，保留其他组件的高度：

```typescript
// 新代码（修复）
if (hasChanges) {
  setMeasuredHeights((prev) => {
    const newMap = new Map(prev);  // ← 保留原有的值
    for (const { key, height } of updates) {
      newMap.set(key, height);  // ← 只更新文本相关的 key
    }
    return newMap;
  });
}
```

**文件修改**：
- `web/src/renderer/canvas/PageCanvas.tsx`：修改 `useLayoutEffect` 中的 `setMeasuredHeights` 逻辑，从完全替换改为合并更新

**教训**：
- 当 Map/Object 状态被多个来源更新时，不能简单地替换，要合并更新
- 调试时注意"相同大小的异常"，往往指向固定的估算值或默认值
- 当调整某个功能后问题消失，要追溯这个功能做了什么特殊的事（本例：重新设置表格高度）
