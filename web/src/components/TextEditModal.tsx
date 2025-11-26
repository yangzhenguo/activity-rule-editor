import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
} from "@heroui/react";

interface TextEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  value: string;
  multiline: boolean;
  large?: boolean; // 是否是大文本框（规则页内容）
}

export function TextEditModal({
  isOpen,
  onClose,
  onSave,
  title,
  value,
  multiline,
  large = false,
}: TextEditModalProps) {
  const [editValue, setEditValue] = React.useState(value);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // 使用 ref 在 Modal 打开时聚焦输入框
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      // 延迟聚焦，确保 Modal 已完全渲染
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      scrollBehavior="inside"
      size={large ? "3xl" : multiline ? "lg" : "md"}
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
        <ModalBody>
          {multiline ? (
            <Textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              classNames={{
                input: large ? "min-h-[400px]" : "min-h-[80px]",
              }}
              maxRows={large ? 30 : 8}
              minRows={large ? 15 : 3}
              placeholder="请输入内容"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <Input
              ref={inputRef as React.Ref<HTMLInputElement>}
              placeholder="请输入内容"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            取消
          </Button>
          <Button color="primary" onPress={handleSave}>
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
