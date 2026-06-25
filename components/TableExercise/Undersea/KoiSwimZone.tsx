import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useImage } from '@shopify/react-native-skia';
import { KoiFishLayer, type KoiImageKey } from './KoiFishLayer';
import { KoiWordBubble } from './KoiWordBubble';

const KOI_VARIANTS = {
  koi1: require('../../../assets/koi1.png'),
  koi2: require('../../../assets/koi2.png'),
  koi3: require('../../../assets/koi3.png'),
} as const;

const KOI_MASK_VARIANTS = {
  koi1: require('../../../assets/koi1-mask.png'),
  koi2: require('../../../assets/koi2-mask.png'),
  koi3: require('../../../assets/koi3-mask.png'),
} as const;

export type KoiSwimZoneProps = {
  words: string[];
};

export function KoiSwimZone({ words }: KoiSwimZoneProps) {
  const { width, height } = useWindowDimensions();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const koi1 = useImage(KOI_VARIANTS.koi1);
  const koi2 = useImage(KOI_VARIANTS.koi2);
  const koi3 = useImage(KOI_VARIANTS.koi3);
  const koi1Mask = useImage(KOI_MASK_VARIANTS.koi1);
  const koi2Mask = useImage(KOI_MASK_VARIANTS.koi2);
  const koi3Mask = useImage(KOI_MASK_VARIANTS.koi3);

  const images = useMemo(
    () => ({ koi1, koi2, koi3 }),
    [koi1, koi2, koi3],
  );
  const masks = useMemo(
    () => ({ koi1: koi1Mask, koi2: koi2Mask, koi3: koi3Mask }),
    [koi1Mask, koi2Mask, koi3Mask],
  );

  const handleFishSelect = useCallback((word: string) => {
    setSelectedWord(word);
  }, []);

  const handleDismiss = useCallback(() => {
    setSelectedWord(null);
  }, []);

  if (
    words.length === 0 ||
    !koi1 ||
    !koi2 ||
    !koi3 ||
    !koi1Mask ||
    !koi2Mask ||
    !koi3Mask ||
    width === 0 ||
    height === 0
  ) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <KoiFishLayer
        width={width}
        height={height}
        words={words}
        images={images as Record<KoiImageKey, NonNullable<typeof koi1>>}
        masks={masks as Record<KoiImageKey, NonNullable<typeof koi1Mask>>}
        interactive={selectedWord === null}
        onFishSelect={handleFishSelect}
      />
      {selectedWord != null && (
        <KoiWordBubble word={selectedWord} onDismiss={handleDismiss} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
