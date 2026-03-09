/**
 * Storage Service Abstraction Layer
 * 
 * Abstracts file storage operations to allow future migration
 * from Supabase Storage to AWS S3 or other providers.
 * 
 * Current implementation: Supabase Storage
 * Future: Replace internals with S3 SDK calls without changing the interface.
 */

import { supabase } from '@/integrations/supabase/client';

export type StorageProvider = 'supabase' | 's3';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface StorageOptions {
  /** Make the file publicly accessible */
  isPublic?: boolean;
  /** Content type override */
  contentType?: string;
  /** Cache control header */
  cacheControl?: string;
}

/**
 * Generate a unique file name with timestamp and random suffix.
 */
export function generateFileName(
  prefix: string,
  originalName: string,
): string {
  const ext = originalName.split('.').pop() || 'bin';
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${Date.now()}-${rand}.${ext}`;
}

/**
 * Upload a file to the configured storage provider.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: StorageOptions,
): Promise<UploadResult> {
  // --- Supabase Storage implementation ---
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options?.cacheControl || '3600',
      contentType: options?.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * List files in a storage bucket path.
 */
export async function listFiles(bucket: string, folder: string) {
  const { data, error } = await supabase.storage.from(bucket).list(folder);
  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }
  return data;
}
