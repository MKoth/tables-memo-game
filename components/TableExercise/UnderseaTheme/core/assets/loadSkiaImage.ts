import { Skia, type SkImage } from '@shopify/react-native-skia';
import { Image } from 'react-native';

export async function loadUnderseaSkiaImage(source: number): Promise<SkImage> {
  const resolved = Image.resolveAssetSource(source);
  if (resolved?.uri == null || resolved.uri.length === 0) {
    throw new Error('Unable to resolve image asset URI');
  }

  const data = await Skia.Data.fromURI(resolved.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (image == null) {
    throw new Error(`Failed to decode image: ${resolved.uri}`);
  }
  return image;
}
