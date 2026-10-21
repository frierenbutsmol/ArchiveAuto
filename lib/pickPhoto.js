import * as ImagePicker from 'expo-image-picker';

// Lets the user pick a profile photo, from the camera or from the gallery.
// Both open the phone's square cropper, so the photo is always a square.
//
//   const r = await takeProfilePhoto();      // or chooseProfilePhoto()
//   r.file      -> { uri, name, mimeType }   ready for api.files.upload()
//   r.cancelled -> the user closed the camera / gallery without choosing
//   r.error     -> a message to show; r.blocked is true when the camera permission was
//                  turned off for good, so only the phone's Settings can switch it back on

const MAX_BYTES = 8 * 1024 * 1024;   // same limit as the server
const OPTIONS = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 };

// The server only accepts JPG and PNG.
function detectMime(asset) {
  const m = (asset.mimeType || '').toLowerCase();
  if (m === 'image/png') return 'image/png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'image/jpeg';
  if (!m) {
    const ext = String(asset.fileName || asset.uri || '').split('?')[0].split('.').pop().toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  }
  return null;
}

function fromResult(result) {
  if (result.canceled) return { cancelled: true };
  const asset = result.assets?.[0];
  if (!asset?.uri) return { error: 'Could not get the photo. Please try again.' };

  const mimeType = detectMime(asset);
  if (!mimeType) return { error: 'Please choose a JPG or PNG photo.' };
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    return { error: 'That photo is too large. Please choose one under 8 MB.' };
  }
  return { file: { uri: asset.uri, name: `profile.${mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType } };
}

export async function takeProfilePhoto() {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return permission.canAskAgain === false
        ? {
            error: 'Camera access is turned off for ArchiveAuto. Turn it on in your phone settings to take a photo.',
            blocked: true,
          }
        : { error: 'ArchiveAuto needs camera access to take a photo.' };
    }
    return fromResult(await ImagePicker.launchCameraAsync(OPTIONS));
  } catch (e) {
    return { error: 'The camera could not be opened on this phone.' };
  }
}

export async function chooseProfilePhoto() {
  try {
    return fromResult(await ImagePicker.launchImageLibraryAsync(OPTIONS));
  } catch (e) {
    return { error: 'Your photo gallery could not be opened on this phone.' };
  }
}