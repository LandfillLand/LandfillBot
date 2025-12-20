import { base64Icon } from "@/assets/favicon"; 

export function serveFavicon(): Response {
  if (!base64Icon) {
    return new Response(null, { status: 204 });
  }

  try {
    const cleanBase64 = base64Icon.includes(",") ? base64Icon.split(",")[1] : base64Icon;
    const binaryString = atob(cleanBase64.trim());
    const length = binaryString.length;
    const bytes = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return new Response(bytes.buffer, {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Icon Error: ${message}`, { status: 500 });
  }
}
