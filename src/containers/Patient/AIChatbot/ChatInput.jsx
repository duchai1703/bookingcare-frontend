// ═══════════════════════════════════════════════════════════════════════
// [Phase 02 — GEMINI VISION] ChatInput — Textarea + Image Attachment & Preview
// Strict Client Validation: JPEG/PNG/WebP only, SVG forbidden, Max 5MB
// IME Guard + Mobile Blur Fix
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Send, Paperclip, X, AlertCircle } from 'lucide-react';
import { useIntl } from 'react-intl';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ChatInput = ({ onSubmit, disabled, isThinking }) => {
  const intl = useIntl();
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isComposingRef = useRef(false); // [IME Tiếng Việt]
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const MAX_LENGTH = 500;

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  // ═══ [File Selection & Validation] ═══
  const handleFileSelect = useCallback((e) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so user can select the same file again if desired
    e.target.value = '';

    // Check SVG & unsafe types explicitly
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    if (isSvg) {
      setImageError('Định dạng ảnh SVG không được phép tải lên vì lý do an toàn.');
      return;
    }

    // Check Allowed MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setImageError('Chỉ hỗ trợ file ảnh định dạng JPEG, PNG hoặc WebP.');
      return;
    }

    // Check File Extension
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setImageError('Đuôi file không hợp lệ. Chỉ chấp nhận .jpg, .jpeg, .png, .webp.');
      return;
    }

    // Check Max Size (5MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Ảnh vượt quá giới hạn 5MB.');
      return;
    }

    // Revoke previous preview if existed
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setSelectedImage({
      file,
      previewUrl,
      name: file.name,
      size: `${sizeInMB} MB`,
    });
  }, [selectedImage]);

  const handleRemoveImage = useCallback(() => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    setImageError('');
  }, [selectedImage]);

  // ═══ [Chặn isComposing] — Không submit khi đang gõ dấu tiếng Việt ═══
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // ═══ [Auto-resize Textarea] ═══
  const handleInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    if (el.value.length > MAX_LENGTH) {
      el.value = el.value.slice(0, MAX_LENGTH);
    }
    setCharCount(el.value.length);
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, []);

  // ═══ [Submit Value] ═══
  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      if (isComposingRef.current) return; // [IME Guard]
      const value = inputRef.current?.value?.trim() || '';

      // Must have either text or image
      if ((!value && !selectedImage) || disabled || isThinking) return;

      onSubmit({
        text: value,
        imageFile: selectedImage?.file || null,
        previewUrl: selectedImage?.previewUrl || null,
      });

      // Reset form state
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.style.height = 'auto';
      }
      setCharCount(0);
      setSelectedImage(null);
      setImageError('');
    },
    [onSubmit, disabled, isThinking, selectedImage]
  );

  // ═══ [Keydown Handler] ═══
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSubmit(e);
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
      }
    },
    [handleSubmit]
  );

  const counterClass = charCount >= MAX_LENGTH
    ? 'char-counter at-limit'
    : charCount >= MAX_LENGTH * 0.8
      ? 'char-counter near-limit'
      : 'char-counter';

  const placeholderText = isThinking
    ? intl.formatMessage({ id: 'chatbot.placeholder-thinking' })
    : selectedImage
      ? 'Nhập câu hỏi về ảnh hoặc nhấn Gửi để AI phân tích...'
      : intl.formatMessage({ id: 'chatbot.placeholder-input' });

  return (
    <div className="chat-input-container">
      {/* Validation Error Banner */}
      {imageError && (
        <div className="image-error-banner" role="alert">
          <AlertCircle size={14} />
          <span>{imageError}</span>
          <button
            type="button"
            className="btn-dismiss-error"
            onClick={() => setImageError('')}
            aria-label="Đóng thông báo"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Image Preview Bar */}
      {selectedImage && (
        <div className="image-preview-bar">
          <div className="preview-thumbnail-container">
            <img
              src={selectedImage.previewUrl}
              alt="Preview"
              className="preview-thumbnail"
            />
            <div className="preview-info">
              <span className="preview-filename">{selectedImage.name}</span>
              <span className="preview-filesize">{selectedImage.size}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-remove-image"
            onClick={handleRemoveImage}
            title="Xóa ảnh"
            aria-label="Xóa ảnh"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={disabled || isThinking}
        />

        {/* Attachment Button */}
        <button
          type="button"
          className="chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isThinking}
          title="Đính kèm hình ảnh (JPEG, PNG, WebP <= 5MB)"
          aria-label="Đính kèm hình ảnh"
        >
          <Paperclip size={18} />
        </button>

        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder={placeholderText}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            className="chat-input"
            autoComplete="off"
          />
          {charCount > 0 && (
            <span className={counterClass}>
              {charCount}/{MAX_LENGTH}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || isThinking || (!charCount && !selectedImage)}
          className="chat-submit-btn"
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Gửi tin nhắn"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
