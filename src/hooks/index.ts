// src/hooks/index.ts
// ============================================
// ROTAFRETE - Índice de Hooks
// ============================================

// Autenticação com roles
export { useAuthWithRole, ProtectedRoute, addAdminEmail, setAdminEmails, getAdminEmails } from './useAuthWithRole';

// Fila de uploads com retry
export { useUploadQueue } from './useUploadQueue';
export type { UploadItem } from './useUploadQueue';

// Seleção de imagens
export { useImagePicker } from './useImagePicker';
export type { ImageResult, ImagePickerOptions, UseImagePickerReturn } from './useImagePicker';

// Compartilhamento
export { useShare } from './useShare';

// Push notifications
export { usePushNotifications } from './usePushNotifications';
