import { useMemo, useEffect } from 'react';
import { useWindowDimensions, StyleSheet, Platform } from 'react-native';
import {
  Canvas,
  Skia,
  Atlas,
  useRSXformBuffer,
  useImage,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { useFrameCallback } from 'react-native-reanimated';
import { createParticle } from './helpers';
import type { SnowfallProps } from './types';

const isAndroid = Platform.OS === 'android';

const Snowfall = ({
  count = 70,
  duration = 10000,
  minSize = 10,
  maxSize = 20,
  imageScale = 0.7,
  imagePath = require('./snowflake.png'),
  customImage,
}: SnowfallProps) => {
  const metronome = useSharedValue(0);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useFrameCallback((frameInfo) => {
    const { timeSincePreviousFrame } = frameInfo;
    if (timeSincePreviousFrame != null) {
      metronome.value += timeSincePreviousFrame;
      if (metronome.value > duration) {
        metronome.value = metronome.value % duration;
      }
    }
  }, true);

  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() =>
      createParticle({ duration, minSize, maxSize })
    );
  }, [count, duration, minSize, maxSize]);

  const snowflakeImage = useImage(imagePath);
  const image = customImage || snowflakeImage;

  const sprites = useMemo(() => {
    if (!image) return [];
    return new Array(count).fill(
      Skia.XYWHRect(0, 0, image.width(), image.height())
    );
  }, [count, image]);

  const imageWidth = useMemo(() => {
    if (!image) return 0;
    return image.width();
  }, [image]);

  const transforms = useRSXformBuffer(count, (val, i) => {
    'worklet';

    const particle = particles[i];
    if (!particle || !image) return;

    const adjustedProgress =
      ((metronome.value + particle.deltas.delayOffset) / duration) % 1;

    const baseXPosition = screenWidth * (particle.deltas.xPosition / 100);

    const swingOffset =
      particle.deltas.swingAmplitude *
      Math.sin(
        2 * Math.PI * particle.deltas.swingFrequency * adjustedProgress +
          particle.deltas.swingPhase
      );
    const xPosition = baseXPosition + swingOffset;
    const translateY = interpolate(
      adjustedProgress,
      [0, 1],
      [-50, screenHeight + (isAndroid ? 60 : 0)]
    );
    const rotation = particle.deltas.rotationSpeed * adjustedProgress;
    const snowflakeSize = imageWidth / imageScale;
    const scale = particle.size / snowflakeSize;

    val.set(
      Math.cos(rotation) * scale,
      Math.sin(rotation) * scale,
      xPosition,
      translateY
    );
  });

  useEffect(() => {
    return () => {
      cancelAnimation(metronome);
    };
  }, [metronome]);

  if (!image) {
    return null; // or some fallback UI
  }

  return (
    <Canvas style={styles.container} pointerEvents={'none'}>
      <Atlas image={image} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
});

export { Snowfall };
