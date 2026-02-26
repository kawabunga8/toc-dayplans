export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      window.prompt('Copy this link:', text);
    } catch {
      // ignore
    }
    return false;
  }
}
