import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";

/**
 * The rider's own photo of their scooter.
 *
 * Makers' product shots are the makers' copyright, and free photo sites have
 * Xiaomis and little else, so the picture of a KuKirin or a Dualtron comes
 * from the one person who is guaranteed to have one. Cropped to a portrait
 * 4 : 5 in the picker, compressed, and copied out of the picker's cache into
 * the app's own document folder, which the system does not clear.
 *
 * Returns { ok: true, uri } or { ok: false, reason: "canceled" | "camera" | "error" }.
 */
export async function pickScooterPhoto(from = "library") {
  const options = { mediaTypes: ["images"], allowsEditing: true, aspect: [4, 5], quality: 0.8 };
  let result;
  try {
    if (from === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: "camera" };
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      // Android's system photo picker: no storage permission needed.
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
  } catch {
    return { ok: false, reason: "error" };
  }
  if (result.canceled || !result.assets?.length) return { ok: false, reason: "canceled" };

  const picked = result.assets[0];
  try {
    const src = new File(picked.uri);
    const dest = new File(Paths.document, `scooter-${Date.now()}.jpg`);
    src.copy(dest);
    return { ok: true, uri: dest.uri };
  } catch {
    // Where the file system is not available (the web preview), the picker's
    // own URI still shows the photo for this session.
    return { ok: true, uri: picked.uri };
  }
}

/** Remove a photo the app copied, when it is replaced or taken away. */
export function forgetScooterPhoto(uri) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* already gone, or not ours */
  }
}
