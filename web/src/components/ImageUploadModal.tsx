import { useState, useCallback, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

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
  const [previewImage, setPreviewImage] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);

  // 当 Modal 打开时，同步 currentImage 到 previewImage
  useEffect(() => {
    if (isOpen) {
      setPreviewImage(currentImage || null);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

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
    setPreviewImage(currentImage || null);
    onClose();
  }, [currentImage, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="2xl"
      backdrop="blur"
    >
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
              ${isDragging 
                ? "border-primary bg-primary-50" 
                : "border-gray-300 hover:border-primary hover:bg-gray-50"
              }
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClickUpload}
          >
            {previewImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="预览"
                  className="max-w-full max-h-[400px] object-contain rounded"
                />
                <div
                  className="absolute bottom-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClickUpload();
                  }}
                >
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
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
            onPress={handleSave}
            isDisabled={!previewImage}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

