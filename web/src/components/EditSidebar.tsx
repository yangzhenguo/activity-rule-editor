import type { Page, Section, Reward } from "@/renderer/canvas/types";

import { useState, useCallback, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Input,
  Textarea,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Image,
} from "@heroui/react";

interface EditSidebarProps {
  isOpen: boolean;
  page: Page | null;
  onClose: () => void;
  onSave: (updatedPage: Page) => void;
}

export function EditSidebar({
  isOpen,
  page,
  onClose,
  onSave,
}: EditSidebarProps) {
  const [editedPage, setEditedPage] = useState<Page | null>(page);

  // 当 page 变化时更新编辑状态
  useEffect(() => {
    setEditedPage(page ? JSON.parse(JSON.stringify(page)) : null);
  }, [page]);

  const handleSave = useCallback(() => {
    if (editedPage) {
      onSave(editedPage);
      onClose();
    }
  }, [editedPage, onSave, onClose]);

  const updateRegion = useCallback(
    (newRegion: string) => {
      if (!editedPage) return;
      setEditedPage({ ...editedPage, region: newRegion });
    },
    [editedPage],
  );

  const updateSectionTitle = useCallback(
    (blockIdx: number, sectionIdx: number, newTitle: string) => {
      if (!editedPage) return;
      const newPage = JSON.parse(JSON.stringify(editedPage));

      if (newPage.blocks && newPage.blocks[blockIdx]) {
        newPage.blocks[blockIdx].sections[sectionIdx].title = newTitle;
      } else if (newPage.sections) {
        newPage.sections[sectionIdx].title = newTitle;
      }

      setEditedPage(newPage);
    },
    [editedPage],
  );

  const updateSectionContent = useCallback(
    (blockIdx: number, sectionIdx: number, newContent: string) => {
      if (!editedPage) return;
      const newPage = JSON.parse(JSON.stringify(editedPage));

      if (newPage.blocks && newPage.blocks[blockIdx]) {
        newPage.blocks[blockIdx].sections[sectionIdx].content = newContent;
      } else if (newPage.sections) {
        newPage.sections[sectionIdx].content = newContent;
      }

      setEditedPage(newPage);
    },
    [editedPage],
  );

  // 清理显示内容，去掉格式标记
  const cleanContent = useCallback((content: string | undefined) => {
    if (!content) return "";

    // 去掉每行的 [center] 和 ** 标记
    return content
      .split("\n")
      .map((line) => {
        let cleaned = line;

        // 先去掉加粗标记
        if (cleaned.startsWith("**") && cleaned.endsWith("**")) {
          cleaned = cleaned.slice(2, -2);
        }
        // 再去掉居中标记
        if (cleaned.startsWith("[center]")) {
          cleaned = cleaned.slice(8);
        }

        return cleaned;
      })
      .join("\n");
  }, []);

  const updateReward = useCallback(
    (
      blockIdx: number,
      sectionIdx: number,
      rewardIdx: number,
      field: "name" | "desc",
      value: string,
    ) => {
      if (!editedPage) return;
      const newPage = JSON.parse(JSON.stringify(editedPage));

      if (newPage.blocks && newPage.blocks[blockIdx]) {
        const reward =
          newPage.blocks[blockIdx].sections[sectionIdx].rewards?.[rewardIdx];

        if (reward) {
          reward[field] = value;
        }
      } else if (newPage.sections) {
        const reward = newPage.sections[sectionIdx].rewards?.[rewardIdx];

        if (reward) {
          reward[field] = value;
        }
      }

      setEditedPage(newPage);
    },
    [editedPage],
  );

  const addReward = useCallback(
    (blockIdx: number, sectionIdx: number) => {
      if (!editedPage) return;
      const newPage = JSON.parse(JSON.stringify(editedPage));

      const newReward: Reward = {
        name: "新奖励",
        desc: "描述",
        image: undefined,
      };

      if (newPage.blocks && newPage.blocks[blockIdx]) {
        if (!newPage.blocks[blockIdx].sections[sectionIdx].rewards) {
          newPage.blocks[blockIdx].sections[sectionIdx].rewards = [];
        }
        newPage.blocks[blockIdx].sections[sectionIdx].rewards!.push(newReward);
      } else if (newPage.sections) {
        if (!newPage.sections[sectionIdx].rewards) {
          newPage.sections[sectionIdx].rewards = [];
        }
        newPage.sections[sectionIdx].rewards!.push(newReward);
      }

      setEditedPage(newPage);
    },
    [editedPage],
  );

  const deleteReward = useCallback(
    (blockIdx: number, sectionIdx: number, rewardIdx: number) => {
      if (!editedPage) return;
      const newPage = JSON.parse(JSON.stringify(editedPage));

      if (newPage.blocks && newPage.blocks[blockIdx]) {
        newPage.blocks[blockIdx].sections[sectionIdx].rewards?.splice(
          rewardIdx,
          1,
        );
      } else if (newPage.sections) {
        newPage.sections[sectionIdx].rewards?.splice(rewardIdx, 1);
      }

      setEditedPage(newPage);
    },
    [editedPage],
  );

  const addSection = useCallback(
    (blockIdx: number) => {
      if (!editedPage) return;
      const newPage = JSON.parse(JSON.stringify(editedPage));

      const newSection: Section = {
        title: "新标题",
        content: "新内容",
        rewards: [],
      };

      if (newPage.blocks && newPage.blocks[blockIdx]) {
        newPage.blocks[blockIdx].sections.push(newSection);
      } else if (newPage.sections) {
        newPage.sections.push(newSection);
      }

      setEditedPage(newPage);
    },
    [editedPage],
  );

  const handleImageUpload = useCallback(
    async (
      blockIdx: number,
      sectionIdx: number,
      rewardIdx: number,
      file: File,
    ) => {
      if (!editedPage) return;

      // 创建临时的 data URL 用于预览
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newPage = JSON.parse(JSON.stringify(editedPage));

        if (newPage.blocks && newPage.blocks[blockIdx]) {
          const reward =
            newPage.blocks[blockIdx].sections[sectionIdx].rewards?.[rewardIdx];

          if (reward) {
            reward.image = dataUrl;
          }
        } else if (newPage.sections) {
          const reward = newPage.sections[sectionIdx].rewards?.[rewardIdx];

          if (reward) {
            reward.image = dataUrl;
          }
        }

        setEditedPage(newPage);
      };
      reader.readAsDataURL(file);
    },
    [editedPage],
  );

  if (!editedPage) return null;

  // 渲染 blocks 结构
  const renderBlocks = () => {
    if (!editedPage.blocks || editedPage.blocks.length === 0) return null;

    return editedPage.blocks.map((block, blockIdx) => (
      <Card key={blockIdx} className="mb-4">
        <CardHeader className="flex justify-between">
          <h3 className="text-lg font-semibold">{block.block_title}</h3>
          <span className="text-xs text-gray-500">{block.block_type}</span>
        </CardHeader>
        <Divider />
        <CardBody>
          {block.sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-4 p-3 bg-gray-50 rounded-lg">
              {/* Section 标题 */}
              <Input
                className="mb-2"
                label="标题"
                size="sm"
                value={section.title || ""}
                onChange={(e) =>
                  updateSectionTitle(blockIdx, sectionIdx, e.target.value)
                }
              />

              {/* Section 内容 */}
              <Textarea
                className="mb-3"
                classNames={{
                  input: "min-h-[120px]",
                }}
                label="内容"
                size="sm"
                value={cleanContent(section.content)}
                onChange={(e) =>
                  updateSectionContent(blockIdx, sectionIdx, e.target.value)
                }
              />

              {/* 奖励列表 */}
              {section.rewards && section.rewards.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">奖励列表</span>
                    <Button
                      color="primary"
                      size="sm"
                      variant="flat"
                      onPress={() => addReward(blockIdx, sectionIdx)}
                    >
                      + 添加奖励
                    </Button>
                  </div>
                  {section.rewards.map((reward, rewardIdx) => (
                    <Card key={rewardIdx} className="mb-2 p-2">
                      <div className="flex gap-2">
                        {/* 奖励图片预览 */}
                        {reward.image && (
                          <div className="flex-shrink-0 w-20 h-20">
                            <Image
                              alt={reward.name || "奖励图片"}
                              className="w-full h-full object-cover rounded"
                              src={
                                typeof reward.image === "string"
                                  ? reward.image
                                  : reward.image?.url
                              }
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          <Input
                            className="mb-1"
                            label="奖励名称"
                            size="sm"
                            value={reward.name || ""}
                            onChange={(e) =>
                              updateReward(
                                blockIdx,
                                sectionIdx,
                                rewardIdx,
                                "name",
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            className="mb-1"
                            label="描述"
                            size="sm"
                            value={reward.desc || ""}
                            onChange={(e) =>
                              updateReward(
                                blockIdx,
                                sectionIdx,
                                rewardIdx,
                                "desc",
                                e.target.value,
                              )
                            }
                          />

                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => {
                                const input = document.createElement("input");

                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];

                                  if (file) {
                                    handleImageUpload(
                                      blockIdx,
                                      sectionIdx,
                                      rewardIdx,
                                      file,
                                    );
                                  }
                                };
                                input.click();
                              }}
                            >
                              更换图片
                            </Button>
                            <Button
                              color="danger"
                              size="sm"
                              variant="flat"
                              onPress={() =>
                                deleteReward(blockIdx, sectionIdx, rewardIdx)
                              }
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* 如果没有奖励，显示添加按钮 */}
              {(!section.rewards || section.rewards.length === 0) && (
                <Button
                  className="mt-2"
                  color="primary"
                  size="sm"
                  variant="flat"
                  onPress={() => addReward(blockIdx, sectionIdx)}
                >
                  + 添加奖励
                </Button>
              )}
            </div>
          ))}

          <Button
            className="mt-2 w-full"
            color="primary"
            size="sm"
            variant="bordered"
            onPress={() => addSection(blockIdx)}
          >
            + 添加文案段落
          </Button>
        </CardBody>
      </Card>
    ));
  };

  // 渲染 sections 结构（向后兼容）
  const renderSections = () => {
    if (!editedPage.sections || editedPage.sections.length === 0) return null;

    return (
      <Card className="mb-4">
        <CardBody>
          {editedPage.sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-4 p-3 bg-gray-50 rounded-lg">
              <Input
                className="mb-2"
                label="标题"
                size="sm"
                value={section.title || ""}
                onChange={(e) =>
                  updateSectionTitle(-1, sectionIdx, e.target.value)
                }
              />

              <Textarea
                className="mb-3"
                classNames={{
                  input: "min-h-[120px]",
                }}
                label="内容"
                size="sm"
                value={cleanContent(section.content)}
                onChange={(e) =>
                  updateSectionContent(-1, sectionIdx, e.target.value)
                }
              />

              {section.rewards && section.rewards.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">奖励列表</span>
                    <Button
                      color="primary"
                      size="sm"
                      variant="flat"
                      onPress={() => addReward(-1, sectionIdx)}
                    >
                      + 添加奖励
                    </Button>
                  </div>
                  {section.rewards.map((reward, rewardIdx) => (
                    <Card key={rewardIdx} className="mb-2 p-2">
                      <div className="flex gap-2">
                        {reward.image && (
                          <div className="flex-shrink-0 w-20 h-20">
                            <Image
                              alt={reward.name || "奖励图片"}
                              className="w-full h-full object-cover rounded"
                              src={
                                typeof reward.image === "string"
                                  ? reward.image
                                  : reward.image?.url
                              }
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          <Input
                            className="mb-1"
                            label="奖励名称"
                            size="sm"
                            value={reward.name || ""}
                            onChange={(e) =>
                              updateReward(
                                -1,
                                sectionIdx,
                                rewardIdx,
                                "name",
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            className="mb-1"
                            label="描述"
                            size="sm"
                            value={reward.desc || ""}
                            onChange={(e) =>
                              updateReward(
                                -1,
                                sectionIdx,
                                rewardIdx,
                                "desc",
                                e.target.value,
                              )
                            }
                          />

                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => {
                                const input = document.createElement("input");

                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];

                                  if (file) {
                                    handleImageUpload(
                                      -1,
                                      sectionIdx,
                                      rewardIdx,
                                      file,
                                    );
                                  }
                                };
                                input.click();
                              }}
                            >
                              更换图片
                            </Button>
                            <Button
                              color="danger"
                              size="sm"
                              variant="flat"
                              onPress={() =>
                                deleteReward(-1, sectionIdx, rewardIdx)
                              }
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {(!section.rewards || section.rewards.length === 0) && (
                <Button
                  className="mt-2"
                  color="primary"
                  size="sm"
                  variant="flat"
                  onPress={() => addReward(-1, sectionIdx)}
                >
                  + 添加奖励
                </Button>
              )}
            </div>
          ))}

          <Button
            className="mt-2 w-full"
            color="primary"
            size="sm"
            variant="bordered"
            onPress={() => addSection(-1)}
          >
            + 添加文案段落
          </Button>
        </CardBody>
      </Card>
    );
  };

  return (
    <Drawer
      classNames={{
        base: "rounded-none",
      }}
      isOpen={isOpen}
      placement="right"
      size="lg"
      onClose={onClose}
    >
      <DrawerContent className="rounded-none">
        <DrawerHeader className="flex flex-col gap-1 flex-shrink-0">
          <h2 className="text-xl font-bold">编辑画布</h2>
          <Input
            className="mt-2"
            label="区域名称"
            size="sm"
            value={editedPage.region || ""}
            onChange={(e) => updateRegion(e.target.value)}
          />
        </DrawerHeader>
        <DrawerBody className="flex-1 overflow-y-auto">
          {editedPage.blocks && editedPage.blocks.length > 0
            ? renderBlocks()
            : renderSections()}
        </DrawerBody>
        <DrawerFooter className="flex-shrink-0">
          <Button color="danger" variant="light" onPress={onClose}>
            取消
          </Button>
          <Button color="primary" onPress={handleSave}>
            保存
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
