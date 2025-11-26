import type { TableData } from "./types";
import type Konva from "konva";

import { useRef, useLayoutEffect, useState, useEffect, useMemo } from "react";
import { Group, Rect, Text, Line, Image as KImage } from "react-konva";

import { loadBitmap } from "./useImageCache";

export function TableComponent({
  table,
  x,
  y,
  width,
  fontSize,
  fontFamily,
  titleColor,
  contentColor,
  direction = "ltr",
  maxImageHeight = 120,
  onHeightMeasured,
  onTextClick,
  onImageClick,
  forExport = false,
}: {
  table: TableData;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  titleColor: string;
  contentColor: string;
  direction?: "rtl" | "ltr";
  maxImageHeight?: number;
  onHeightMeasured?: (height: number) => void;
  onTextClick?: (rowIdx: number, colIdx: number, value: string) => void;
  onImageClick?: (rowIdx: number, colIdx: number, currentImage?: string) => void;
  forExport?: boolean;
}) {
  // 存储每个单元格文本节点的高度
  const [cellHeights, setCellHeights] = useState<Map<string, number>>(
    new Map(),
  );
  const textRefs = useRef<Map<string, Konva.Text>>(new Map());
  const imageRefs = useRef<Map<string, Konva.Image>>(new Map());
  
  // 悬浮状态管理 - 存储当前悬浮的单元格 {rowIdx, colIdx}
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);

  // 存储已加载的图片
  const [loadedImages, setLoadedImages] = useState<
    Map<string, CanvasImageSource>
  >(new Map());

  // 重试计数器，避免无限重试
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // 加载所有表格中的图片
  useEffect(() => {
    const loadImages = async () => {
      const newImages = new Map<string, CanvasImageSource>();

      for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
        const row = table.rows[rowIdx];

        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cell = row[colIdx];

          if (cell.is_image && cell.image) {
            const key = `${rowIdx}-${colIdx}`;

            // 处理新旧两种格式：字符串 URL 或 ImageMeta 对象（与奖励图片一致）
            const imageUrl =
              typeof cell.image === "string" ? cell.image : cell.image?.url;

            if (imageUrl) {
              const bmp = await loadBitmap(imageUrl);

              if (bmp) {
                newImages.set(key, bmp as any);
              }
            }
          }
        }
      }

      setLoadedImages(newImages);
    };

    loadImages();
  }, [table]);

  // 计算列数：从第一行推断总列数（考虑 colspan）
  let colCount = 0;
  if (table.rows.length > 0) {
    const firstRow = table.rows[0];
    for (const cell of firstRow) {
      colCount += cell.colspan || 1;
    }
  }
  
  const colWidth = width / colCount;
  const cellPadding = 8;
  const minRowHeight = fontSize * 2;
  const textAlign = direction === "rtl" ? "right" : "left";
  const cornerRadius = 8; // 圆角半径
  
  // 预先计算单元格布局（使用 useMemo 避免每次渲染都重新计算）
  const cellLayout = useMemo(() => {
    const layout: Array<{
      rowIdx: number;
      cellIdx: number;
      colIdx: number;
      rowspan: number;
      colspan: number;
    }> = [];
    
    // 构建单元格占用矩阵
    const matrix: boolean[][] = [];
    for (let i = 0; i < table.rows.length; i++) {
      matrix[i] = new Array(colCount).fill(false);
    }
    
    // 遍历所有行和单元格，计算每个单元格的实际列位置
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      let colIdx = 0;
      
      for (let cellIdx = 0; cellIdx < row.length; cellIdx++) {
        const cell = row[cellIdx];
        const rowspan = cell.rowspan || 1;
        const colspan = cell.colspan || 1;
        
        // 找到第一个未被占用的列
        while (colIdx < colCount && matrix[rowIdx][colIdx]) {
          colIdx++;
        }
        
        // 如果列索引超出范围，跳过
        if (colIdx >= colCount) {
          continue;
        }
        
        // 记录单元格位置
        layout.push({
          rowIdx,
          cellIdx,
          colIdx,
          rowspan,
          colspan,
        });
        
        // 标记该单元格占用的所有位置
        for (let r = rowIdx; r < rowIdx + rowspan && r < table.rows.length; r++) {
          for (let c = colIdx; c < colIdx + colspan && c < colCount; c++) {
            matrix[r][c] = true;
          }
        }
        
        // 移动到下一列
        colIdx += colspan;
      }
    }
    
    return { layout, matrix };
  }, [table.rows, colCount]);

  // 测量所有单元格的实际高度
  useLayoutEffect(() => {
    const newHeights = new Map<string, number>();
    let hasChanges = false;
    let hasUnmeasured = false;

    // 测量文本节点
    textRefs.current.forEach((textNode, key) => {
      if (textNode) {
        const height = textNode.height();

        if (height > 0) {
          newHeights.set(key, height);
          if (!cellHeights.has(key) || cellHeights.get(key) !== height) {
            hasChanges = true;
          }
        } else {
          // 高度为 0，标记为未完成测量
          hasUnmeasured = true;
        }
      }
    });

    // 测量图片节点
    imageRefs.current.forEach((imageNode, key) => {
      if (imageNode) {
        const height = imageNode.height();

        if (height > 0) {
          newHeights.set(key, height);
          if (!cellHeights.has(key) || cellHeights.get(key) !== height) {
            hasChanges = true;
          }
        } else {
          hasUnmeasured = true;
        }
      }
    });

    if (hasChanges) {
      setCellHeights(newHeights);
      // 重置重试计数器
      retryCountRef.current = 0;
    }

    // 如果有未测量的节点，且未超过最大重试次数，则重试
    if (hasUnmeasured && retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      const timer = setTimeout(() => {
        setCellHeights((prev) => new Map(prev)); // 强制触发重新渲染
      }, 100);

      return () => clearTimeout(timer);
    }
  });

  // 移除了表头高度计算（没有表头概念了）

  // 计算所有数据行的统一高度（找出整个表格中最高的单元格）
  const getUnifiedDataRowHeight = () => {
    let maxHeight = minRowHeight;
    let hasMeasuredCells = false;

    // 遍历所有数据行的所有单元格，找出最大高度
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const key = `${rowIdx}-${colIdx}`;
        const cellHeight = cellHeights.get(key);

        if (cellHeight && cellHeight > 0) {
          hasMeasuredCells = true;
          if (cellHeight > maxHeight) {
            maxHeight = cellHeight;
          }
        }
      }
    }

    // 如果还没有测量到任何单元格，使用更合理的初始估算
    if (!hasMeasuredCells) {
      // 检查是否有图片单元格
      let hasImages = false;
      for (const row of table.rows) {
        for (const cell of row) {
          if (cell.is_image) {
            hasImages = true;
            break;
          }
        }
        if (hasImages) break;
      }
      
      // 如果有图片，使用图片最大高度估算
      // 否则使用文本估算
      maxHeight = hasImages ? maxImageHeight : minRowHeight;
    }

    // 加上上下 padding
    return maxHeight + cellPadding * 2;
  };

  const unifiedDataRowHeight = getUnifiedDataRowHeight(); // 所有行使用同一个统一高度

  // 计算每行的 Y 坐标（所有行使用统一高度，从 0 开始）
  const rowPositions: Array<{ y: number; height: number }> = [];
  let currentY = 0;

  for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
    rowPositions.push({ y: currentY, height: unifiedDataRowHeight });
    currentY += unifiedDataRowHeight;
  }

  const totalHeight = currentY;

  // 通知父组件总高度 - 只依赖 totalHeight，确保每次高度变化都会通知
  const onHeightMeasuredRef = useRef(onHeightMeasured);

  useLayoutEffect(() => {
    onHeightMeasuredRef.current = onHeightMeasured;
  }, [onHeightMeasured]);

  useLayoutEffect(() => {
    if (onHeightMeasuredRef.current && totalHeight > 0) {
      onHeightMeasuredRef.current(totalHeight);
    }
  }, [totalHeight]);

  return (
    <Group x={x} y={y}>
      {/* 表格行（所有行都是数据行，没有表头） */}
      {table.rows.map((row, rowIdx) => {
        const pos = rowPositions[rowIdx];

        if (!pos) return null;

        const { y: rowY, height: rowH } = pos;
        const isFirstRow = rowIdx === 0;
        const isLastRow = rowIdx === table.rows.length - 1;

        return (
          <Group key={`row-${rowIdx}`}>
            {/* 行背景 - 第一行添加上方圆角，最后一行添加下方圆角 */}
            <Rect
              cornerRadius={
                isFirstRow && isLastRow
                  ? cornerRadius
                  : isFirstRow
                  ? [cornerRadius, cornerRadius, 0, 0]
                  : isLastRow
                  ? [0, 0, cornerRadius, cornerRadius]
                  : 0
              }
              fill="rgba(255, 255, 255, 0.1)"
              height={rowH}
              width={width}
              x={0}
              y={rowY}
            />

            {/* 数据单元格内容 */}
            {cellLayout.layout
              .filter((item) => item.rowIdx === rowIdx)
              .map((item) => {
              const cell = row[item.cellIdx];
              const { colIdx, rowspan, colspan } = item;
              const actualColIdx = item.cellIdx; // 原始数组中的列索引
              
              const key = `${rowIdx}-${item.cellIdx}`;
              const cellX = colIdx * colWidth;
              const cellWidth = colWidth * colspan;
              
              // 计算跨行单元格的总高度
              let cellHeight = 0;
              for (let r = rowIdx; r < rowIdx + rowspan && r < table.rows.length; r++) {
                const rowPos = rowPositions[r];
                if (rowPos) {
                  cellHeight += rowPos.height;
                }
              }

              // 如果是图片
              if (cell.is_image && cell.image) {
                const bmp = loadedImages.get(key);

                if (bmp) {
                  // 计算图片尺寸：尽量充满单元格，保持比例，留间距
                  // 添加最大高度限制
                  const maxImgWidth = cellWidth - cellPadding * 2;
                  const maxImgHeight = Math.min(cellHeight - cellPadding * 2, maxImageHeight);

                  // 获取图片的原始尺寸
                  const originalW = (bmp as any).width || 1;
                  const originalH = (bmp as any).height || 1;
                  const imgAspect = originalW / originalH;

                  let imgW = maxImgWidth;
                  let imgH = imgW / imgAspect;

                  // 如果高度超出，按高度缩放
                  if (imgH > maxImgHeight) {
                    imgH = maxImgHeight;
                    imgW = imgH * imgAspect;
                  }

                  // 居中显示图片（水平和垂直都居中）
                  const imgX = cellX + (cellWidth - imgW) / 2;
                  const imgY = rowY + (cellHeight - imgH) / 2;

                  const isHovered = !forExport && hoveredCell?.row === rowIdx && hoveredCell?.col === actualColIdx;
                  
                  return (
                    <Group key={key}>
                      {/* 透明热区 - 覆盖整个单元格 */}
                      <Rect
                        x={cellX}
                        y={rowY}
                        width={cellWidth}
                        height={cellHeight}
                        fill="transparent"
                        listening={!forExport}
                        onMouseEnter={() => !forExport && setHoveredCell({row: rowIdx, col: actualColIdx})}
                        onMouseLeave={() => !forExport && setHoveredCell(null)}
                        onClick={() => {
                          if (!forExport && onImageClick) {
                            const imageUrl = typeof cell.image === 'string' ? cell.image : cell.image?.url;
                            onImageClick(rowIdx, actualColIdx, imageUrl);
                          }
                        }}
                      />
                      {/* 图片内容 */}
                      <KImage
                        ref={(node) => {
                          if (node) {
                            imageRefs.current.set(key, node);
                          } else {
                            imageRefs.current.delete(key);
                          }
                        }}
                        height={imgH}
                        image={bmp as any}
                        width={imgW}
                        x={imgX}
                        y={imgY}
                        listening={false}
                      />
                      {/* 悬浮边框 */}
                      {isHovered && (
                        <Rect
                          x={cellX + 1}
                          y={rowY + 1}
                          width={cellWidth - 2}
                          height={cellHeight - 2}
                          stroke="#ff3333"
                          strokeWidth={2}
                          dash={[5, 5]}
                          listening={false}
                        />
                      )}
                    </Group>
                  );
                }

                // 图片加载中或未加载，返回空占位
                return null;
              }

              // 文字内容
              const textHeight = cellHeights.get(key) || 0;
              const verticalOffset = (cellHeight - textHeight) / 2;
              
              // 根据单元格格式应用样式
              const cellAlign = cell.center ? "center" : textAlign;
              const cellFontStyle = cell.bold ? "bold" : "normal";
              const cellColor = cell.bold ? titleColor : contentColor;
              
              const isHovered = !forExport && hoveredCell?.row === rowIdx && hoveredCell?.col === actualColIdx;

              return (
                <Group key={key}>
                  {/* 透明热区 - 覆盖整个单元格 */}
                  <Rect
                    x={cellX}
                    y={rowY}
                    width={cellWidth}
                    height={cellHeight}
                    fill="transparent"
                    listening={!forExport}
                    onMouseEnter={() => !forExport && setHoveredCell({row: rowIdx, col: actualColIdx})}
                    onMouseLeave={() => !forExport && setHoveredCell(null)}
                    onClick={() => {
                      if (!forExport && onTextClick) {
                        onTextClick(rowIdx, actualColIdx, cell.value);
                      }
                    }}
                  />
                  {/* 文字内容 */}
                  <Text
                    ref={(node) => {
                      if (node) {
                        textRefs.current.set(key, node);
                      } else {
                        textRefs.current.delete(key);
                      }
                    }}
                    align={cellAlign}
                    direction={direction}
                    fill={cellColor}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    fontStyle={cellFontStyle}
                    text={cell.value}
                    verticalAlign="top"
                    width={cellWidth - cellPadding * 2}
                    wrap="word"
                    x={cellX + cellPadding}
                    y={rowY + Math.max(cellPadding, verticalOffset)}
                    listening={false}
                  />
                  {/* 悬浮边框 */}
                  {isHovered && (
                    <Rect
                      x={cellX + 1}
                      y={rowY + 1}
                      width={cellWidth - 2}
                      height={cellHeight - 2}
                      stroke="#ff3333"
                      strokeWidth={2}
                      dash={[5, 5]}
                      listening={false}
                    />
                  )}
                </Group>
              );
            })}

            {/* 行分割线 - 分段绘制，跳过合并单元格 */}
            {!isLastRow && (() => {
              const segments: Array<{ start: number; end: number }> = [];
              let segmentStart: number | null = null;
              
              // 遍历所有列，找出不跨行的区段
              for (let c = 0; c < colCount; c++) {
                const currentRowHasCell = cellLayout.matrix[rowIdx][c];
                const nextRowHasCell = cellLayout.matrix[rowIdx + 1][c];
                
                // 检查该列在当前行是否有跨到下一行的单元格
                let hasRowspan = false;
                for (const item of cellLayout.layout) {
                  if (item.rowIdx === rowIdx && 
                      item.colIdx <= c && 
                      c < item.colIdx + item.colspan &&
                      item.rowspan > 1) {
                    hasRowspan = true;
                    break;
                  }
                }
                
                if (!hasRowspan) {
                  // 该列不跨行，可以绘制分割线
                  if (segmentStart === null) {
                    segmentStart = c;
                  }
                } else {
                  // 该列跨行，结束当前区段
                  if (segmentStart !== null) {
                    segments.push({ start: segmentStart, end: c });
                    segmentStart = null;
                  }
                }
              }
              
              // 处理最后一个区段
              if (segmentStart !== null) {
                segments.push({ start: segmentStart, end: colCount });
              }
              
              // 绘制所有区段
              return segments.map((seg, idx) => (
                <Line
                  key={`row-hline-${rowIdx}-${idx}`}
                  points={[
                    seg.start * colWidth,
                    rowY + rowH,
                    seg.end * colWidth,
                    rowY + rowH,
                  ]}
                  stroke="rgba(0, 0, 0, 0.3)"
                  strokeWidth={1}
                />
              ));
            })()}

            {/* 列分割线 - 只在当前行的列边界绘制，跳过跨列单元格 */}
            {cellLayout.layout
              .filter((item) => item.rowIdx === rowIdx && item.colIdx > 0)
              .map((item) => {
                // 在单元格左侧绘制分割线
                const colIdx = item.colIdx;
                
                return (
                  <Line
                    key={`row-vline-${rowIdx}-${colIdx}`}
                    points={[
                      colIdx * colWidth,
                      rowY,
                      colIdx * colWidth,
                      rowY + rowH,
                    ]}
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth={1}
                  />
                );
              })}
          </Group>
        );
      })}
    </Group>
  );
}
