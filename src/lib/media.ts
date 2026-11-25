import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
export const STORAGE_PREFIX = "storage:videos/";

function safeName(file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Upload an image/trailer/subtitle to the media bucket and return a long-lived link. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const path = `${folder}/${safeName(file)}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data) throw e2 ?? new Error("Imeshindikana kupata link");
  return data.signedUrl;
}

/**
 * Upload a full MP4 to the protected bucket with progress; the returned marker is resolved per-viewer,
 * so the file only plays inside the site's own player for signed-in subscribers.
 */
export async function uploadProtectedVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const path = `files/${safeName(file)}`;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const base = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!base || !key) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/local-media-upload?bucket=videos&path=${encodeURIComponent(path)}`);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
        } else {
          reject(new Error("Imeshindikana kupakia video"));
        }
      };
      xhr.onerror = () => reject(new Error("Mtandao umekatika wakati wa kupakia. Jaribu tena."));
      xhr.send(file);
    });
    return STORAGE_PREFIX + path;
  }
  if (!token) throw new Error("Ingia tena kisha ujaribu");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base.replace(/\/+$/, "")}/storage/v1/object/videos/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = "Imeshindikana kupakia video";
        try {
          const j = JSON.parse(xhr.responseText) as { message?: string };
          if (j.message)
            msg = /exceeded|too large|maximum/i.test(j.message) ? "Faili ni kubwa mno" : j.message;
        } catch {
          /* keep default */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Mtandao umekatika wakati wa kupakia. Jaribu tena."));
    xhr.send(file);
  });
  return STORAGE_PREFIX + path;
}

/** Turn a stored video source into a playable URL (signed for protected files). */
export async function resolveVideoUrl(url: string): Promise<string> {
  if (!url.startsWith(STORAGE_PREFIX)) return url;
  const path = url.slice(STORAGE_PREFIX.length);
  const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, 60 * 60 * 6);
  if (error || !data) throw error ?? new Error("Video haipatikani");
  return data.signedUrl;
}
