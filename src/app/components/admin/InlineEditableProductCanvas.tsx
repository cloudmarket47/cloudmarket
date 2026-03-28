import {
  createContext,
  type ChangeEvent,
  type DragEvent,
  type ElementType,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Flame,
  Gift,
  GripVertical,
  Hand,
  ImagePlus,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  MoreVertical,
  Package,
  Phone,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  Upload,
  User,
  Video,
  X,
  Zap,
  Droplets,
} from 'lucide-react';
import {
  type AdminVideoAspectRatio,
  appendMediaLibraryItemToDraft,
  createAutoPricedOfferPackage,
  createAdminProductLibraryItem,
  formatDraftCurrency,
  type AdminContentCard,
  type AdminProductLibraryItem,
  type AdminMediaAsset,
  type AdminProductDraft,
  type AdminAlertItem,
  type AdminFaqItem,
  type AdminOfferPackage,
  removeMediaAssetFromDraft,
  type AdminReviewItem,
} from '../../lib/adminProductDrafts';
import { ALERT_PRESETS, applyAlertPreset } from '../../lib/alertPresets';
import {
  getCountryCustomerPoolLabel,
  getCustomerPoolGenderLabel,
  getDeterministicCustomerNameForIndex,
  normalizeCustomerIdentityPools,
  type CustomerGenderTarget,
  type CustomerIdentityPools,
  type CustomerNameGender,
} from '../../lib/customerIdentityPools';
import { useLocale } from '../../context/LocaleContext';
import { SUPPORTED_COUNTRY_CODES, type SupportedCountryCode } from '../../lib/localeData';
import { getProductCategoryDisplay } from '../../lib/productCategories';
import {
  deleteAssetFromSupabaseStorage,
  uploadAssetToSupabaseStorage,
  uploadAssetToSupabaseStorageDetailed,
} from '../../lib/supabaseStorage';
import {
  getProductLibraryLimitLabel,
  getProductLibraryCountLimit,
  validateProductLibraryUpload,
} from '../../lib/productMediaLibrary';
import { cn } from '../../lib/utils';
import { Carousel3D } from '../animations/Carousel3D';

const HERO_SLIDE_DURATION_MS = 8000;
const videoAspectRatioOptions: { value: AdminVideoAspectRatio; label: string; className: string }[] = [
  { value: '16:9', label: '16:9', className: 'aspect-video' },
  { value: '4:5', label: '4:5', className: 'aspect-[4/5]' },
  { value: '1:1', label: 'Square', className: 'aspect-square' },
  { value: '3:4', label: '3:4', className: 'aspect-[3/4]' },
];

const contentCardIconMap: Record<string, LucideIcon> = {
  Zap,
  Maximize2,
  Hand,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  Flame,
  Layers,
  Package,
  Gift,
  MessageSquare,
  Tag,
  Video,
};

function createImageAsset(src = ''): AdminMediaAsset {
  return {
    src,
    source: 'url',
    kind: 'image',
  };
}

function hasMedia(asset: AdminMediaAsset | undefined) {
  return Boolean(asset?.src?.trim());
}

function getHeroSlides(pageData: AdminProductDraft) {
  const slides = pageData.sections.hero.images.filter((item) => hasMedia(item));

  if (slides.length > 0) {
    return slides;
  }

  if (hasMedia(pageData.sections.hero.image)) {
    return [pageData.sections.hero.image];
  }

  if (hasMedia(pageData.coverImage)) {
    return [pageData.coverImage];
  }

  return [createImageAsset()];
}

function CardGlyph({
  iconName,
  className,
  emojiClassName,
}: {
  iconName: string;
  className?: string;
  emojiClassName?: string;
}) {
  const Icon = contentCardIconMap[iconName];

  if (Icon) {
    return <Icon className={className} />;
  }

  if (!iconName.trim()) {
    return <Sparkles className={className} />;
  }

  return <span className={emojiClassName}>{iconName.trim()}</span>;
}

function getVideoAspectRatioClass(value: AdminVideoAspectRatio) {
  return (
    videoAspectRatioOptions.find((option) => option.value === value)?.className ?? 'aspect-video'
  );
}

function readFileAsDataUrl(file: File) {
  return uploadAssetToSupabaseStorage(file, 'inline-editor');
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function countLibraryItemsByKind(
  items: AdminProductLibraryItem[],
  kind: 'image' | 'video',
) {
  return items.filter((item) => item.asset.kind === kind).length;
}

interface TextEditorPanelConfig {
  title: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
  description?: string;
  saveLabel?: string;
  onSave: (value: string) => void;
}

interface MediaEditorPanelConfig {
  title: string;
  value: string;
  kind: 'image' | 'video';
  accept: string;
  placeholder?: string;
  description?: string;
  saveLabel?: string;
  deleteLabel?: string;
  onDelete?: () => void;
  onSave: (value: string, source: 'url' | 'upload') => void;
}

type EditorPanelState =
  | ({ mode: 'text' } & TextEditorPanelConfig)
  | ({ mode: 'media' } & MediaEditorPanelConfig)
  | null;

interface InlineEditorContextValue {
  openTextEditor: (config: TextEditorPanelConfig) => void;
  openMediaEditor: (config: MediaEditorPanelConfig) => void;
}

const InlineEditorContext = createContext<InlineEditorContextValue | null>(null);

interface EditableTextProps {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
  editorTitle?: string;
  editorDescription?: string;
  editorSaveLabel?: string;
}

function EditableText({
  as = 'div',
  value,
  onSave,
  className,
  placeholder = 'Double-click to edit',
  multiline = false,
  editable = true,
  editorTitle,
  editorDescription,
  editorSaveLabel,
}: EditableTextProps) {
  const Tag = as as ElementType;
  const editorContext = useContext(InlineEditorContext);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [isEditing, value]);

  const commitValue = () => {
    setIsEditing(false);
    onSave(draftValue.trim());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraftValue(value);
      setIsEditing(false);
      return;
    }

    if (event.key === 'Enter' && (!multiline || !event.shiftKey)) {
      event.preventDefault();
      commitValue();
    }
  };

  const shellClassName = cn(
    className,
    editable &&
      !isEditing &&
      'cursor-text rounded-[0.8rem] transition outline-offset-4 hover:outline hover:outline-1 hover:outline-dashed hover:outline-blue-400/50',
    !value.trim() && !isEditing && 'text-blue-500/60',
  );

  if (editorContext && editable) {
    return (
      <Tag
        onDoubleClick={() =>
          editorContext.openTextEditor({
            title: editorTitle ?? placeholder ?? 'Text Content',
            value,
            multiline,
            placeholder,
            description: editorDescription,
            saveLabel: editorSaveLabel,
            onSave,
          })
        }
        className={shellClassName}
        title="Double-click to edit"
      >
        {value.trim() || placeholder}
      </Tag>
    );
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          rows={Math.max(2, draftValue.split('\n').length)}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          className={cn(
            className,
            'w-full resize-none border-none bg-transparent p-0 text-inherit shadow-none outline-none ring-0 focus:outline-none focus:ring-0',
          )}
          style={{ font: 'inherit' }}
        />
      );
    }

    return (
      <input
        autoFocus
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        className={cn(
          className,
          'w-full border-none bg-transparent p-0 text-inherit shadow-none outline-none ring-0 focus:outline-none focus:ring-0',
        )}
        style={{ font: 'inherit' }}
      />
    );
  }

  return (
    <Tag
      onDoubleClick={editable ? () => setIsEditing(true) : undefined}
      className={shellClassName}
      title={editable ? 'Double-click to edit' : undefined}
    >
      {value.trim() || placeholder}
    </Tag>
  );
}

interface EditableImageProps {
  src: string;
  alt: string;
  onSave: (src: string) => void;
  className?: string;
  imageClassName?: string;
  editable?: boolean;
  editorTitle?: string;
  mediaKind?: 'image' | 'video';
  accept?: string;
  editorDescription?: string;
  isDark?: boolean;
}

