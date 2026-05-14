import { supabase, HAS_SUPABASE } from './supabase';

export async function uploadFile(bucket, file) {
  if (!HAS_SUPABASE) return { path: '#mock', url: '#', name: file.name };
  const path = `${Date.now()}-${file.name}`;
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  if (api?.uploadFile) {
    const bytes = await file.arrayBuffer();
    const res = await api.uploadFile({ bucket, path, bytes, contentType: file.type });
    if (res?.error) throw new Error(res.error);
    return { path: res.path, url: res.url, name: file.name };
  }
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: pub.publicUrl, name: file.name };
}

export function publicUrl(bucket, path) {
  if (!HAS_SUPABASE || !path) return path || '#';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
