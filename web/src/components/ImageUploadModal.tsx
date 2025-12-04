import { useState, useCallback, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { normalizeImageUrl } from "@/renderer/canvas/useImageCache";

interface ImageUploadModalProps {
  isOpen: boolean;
  currentImage?: string;
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
}

export function ImageUploadModal({
  isOpen,
  currentImage,
  onClose,
  onSave,
}: ImageUploadModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentImage || null,
  );
  const [isDragging, setIsDragging] = useState(false);

  // 当 Modal 打开时，同步 currentImage 到 previewImage（规范化 URL）
  useEffect(() => {
    if (isOpen) {
      // 规范化 URL：将相对路径转换为完整 API 地址
      const normalized = currentImage ? normalizeImageUrl(currentImage) : null;
      setPreviewImage(normalized);
    }
  }, [isOpen, currentImage]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");

      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];

      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClickUpload = useCallback(() => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];

      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  }, [handleFileSelect]);

  const handleSave = useCallback(() => {
    if (previewImage) {
      onSave(previewImage);
      onClose();
    }
  }, [previewImage, onSave, onClose]);

  const handleCancel = useCallback(() => {
    // 规范化 URL
    const normalized = currentImage ? normalizeImageUrl(currentImage) : null;
    setPreviewImage(normalized);
    onClose();
  }, [currentImage, onClose]);

  return (
    <Modal backdrop="blur" isOpen={isOpen} size="2xl" onClose={handleCancel}>
      <ModalContent>
        <ModalHeader>
          <h3 className="text-xl font-bold">替换图片</h3>
        </ModalHeader>
        <ModalBody>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8
              flex flex-col items-center justify-center
              min-h-[300px] transition-colors cursor-pointer
              ${
                isDragging
                  ? "border-primary bg-primary-50"
                  : "border-gray-300 hover:border-primary hover:bg-gray-50"
              }
            `}
            role="button"
            tabIndex={0}
            onClick={handleClickUpload}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClickUpload();
              }
            }}
          >
            {previewImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  alt="预览"
                  className="max-w-full max-h-[400px] object-contain rounded"
                  src={previewImage}
                />
                <div className="absolute bottom-2 right-2">
                  <Button
                    color="primary"
                    size="sm"
                    variant="flat"
                    onPress={handleClickUpload}
                  >
                    更换图片
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-4">📁</div>
                <p className="text-lg font-medium mb-2">
                  点击选择图片或拖拽图片到此处
                </p>
                <p className="text-sm text-gray-500">
                  支持 JPG、PNG、GIF、WebP 等格式
                </p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={handleCancel}>
            取消
          </Button>
          <Button
            color="primary"
            isDisabled={!previewImage}
            onPress={handleSave}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
