import "server-only";
import sharp from "sharp";

/**
 * pdfkit embeds JPEG and PNG only. Settings accept WebP logos for HTML
 * preview; convert those to PNG so export matches the on-screen logo.
 */
export async function logoBufferForPdf(
  logo?: { bytes: Uint8Array; contentType: string } | null
): Promise<Buffer | null> {
  if (!logo) {
    return null;
  }
  if (logo.contentType === "image/jpeg" || logo.contentType === "image/png") {
    return Buffer.from(logo.bytes);
  }
  if (logo.contentType === "image/webp") {
    try {
      return await sharp(logo.bytes).png().toBuffer();
    } catch {
      return null;
    }
  }
  return null;
}
