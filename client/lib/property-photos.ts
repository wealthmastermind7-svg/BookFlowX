import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

export interface PropertyPhoto {
  uri: string;
  timestamp: string;
}

/**
 * Persist image content rather than a temporary picker URI. This lets another
 * device display the evidence and lets native PDF rendering embed every photo.
 * Timestamps record when the photo was added, not a verified EXIF capture time.
 */
export async function pickPropertyPhotos(limit: number, camera = false): Promise<PropertyPhoto[]> {
  if (limit <= 0) throw new Error("The photo limit has been reached. Remove a photo first.");
  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(`Allow ${camera ? "camera" : "photo library"} access to add property photos.`);
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsMultipleSelection: !camera,
    selectionLimit: limit,
    quality: 0.8,
    exif: false,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  if (result.assets.length > limit) throw new Error(`Select no more than ${limit} photos.`);
  const timestamp = new Date().toISOString();
  // Sequential processing limits memory usage when adding a whole room's photos.
  const photos: PropertyPhoto[] = [];
  for (const asset of result.assets) {
    const maxSide = Math.max(asset.width, asset.height);
    const actions = maxSide > 1600
      ? [{ resize: asset.width >= asset.height ? { width: 1600 } : { height: 1600 } }]
      : [];
    const image = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress: 0.65,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!image.base64) throw new Error("The selected photo could not be read. Please try again.");
    if (image.base64.length > 3 * 1024 * 1024) {
      throw new Error("This photo is too large. Please choose a smaller image.");
    }
    photos.push({ uri: `data:image/jpeg;base64,${image.base64}`, timestamp });
  }
  return photos;
}

export function propertyImageSource(uri: string) {
  return { uri };
}