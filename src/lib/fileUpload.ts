"use client";

// Firestore caps a single document at 1MB. We store the uploaded file
// inline as a base64 string on the document (see repo.ts:createHealthDocument),
// so everything here exists to make sure that string — plus the rest of the
// document's fields — comfortably fits under that ceiling.
//
// Base64 adds ~33% overhead, so we target well under the raw 1MB limit.
const MAX_STORED_BYTES = 700_000; // ~700KB raw -> ~950KB base64, leaving headroom for other fields
const MAX_IMAGE_DIMENSION = 1600; // px, longest side

export interface PreparedFile {
  base64: string; // no data: prefix — just the encoded bytes
  mimeType: string;
  sizeBytes: number; // size of the raw (decoded) bytes actually stored
}

export class FileTooLargeError extends Error {}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read file."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function base64ByteLength(base64: string): number {
  // Each base64 char encodes 6 bits; account for padding.
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image."));
    img.src = dataUrl;
  });
}

/** Draws the image to a canvas at a capped size, then re-encodes as JPEG, stepping quality down until it fits. */
async function compressImage(file: File): Promise<PreparedFile> {
  const originalDataUrl = await fileToDataUrl(file);
  const img = await loadImage(originalDataUrl);

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process this image on your device.");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let base64 = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    base64 = dataUrlToBase64(dataUrl);
    if (base64ByteLength(base64) <= MAX_STORED_BYTES) break;
    quality -= 0.15;
  }

  const sizeBytes = base64ByteLength(base64);
  if (sizeBytes > MAX_STORED_BYTES) {
    throw new FileTooLargeError(
      "This image is too large or detailed to compress under the size limit — try cropping it tighter or taking a clearer, closer photo."
    );
  }

  return { base64, mimeType: "image/jpeg", sizeBytes };
}

/** PDFs aren't re-encoded — just size-checked against the same budget. */
async function prepareNonImage(file: File): Promise<PreparedFile> {
  if (file.size > MAX_STORED_BYTES) {
    throw new FileTooLargeError(
      "This PDF is too large to store — please upload a single page, or a smaller/lower-resolution scan."
    );
  }
  const dataUrl = await fileToDataUrl(file);
  const base64 = dataUrlToBase64(dataUrl);
  return { base64, mimeType: file.type, sizeBytes: file.size };
}

export async function prepareFileForUpload(file: File): Promise<PreparedFile> {
  if (file.type.startsWith("image/")) {
    return compressImage(file);
  }
  return prepareNonImage(file);
}
