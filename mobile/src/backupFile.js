import { Directory, File } from "expo-file-system";

import { backupFileName, parseBackup } from "./backup";

/**
 * Saving and opening backup files, through Android's own file pickers — so
 * the backup can go to the Downloads folder, a memory card, or straight into
 * Google Drive, and Rangely needs no storage permission for any of it.
 *
 * Every function resolves; nothing throws out of here.
 */

/** Ask where to save, then write the file there. */
export async function saveBackupFile(data) {
  let dir;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return { ok: false, reason: "cancelled" };
  }
  try {
    const text = JSON.stringify(data);
    const name = backupFileName(data?.exportedAt);
    const file = dir.createFile(name, "application/json");
    file.write(text);
    return { ok: true, name, bytes: text.length };
  } catch (e) {
    return { ok: false, reason: "write", message: e?.message ?? String(e) };
  }
}

/** Ask for a backup file and read it. */
export async function openBackupFile() {
  let picked;
  try {
    // Drive and some file managers label JSON as plain text or as nothing at
    // all, so the picker is not narrowed to one type; the contents decide.
    picked = await File.pickFileAsync({ mimeTypes: ["*/*"] });
  } catch {
    return { ok: false, reason: "cancelled" };
  }
  if (!picked || picked.canceled || !picked.result) return { ok: false, reason: "cancelled" };
  try {
    const text = await picked.result.text();
    const parsed = parseBackup(text);
    return parsed.ok ? { ok: true, data: parsed.data } : { ok: false, reason: "invalid", message: parsed.error };
  } catch (e) {
    return { ok: false, reason: "read", message: e?.message ?? String(e) };
  }
}
