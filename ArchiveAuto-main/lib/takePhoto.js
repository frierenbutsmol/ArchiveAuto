import * as ImagePicker from 'expo-image-picker';

// Opens the phone's camera and hands back the photo, ready to upload.
//
//   const r = await takePhoto();
//   r.file      -> { uri, name, mimeType, size }   (size can be missing on some phones)
//   r.cancelled -> the user closed the camera without taking a photo
//   r.error     -> a message to show the user; r.blocked is true when the permission was
//                  turned off for good, so only the phone's Settings can switch it back on
export async function takePhoto() {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return permission.canAskAgain === false
        ? {
            error: 'Camera access is turned off for ArchiveAuto. Turn it on in your phone settings to take photos.',
            blocked: true,
          }
        : { error: 'ArchiveAuto needs camera access to take a photo.' };
    }

    // quality 0.7 keeps photos well under the 8 MB upload limit and still readable
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return { cancelled: true };

    const asset = result.assets?.[0];
    if (!asset?.uri) return { error: 'Could not take the photo. Please try again.' };

    const mimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);   // 20261018133500
    const name = asset.fileName || `photo-${stamp}.${mimeType === 'image/png' ? 'png' : 'jpg'}`;

    return { file: { uri: asset.uri, name, mimeType, size: asset.fileSize } };
  } catch (e) {
    return { error: 'The camera could not be opened on this phone.' };
  }
}