function EditableImage({
  src,
  alt,
  onSave,
  className,
  imageClassName,
  editable = true,
  editorTitle,
  mediaKind = 'image',
  accept = 'image/*',
  editorDescription,
  isDark = false,
}: EditableImageProps) {
  const editorContext = useContext(InlineEditorContext);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenEditor = () => {
    if (editorContext) {
      editorContext.openMediaEditor({
        title: editorTitle ?? alt,
        value: src,
        kind: mediaKind,
        accept,
        description: editorDescription,
        placeholder: mediaKind === 'video' ? 'Paste a direct video URL' : 'Paste a direct image URL',
        saveLabel: mediaKind === 'video' ? 'Save Media' : 'Save Image',
        onSave: (value) => onSave(value),
      });
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onSave(dataUrl);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div
      className={cn(
        className,
        editable &&
          'cursor-pointer rounded-[1.25rem] transition outline-offset-4 hover:outline hover:outline-1 hover:outline-dashed hover:outline-blue-400/50',
      )}
      onDoubleClick={editable ? handleOpenEditor : undefined}
      title={editable ? 'Double-click to change image' : undefined}
    >
      {src ? (
        <img src={src} alt={alt} className={imageClassName} />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center rounded-[inherit] border border-dashed',
            isDark
              ? 'border-slate-700 bg-slate-900/80 text-slate-500'
              : 'border-gray-300 bg-white/75 text-gray-400',
            imageClassName,
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <ImagePlus className="h-8 w-8" />
            <span className="text-xs font-medium">Double-click to add image</span>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function InlineEditorDrawer({
  editor,
  deviceView,
  libraryItems,
  onUploadToLibrary,
  onDeleteLibraryItem,
  isDark = false,
  onClose,
}: {
  editor: EditorPanelState;
  deviceView: 'desktop' | 'mobile';
  libraryItems: AdminProductLibraryItem[];
  onUploadToLibrary: (file: File, kind: 'image' | 'video') => Promise<AdminProductLibraryItem>;
  onDeleteLibraryItem: (item: AdminProductLibraryItem) => Promise<void>;
  isDark?: boolean;
  onClose: () => void;
}) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [draftSource, setDraftSource] = useState<'url' | 'upload'>('url');
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaFeedback, setMediaFeedback] = useState('');

  useEffect(() => {
    if (!editor) {
      return;
    }

    setDraftValue(editor.value);
    setDraftSource('url');
    setMediaFeedback('');
    setIsProcessingMedia(false);
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [editor, onClose]);

  if (!editor) {
    return null;
  }

  const isDesktop = deviceView === 'desktop';
  const matchingLibraryItems =
    editor.mode === 'media'
      ? libraryItems.filter((item) => item.asset.kind === editor.kind)
      : [];
  const libraryCount =
    editor.mode === 'media' ? countLibraryItemsByKind(libraryItems, editor.kind) : 0;
  const libraryLimit =
    editor.mode === 'media' ? getProductLibraryCountLimit(editor.kind) : 0;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || editor.mode !== 'media') {
      return;
    }

    setIsProcessingMedia(true);
    setMediaFeedback('');

    try {
      const libraryItem = await onUploadToLibrary(file, editor.kind);
      setDraftValue(libraryItem.asset.src);
      setDraftSource(libraryItem.asset.source);
      setMediaFeedback(`${libraryItem.name} uploaded to the product library and selected.`);
    } catch (error) {
      setMediaFeedback(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsProcessingMedia(false);
      event.target.value = '';
    }
  };

  const handleUseLibraryItem = (item: AdminProductLibraryItem) => {
    setDraftValue(item.asset.src);
    setDraftSource(item.asset.source);
    setMediaFeedback(`${item.name} selected from the product library.`);
  };

  const handleDeleteLibrarySelection = async (item: AdminProductLibraryItem) => {
    setIsProcessingMedia(true);
    setMediaFeedback('');

    try {
      await onDeleteLibraryItem(item);

      if (draftValue === item.asset.src) {
        setDraftValue('');
        setDraftSource('url');
      }

      setMediaFeedback(`${item.name} was deleted from the product library.`);
    } catch (error) {
      setMediaFeedback(error instanceof Error ? error.message : 'Unable to delete this media item.');
    } finally {
      setIsProcessingMedia(false);
    }
  };

  const handleSave = () => {
    if (editor.mode === 'text') {
      editor.onSave(draftValue.trim());
    } else {
      editor.onSave(draftValue.trim(), draftSource);
    }

    onClose();
  };

  const handleDelete = () => {
    if (editor.mode === 'media' && editor.onDelete) {
      editor.onDelete();
    }

    onClose();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close editor panel"
        onClick={onClose}
        className="pointer-events-auto absolute inset-0 bg-slate-950/18 backdrop-blur-[1px]"
      />

      <div
        className={cn(
          'pointer-events-auto absolute shadow-[0_28px_80px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-out',
          isDark ? 'bg-slate-950 text-white' : 'bg-white',
          isDesktop
            ? cn(
                'inset-y-0 right-0 w-full max-w-[420px] border-l',
                isDark ? 'border-slate-800' : 'border-gray-200',
              )
            : cn(
                'inset-x-0 bottom-0 max-h-[82vh] rounded-t-[2rem] border-t',
                isDark ? 'border-slate-800' : 'border-gray-200',
              ),
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {!isDesktop ? (
            <div className={cn('mx-auto mt-3 h-1.5 w-14 rounded-full', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
          ) : null}

          <div className={cn('border-b px-5 py-5', isDark ? 'border-slate-800' : 'border-gray-200')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0E7C7B]">
                  {editor.mode === 'text' ? 'Text Editor' : 'Media Editor'}
                </p>
                <h3 className={cn('mt-2 text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {editor.title}
                </h3>
                {editor.description ? (
                  <p className={cn('mt-2 text-sm leading-6', isDark ? 'text-slate-300' : 'text-gray-600')}>
                    {editor.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-full transition',
                  isDark
                    ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {editor.mode === 'text' ? (
              <div className="space-y-3">
                <label className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                  Content
                </label>
                {editor.multiline ? (
                  <textarea
                    rows={8}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    placeholder={editor.placeholder}
                    className={cn(
                      'w-full rounded-[1.5rem] border px-4 py-4 text-base outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/10',
                      isDark
                        ? 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-gray-200 bg-white text-gray-900',
                    )}
                  />
                ) : (
                  <input
                    type="text"
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    placeholder={editor.placeholder}
                    className={cn(
                      'w-full rounded-[1.5rem] border px-4 py-4 text-base outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/10',
                      isDark
                        ? 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-gray-200 bg-white text-gray-900',
                    )}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div
                  className={cn(
                    'rounded-[1.5rem] border p-4',
                    isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-gray-50',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        Product Library
                      </p>
                      <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        {libraryCount}/{libraryLimit} {editor.kind}s used. {getProductLibraryLimitLabel(editor.kind)}
                      </p>
                    </div>
                  </div>

                  {matchingLibraryItems.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {matchingLibraryItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'overflow-hidden rounded-[1.35rem] border',
                            isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
                          )}
                        >
                          <div className={cn('aspect-[4/3] overflow-hidden', isDark ? 'bg-slate-900' : 'bg-gray-100')}>
                            {item.asset.kind === 'image' ? (
                              <img src={item.asset.src} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <video src={item.asset.src} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="space-y-3 p-3">
                            <div>
                              <p className={cn('truncate text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                                {item.name}
                              </p>
                              <p className={cn('mt-1 truncate text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                                {item.asset.source === 'upload' ? 'Stored in Supabase' : 'External URL'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleUseLibraryItem(item)}
                                disabled={isProcessingMedia}
                                className="inline-flex flex-1 items-center justify-center rounded-full bg-[#0E7C7B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0a5f5e] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Use Media
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteLibrarySelection(item)}
                                disabled={isProcessingMedia}
                                className="inline-flex items-center justify-center rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'mt-4 rounded-[1.25rem] border border-dashed px-4 py-5 text-sm',
                        isDark ? 'border-slate-700 text-slate-400' : 'border-gray-300 text-gray-500',
                      )}
                    >
                      No {editor.kind}s in this product library yet. Upload from device below or add a direct URL in market settings.
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    'rounded-[1.5rem] border p-4',
                    isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-gray-50',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        Upload from Device
                      </p>
                      <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        Uploading here stores the file in the product library first, then links it to this placeholder.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={isProcessingMedia}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4" />
                      {isProcessingMedia ? 'Uploading...' : 'Upload'}
                    </button>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept={editor.accept}
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    Direct URL
                  </label>
                  <input
                    type="text"
                    value={draftValue}
                    onChange={(event) => {
                      setDraftValue(event.target.value);
                      setDraftSource('url');
                    }}
                    placeholder={editor.placeholder}
                    className={cn(
                      'w-full rounded-[1.5rem] border px-4 py-4 text-base outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/10',
                      isDark
                        ? 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-gray-200 bg-white text-gray-900',
                    )}
                  />
                </div>

                {mediaFeedback ? (
                  <p className={cn('text-sm font-medium', isDark ? 'text-[#70d6d4]' : 'text-[#0E7C7B]')}>
                    {mediaFeedback}
                  </p>
                ) : null}

                {draftValue ? (
                  <div
                    className={cn(
                      'overflow-hidden rounded-[1.5rem] border',
                      isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white',
                    )}
                  >
                    {editor.kind === 'image' ? (
                      <img src={draftValue} alt={editor.title} className="h-56 w-full object-cover" />
                    ) : (
                      <video src={draftValue} className="h-56 w-full bg-black object-cover" controls />
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div
            className={cn(
              'border-t px-5 py-4',
              isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {editor.mode === 'media' && editor.onDelete && editor.value ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-full bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 sm:mr-auto"
                >
                  {editor.deleteLabel ?? 'Remove Media'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessingMedia}
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                  isDark
                    ? 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessingMedia}
                className="inline-flex items-center justify-center rounded-full bg-[#0E7C7B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a5f5e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editor.saveLabel ?? 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SectionVisibilityToggleProps {
  visible: boolean;
  label: string;
  onToggle: () => void;
  isDark?: boolean;
}

function SectionVisibilityToggle({
  visible,
  label,
  onToggle,
  isDark = false,
}: SectionVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
        isDark
          ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {visible ? `Hide ${label}` : `Show ${label}`}
    </button>
  );
}

interface EditableAssetControlsProps {
  label: string;
  asset: AdminMediaAsset;
  kind: 'image' | 'video';
  accept: string;
  deleteLabel?: string;
  hideAssetValue?: boolean;
  isDark?: boolean;
  onSave: (asset: AdminMediaAsset) => void;
}

function EditableAssetControls({
  label,
  asset,
  kind,
  accept,
  deleteLabel,
  hideAssetValue = false,
  isDark = false,
  onSave,
}: EditableAssetControlsProps) {
  const editorContext = useContext(InlineEditorContext);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handlePrompt = () => {
    if (!editorContext) {
      return;
    }

    editorContext.openMediaEditor({
      title: label,
      value: asset.src,
      kind,
      accept,
      placeholder: `Paste the ${label.toLowerCase()} URL`,
      saveLabel: 'Save Media',
      deleteLabel,
      onDelete: () =>
        onSave({
          src: '',
          source: 'url',
          kind,
        }),
      onSave: (value, source) =>
        onSave({
          src: value,
          source,
          kind,
        }),
    });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onSave({
        src: dataUrl,
        source: 'upload',
        kind,
      });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-4',
        isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
      )}
    >
      <div className="space-y-4">
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{label}</p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
            {asset.src ? `Connected via ${asset.source}` : `No ${kind} linked yet`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={handlePrompt}
            className={cn(
              'inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            {kind === 'video' ? <Video className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            {asset.src ? 'Change URL' : 'Paste URL'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (editorContext) {
                handlePrompt();
                return;
              }

              inputRef.current?.click();
            }}
            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
          >
            <Upload className="h-4 w-4" />
            {editorContext ? 'Choose Media' : asset.src ? 'Replace' : 'Upload'}
          </button>
          {asset.src ? (
            <button
              type="button"
              onClick={() =>
                onSave({
                  src: '',
                  source: 'url',
                  kind,
                })
              }
              className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              {deleteLabel ?? 'Delete'}
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>
      {asset.src && kind !== 'video' && !hideAssetValue ? (
        <p
          className={cn(
            'mt-3 break-all rounded-xl px-3 py-2 text-xs',
            isDark ? 'bg-slate-900 text-slate-400' : 'bg-gray-50 text-gray-500',
          )}
        >
          {asset.src}
        </p>
      ) : null}
    </div>
  );
}

interface EditableMediaListProps {
  title: string;
  items: AdminMediaAsset[];
  onChange: (items: AdminMediaAsset[]) => void;
  allowMultipleUpload?: boolean;
  maxBatchUpload?: number;
  helperText?: string;
  uploadButtonLabel?: string;
  isDark?: boolean;
}

function EditableMediaList({
  title,
  items,
  onChange,
  allowMultipleUpload = false,
  maxBatchUpload = 1,
  helperText,
  uploadButtonLabel,
  isDark = false,
}: EditableMediaListProps) {
  const editorContext = useContext(InlineEditorContext);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const appendUrl = () => {
    if (!editorContext) {
      return;
    }

    editorContext.openMediaEditor({
      title,
      value: '',
      kind: 'image',
      accept: 'image/*',
      placeholder: `Paste the ${title.toLowerCase()} image URL`,
      saveLabel: 'Add Image',
      onSave: (value, source) =>
        onChange([
          ...items,
          {
            src: value,
            source,
            kind: 'image',
          },
        ]),
    });
  };

  const appendUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    try {
      const uploadBatch = selectedFiles.slice(0, Math.max(1, maxBatchUpload));
      const uploadedItems = await Promise.all(
        uploadBatch.map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file);

          return {
            src: dataUrl,
            source: 'upload' as const,
            kind: 'image' as const,
          };
        }),
      );

      onChange([
        ...items,
        ...uploadedItems,
      ]);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{title}</p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
            {helperText ?? 'Double-click any image to replace it, or add more from URL or device upload.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={appendUrl}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <ImagePlus className="h-4 w-4" />
            Add URL
          </button>
          <button
            type="button"
            onClick={() => {
              if (editorContext) {
                appendUrl();
                return;
              }

              inputRef.current?.click();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
          >
            <Upload className="h-4 w-4" />
            {editorContext ? 'Library or Upload' : uploadButtonLabel ?? 'Upload'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={allowMultipleUpload}
            className="hidden"
            onChange={appendUpload}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={`${item.src || 'empty-media'}-${index}`}
            className={cn(
              'rounded-[1.5rem] border p-3',
              isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
            )}
          >
            <EditableImage
              src={item.src}
              alt={`${title} ${index + 1}`}
              onSave={(src) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          ...entry,
                          src,
                          source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                        }
                      : entry,
                  ),
                )
              }
              className="aspect-[4/5] overflow-hidden rounded-[1.15rem]"
              imageClassName="h-full w-full object-cover"
              isDark={isDark}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Image {index + 1}
              </p>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                  isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-500',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HiddenInlineMessage({
  message,
  isDark = false,
}: {
  message: string;
  isDark?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[2rem] border border-dashed px-6 py-10 text-center',
        isDark ? 'border-slate-700 bg-slate-950' : 'border-gray-300 bg-white',
      )}
    >
      <p className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{message}</p>
    </div>
  );
}

function VideoRatioSelector({
  value,
  onChange,
  isDark = false,
}: {
  value: AdminVideoAspectRatio;
  onChange: (value: AdminVideoAspectRatio) => void;
  isDark?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-4',
        isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
      )}
    >
      <div className="space-y-4">
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
            Video placeholder ratio
          </p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Choose how tall or wide this video block should appear.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {videoAspectRatioOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'min-w-0 rounded-full px-3 py-2 text-sm font-semibold transition',
                option.value === value
                  ? 'bg-[#0E7C7B] text-white'
                  : isDark
                    ? 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InlineVideoPreview({
  title,
  poster,
  video,
  ratio,
}: {
  title: string;
  poster: AdminMediaAsset;
  video: AdminMediaAsset;
  ratio: AdminVideoAspectRatio;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPosterVisible, setIsPosterVisible] = useState(Boolean(video.src && poster.src));

  useEffect(() => {
    setIsPosterVisible(Boolean(video.src && poster.src));
  }, [poster.src, video.src]);

  const handlePosterClick = () => {
    setIsPosterVisible(false);
    void videoRef.current?.play().catch(() => {
      setIsPosterVisible(true);
    });
  };

  if (video.src) {
    return (
      <div className={cn('relative overflow-hidden bg-black', getVideoAspectRatioClass(ratio))}>
        <video
          ref={videoRef}
          src={video.src}
          poster={poster.src || undefined}
          className="h-full w-full object-cover"
          controls
          preload="metadata"
          onPlay={() => setIsPosterVisible(false)}
          onEnded={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
            }
            setIsPosterVisible(Boolean(poster.src));
          }}
        />

        {poster.src && isPosterVisible ? (
          <button
            type="button"
            onClick={handlePosterClick}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-label={`Play ${title}`}
          >
            <img src={poster.src} alt={`${title} poster`} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/35 to-slate-950/65" />
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-white/16 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-md">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </div>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <EditableImage
        src={poster.src}
        alt={title}
        onSave={() => {}}
        editable={false}
        className={cn('absolute inset-0', getVideoAspectRatioClass(ratio))}
        imageClassName="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/35 to-slate-950/65" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-white/16 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-md">
          <Play className="ml-1 h-8 w-8 fill-white text-white" />
        </div>
        <p className="mt-6 text-xl font-semibold text-white md:text-2xl">
          Your demo video will appear here
        </p>
      </div>
    </>
  );
}

interface EditableContentCardGridProps {
  title: string;
  items: AdminContentCard[];
  onChange: (items: AdminContentCard[]) => void;
  tone?: 'default' | 'danger';
  compact?: boolean;
  editable?: boolean;
  isDark?: boolean;
}

function EditableContentCardGrid({
  title,
  items,
  onChange,
  tone = 'default',
  compact = false,
  editable = true,
  isDark = false,
}: EditableContentCardGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{title}</p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-300' : 'text-gray-500')}>
            Double-click the card text or icon badge to replace content. Add or remove cards as needed.
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() =>
              onChange([
                ...items,
                {
                  icon: 'Sparkles',
                  title: 'New card title',
                  description: 'Add the real section copy here.',
                },
              ])
            }
            className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
        ) : null}
      </div>

      <div className={cn('grid gap-6', compact ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3')}>
        {items.map((item, index) => (
            <div
              key={`${title}-card-${index}`}
              className={cn(
                'relative overflow-hidden rounded-[2rem] p-6 shadow-sm',
                isDark ? 'border border-slate-800 bg-slate-950' : 'border border-gray-200 bg-white',
              )}
            >
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                  className={cn(
                    'absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                    isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}

              <EditableCardGlyph
                iconName={item.icon}
                onSave={(value) =>
                  onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, icon: value } : entry)))
                }
                tone={tone}
                editable={editable}
              />
              <EditableText
                as="h3"
                value={item.title}
                onSave={(value) =>
                  onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: value } : entry)))
                }
                multiline
                editable={editable}
                className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}
                placeholder="Card title"
              />
              <EditableText
                as="p"
                value={item.description}
                onSave={(value) =>
                  onChange(
                    items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, description: value } : entry,
                    ),
                  )
                }
                multiline
                editable={editable}
                className={cn('mt-3', isDark ? 'text-slate-300' : 'text-gray-600')}
                placeholder="Card description"
              />
            </div>
        ))}
      </div>
    </div>
  );
}

function EditableAlertsList({
  items,
  onChange,
  isDark = false,
}: {
  items: AdminAlertItem[];
  onChange: (items: AdminAlertItem[]) => void;
  isDark?: boolean;
}) {
  const updateItem = (index: number, patch: Partial<AdminAlertItem>) => {
    onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>Top popup alerts</p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-300' : 'text-gray-500')}>
            Keep each alert short. These cards drop in like mobile notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              {
                ...applyAlertPreset(ALERT_PRESETS[0].id),
                title: 'New Alert',
                message: 'Replace this with the real offer or stock message.',
              },
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
        >
          <Plus className="h-4 w-4" />
          Add alert
        </button>
      </div>

      <div className="grid gap-4">
        {items.map((item, index) => (
          <div
            key={`alert-item-${index}`}
            className={cn(
              'rounded-[1.5rem] border border-[#FF7A00]/55 p-4 shadow-sm',
              isDark ? 'bg-slate-950' : 'bg-white',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#0E7C7B]">
                  Alert preset
                  <select
                    value={item.presetId ?? ALERT_PRESETS[0].id}
                    onChange={(event) => updateItem(index, applyAlertPreset(event.target.value, item))}
                    className={cn(
                      'mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-medium outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/10',
                      isDark
                        ? 'border-slate-800 bg-slate-900 text-white'
                        : 'border-gray-200 bg-white text-slate-900',
                    )}
                  >
                    {ALERT_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.badge} - {preset.title}
                      </option>
                    ))}
                  </select>
                </label>
                <EditableText
                  as="p"
                  value={item.title}
                  onSave={(value) => updateItem(index, { title: value })}
                  className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}
                />
                <EditableText
                  as="p"
                  value={item.message}
                  onSave={(value) => updateItem(index, { message: value })}
                  multiline
                  className={cn('mt-2 text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                  isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-500',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <EditableText
              as="span"
              value={item.badge}
              onSave={(value) => updateItem(index, { badge: value })}
              className="mt-3 inline-flex rounded-full bg-[#fff7ed] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c2410c]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableFaqList({
  items,
  onChange,
  isDark = false,
}: {
  items: AdminFaqItem[];
  onChange: (items: AdminFaqItem[]) => void;
  isDark?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>FAQ items</p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-300' : 'text-gray-500')}>
            Double-click each question or answer to edit it inline.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              {
                question: 'New question',
                answer: 'Add the answer for this FAQ item.',
              },
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={`faq-item-${index}`}
            className={cn(
              'rounded-[1.5rem] px-5 py-5',
              isDark ? 'border border-slate-800 bg-slate-950' : 'border border-gray-200 bg-gray-50',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <EditableText
                  as="h3"
                  value={item.question}
                  onSave={(value) =>
                    onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, question: value } : entry)))
                  }
                  multiline
                  className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}
                />
                <EditableText
                  as="p"
                  value={item.answer}
                  onSave={(value) =>
                    onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, answer: value } : entry)))
                  }
                  multiline
                  className={cn('mt-3', isDark ? 'text-slate-300' : 'text-gray-600')}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                  isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-gray-500',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableStringList({
  label,
  items,
  onChange,
  isDark = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  isDark?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{label}</p>
        <button
          type="button"
          onClick={() => onChange([...items, 'New list item'])}
          className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div
            key={`${label}-${index}`}
            className={cn(
              'flex items-center gap-3 rounded-[1.25rem] border px-4 py-3',
              isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
            )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef7f6] text-[#0E7C7B]">
              <Sparkles className="h-4 w-4" />
            </span>
            <EditableText
              as="p"
              value={item}
              onSave={(value) => onChange(items.map((entry, entryIndex) => (entryIndex === index ? value : entry)))}
              className={cn('flex-1 text-sm font-medium', isDark ? 'text-slate-200' : 'text-gray-700')}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-500',
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableCardGlyph({
  iconName,
  onSave,
  tone = 'default',
  editable = true,
}: {
  iconName: string;
  onSave: (value: string) => void;
  tone?: 'default' | 'danger';
  editable?: boolean;
}) {
  const editorContext = useContext(InlineEditorContext);
  const toneClassName =
    tone === 'danger' ? 'from-red-100 to-orange-100 text-red-600' : 'from-[#0E7C7B] to-[#2B7FFF] text-white';

  const handleOpenEditor = () => {
    if (!editorContext || !editable) {
      return;
    }

    editorContext.openTextEditor({
      title: 'Card icon or emoji',
      value: iconName,
      placeholder: 'Sparkles',
      description: 'Use a Lucide icon key like Sparkles, Zap, or ShieldCheck, or paste any emoji.',
      saveLabel: 'Save Icon',
      onSave,
    });
  };

  return (
    <button
      type="button"
      onDoubleClick={editable ? handleOpenEditor : undefined}
      className={cn(
        'mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br text-center',
        toneClassName,
        editable &&
          'cursor-pointer transition outline-offset-4 hover:outline hover:outline-1 hover:outline-dashed hover:outline-blue-400/50',
      )}
      title={editable ? 'Double-click to change icon or emoji' : undefined}
      aria-label="Edit card icon or emoji"
    >
      <CardGlyph iconName={iconName} className="h-8 w-8" emojiClassName="text-3xl leading-none" />
    </button>
  );
}

function EditableRegionalCustomerPools({
  pools,
  onChange,
  genderTarget,
  previewCountryCode,
  editable = true,
  isDark = false,
}: {
  pools: CustomerIdentityPools;
  onChange: (value: CustomerIdentityPools) => void;
  genderTarget: CustomerGenderTarget;
  previewCountryCode: SupportedCountryCode;
  editable?: boolean;
  isDark?: boolean;
}) {
  const editorContext = useContext(InlineEditorContext);
  const normalizedPools = useMemo(() => normalizeCustomerIdentityPools(pools), [pools]);
  const genderAudienceLabel =
    genderTarget === 'women'
      ? 'female names only'
      : genderTarget === 'men'
        ? 'male names only'
        : 'a mixed male and female name rotation';

  const updatePool = (
    countryCode: SupportedCountryCode,
    gender: CustomerNameGender,
    nextNames: string[],
  ) => {
    const cleanedNames = nextNames
      .map((name) => name.trim().replace(/\s+/g, ' '))
      .filter((name) => name.length > 0);

    onChange({
      ...normalizedPools,
      [countryCode]: {
        ...normalizedPools[countryCode],
        [gender]: cleanedNames,
      },
    });
  };

  const openAddNameEditor = (countryCode: SupportedCountryCode, gender: CustomerNameGender) => {
    if (!editable || !editorContext) {
      return;
    }

    editorContext.openTextEditor({
      title: `Add ${getCustomerPoolGenderLabel(gender).toLowerCase()} for ${getCountryCustomerPoolLabel(countryCode)}`,
      value: '',
      placeholder: 'Full customer name',
      description: 'This name becomes available to review cards and purchase alerts for this country.',
      saveLabel: 'Add Name',
      onSave: (value) => {
        if (!value.trim()) {
          return;
        }

        updatePool(countryCode, gender, [...normalizedPools[countryCode][gender], value]);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
            Regional customer name library
          </p>
          <p className={cn('mt-1 text-xs leading-5', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Live product pages automatically switch to the visitor&apos;s country and use {genderAudienceLabel}.
            The current canvas preview is reading from {getCountryCustomerPoolLabel(previewCountryCode)}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {SUPPORTED_COUNTRY_CODES.map((countryCode) => {
          const countryPool = normalizedPools[countryCode];

          return (
            <div
              key={`customer-pool-${countryCode}`}
              className={cn(
                'rounded-[1.6rem] border p-5',
                isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    {getCountryCustomerPoolLabel(countryCode)}
                  </p>
                  <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    {countryCode === previewCountryCode
                      ? 'Current live preview country'
                      : 'Available for auto-switch when visitors view this product'}
                  </p>
                </div>
                {countryCode === previewCountryCode ? (
                  <span className="inline-flex rounded-full bg-[#eef5ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2B63D9]">
                    Preview country
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4">
                {(['female', 'male'] as CustomerNameGender[]).map((gender) => (
                  <div
                    key={`${countryCode}-${gender}`}
                    className={cn(
                      'rounded-[1.3rem] border p-4',
                      isDark ? 'border-slate-800 bg-slate-900/80' : 'border-gray-200 bg-gray-50',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                          {getCustomerPoolGenderLabel(gender)}
                        </p>
                        <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                          {countryPool[gender].length} saved name{countryPool[gender].length === 1 ? '' : 's'}
                        </p>
                      </div>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => openAddNameEditor(countryCode, gender)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0a5f5e]"
                        >
                          <Plus className="h-4 w-4" />
                          Add name
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {countryPool[gender].map((name, index) => (
                        <div
                          key={`${countryCode}-${gender}-${index}`}
                          className={cn(
                            'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2',
                            isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-200 bg-white text-slate-800',
                          )}
                        >
                          <EditableText
                            as="span"
                            value={name}
                            onSave={(value) =>
                              updatePool(
                                countryCode,
                                gender,
                                countryPool[gender].map((entry, entryIndex) =>
                                  entryIndex === index ? value : entry,
                                ),
                              )
                            }
                            editable={editable}
                            className="max-w-[14rem] truncate text-xs font-semibold"
                            placeholder="Customer name"
                            editorTitle={`${getCountryCustomerPoolLabel(countryCode)} ${getCustomerPoolGenderLabel(gender)} name`}
                            editorDescription="Double-click to rename this saved customer identity."
                            editorSaveLabel="Save Name"
                          />
                          {editable ? (
                            <button
                              type="button"
                              onClick={() =>
                                updatePool(
                                  countryCode,
                                  gender,
                                  countryPool[gender].filter((_, entryIndex) => entryIndex !== index),
                                )
                              }
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                                isDark ? 'bg-slate-900 text-slate-400' : 'bg-gray-100 text-gray-500',
                              )}
                              aria-label={`Remove ${name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditableReviewsList({
  items,
  onChange,
  customerIdentityPools,
  genderTarget,
  previewCountryCode,
  editable = true,
  isDark = false,
}: {
  items: AdminReviewItem[];
  onChange: (items: AdminReviewItem[]) => void;
  customerIdentityPools: CustomerIdentityPools;
  genderTarget: CustomerGenderTarget;
  previewCountryCode: SupportedCountryCode;
  editable?: boolean;
  isDark?: boolean;
}) {
  const resolvedReviewNames = useMemo(() => {
    return items.map((item, index) =>
      getDeterministicCustomerNameForIndex({
        customerIdentityPools,
        countryCode: previewCountryCode,
        genderTarget,
        index,
        seed: `${item.text}-${item.image.src}-${item.avatar?.src ?? ''}`,
        fallbackName: item.name || 'Verified Customer',
      }),
    );
  }, [customerIdentityPools, genderTarget, items, previewCountryCode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
            Customer review cards
          </p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Edit the review text, star rating, background image and customer avatar directly from the live cards.
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() =>
              onChange([
                ...items,
                {
                  name: 'New Customer',
                  location: 'Lagos',
                  rating: 5,
                  text: 'Replace this with a real customer review.',
                  image: createImageAsset(),
                  avatar: createImageAsset(),
                },
              ])
            }
            className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
          >
            <Plus className="h-4 w-4" />
            Add review
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={`review-${index}`}
            className="relative min-h-[420px] overflow-hidden rounded-[2.25rem] shadow-[0_22px_50px_rgba(15,23,42,0.16)]"
          >
            <EditableImage
              src={item.image.src}
              alt={item.name}
              onSave={(src) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          ...entry,
                          image: {
                            ...entry.image,
                            src,
                            source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                          },
                        }
                      : entry,
                  ),
                )
              }
              className="absolute inset-0"
              imageClassName="h-full w-full object-cover"
              editable={editable}
              editorTitle="Customer review background image"
              editorDescription="Upload the main review image shown behind the customer quote."
              isDark={isDark}
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[40%] bg-gradient-to-t from-black via-[#17110e]/92 to-transparent" />

            <div className="absolute right-5 top-5 z-20">
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                    isDark ? 'bg-slate-900/90 text-slate-300' : 'bg-white/90 text-gray-500',
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[40%] flex-col justify-end p-6 md:p-7">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, starIndex) => {
                    const isActive = starIndex < Math.max(1, item.rating);

                    if (!editable) {
                      return (
                        <Star
                          key={`${item.name}-star-${starIndex}`}
                          className={cn(
                            'h-5 w-5',
                            isActive ? 'fill-[#FF7A00] text-[#FF7A00]' : 'text-white/28',
                          )}
                        />
                      );
                    }

                    return (
                      <button
                        key={`${item.name}-star-${starIndex}`}
                        type="button"
                        onClick={() =>
                          onChange(
                            items.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, rating: starIndex + 1 } : entry,
                            ),
                          )
                        }
                        className="rounded-full p-0.5 transition hover:bg-white/10"
                        aria-label={`Set rating to ${starIndex + 1} stars`}
                      >
                        <Star
                          className={cn(
                            'h-5 w-5',
                            isActive ? 'fill-[#FF7A00] text-[#FF7A00]' : 'text-white/28',
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                {editable ? (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                    {Math.max(1, item.rating)}/5 rating
                  </span>
                ) : null}
              </div>
              <EditableText
                as="p"
                value={item.text}
                onSave={(value) =>
                  onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, text: value } : entry)))
                }
                multiline
                editable={editable}
                className="mb-5 text-sm leading-7 text-white/88 md:text-base"
              />
              <div className="flex items-center gap-3">
                <EditableImage
                  src={item.avatar?.src || item.image.src}
                  alt={`${item.name} avatar`}
                  onSave={(src) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index
                          ? {
                              ...entry,
                              avatar: {
                                ...(entry.avatar ?? createImageAsset()),
                                src,
                                source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                                kind: 'image',
                              },
                            }
                          : entry,
                      ),
                    )
                  }
                  className="h-12 w-12 overflow-hidden rounded-full border border-white/35 shadow-md"
                  imageClassName="h-full w-full object-cover"
                  editable={editable}
                  editorTitle="Customer avatar"
                  editorDescription="Upload the small customer avatar shown beside the review name."
                  isDark={isDark}
                />
                <div>
                  <p className="font-semibold text-white">{resolvedReviewNames[index] ?? item.name}</p>
                  <p className="text-sm text-white/66">
                    Auto-switched for {getCountryCustomerPoolLabel(previewCountryCode)}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EditablePackagesList({
  items,
  currency,
  onChange,
  isDark = false,
}: {
  items: AdminOfferPackage[];
  currency: AdminProductDraft['currency'];
  onChange: (items: AdminOfferPackage[]) => void;
  isDark?: boolean;
}) {
  const cardClassName = isDark
    ? 'border border-slate-800 bg-slate-950 text-white shadow-[0_18px_40px_rgba(0,0,0,0.32)]'
    : 'bg-white text-stone-950 shadow-2xl';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-white')}>
            Offer packages
          </p>
          <p className={cn('mt-1 text-xs', isDark ? 'text-slate-300' : 'text-white/70')}>
            Edit package titles, pricing, short descriptions and package images inline.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              createAutoPricedOfferPackage(items),
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0E7C7B] transition hover:bg-gray-100"
        >
          <Plus className="h-4 w-4" />
          Add package
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div key={`package-${index}`} className={cn('relative rounded-2xl p-8 text-center', cardClassName)}>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              className={cn(
                'absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-500',
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <EditableImage
              src={item.image?.src ?? ''}
              alt={`${item.title} package`}
              onSave={(src) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          ...entry,
                          image: {
                            ...(entry.image ?? createImageAsset()),
                            src,
                            source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                            kind: 'image',
                          },
                        }
                      : entry,
                  ),
                )
              }
              className={cn(
                'mx-auto mb-4 h-24 w-24 overflow-hidden rounded-[1.4rem]',
                isDark ? 'bg-slate-900' : 'bg-[#f4ede3]',
              )}
              imageClassName="h-full w-full object-cover"
              editorTitle="Package image"
              editorDescription="Upload the specific image used for this package across checkout previews."
              isDark={isDark}
            />
            <EditableText
              as="h3"
              value={item.title}
              onSave={(value) =>
                onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: value } : entry)))
              }
              multiline
              className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}
            />
            <EditableText
              as="p"
              value={String(item.oldPrice)}
              onSave={(value) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, oldPrice: Number(value.replace(/[^\d.]/g, '')) || entry.oldPrice }
                      : entry,
                  ),
                )
              }
              className={cn(
                'mt-2 text-sm font-semibold line-through',
                isDark ? 'text-slate-400' : 'text-gray-500',
              )}
            />
            <EditableText
              as="p"
              value={String(item.price)}
              onSave={(value) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, price: Number(value.replace(/[^\d.]/g, '')) || entry.price }
                      : entry,
                  ),
                )
              }
              className="mt-1 text-4xl font-bold text-[#0E7C7B]"
            />
            <p className="mt-2 text-sm font-semibold text-emerald-600">
              Save {formatDraftCurrency(Math.max(item.oldPrice - item.price, 0), currency)}
            </p>
            <EditableText
              as="p"
              value={item.description}
              onSave={(value) =>
                onChange(items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, description: value } : entry)))
              }
              className={cn('mt-3', isDark ? 'text-slate-300' : 'text-gray-600')}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface InlineEditableProductCanvasProps {
  pageData: AdminProductDraft;
  deviceView: 'desktop' | 'mobile';
  onChange: (updater: (current: AdminProductDraft) => AdminProductDraft) => void;
  readOnly?: boolean;
}

export function InlineEditableProductCanvas({
  pageData,
  deviceView,
  onChange,
  readOnly = false,
}: InlineEditableProductCanvasProps) {
  const { countryCode } = useLocale();
  const isDark = pageData.themeMode === 'dark';
  const isMobileView = deviceView === 'mobile';
  const heroSlides = useMemo(() => getHeroSlides(pageData), [pageData]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null);
  const appendSlideUploadRef = useRef<HTMLInputElement | null>(null);
  const [editorPanel, setEditorPanel] = useState<EditorPanelState>(null);
  const [checkoutPreviewMode, setCheckoutPreviewMode] = useState<'selection' | 'form'>('selection');

  useEffect(() => {
    setActiveSlide((current) => Math.min(current, Math.max(heroSlides.length - 1, 0)));
  }, [heroSlides.length]);

  useEffect(() => {
    if (readOnly) {
      setEditorPanel(null);
    }
  }, [readOnly]);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_SLIDE_DURATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [heroSlides.length]);

  const updatePageData = (updater: (current: AdminProductDraft) => AdminProductDraft) => {
    if (readOnly) {
      return;
    }

    onChange(updater);
  };

  const openTextEditor = (config: TextEditorPanelConfig) => {
    if (readOnly) {
      return;
    }

    setEditorPanel({
      mode: 'text',
      ...config,
    });
  };

  const openMediaEditor = (config: MediaEditorPanelConfig) => {
    if (readOnly) {
      return;
    }

    setEditorPanel({
      mode: 'media',
      ...config,
    });
  };

  const updateHeroSlides = (slides: AdminMediaAsset[]) => {
    const sanitizedSlides = slides.length > 0 ? slides : [createImageAsset()];
    const primarySlide = sanitizedSlides.find((item) => hasMedia(item)) ?? sanitizedSlides[0];

    updatePageData((current) => ({
      ...current,
      coverImage: hasMedia(primarySlide) ? primarySlide : current.coverImage,
      sections: {
        ...current.sections,
        hero: {
          ...current.sections.hero,
          image: primarySlide,
          images: sanitizedSlides,
        },
      },
    }));
  };

  const updateHeroText = (
    field: 'badge' | 'title' | 'subtitle' | 'ctaText',
    value: string,
  ) => {
    updatePageData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        hero: {
          ...current.sections.hero,
          [field]: value,
        },
      },
    }));
  };

  const updateFeatureSection = (
    field: 'title' | 'subtitle' | 'visible',
    value: string | boolean,
  ) => {
    updatePageData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        features: {
          ...current.sections.features,
          [field]: value,
        },
      },
    }));
  };

  const updateFeatureCard = (index: number, patch: Partial<AdminContentCard>) => {
    updatePageData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        features: {
          ...current.sections.features,
          items: current.sections.features.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, ...patch } : item,
          ),
        },
      },
    }));
  };

  const updateSection = <K extends keyof AdminProductDraft['sections']>(
    key: K,
    patch: Partial<AdminProductDraft['sections'][K]>,
  ) => {
    updatePageData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [key]: {
          ...current.sections[key],
          ...patch,
        },
      },
    }));
  };

  const handleUploadToLibrary = async (
    file: File,
    kind: 'image' | 'video',
  ): Promise<AdminProductLibraryItem> => {
    const validationError = validateProductLibraryUpload({
      file,
      kind,
      existingCount: countLibraryItemsByKind(pageData.mediaLibrary, kind),
    });

    if (validationError) {
      throw new Error(validationError);
    }

    const uploaded = await uploadAssetToSupabaseStorageDetailed(
      file,
      `product-library/${pageData.slug || pageData.id}`,
    );

    const libraryItem = createAdminProductLibraryItem(file.name, {
      src: uploaded.publicUrl,
      source: 'upload',
      kind,
      storagePath: uploaded.storagePath,
    });

    updatePageData((current) => appendMediaLibraryItemToDraft(current, libraryItem));

    return libraryItem;
  };

  const handleDeleteLibraryItem = async (item: AdminProductLibraryItem) => {
    if (item.asset.source === 'upload') {
      await deleteAssetFromSupabaseStorage(item.asset.storagePath || item.asset.src);
    }

    updatePageData((current) => removeMediaAssetFromDraft(current, item.asset));
  };

  const handleAppendSlideUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const libraryItem = await handleUploadToLibrary(file, 'image');
      updateHeroSlides([
        ...heroSlides,
        {
          src: libraryItem.asset.src,
          source: libraryItem.asset.source,
          kind: 'image',
        },
      ]);
      setActiveSlide(heroSlides.length);
    } finally {
      event.target.value = '';
    }
  };

  const handleAppendSlideUrl = () => {
    openMediaEditor({
      title: 'Hero carousel slide',
      value: '',
      kind: 'image',
      accept: 'image/*',
      placeholder: 'Paste the hero slide image URL',
      saveLabel: 'Add Slide',
      onSave: (value, source) => {
        updateHeroSlides([
          ...heroSlides,
          {
            src: value,
            source,
            kind: 'image',
          },
        ]);
        setActiveSlide(heroSlides.length);
      },
    });
  };

  const handleRemoveSlide = (index: number) => {
    updateHeroSlides(heroSlides.filter((_, slideIndex) => slideIndex !== index));

    if (activeSlide >= index) {
      setActiveSlide((current) => Math.max(0, current - 1));
    }
  };

  const handleHeroSlideDrop = (targetIndex: number) => {
    if (draggedSlideIndex === null || draggedSlideIndex === targetIndex) {
      setDraggedSlideIndex(null);
      return;
    }

    updateHeroSlides(reorderItems(heroSlides, draggedSlideIndex, targetIndex));
    setActiveSlide(targetIndex);
    setDraggedSlideIndex(null);
  };

  const handleAddFeatureCard = () => {
    updatePageData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        features: {
          ...current.sections.features,
          visible: true,
          items: [
            ...current.sections.features.items,
            {
              icon: 'Sparkles',
              title: 'New Feature',
              description: 'Double-click this text to replace it with the real feature copy.',
            },
          ],
        },
      },
    }));
  };

  const handleRemoveFeatureCard = (index: number) => {
    updatePageData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        features: {
          ...current.sections.features,
          items: current.sections.features.items.filter((_, itemIndex) => itemIndex !== index),
        },
      },
    }));
  };

  const frameClassName = isMobileView
    ? 'w-full max-w-[390px] rounded-[2.8rem] bg-slate-950 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.22)]'
    : cn(
        'w-full rounded-[2.5rem] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)]',
        isDark ? 'border border-slate-800 bg-slate-950' : 'border border-gray-200 bg-white',
      );
  const shellClassName = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-950';
  const canvasBackgroundClassName = isDark ? 'bg-slate-950' : 'bg-[#f8f8f8]';
  const mutedTextClassName = isDark ? 'text-slate-300' : 'text-slate-600';
  const editorSurfaceClassName = isDark
    ? 'border border-slate-800 bg-slate-950 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)]'
    : 'border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]';
  const marqueeImages = pageData.sections.featureMarquee.images.filter((item) => hasMedia(item));
  const showcaseImages = pageData.sections.showcase.images.filter((item) => hasMedia(item));
  const checkoutPreviewGallery = [
    ...heroSlides.map((item) => item.src),
    ...showcaseImages.map((item) => item.src),
    pageData.coverImage.src,
  ].filter((src, index, collection): src is string => Boolean(src) && collection.indexOf(src) === index);
  const checkoutPreviewBundles = pageData.sections.offer.packages.map((pkg, index) => ({
    title: pkg.title,
    description: pkg.description,
    oldPrice: formatDraftCurrency(pkg.oldPrice, pageData.currency),
    promoPrice: formatDraftCurrency(pkg.price, pageData.currency),
    isBestValue: pkg.isBestValue,
    spotlight: index === 0 ? 'Easy starter bundle' : index === 1 ? 'Most popular' : 'Maximum savings',
    image: pkg.image?.src || checkoutPreviewGallery[index % Math.max(checkoutPreviewGallery.length, 1)] || '',
  }));
  const checkoutPreviewBundle = checkoutPreviewBundles[0] ?? null;
  const orderPackageOptions = pageData.sections.offer.packages.map((pkg, index) => ({
    id: pkg.title.match(/buy\s+(\d+)/i)?.[1] ?? String(index + 1),
    label: `${pkg.title} - ${pkg.description} - ${formatDraftCurrency(pkg.price, pageData.currency)}`,
  }));

  return (
    <InlineEditorContext.Provider value={{ openTextEditor, openMediaEditor }}>
      <section className="space-y-6">
      <div className={cn('rounded-[2rem] p-6', editorSurfaceClassName)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#0E7C7B]/15 bg-[#eef7f6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0E7C7B]">
                Live inline editor
              </span>
              <span className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                isDark ? 'border border-slate-800 bg-slate-900 text-slate-300' : 'border border-gray-200 bg-white text-gray-500',
              )}>
                {deviceView} view
              </span>
            </div>
            <h2 className={cn('mt-4 text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              Double-click the live Hero and Features template to update content directly on the canvas.
            </h2>
            <p className={cn('mt-2 max-w-3xl text-sm leading-6', isDark ? 'text-slate-300' : 'text-gray-600')}>
              Text updates save straight into the page state on blur or Enter. Double-click hero
              images to replace them, or use the slide rail below to upload, add URLs and reorder
              the carousel.
            </p>
          </div>

          {!readOnly ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  updatePageData((current) => ({
                    ...current,
                    sections: {
                      ...current.sections,
                      hero: {
                        ...current.sections.hero,
                        visible: !current.sections.hero.visible,
                      },
                    },
                  }))
                }
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {pageData.sections.hero.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {pageData.sections.hero.visible ? 'Hide hero' : 'Show hero'}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateFeatureSection('visible', !pageData.sections.features.visible)
                }
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {pageData.sections.features.visible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {pageData.sections.features.visible ? 'Hide features' : 'Show features'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-center">
        <div className={frameClassName}>
          <div className={cn('overflow-hidden rounded-[2.1rem]', shellClassName, canvasBackgroundClassName)}>
            {isMobileView ? (
              <div
                className={cn(
                  'flex items-center justify-between px-4 py-3 text-[11px] font-semibold',
                  isDark ? 'text-white/80' : 'text-gray-500',
                )}
              >
                <span>9:41</span>
                <span>{pageData.pageName}</span>
              </div>
            ) : (
              <div
                className={cn(
                  'border-b px-5 py-4',
                  isDark ? 'border-slate-800 text-slate-300' : 'border-gray-200 text-gray-500',
                )}
              >
                <p className="text-xs uppercase tracking-[0.18em]">
                  Current Crevice Brush template canvas
                </p>
              </div>
            )}

            <div className={cn('space-y-8 px-3 pb-4 pt-2 sm:px-4 sm:pb-6', canvasBackgroundClassName)}>
              {pageData.sections.hero.visible ? (
                <section className="space-y-4">
                  <div className="relative isolate overflow-hidden rounded-[2.4rem] bg-[#f6f4ef] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] md:p-5">
                    <div className="hero-frame relative h-[80vh] min-h-[520px] overflow-hidden rounded-[2.2rem] md:h-[700px] md:rounded-[2.7rem]">
                      <div className="hero-carousel-media absolute inset-0">
                        {heroSlides.map((slide, index) => (
                          <div
                            key={`${slide.src || 'empty-slide'}-${index}`}
                            className={cn(
                              'hero-carousel-slide absolute inset-0',
                              index === activeSlide && 'is-active',
                            )}
                          >
                            <EditableImage
                              src={slide.src}
                              alt={`${pageData.productName} slide ${index + 1}`}
                              editable={!readOnly && index === activeSlide}
                              onSave={(src) => {
                                const nextSlides = heroSlides.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        src,
                                        source: (src.startsWith('data:') ? 'upload' : 'url') as
                                          | 'upload'
                                          | 'url',
                                      }
                                    : item,
                                );
                                updateHeroSlides(nextSlides);
                              }}
                              className="h-full w-full"
                              imageClassName="hero-carousel-image h-full w-full object-cover"
                              isDark={isDark}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="hero-vignette pointer-events-none absolute inset-0 z-10" />

                      <div className="relative z-20 flex h-full items-end">
                        <div className="mx-auto flex h-full w-full max-w-6xl items-end p-5 md:p-10">
                          <div className="hero-copy-shell relative max-w-[36rem] space-y-4 pt-2 md:space-y-6 md:pt-4">
                            <div className="hero-copy-pocket absolute inset-x-[-1rem] top-[-8rem] bottom-[-1.75rem] -z-10 rounded-[2.2rem] md:inset-x-[-1.5rem] md:top-[-10rem] md:bottom-[-2rem] md:rounded-[2.6rem]" />

                            <EditableText
                              as="p"
                              value={pageData.sections.hero.badge}
                              onSave={(value) => updateHeroText('badge', value)}
                              editable={!readOnly}
                              className="text-xs font-semibold uppercase tracking-[0.26em] text-white/58 md:text-sm"
                              placeholder="Limited Time Offer"
                            />

                            <div className="space-y-2 md:space-y-3">
                              <EditableText
                                value={pageData.productName}
                                onSave={(value) =>
                                  updatePageData((current) => ({
                                    ...current,
                                    productName: value,
                                  }))
                                }
                                editable={!readOnly}
                                className="text-sm font-semibold uppercase tracking-[0.22em] text-white/58"
                                placeholder="Product name"
                              />

                              <EditableText
                                as="h1"
                                value={pageData.sections.hero.title || pageData.productName}
                                onSave={(value) => updateHeroText('title', value)}
                                editable={!readOnly}
                                multiline
                                className="max-w-[10ch] font-sans text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl md:max-w-[11ch] md:text-6xl"
                                placeholder="Hero headline"
                              />

                              <EditableText
                                as="p"
                                value={pageData.sections.hero.subtitle}
                                onSave={(value) => updateHeroText('subtitle', value)}
                                editable={!readOnly}
                                multiline
                                className="max-w-xl text-base leading-relaxed text-white/82 sm:text-lg"
                                placeholder="Add the hero subtitle"
                              />
                              <EditableText
                                as="p"
                                value={`${getProductCategoryDisplay(pageData)} | ${pageData.targetAudience}`}
                                onSave={() => undefined}
                                editable={false}
                                className="text-sm font-medium text-white/52 sm:text-base"
                                placeholder="Category | Target audience"
                              />
                            </div>

                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                              <div className="inline-flex flex-col rounded-full border border-[#7fb2ff]/40 bg-gradient-to-br from-[#2B7FFF] to-[#1450b8] px-5 py-3 text-white shadow-[0_18px_40px_rgba(20,80,184,0.34)]">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                                  Price
                                </span>
                                <EditableText
                                  as="span"
                                  value={String(pageData.basePrice)}
                                  onSave={(value) =>
                                    updatePageData((current) => ({
                                      ...current,
                                      basePrice: Number(value.replace(/[^\d.]/g, '')) || current.basePrice,
                                    }))
                                  }
                                  editable={!readOnly}
                                  className="text-lg font-bold leading-none md:text-xl"
                                  placeholder="15000"
                                />
                              </div>

                              <button
                                type="button"
                                className="w-full rounded-full border border-white/70 bg-white px-7 py-4 text-base font-semibold text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:w-auto"
                              >
                                <EditableText
                                  as="span"
                                  value={pageData.sections.hero.ctaText}
                                  onSave={(value) => updateHeroText('ctaText', value)}
                                  editable={!readOnly}
                                  className="inline-flex items-center gap-2"
                                  placeholder="Buy Now"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!readOnly ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Hero carousel slides
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Drag to reorder. The first slide becomes the primary hero image.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleAppendSlideUrl}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                                isDark
                                  ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                              )}
                            >
                              <ImagePlus className="h-4 w-4" />
                              Add URL slide
                            </button>
                            <button
                              type="button"
                              onClick={() => appendSlideUploadRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
                            >
                              <Upload className="h-4 w-4" />
                              Upload slide
                            </button>
                            <input
                              ref={appendSlideUploadRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAppendSlideUpload}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {heroSlides.map((slide, index) => (
                            <div
                              key={`${slide.src || 'hero-slide'}-thumb-${index}`}
                              draggable
                              onDragStart={() => setDraggedSlideIndex(index)}
                              onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                              onDrop={() => handleHeroSlideDrop(index)}
                              className={cn(
                                'min-w-[168px] overflow-hidden rounded-[1.4rem] border shadow-sm transition',
                                index === activeSlide
                                  ? cn(
                                      'border-[#0E7C7B] ring-2 ring-[#0E7C7B]/10',
                                      isDark ? 'bg-slate-950' : 'bg-white',
                                    )
                                  : isDark
                                    ? 'border-slate-800 bg-slate-950'
                                    : 'border-gray-200 bg-white',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveSlide(index)}
                                className="block w-full text-left"
                              >
                                <div className={cn('relative h-28 w-full', isDark ? 'bg-slate-900' : 'bg-gray-100')}>
                                  {slide.src ? (
                                    <img
                                      src={slide.src}
                                      alt={`Hero slide ${index + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className={cn('flex h-full w-full items-center justify-center', isDark ? 'text-slate-500' : 'text-gray-400')}>
                                      <ImagePlus className="h-6 w-6" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                                    <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                      {index === 0 ? 'Primary' : `Slide ${index + 1}`}
                                    </span>
                                    <span className={cn('rounded-full p-1', isDark ? 'bg-slate-900/90 text-slate-300' : 'bg-white/90 text-slate-500')}>
                                      <GripVertical className="h-3.5 w-3.5" />
                                    </span>
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center justify-between gap-2 px-3 py-3">
                                <span className={cn('text-xs font-medium', isDark ? 'text-slate-300' : 'text-gray-600')}>
                                  {slide.src ? 'Double-click main image to replace' : 'Empty slide'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlide(index)}
                                  className={cn(
                                    'inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                                    isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-500',
                                  )}
                                  aria-label={`Remove slide ${index + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleAppendSlideUrl}
                            className={cn(
                              'flex min-w-[168px] flex-col items-center justify-center gap-3 rounded-[1.4rem] border border-dashed px-4 py-6 text-center transition hover:border-[#0E7C7B]/40',
                              isDark
                                ? 'border-slate-700 bg-slate-950 hover:bg-slate-900'
                                : 'border-gray-300 bg-white hover:bg-[#f8fbfb]',
                            )}
                          >
                            <Plus className="h-6 w-6 text-[#0E7C7B]" />
                            <span className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>
                              Add another slide
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-center gap-2">
                        {heroSlides.map((slide, index) => (
                          <span
                            key={`${slide.src || 'hero-dot'}-${index}`}
                            className={cn(
                              'h-2.5 rounded-full transition-all',
                              index === activeSlide ? 'w-7 bg-[#0E7C7B]' : 'w-2.5 bg-gray-300',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <div
                  className={cn(
                    'rounded-[2rem] border border-dashed px-6 py-10 text-center',
                    isDark ? 'border-slate-700 bg-slate-950' : 'border-gray-300 bg-white',
                  )}
                >
                  <p className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    Hero section is hidden
                  </p>
                  <p className={cn('mt-2 text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    Use the section toggle above to bring the hero back into the live canvas.
                  </p>
                </div>
              )}

              {pageData.sections.features.visible ? (
                <section
                  id="product-feature-details"
                  className={cn(
                    'rounded-[2rem] bg-gradient-to-b py-16 md:py-24',
                    isDark ? 'from-slate-950 to-slate-900' : 'from-gray-50 to-white',
                  )}
                >
                  <div className="mx-auto px-4">
                    <div className="mb-12 text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.features.title}
                        onSave={(value) => updateFeatureSection('title', value)}
                        editable={!readOnly}
                        multiline
                        className={cn(
                          'mx-auto max-w-3xl text-3xl font-bold md:text-5xl',
                          isDark ? 'text-white' : 'text-gray-900',
                        )}
                        placeholder="Why This Product Stands Out"
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.features.subtitle}
                        onSave={(value) => updateFeatureSection('subtitle', value)}
                        editable={!readOnly}
                        multiline
                        className={cn(
                          'mx-auto mt-4 max-w-3xl text-xl',
                          isDark ? 'text-slate-300' : 'text-gray-600',
                        )}
                        placeholder="Add the supporting features section subtitle"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4 xl:gap-8">
                      {pageData.sections.features.items.map((feature, index) => {
                        return (
                          <div
                            key={`inline-feature-${index}`}
                            className={cn(
                              'card-3d relative overflow-hidden rounded-[2rem] p-8',
                              isDark
                                ? 'border border-slate-800 !bg-slate-900 shadow-[0_18px_40px_rgba(2,6,23,0.55)]'
                                : 'border border-white/70 bg-white',
                            )}
                          >
                            {!readOnly ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveFeatureCard(index)}
                                className={cn(
                                  'absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500',
                                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-500',
                                )}
                                aria-label={`Remove feature card ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}

                            <EditableCardGlyph
                              iconName={feature.icon}
                              onSave={(value) => updateFeatureCard(index, { icon: value })}
                              editable={!readOnly}
                            />
                            <EditableText
                              as="h3"
                              value={feature.title}
                              onSave={(value) => updateFeatureCard(index, { title: value })}
                              editable={!readOnly}
                              multiline
                              className={cn(
                                'text-xl font-bold',
                                isDark ? 'text-white' : 'text-gray-900',
                              )}
                              placeholder="Feature title"
                            />
                            <EditableText
                              as="p"
                              value={feature.description}
                              onSave={(value) => updateFeatureCard(index, { description: value })}
                              editable={!readOnly}
                              multiline
                              className={cn(
                                'mt-3 leading-relaxed',
                                isDark ? 'text-slate-300' : 'text-gray-600',
                              )}
                              placeholder="Feature description"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {!readOnly ? (
                      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                        <p className={cn('text-sm', mutedTextClassName)}>
                          Double-click any feature title or description to replace the mock copy.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddFeatureCard}
                          className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
                        >
                          <Plus className="h-4 w-4" />
                          Add feature card
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <div
                  className={cn(
                    'rounded-[2rem] border border-dashed px-6 py-10 text-center',
                    isDark ? 'border-slate-700 bg-slate-950' : 'border-gray-300 bg-white',
                  )}
                >
                  <p className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    Features section is hidden
                  </p>
                  <p className={cn('mt-2 text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    Turn the section back on when you want the feature cards to appear on the template.
                  </p>
                </div>
              )}

              {pageData.sections.seeInAction.visible ? (
                <section className={cn('rounded-[2rem] py-12 md:py-16', isDark ? 'bg-slate-950' : 'bg-white')}>
                  <div className="mx-auto max-w-5xl px-4">
                    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 text-center md:text-left">
                      <div className="mx-auto md:mx-0">
                        <EditableText
                          as="span"
                          value={pageData.sections.seeInAction.badge}
                          onSave={(value) => updateSection('seeInAction', { badge: value })}
                          className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9]"
                        />
                        <EditableText
                          as="h2"
                          value={pageData.sections.seeInAction.title}
                          onSave={(value) => updateSection('seeInAction', { title: value })}
                          multiline
                          className={cn(
                            'mt-4 text-3xl font-bold tracking-tight md:text-5xl',
                            isDark ? 'text-white' : 'text-slate-950',
                          )}
                        />
                        <EditableText
                          as="p"
                          value={pageData.sections.seeInAction.subtitle}
                          onSave={(value) => updateSection('seeInAction', { subtitle: value })}
                          multiline
                          className={cn(
                            'mx-auto mt-4 max-w-3xl text-base leading-7 md:text-lg md:mx-0',
                            isDark ? 'text-slate-300' : 'text-slate-600',
                          )}
                        />
                      </div>
                      {!readOnly ? (
                        <SectionVisibilityToggle
                          visible={pageData.sections.seeInAction.visible}
                          label="See in Action"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('seeInAction', {
                              visible: !pageData.sections.seeInAction.visible,
                            })
                          }
                        />
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        'overflow-hidden rounded-[2rem] border shadow-[0_18px_50px_rgba(15,23,42,0.08)]',
                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50',
                      )}
                    >
                      <div className={cn('relative overflow-hidden', isDark ? 'bg-slate-950' : 'bg-slate-100')}>
                        <InlineVideoPreview
                          title={pageData.sections.seeInAction.title}
                          poster={pageData.sections.seeInAction.poster}
                          video={pageData.sections.seeInAction.video}
                          ratio={pageData.sections.seeInAction.ratio}
                        />
                      </div>
                    </div>

                    {!readOnly ? (
                      <div className="mt-4 grid gap-4">
                        <VideoRatioSelector
                          value={pageData.sections.seeInAction.ratio}
                          onChange={(ratio) => updateSection('seeInAction', { ratio })}
                          isDark={isDark}
                        />
                        <EditableAssetControls
                          label="See in Action poster"
                          asset={pageData.sections.seeInAction.poster}
                          kind="image"
                          accept="image/*"
                          deleteLabel="Delete Poster"
                          hideAssetValue
                          isDark={isDark}
                          onSave={(asset) => updateSection('seeInAction', { poster: asset })}
                        />
                        <EditableAssetControls
                          label="See in Action video"
                          asset={pageData.sections.seeInAction.video}
                          kind="video"
                          accept="video/*"
                          deleteLabel="Delete Video"
                          isDark={isDark}
                          onSave={(asset) => updateSection('seeInAction', { video: asset })}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="See in Action section is hidden." isDark={isDark} />
              )}

              {pageData.sections.headline.visible ? (
                <section className={cn('py-10 md:py-14', isDark ? 'bg-slate-950' : 'bg-white')}>
                  <div className="mx-auto max-w-4xl px-4">
                    <div
                      className={cn(
                        'rounded-[2rem] border px-6 py-8 text-center shadow-[0_12px_34px_rgba(15,23,42,0.06)] md:px-10 md:py-10',
                        isDark
                          ? 'border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
                          : 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50',
                      )}
                    >
                      <div className="mb-4 flex justify-end">
                        {!readOnly ? (
                          <SectionVisibilityToggle
                            visible={pageData.sections.headline.visible}
                            label="Headline"
                            isDark={isDark}
                            onToggle={() =>
                              updateSection('headline', {
                                visible: !pageData.sections.headline.visible,
                              })
                            }
                          />
                        ) : null}
                      </div>
                      <EditableText
                        as="p"
                        value={pageData.sections.headline.eyebrow}
                        onSave={(value) => updateSection('headline', { eyebrow: value })}
                        className="text-xs font-semibold uppercase tracking-[0.26em] text-[#2B63D9]"
                      />
                      <EditableText
                        as="h2"
                        value={pageData.sections.headline.title}
                        onSave={(value) => updateSection('headline', { title: value })}
                        multiline
                        className={cn(
                          'mt-4 text-3xl font-bold tracking-tight md:text-5xl',
                          isDark ? 'text-white' : 'text-slate-950',
                        )}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.headline.description}
                        onSave={(value) => updateSection('headline', { description: value })}
                        multiline
                        className={cn(
                          'mx-auto mt-4 max-w-3xl text-base leading-7 md:text-lg',
                          isDark ? 'text-slate-300' : 'text-slate-600',
                        )}
                      />
                    </div>
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Product headline section is hidden." isDark={isDark} />
              )}

              {pageData.sections.alerts.visible ? (
                <section className={cn('space-y-5 rounded-[2rem] p-6', editorSurfaceClassName)}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7A00]">
                        Notification Alerts
                      </p>
                      <h3 className={cn('mt-2 text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>Top popup alerts</h3>
                    </div>
                    {!readOnly ? (
                      <SectionVisibilityToggle
                        visible={pageData.sections.alerts.visible}
                        label="Alerts"
                        isDark={isDark}
                        onToggle={() =>
                          updateSection('alerts', {
                            visible: !pageData.sections.alerts.visible,
                          })
                        }
                      />
                    ) : null}
                  </div>
                  <EditableAlertsList
                    items={pageData.sections.alerts.items}
                    onChange={(items) => updateSection('alerts', { items })}
                    isDark={isDark}
                  />
                </section>
              ) : (
                <HiddenInlineMessage message="Top popup alerts are hidden." isDark={isDark} />
              )}

              {pageData.sections.featureMarquee.visible ? (
                <section
                  className={cn(
                    'rounded-[2rem] py-14 md:py-20',
                    isDark
                      ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'
                      : 'bg-gradient-to-b from-white via-slate-50 to-white',
                  )}
                >
                  <div className="px-4">
                    <div className="mx-auto max-w-3xl text-center">
                      <EditableText
                        as="span"
                        value={pageData.sections.featureMarquee.title}
                        onSave={(value) => updateSection('featureMarquee', { title: value })}
                        className={cn(
                          'inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#2B7FFF] shadow-sm',
                          isDark ? 'border-slate-700 bg-slate-900' : 'border-[#d7e6ff] bg-white',
                        )}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.featureMarquee.subtitle}
                        onSave={(value) => updateSection('featureMarquee', { subtitle: value })}
                        multiline
                        className={cn(
                          'mt-4 text-base leading-7 md:text-lg',
                          isDark ? 'text-slate-300' : 'text-slate-600',
                        )}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mt-5 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.featureMarquee.visible}
                          label="Feature Marquee"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('featureMarquee', {
                              visible: !pageData.sections.featureMarquee.visible,
                            })
                          }
                        />
                      </div>
                    ) : null}
                    {marqueeImages.length > 0 ? (
                      <div className="feature-marquee-shell mt-10 flex flex-col gap-4 md:gap-6">
                        <div className="feature-marquee-row">
                          <div className="feature-marquee-track feature-marquee-track-left">
                            {[...marqueeImages, ...marqueeImages].map((image, index) => (
                              <div
                                key={`${image.src || 'marquee-top'}-${index}`}
                                className={cn(
                                  'w-[180px] shrink-0 rounded-[1.8rem] border p-2.5 shadow-sm sm:w-[205px] lg:w-[220px]',
                                  isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white',
                                )}
                              >
                                <div className={cn('aspect-[4/5] overflow-hidden rounded-[1.35rem]', isDark ? 'bg-slate-900' : 'bg-slate-100')}>
                                  <img
                                    src={image.src}
                                    alt={`Marquee ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="feature-marquee-row">
                          <div className="feature-marquee-track feature-marquee-track-right">
                            {[...marqueeImages.slice().reverse(), ...marqueeImages.slice().reverse()].map((image, index) => (
                              <div
                                key={`${image.src || 'marquee-bottom'}-${index}`}
                                className={cn(
                                  'w-[180px] shrink-0 rounded-[1.8rem] border p-2.5 shadow-sm sm:w-[205px] lg:w-[220px]',
                                  isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white',
                                )}
                              >
                                <div className={cn('aspect-[4/5] overflow-hidden rounded-[1.35rem]', isDark ? 'bg-slate-900' : 'bg-slate-100')}>
                                  <img
                                    src={image.src}
                                    alt={`Marquee ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {!readOnly ? (
                      <div className="mt-8">
                        <EditableMediaList
                          title="Feature marquee images"
                          items={pageData.sections.featureMarquee.images}
                          onChange={(images) => updateSection('featureMarquee', { images })}
                          allowMultipleUpload
                          maxBatchUpload={20}
                          helperText="Select up to 20 images at once from this device, or add individual images by URL."
                          uploadButtonLabel="Upload up to 20"
                          isDark={isDark}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Feature marquee section is hidden." isDark={isDark} />
              )}

              {pageData.sections.problem.visible ? (
                <section className={cn('rounded-[2rem] py-16 md:py-24', isDark ? 'bg-slate-950' : 'bg-gray-100')}>
                  <div className="px-4">
                    <div className="mb-12 text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.problem.title}
                        onSave={(value) => updateSection('problem', { title: value })}
                        multiline
                        className={cn('text-3xl font-bold md:text-5xl', isDark ? 'text-white' : 'text-gray-900')}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.problem.subtitle}
                        onSave={(value) => updateSection('problem', { subtitle: value })}
                        multiline
                        className={cn('mx-auto mt-4 max-w-3xl text-xl', isDark ? 'text-slate-300' : 'text-gray-600')}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.problem.visible}
                          label="Problem"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('problem', { visible: !pageData.sections.problem.visible })
                          }
                        />
                      </div>
                    ) : null}
                    <EditableContentCardGrid
                      title="Problem cards"
                      items={pageData.sections.problem.items}
                      onChange={(items) => updateSection('problem', { items })}
                      tone="danger"
                      editable={!readOnly}
                      isDark={isDark}
                    />
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Problem section is hidden." isDark={isDark} />
              )}

              {pageData.sections.solution.visible ? (
                <section className={cn('rounded-[2rem] py-16 md:py-24', isDark ? 'bg-slate-950' : 'bg-white')}>
                  <div className="grid grid-cols-1 items-center gap-12 px-4 lg:grid-cols-2">
                    <div className="order-2 lg:order-1">
                      <div className="image-3d overflow-hidden rounded-3xl shadow-2xl">
                        <EditableImage
                          src={pageData.sections.solution.image.src}
                          alt={pageData.sections.solution.title}
                          onSave={(src) =>
                            updateSection('solution', {
                              image: {
                                ...pageData.sections.solution.image,
                                src,
                                source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                              },
                            })
                          }
                          className="w-full"
                          imageClassName="w-full h-auto object-cover"
                          isDark={isDark}
                        />
                      </div>
                    </div>
                    <div className="order-1 space-y-6 lg:order-2">
                      {!readOnly ? (
                        <div className="flex justify-end">
                          <SectionVisibilityToggle
                            visible={pageData.sections.solution.visible}
                            label="Solution"
                            isDark={isDark}
                            onToggle={() =>
                              updateSection('solution', { visible: !pageData.sections.solution.visible })
                            }
                          />
                        </div>
                      ) : null}
                      <EditableText
                        as="span"
                        value={pageData.sections.solution.badge}
                        onSave={(value) => updateSection('solution', { badge: value })}
                        className="badge-3d inline-flex"
                      />
                      <EditableText
                        as="h2"
                        value={pageData.sections.solution.title}
                        onSave={(value) => updateSection('solution', { title: value })}
                        multiline
                        className={cn('text-3xl font-bold md:text-5xl', isDark ? 'text-white' : 'text-gray-900')}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.solution.description}
                        onSave={(value) => updateSection('solution', { description: value })}
                        multiline
                        className={cn('text-xl leading-relaxed', isDark ? 'text-slate-300' : 'text-gray-700')}
                      />
                      <EditableStringList
                        label="Solution feature bullets"
                        items={pageData.sections.solution.features}
                        onChange={(features) => updateSection('solution', { features })}
                        isDark={isDark}
                      />
                      <button type="button" className="btn-3d btn-3d-orange w-full md:w-auto">
                        <EditableText
                          as="span"
                          value={pageData.sections.solution.ctaText}
                          onSave={(value) => updateSection('solution', { ctaText: value })}
                          className="inline-flex items-center gap-2"
                        />
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Solution section is hidden." isDark={isDark} />
              )}

              {pageData.sections.aboutProduct.visible ? (
                <section className={cn('rounded-[2rem] py-16 md:py-24', isDark ? 'bg-slate-950' : 'bg-white')}>
                  <div className="px-4">
                    <div className="mb-12 text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.aboutProduct.title}
                        onSave={(value) => updateSection('aboutProduct', { title: value })}
                        multiline
                        className={cn('text-3xl font-bold md:text-5xl', isDark ? 'text-white' : 'text-gray-900')}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.aboutProduct.subtitle}
                        onSave={(value) => updateSection('aboutProduct', { subtitle: value })}
                        multiline
                        className={cn('mx-auto mt-4 max-w-3xl text-xl', isDark ? 'text-slate-300' : 'text-gray-600')}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.aboutProduct.visible}
                          label="About Product"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('aboutProduct', {
                              visible: !pageData.sections.aboutProduct.visible,
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <EditableContentCardGrid
                      title="About product cards"
                      items={pageData.sections.aboutProduct.items}
                      onChange={(items) => updateSection('aboutProduct', { items })}
                      editable={!readOnly}
                      isDark={isDark}
                    />
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="About Product section is hidden." isDark={isDark} />
              )}

              {pageData.sections.showcase.visible ? (
                <section
                  className={cn(
                    'rounded-[2rem] py-16 md:py-24',
                    isDark ? 'bg-gradient-to-b from-slate-950 to-slate-900' : 'bg-gradient-to-b from-white to-gray-50',
                  )}
                >
                  <div className="px-4">
                    <div className="mb-12 text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.showcase.title}
                        onSave={(value) => updateSection('showcase', { title: value })}
                        multiline
                        className={cn('text-3xl font-bold md:text-5xl', isDark ? 'text-white' : 'text-gray-900')}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.showcase.subtitle}
                        onSave={(value) => updateSection('showcase', { subtitle: value })}
                        multiline
                        className={cn('mx-auto mt-4 max-w-3xl text-xl', isDark ? 'text-slate-300' : 'text-gray-600')}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.showcase.visible}
                          label="Showcase"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('showcase', { visible: !pageData.sections.showcase.visible })
                          }
                        />
                      </div>
                    ) : null}
                    {showcaseImages.length > 0 ? (
                      <Carousel3D images={showcaseImages.map((item) => item.src)} />
                    ) : (
                      <HiddenInlineMessage
                        message="Add showcase images to activate the 3D carousel."
                        isDark={isDark}
                      />
                    )}
                    {!readOnly ? (
                      <div className="mt-8">
                        <EditableMediaList
                          title="Showcase images"
                          items={pageData.sections.showcase.images}
                          onChange={(images) => updateSection('showcase', { images })}
                          isDark={isDark}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Quality showcase section is hidden." isDark={isDark} />
              )}

              {pageData.sections.testimonials.visible ? (
                <section className={cn('rounded-[2rem] py-16 md:py-24', isDark ? 'bg-slate-950' : 'bg-[#f8f5ef]')}>
                  <div className="px-4">
                    <div className="mx-auto mb-12 max-w-3xl text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.testimonials.title}
                        onSave={(value) => updateSection('testimonials', { title: value })}
                        multiline
                        className={cn('text-3xl font-bold md:text-5xl', isDark ? 'text-white' : 'text-gray-900')}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.testimonials.subtitle}
                        onSave={(value) => updateSection('testimonials', { subtitle: value })}
                        multiline
                        className={cn('mt-4 text-xl', isDark ? 'text-slate-300' : 'text-gray-600')}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.testimonials.visible}
                          label="Testimonials"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('testimonials', {
                              visible: !pageData.sections.testimonials.visible,
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <EditableReviewsList
                      items={pageData.sections.testimonials.reviews}
                      onChange={(reviews) => updateSection('testimonials', { reviews })}
                      customerIdentityPools={pageData.customerIdentityPools}
                      genderTarget={pageData.genderTarget}
                      previewCountryCode={countryCode}
                      editable={!readOnly}
                      isDark={isDark}
                    />
                    {!readOnly ? (
                      <div className="mt-8">
                        <EditableRegionalCustomerPools
                          pools={pageData.customerIdentityPools}
                          genderTarget={pageData.genderTarget}
                          previewCountryCode={countryCode}
                          onChange={(customerIdentityPools) =>
                            updatePageData((current) => ({
                              ...current,
                              customerIdentityPools,
                            }))
                          }
                          editable
                          isDark={isDark}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Customer review section is hidden." isDark={isDark} />
              )}

              {pageData.sections.footerVideo.visible ? (
                <section className={cn('rounded-[2rem] py-12 md:py-16', isDark ? 'bg-slate-950' : 'bg-white')}>
                  <div className="mx-auto max-w-5xl px-4">
                    <div className="mb-8 text-center">
                      <EditableText
                        as="span"
                        value={pageData.sections.footerVideo.badge}
                        onSave={(value) => updateSection('footerVideo', { badge: value })}
                        className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9]"
                      />
                      <EditableText
                        as="h2"
                        value={pageData.sections.footerVideo.title}
                        onSave={(value) => updateSection('footerVideo', { title: value })}
                        multiline
                        className={cn(
                          'mt-4 text-3xl font-bold tracking-tight md:text-5xl',
                          isDark ? 'text-white' : 'text-slate-950',
                        )}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.footerVideo.subtitle}
                        onSave={(value) => updateSection('footerVideo', { subtitle: value })}
                        multiline
                        className={cn(
                          'mx-auto mt-4 max-w-3xl text-base leading-7 md:text-lg',
                          isDark ? 'text-slate-300' : 'text-slate-600',
                        )}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.footerVideo.visible}
                          label="Footer Video"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('footerVideo', {
                              visible: !pageData.sections.footerVideo.visible,
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'overflow-hidden rounded-[2rem] border shadow-[0_18px_50px_rgba(15,23,42,0.08)]',
                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50',
                      )}
                    >
                      <div className={cn('relative overflow-hidden', isDark ? 'bg-slate-950' : 'bg-slate-100')}>
                        <InlineVideoPreview
                          title={pageData.sections.footerVideo.title}
                          poster={pageData.sections.footerVideo.poster}
                          video={pageData.sections.footerVideo.video}
                          ratio={pageData.sections.footerVideo.ratio}
                        />
                      </div>
                    </div>
                    {!readOnly ? (
                      <div className="mt-4 grid gap-4">
                        <VideoRatioSelector
                          value={pageData.sections.footerVideo.ratio}
                          onChange={(ratio) => updateSection('footerVideo', { ratio })}
                          isDark={isDark}
                        />
                        <EditableAssetControls
                          label="Footer video poster"
                          asset={pageData.sections.footerVideo.poster}
                          kind="image"
                          accept="image/*"
                          deleteLabel="Delete Poster"
                          hideAssetValue
                          isDark={isDark}
                          onSave={(asset) => updateSection('footerVideo', { poster: asset })}
                        />
                        <EditableAssetControls
                          label="Footer video"
                          asset={pageData.sections.footerVideo.video}
                          kind="video"
                          accept="video/*"
                          deleteLabel="Delete Video"
                          isDark={isDark}
                          onSave={(asset) => updateSection('footerVideo', { video: asset })}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Footer video section is hidden." isDark={isDark} />
              )}

              {pageData.sections.subscription.visible ? (
                <section className="rounded-[2rem] bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] py-12 md:py-16">
                  <div className="mx-auto max-w-3xl px-4 text-center">
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.subscription.visible}
                          label="Subscription"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('subscription', {
                              visible: !pageData.sections.subscription.visible,
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-lg">
                      <Mail className="h-8 w-8 text-white" />
                    </div>
                    <EditableText
                      as="h2"
                      value={pageData.sections.subscription.title}
                      onSave={(value) => updateSection('subscription', { title: value })}
                      multiline
                      className="text-3xl font-bold text-white md:text-4xl"
                    />
                    <EditableText
                      as="p"
                      value={pageData.sections.subscription.subtitle}
                      onSave={(value) => updateSection('subscription', { subtitle: value })}
                      multiline
                      className="mt-4 text-xl text-white/90"
                    />
                    <div className={cn('mx-auto mt-8 max-w-2xl rounded-[2rem] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.14)]', isDark ? 'border border-slate-800 bg-slate-950' : 'bg-white')}>
                      <button type="button" className="w-full rounded-full bg-[#0E7C7B] px-6 py-4 text-base font-semibold text-white">
                        <EditableText
                          as="span"
                          value={pageData.sections.subscription.buttonLabel}
                          onSave={(value) => updateSection('subscription', { buttonLabel: value })}
                          className="inline-flex items-center gap-2"
                        />
                      </button>
                      <EditableText
                        as="p"
                        value={pageData.sections.subscription.privacyNote}
                        onSave={(value) => updateSection('subscription', { privacyNote: value })}
                        multiline
                        className={cn('mt-4 text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}
                      />
                    </div>
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Subscription section is hidden." isDark={isDark} />
              )}

              {pageData.sections.offer.visible ? (
                <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0E7C7B] via-[#2B7FFF] to-[#0E7C7B] py-16 md:py-24">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-white blur-3xl" />
                    <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-white blur-3xl" />
                  </div>
                  <div className="relative z-10 px-4">
                    <div className="mx-auto max-w-6xl text-center">
                      {!readOnly ? (
                        <div className="mb-6 flex justify-end">
                          <SectionVisibilityToggle
                            visible={pageData.sections.offer.visible}
                            label="Offer"
                            isDark={isDark}
                            onToggle={() =>
                              updateSection('offer', { visible: !pageData.sections.offer.visible })
                            }
                          />
                        </div>
                      ) : null}
                      <EditableText
                        as="span"
                        value={pageData.sections.offer.badge}
                        onSave={(value) => updateSection('offer', { badge: value })}
                        className="badge-3d inline-flex"
                      />
                      <EditableText
                        as="h2"
                        value={pageData.sections.offer.title}
                        onSave={(value) => updateSection('offer', { title: value })}
                        multiline
                        className="mt-6 text-4xl font-bold text-white md:text-6xl"
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.offer.subtitle}
                        onSave={(value) => updateSection('offer', { subtitle: value })}
                        multiline
                        className="mt-6 text-xl text-white/90 md:text-2xl"
                      />
                      <div className="mb-12 mt-8 flex justify-center gap-4">
                        {['Hours', 'Minutes', 'Seconds'].map((unit, index) => (
                          <div
                            key={unit}
                            className="card-3d min-w-[80px] rounded-xl border border-white/70 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                          >
                            <EditableText
                              as="p"
                              value={
                                index === 0
                                  ? String(pageData.sections.offer.countdownHours).padStart(2, '0')
                                  : index === 1
                                    ? '59'
                                    : '59'
                              }
                              onSave={(value) => {
                                if (index === 0) {
                                  updateSection('offer', {
                                    countdownHours: Number(value.replace(/[^\d]/g, '')) || pageData.sections.offer.countdownHours,
                                  });
                                }
                              }}
                              className="text-4xl font-bold text-[#0E7C7B]"
                            />
                            <p className="text-sm font-medium text-slate-500">{unit}</p>
                          </div>
                        ))}
                      </div>
                      <EditablePackagesList
                        items={pageData.sections.offer.packages}
                        currency={pageData.currency}
                        onChange={(packages) => updateSection('offer', { packages })}
                        isDark={isDark}
                      />
                      <div className="mt-8 grid grid-cols-1 gap-4 text-white md:grid-cols-3">
                        <div className="flex items-center justify-center gap-3 md:justify-start">
                          <Truck className="h-6 w-6 flex-shrink-0" />
                          <span className="font-semibold">Free Delivery Across Nigeria</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 md:justify-start">
                          <DollarSign className="h-6 w-6 flex-shrink-0" />
                          <span className="font-semibold">Pay on Delivery</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 md:justify-start">
                          <Clock className="h-6 w-6 flex-shrink-0" />
                          <span className="font-semibold">Fast Delivery</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Offer section is hidden." isDark={isDark} />
              )}

              {pageData.sections.orderForm.visible ? (
                <section
                  className={cn(
                    'rounded-[2rem] py-16 md:py-24',
                    isDark ? 'bg-gradient-to-b from-slate-950 to-slate-900' : 'bg-gradient-to-b from-gray-50 to-white',
                  )}
                >
                  <div className="mx-auto max-w-2xl px-4">
                    <div className="mb-12 text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.orderForm.title}
                        onSave={(value) => updateSection('orderForm', { title: value })}
                        multiline
                        className={cn(
                          'mb-4 text-3xl font-bold md:text-5xl',
                          isDark ? 'text-white' : 'text-gray-900',
                        )}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.orderForm.subtitle}
                        onSave={(value) => updateSection('orderForm', { subtitle: value })}
                        multiline
                        className={cn('text-xl', isDark ? 'text-slate-300' : 'text-gray-600')}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.orderForm.visible}
                          label="Order Form"
                          isDark={isDark}
                          onToggle={() =>
                            updateSection('orderForm', {
                              visible: !pageData.sections.orderForm.visible,
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'card-3d rounded-3xl p-8 shadow-2xl md:p-12',
                        isDark
                          ? 'border border-slate-800 !bg-slate-950 shadow-[0_26px_60px_rgba(2,6,23,0.6)]'
                          : 'bg-white',
                      )}
                    >
                      <div className="space-y-6">
                        {[
                          { icon: User, label: 'Full Name', placeholder: 'Enter your full name' },
                          { icon: Phone, label: 'Phone Number', placeholder: 'e.g., 08012345678' },
                          { icon: MapPin, label: 'Delivery Address', placeholder: 'Enter your full address' },
                        ].map((field) => {
                          const Icon = field.icon;
                          return (
                            <div key={field.label} className="space-y-2">
                              <label
                                className={cn(
                                  'flex items-center gap-2 font-semibold',
                                  isDark ? 'text-white' : 'text-gray-900',
                                )}
                              >
                                <Icon className="h-4 w-4 text-[#0E7C7B]" />
                                {field.label}
                              </label>
                              <div
                                className={cn(
                                  'h-12 rounded-xl border px-4 py-3',
                                  isDark
                                    ? 'border-slate-800 bg-slate-900 text-slate-500'
                                    : 'border-gray-300 bg-gray-50 text-gray-400',
                                )}
                              >
                                {field.placeholder}
                              </div>
                            </div>
                          );
                        })}
                        <div className="space-y-2">
                          <label
                            className={cn(
                              'flex items-center gap-2 font-semibold',
                              isDark ? 'text-white' : 'text-gray-900',
                            )}
                          >
                            <Package className="h-4 w-4 text-[#0E7C7B]" />
                            Select Your Package
                          </label>
                          <div
                            className={cn(
                              'rounded-xl border px-4 py-3 text-sm',
                              isDark
                                ? 'border-slate-800 bg-slate-900 text-slate-400'
                                : 'border-gray-300 bg-gray-50 text-gray-500',
                            )}
                          >
                            {orderPackageOptions.map((option) => option.label).join(' | ')}
                          </div>
                        </div>
                        {pageData.sections.orderForm.enableTokenField ? (
                          <div
                            className={cn(
                              'rounded-2xl border border-dashed p-5',
                              isDark
                                ? 'border-slate-700 bg-slate-900/80'
                                : 'border-[#2B7FFF]/35 bg-[#f5f9ff]',
                            )}
                          >
                            <EditableText
                              as="p"
                              value={pageData.sections.orderForm.tokenPrompt}
                              onSave={(value) => updateSection('orderForm', { tokenPrompt: value })}
                              multiline
                              className={cn(
                                'text-left text-sm font-semibold',
                                isDark ? 'text-[#7fb6ff]' : 'text-[#1f56c6]',
                              )}
                            />
                          </div>
                        ) : null}
                        <button type="button" className="btn-3d btn-3d-orange w-full">
                          <EditableText
                            as="span"
                            value={pageData.sections.orderForm.submitButtonLabel}
                            onSave={(value) =>
                              updateSection('orderForm', { submitButtonLabel: value })
                            }
                            className="inline-flex items-center gap-2"
                            editable={!readOnly}
                          />
                        </button>
                      </div>
                    </div>

                    {checkoutPreviewBundle ? (
                      <div className="mt-10">
                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                              Quick checkout sheet preview
                            </p>
                            <p className={cn('mt-1 text-xs', isDark ? 'text-slate-300' : 'text-gray-500')}>
                              Edit the parent sheet and child sheet labels used in the mobile quick checkout flow.
                            </p>
                          </div>

                          <div className={cn(
                            'inline-flex rounded-full p-1 shadow-sm ring-1',
                            isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-gray-200',
                          )}>
                            <button
                              type="button"
                              onClick={() => setCheckoutPreviewMode('selection')}
                              className={cn(
                                'rounded-full px-4 py-2 text-xs font-semibold transition',
                                checkoutPreviewMode === 'selection'
                                  ? 'bg-[#eef7f6] text-[#0E7C7B]'
                                  : 'text-gray-500',
                              )}
                            >
                              Package view
                            </button>
                            <button
                              type="button"
                              onClick={() => setCheckoutPreviewMode('form')}
                              className={cn(
                                'rounded-full px-4 py-2 text-xs font-semibold transition',
                                checkoutPreviewMode === 'form'
                                  ? 'bg-[#eef7f6] text-[#0E7C7B]'
                                  : 'text-gray-500',
                              )}
                            >
                              Form view
                            </button>
                          </div>
                        </div>

                        <div className={cn(
                          'mx-auto max-w-[29rem] rounded-[2.25rem] p-4 shadow-[0_22px_60px_rgba(15,23,42,0.14)]',
                          isDark ? 'border border-slate-800 bg-slate-950' : 'bg-white',
                        )}>
                          <div className={cn('mx-auto h-1.5 w-14 rounded-full', isDark ? 'bg-slate-700' : 'bg-stone-300')} />

                          <div className="mt-4 flex items-center justify-between">
                            <div className={cn(
                              'inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm',
                              isDark ? 'bg-slate-900 text-slate-200' : 'bg-stone-100 text-stone-700',
                            )}>
                              <ChevronLeft className="h-5 w-5" />
                            </div>
                            <EditableText
                              as="p"
                              value={
                                checkoutPreviewMode === 'form'
                                  ? pageData.sections.orderForm.orderDetailsLabel
                                  : pageData.sections.orderForm.quickCheckoutLabel
                              }
                              onSave={(value) =>
                                updateSection('orderForm', {
                                  [checkoutPreviewMode === 'form'
                                    ? 'orderDetailsLabel'
                                    : 'quickCheckoutLabel']: value,
                                })
                              }
                              className={cn(
                                'text-[11px] font-semibold uppercase tracking-[0.28em]',
                                isDark ? 'text-slate-400' : 'text-stone-400',
                              )}
                              editable={!readOnly}
                            />
                            <div className={cn(
                              'flex h-11 w-11 items-center justify-center rounded-full shadow-sm',
                              isDark ? 'bg-slate-900 text-slate-400' : 'bg-stone-100 text-stone-500',
                            )}>
                              <MoreVertical className="h-5 w-5" />
                            </div>
                          </div>

                          {checkoutPreviewMode === 'selection' ? (
                            <>
                              <div className="px-4 pb-4 pt-6 text-center">
                                <EditableImage
                                  src={pageData.sections.offer.packages[0]?.image?.src ?? checkoutPreviewBundle.image}
                                  alt={checkoutPreviewBundle.title}
                                  onSave={(src) =>
                                    updateSection('offer', {
                                      packages: pageData.sections.offer.packages.map((entry, entryIndex) =>
                                        entryIndex === 0
                                          ? {
                                              ...entry,
                                              image: {
                                                ...(entry.image ?? createImageAsset()),
                                                src,
                                                source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                                                kind: 'image',
                                              },
                                            }
                                          : entry,
                                      ),
                                    })
                                  }
                                  className={cn(
                                    'mx-auto h-36 w-36 overflow-hidden rounded-[2.4rem] shadow-[0_18px_32px_rgba(15,23,42,0.1)]',
                                    isDark ? 'bg-slate-900' : 'bg-[#f4ede3]',
                                  )}
                                  imageClassName="h-full w-full object-cover"
                                  editable={!readOnly}
                                  editorTitle="Parent sheet package preview"
                                  editorDescription="Upload the image shown at the top of the quick checkout parent sheet."
                                  isDark={isDark}
                                />

                                <EditableText
                                  as="p"
                                  value={pageData.sections.orderForm.packagePreviewLabel}
                                  onSave={(value) =>
                                    updateSection('orderForm', { packagePreviewLabel: value })
                                  }
                                  className={cn(
                                    'mt-6 text-[11px] font-semibold uppercase tracking-[0.28em]',
                                    isDark ? 'text-slate-400' : 'text-stone-400',
                                  )}
                                  editable={!readOnly}
                                />
                                <EditableText
                                  as="p"
                                  value={pageData.productName}
                                  onSave={(value) =>
                                    updatePageData((current) => ({
                                      ...current,
                                      productName: value,
                                    }))
                                  }
                                  className={cn(
                                    'mt-3 text-3xl font-black tracking-tight',
                                    isDark ? 'text-white' : 'text-stone-950',
                                  )}
                                  editable={!readOnly}
                                />
                                <EditableText
                                  as="p"
                                  value={pageData.sections.offer.packages[0]?.title ?? checkoutPreviewBundle.title}
                                  onSave={(value) =>
                                    updateSection('offer', {
                                      packages: pageData.sections.offer.packages.map((entry, entryIndex) =>
                                        entryIndex === 0 ? { ...entry, title: value } : entry,
                                      ),
                                    })
                                  }
                                  className={cn(
                                    'mt-2 text-base font-medium',
                                    isDark ? 'text-slate-300' : 'text-stone-600',
                                  )}
                                  editable={!readOnly}
                                />

                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                  <span className={cn(
                                    'rounded-full px-4 py-2 text-xs font-semibold line-through',
                                    isDark ? 'bg-slate-800 text-slate-400' : 'bg-stone-200 text-stone-500',
                                  )}>
                                    {checkoutPreviewBundle.oldPrice}
                                  </span>
                                  <span className={cn(
                                    'inline-flex rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg',
                                    isDark ? 'bg-[#FF7A00]' : 'bg-stone-950',
                                  )}>
                                    Promo {checkoutPreviewBundle.promoPrice}
                                  </span>
                                </div>

                                <EditableText
                                  as="p"
                                  value={pageData.shortDescription}
                                  onSave={(value) =>
                                    updatePageData((current) => ({
                                      ...current,
                                      shortDescription: value,
                                    }))
                                  }
                                  multiline
                                  className={cn(
                                    'mx-auto mt-4 max-w-[18rem] text-sm leading-6',
                                    isDark ? 'text-slate-300' : 'text-stone-500',
                                  )}
                                  editable={!readOnly}
                                />
                              </div>

                              <div className="rounded-[2.8rem] bg-gradient-to-br from-[#0E7C7B] via-[#1f6ebf] to-[#2B7FFF] px-4 pb-6 pt-5 shadow-[0_-16px_40px_rgba(15,23,42,0.16)]">
                                <div className="mx-auto h-1.5 w-12 rounded-full bg-white/16" />
                                <div className="mt-5">
                                  <EditableText
                                    as="p"
                                    value={pageData.sections.orderForm.childSheetLabel}
                                    onSave={(value) =>
                                      updateSection('orderForm', { childSheetLabel: value })
                                    }
                                    className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45"
                                    editable={!readOnly}
                                  />
                                  <EditableText
                                    as="h3"
                                    value={pageData.sections.orderForm.childSheetTitle}
                                    onSave={(value) =>
                                      updateSection('orderForm', { childSheetTitle: value })
                                    }
                                    className="mt-2 text-2xl font-black tracking-tight text-white"
                                    editable={!readOnly}
                                  />
                                  <EditableText
                                    as="p"
                                    value={pageData.sections.orderForm.childSheetDescription}
                                    onSave={(value) =>
                                      updateSection('orderForm', { childSheetDescription: value })
                                    }
                                    multiline
                                    className="mt-2 text-sm leading-6 text-white/65"
                                    editable={!readOnly}
                                  />
                                </div>

                                <div className="mt-4 space-y-3">
                                  {checkoutPreviewBundles.slice(0, 3).map((bundle, index) => (
                                    <div
                                      key={`${bundle.title}-preview`}
                                      className={cn(
                                        'rounded-[1.7rem] p-4 text-center shadow-[0_12px_24px_rgba(15,23,42,0.12)]',
                                        isDark ? 'bg-slate-950 text-white' : 'bg-[#f8f1e8] text-stone-950',
                                      )}
                                    >
                                      <div className="flex flex-col items-center gap-4">
                                        <EditableImage
                                          src={pageData.sections.offer.packages[index]?.image?.src ?? bundle.image}
                                          alt={bundle.title}
                                          onSave={(src) =>
                                            updateSection('offer', {
                                              packages: pageData.sections.offer.packages.map((entry, entryIndex) =>
                                                entryIndex === index
                                                  ? {
                                                      ...entry,
                                                      image: {
                                                        ...(entry.image ?? createImageAsset()),
                                                        src,
                                                        source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                                                        kind: 'image',
                                                      },
                                                    }
                                                  : entry,
                                              ),
                                            })
                                          }
                                          className={cn(
                                            'h-16 w-16 overflow-hidden rounded-[1.25rem]',
                                            isDark ? 'bg-slate-900' : 'bg-white',
                                          )}
                                          imageClassName="h-full w-full object-cover"
                                          editable={!readOnly}
                                          editorTitle={`Package image ${index + 1}`}
                                          editorDescription="Upload the image shown for this package inside the select-your-package child sheet."
                                          isDark={isDark}
                                        />

                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center justify-center gap-2">
                                            <h4 className="text-lg font-black tracking-tight">
                                              {bundle.title}
                                            </h4>
                                            {bundle.isBestValue ? (
                                              <span className="rounded-full bg-[#FF7A00]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF7A00]">
                                                Best value
                                              </span>
                                            ) : null}
                                          </div>

                                          <p className={cn('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-stone-600')}>
                                            {bundle.description}
                                          </p>

                                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                            <span className={cn(
                                              'rounded-full px-3 py-1 text-xs font-semibold',
                                              isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-stone-600',
                                            )}>
                                              {bundle.spotlight}
                                            </span>
                                            <span className={cn(
                                              'rounded-full px-3 py-1 text-xs font-semibold line-through',
                                              isDark ? 'bg-slate-800 text-slate-400' : 'bg-stone-200 text-stone-500',
                                            )}>
                                              {bundle.oldPrice}
                                            </span>
                                            <span className="rounded-full bg-[#FF7A00] px-3 py-1 text-xs font-semibold text-white">
                                              Promo {bundle.promoPrice}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7A00] text-white">
                                          <Check className="h-4 w-4" />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="px-4 pb-4 pt-6">
                              <div className="rounded-[2.8rem] bg-gradient-to-br from-[#0E7C7B] via-[#1f6ebf] to-[#2B7FFF] px-4 pb-6 pt-5 shadow-[0_-16px_40px_rgba(15,23,42,0.16)]">
                                <div className="mx-auto h-1.5 w-12 rounded-full bg-white/16" />

                                <div className={cn(
                                  'mt-5 rounded-[1.7rem] p-4 shadow-[0_12px_24px_rgba(15,23,42,0.12)]',
                                  isDark ? 'bg-slate-950 text-white' : 'bg-[#f8f1e8] text-stone-950',
                                )}>
                                  <div className="flex flex-col items-center gap-3 text-center">
                                    <EditableImage
                                      src={pageData.sections.offer.packages[0]?.image?.src ?? checkoutPreviewBundle.image}
                                      alt={checkoutPreviewBundle.title}
                                      onSave={(src) =>
                                        updateSection('offer', {
                                          packages: pageData.sections.offer.packages.map((entry, entryIndex) =>
                                            entryIndex === 0
                                              ? {
                                                  ...entry,
                                                  image: {
                                                    ...(entry.image ?? createImageAsset()),
                                                    src,
                                                    source: (src.startsWith('data:') ? 'upload' : 'url') as 'upload' | 'url',
                                                    kind: 'image',
                                                  },
                                                }
                                              : entry,
                                          ),
                                        })
                                      }
                                      className={cn(
                                        'h-16 w-16 overflow-hidden rounded-[1.25rem]',
                                        isDark ? 'bg-slate-900' : 'bg-white',
                                      )}
                                      imageClassName="h-full w-full object-cover"
                                      editable={!readOnly}
                                      editorTitle="Selected package image"
                                      editorDescription="Upload the image shown for the chosen package before the quick-checkout form."
                                      isDark={isDark}
                                    />

                                    <div className="min-w-0">
                                      <EditableText
                                        as="p"
                                        value={pageData.sections.orderForm.childSheetLabel}
                                        onSave={(value) =>
                                          updateSection('orderForm', { childSheetLabel: value })
                                        }
                                        className={cn(
                                          'text-xs font-semibold uppercase tracking-[0.26em]',
                                          isDark ? 'text-slate-400' : 'text-stone-500',
                                        )}
                                        editable={!readOnly}
                                      />
                                      <h3 className={cn(
                                        'mt-1 truncate text-lg font-black tracking-tight',
                                        isDark ? 'text-white' : 'text-stone-950',
                                      )}>
                                        {checkoutPreviewBundle.title}
                                      </h3>
                                      <p className={cn('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-stone-600')}>
                                        {checkoutPreviewBundle.description}
                                      </p>
                                      <p className={cn(
                                        'mt-1 text-xs font-semibold line-through',
                                        isDark ? 'text-slate-400' : 'text-stone-500',
                                      )}>
                                        Old Price: {checkoutPreviewBundle.oldPrice}
                                      </p>
                                      <p className="text-sm font-bold text-[#FF7A00]">
                                        Promo: {checkoutPreviewBundle.promoPrice}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      className="btn-3d btn-3d-orange rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
                                    >
                                      <EditableText
                                        as="span"
                                        value={pageData.sections.orderForm.changeSelectionLabel}
                                        onSave={(value) =>
                                          updateSection('orderForm', { changeSelectionLabel: value })
                                        }
                                        className="inline-flex"
                                        editable={!readOnly}
                                      />
                                    </button>
                                  </div>
                                </div>

                                <div className={cn(
                                  'mt-4 rounded-[1.7rem] p-4 shadow-[0_12px_24px_rgba(15,23,42,0.12)] md:p-5',
                                  isDark ? 'bg-slate-950 text-white' : 'bg-[#f8f1e8] text-stone-950',
                                )}>
                                  <div className="space-y-4">
                                    {[ 'Full Name', 'Phone Number', 'Delivery Address' ].map((label) => (
                                      <div key={label} className="space-y-2">
                                        <label className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-stone-700')}>{label}</label>
                                        <div className={cn(
                                          'h-12 rounded-2xl px-4 py-3 text-sm',
                                          isDark ? 'border border-slate-800 bg-slate-900 text-slate-500' : 'border border-stone-200 bg-white text-stone-400',
                                        )}>
                                          Placeholder input
                                        </div>
                                      </div>
                                    ))}

                                    {pageData.sections.orderForm.enableTokenField ? (
                                      <div className={cn(
                                        'rounded-[1.5rem] border border-dashed border-[#2B7FFF]/35 p-4',
                                        isDark ? 'bg-slate-900/80' : 'bg-[#f5f9ff]',
                                      )}>
                                        <EditableText
                                          as="p"
                                          value={pageData.sections.orderForm.tokenPrompt}
                                          onSave={(value) =>
                                            updateSection('orderForm', { tokenPrompt: value })
                                          }
                                          multiline
                                          className="text-left text-sm font-semibold text-[#1f56c6]"
                                          editable={!readOnly}
                                        />
                                      </div>
                                    ) : null}

                                    <div className="rounded-[1.6rem] bg-[#FF7A00] p-5 text-white">
                                      <div className="flex items-center justify-between gap-4">
                                        <div>
                                          <EditableText
                                            as="p"
                                            value={pageData.sections.orderForm.summaryLabel}
                                            onSave={(value) =>
                                              updateSection('orderForm', { summaryLabel: value })
                                            }
                                            className="text-xs font-semibold uppercase tracking-[0.26em] text-white/45"
                                            editable={!readOnly}
                                          />
                                          <h4 className="mt-2 text-xl font-bold">
                                            {checkoutPreviewBundle.title}
                                          </h4>
                                          <p className="mt-1 text-sm text-white/68">
                                            {pageData.sections.offer.packages[0]?.features.join(' / ')}
                                          </p>
                                        </div>

                                        <div className="text-right">
                                          <EditableText
                                            as="p"
                                            value={pageData.sections.orderForm.totalLabel}
                                            onSave={(value) =>
                                              updateSection('orderForm', { totalLabel: value })
                                            }
                                            className="text-xs uppercase tracking-[0.24em] text-white/45"
                                            editable={!readOnly}
                                          />
                                          <p className="mt-2 text-2xl font-black">
                                            {checkoutPreviewBundle.promoPrice}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <button type="button" className="btn-3d btn-3d-orange w-full py-4 text-base">
                                      <EditableText
                                        as="span"
                                        value={pageData.sections.orderForm.submitButtonLabel}
                                        onSave={(value) =>
                                          updateSection('orderForm', { submitButtonLabel: value })
                                        }
                                        className="inline-flex"
                                        editable={!readOnly}
                                      />
                                    </button>

                                    <EditableText
                                      as="p"
                                      value={pageData.sections.orderForm.confirmationNote}
                                      onSave={(value) =>
                                        updateSection('orderForm', { confirmationNote: value })
                                      }
                                      multiline
                                      className={cn('text-center text-sm leading-6', isDark ? 'text-slate-300' : 'text-stone-500')}
                                      editable={!readOnly}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="Main order form section is hidden." isDark={isDark} />
              )}

              {pageData.sections.faq.visible ? (
                <section className={cn('rounded-[2rem] py-16 md:py-24', isDark ? 'bg-slate-950' : 'bg-white')}>
                  <div className="mx-auto max-w-3xl px-4">
                    <div className="mb-12 text-center">
                      <EditableText
                        as="h2"
                        value={pageData.sections.faq.title}
                        onSave={(value) => updateSection('faq', { title: value })}
                        multiline
                        className={cn(
                          'mb-4 text-3xl font-bold md:text-5xl',
                          isDark ? 'text-white' : 'text-gray-900',
                        )}
                      />
                      <EditableText
                        as="p"
                        value={pageData.sections.faq.subtitle}
                        onSave={(value) => updateSection('faq', { subtitle: value })}
                        multiline
                        className={cn('text-xl', isDark ? 'text-slate-300' : 'text-gray-600')}
                      />
                    </div>
                    {!readOnly ? (
                      <div className="mb-6 flex justify-end">
                        <SectionVisibilityToggle
                          visible={pageData.sections.faq.visible}
                          label="FAQ"
                          isDark={isDark}
                          onToggle={() => updateSection('faq', { visible: !pageData.sections.faq.visible })}
                        />
                      </div>
                    ) : null}
                    <EditableFaqList
                      items={pageData.sections.faq.items}
                      onChange={(items) => updateSection('faq', { items })}
                      isDark={isDark}
                    />
                  </div>
                </section>
              ) : (
                <HiddenInlineMessage message="FAQ section is hidden." isDark={isDark} />
              )}
            </div>
          </div>
        </div>
      </div>

      {!readOnly ? (
        <div className={cn('rounded-[2rem] p-6', editorSurfaceClassName)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>Live data snapshot</h3>
              <p className={cn('mt-2 max-w-2xl text-sm leading-6', isDark ? 'text-slate-300' : 'text-gray-600')}>
                Hero text, button labels, image URLs and feature copy now update directly inside the
                single page state object behind this product draft.
              </p>
            </div>

            <div className={cn('rounded-[1.5rem] px-5 py-4', isDark ? 'border border-slate-800 bg-slate-900' : 'border border-gray-200 bg-gray-50')}>
              <p className={cn('text-xs uppercase tracking-[0.18em]', isDark ? 'text-slate-400' : 'text-gray-500')}>Current base price</p>
              <p className={cn('mt-2 text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                {formatDraftCurrency(pageData.basePrice, pageData.currency)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      </section>
      <InlineEditorDrawer
        editor={editorPanel}
        deviceView={deviceView}
        libraryItems={pageData.mediaLibrary}
        onUploadToLibrary={handleUploadToLibrary}
        onDeleteLibraryItem={handleDeleteLibraryItem}
        isDark={isDark}
        onClose={() => setEditorPanel(null)}
      />
    </InlineEditorContext.Provider>
  );
}
