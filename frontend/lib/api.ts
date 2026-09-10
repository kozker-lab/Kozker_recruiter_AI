import { createClient } from "./supabase/client";

// Base Configuration - Dynamic Browser/Server Resolving
const isBrowser = typeof window !== "undefined";
export const API_BASE_URL = isBrowser
  ? (process.env.NEXT_PUBLIC_API_URL || "/api/v1")
  : (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/v1` : "http://localhost:8000/api/v1");

export function obfuscateId(uuidStr: string): string {
  if (!uuidStr) return "";
  const clean = uuidStr.replace(/-/g, "").toLowerCase();
  if (clean.length !== 32) return uuidStr;
  try {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    }
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `rec_${urlSafe}`;
  } catch (e) {
    return uuidStr;
  }
}

export function deobfuscateId(obfuscated: string): string {
  if (!obfuscated || !obfuscated.startsWith("rec_")) return obfuscated;
  try {
    const clean = obfuscated.substring(4);
    let base64 = clean.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  } catch (e) {
    return obfuscated;
  }
}

// API fetch wrapper with absolute error propagation (no mock fallback)
export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: any
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Retrieve Supabase token if available
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (tokenErr) {
    console.warn("Could not retrieve supabase token for API request", tokenErr);
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    const text = await res.text();
    let responseData: any = {};
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      responseData = {};
    }

    if (!res.ok) {
      const errMsg = responseData.detail || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }
    
    return responseData as T;
  } catch (err) {
    console.error(`API Request to ${path} failed:`, err);
    throw new Error(
      err instanceof Error 
        ? err.message 
        : "Failed to connect to the backend server. Please make sure the service is online."
    );
  }
}

// Helper function for uploading and parsing a PDF/DOCX file
export const apiUploadFile = async (path: string, file: File): Promise<{ text: string }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    } catch (tokenErr) {
      console.warn("Could not retrieve supabase token for apiUploadFile", tokenErr);
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || "Failed to upload and parse file");
    }

    try {
      return text ? JSON.parse(text) : { text: "" };
    } catch {
      throw new Error("Invalid JSON response from server during file upload");
    }
  } catch (err) {
    console.error("Error in apiUploadFile:", err);
    throw err;
  }
};
