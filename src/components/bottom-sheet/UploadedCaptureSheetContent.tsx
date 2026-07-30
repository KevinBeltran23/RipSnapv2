import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import CaptureMediaPreview from '../detection/CaptureMediaPreview';
import Button from '../common/Button';
import { getUserFacingMessage } from '../../services/errorHandler';
import { saveRemoteFile, saveTextFile } from '../../utils/downloads';
import type { CaptureMetadata } from '../../types/media';
import type { RipMapPoint } from '../../types/ripMap';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface UploadedCaptureSheetContentProps {
  point: RipMapPoint;
}

type DownloadKind = 'media' | 'metadata' | null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const isCaptureType = (value: unknown): value is 'photo' | 'video' =>
  value === 'photo' || value === 'video';

const normalizeMetadata = (value: unknown): CaptureMetadata | null => {
  const raw = asRecord(value);
  if (!raw) return null;

  const rawLocation = asRecord(raw.location);
  const frames = Array.isArray(raw.frames)
    ? raw.frames.flatMap(frameValue => {
        const frame = asRecord(frameValue);
        const elapsedMs = asFiniteNumber(frame?.elapsedMs);
        if (!frame || elapsedMs === undefined) return [];

        const detections = Array.isArray(frame.detections)
          ? frame.detections.flatMap(detectionValue => {
              const detection = asRecord(detectionValue);
              const bbox = detection?.bbox;
              const confidence = asFiniteNumber(detection?.confidence);
              if (
                !detection ||
                typeof detection.className !== 'string' ||
                confidence === undefined ||
                !Array.isArray(bbox) ||
                bbox.length !== 4 ||
                !bbox.every(
                  coordinate => asFiniteNumber(coordinate) !== undefined,
                )
              ) {
                return [];
              }

              return [
                {
                  className: detection.className,
                  confidence,
                  bbox: [bbox[0], bbox[1], bbox[2], bbox[3]] as [
                    number,
                    number,
                    number,
                    number,
                  ],
                },
              ];
            })
          : [];

        return [{ elapsedMs, detections }];
      })
    : undefined;

  return {
    sessionId: asString(raw.sessionId),
    captureType: isCaptureType(raw.captureType) ? raw.captureType : undefined,
    source: asString(raw.source),
    coordinateSpace: asString(raw.coordinateSpace),
    timestamp: asString(raw.timestamp),
    startTime: asString(raw.startTime),
    endTime: asString(raw.endTime),
    durationMs: asFiniteNumber(raw.durationMs),
    screenWidth: asFiniteNumber(raw.screenWidth),
    screenHeight: asFiniteNumber(raw.screenHeight),
    mediaWidth: asFiniteNumber(raw.mediaWidth),
    mediaHeight: asFiniteNumber(raw.mediaHeight),
    modelName: asString(raw.modelName),
    modelInputSize: asFiniteNumber(raw.modelInputSize),
    layerId: asString(raw.layerId),
    title: asString(raw.title),
    notes: asString(raw.notes),
    location: rawLocation
      ? {
          latitude: asFiniteNumber(rawLocation.latitude),
          longitude: asFiniteNumber(rawLocation.longitude),
        }
      : null,
    frames,
  };
};

const formatDate = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatNumber = (value?: number) =>
  value === undefined ? 'Unavailable' : String(Math.round(value));

const getMediaFileInfo = (url: string, captureType: 'photo' | 'video') => {
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    // Keep the original URL when a provider returns malformed encoding.
  }
  const extensionMatch = decodedUrl.match(/\.([a-z0-9]+)(?:[?#&]|$)/i);
  const extension = extensionMatch?.[1]?.toLowerCase();
  const allowedExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'heic',
    'heif',
    'mp4',
    'mov',
    'm4v',
    'webm',
  ]);
  const safeExtension =
    extension && allowedExtensions.has(extension)
      ? extension
      : captureType === 'video'
        ? 'mp4'
        : 'jpg';
  const mimeTypeByExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
  };
  const mimeType =
    mimeTypeByExtension[safeExtension] ??
    (captureType === 'video' ? 'video/mp4' : 'image/jpeg');

  return { extension: safeExtension, mimeType };
};

function UploadedCaptureSheetContent({
  point,
}: UploadedCaptureSheetContentProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();
  const media = point.media;
  const metadataUrl = media?.metadataUrl;
  const [metadata, setMetadata] = useState<CaptureMetadata | null>(null);
  const [metadataJson, setMetadataJson] = useState<string | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(Boolean(metadataUrl));
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<DownloadKind>(null);

  useEffect(() => {
    let active = true;

    const loadMetadata = async () => {
      setMetadata(null);
      setMetadataJson(null);
      setMetadataError(null);
      if (!metadataUrl) {
        setMetadataLoading(false);
        return;
      }

      setMetadataLoading(true);
      try {
        const response = await fetch(metadataUrl);
        if (!response.ok) throw new Error('Metadata request failed.');
        const text = await response.text();
        const parsed: unknown = JSON.parse(text);
        if (!active) return;

        setMetadata(normalizeMetadata(parsed));
        setMetadataJson(text);
      } catch (error) {
        if (!active) return;
        setMetadataError(
          getUserFacingMessage(
            error,
            'Detection metadata could not be loaded for this upload.',
          ),
        );
      } finally {
        if (active) setMetadataLoading(false);
      }
    };

    loadMetadata().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [metadataUrl]);

  const captureType =
    media?.captureType === 'photo' || media?.captureType === 'video'
      ? media.captureType
      : metadata?.captureType;
  const detectionCount = useMemo(
    () =>
      metadata?.frames?.reduce(
        (total, frame) => total + (frame.detections?.length ?? 0),
        0,
      ) ?? 0,
    [metadata?.frames],
  );
  const frameCount = metadata?.frames?.length ?? 0;
  const dimensions =
    metadata?.mediaWidth && metadata?.mediaHeight
      ? `${formatNumber(metadata.mediaWidth)} x ${formatNumber(metadata.mediaHeight)}`
      : 'Unavailable';
  const duration = metadata?.durationMs
    ? `${Math.round(metadata.durationMs / 1000)}s`
    : captureType === 'photo'
      ? 'Still image'
      : 'Unavailable';
  const mediaFileInfo =
    media?.url && captureType ? getMediaFileInfo(media.url, captureType) : null;
  const fileStem = point.title.trim() || 'ripsnap-capture';

  const handleDownloadMedia = async () => {
    if (!media?.url || !mediaFileInfo || !captureType) return;

    setDownloading('media');
    try {
      await saveRemoteFile(media.url, {
        fileName: `${fileStem}.${mediaFileInfo.extension}`,
        mimeType: mediaFileInfo.mimeType,
      });
      Alert.alert('Media Saved', 'The media file was saved successfully.');
    } catch (error) {
      Alert.alert(
        'Download Failed',
        getUserFacingMessage(error, 'The media could not be downloaded.'),
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadMetadata = async () => {
    if (!metadataUrl && !metadataJson) return;

    setDownloading('metadata');
    try {
      if (metadataJson) {
        await saveTextFile(metadataJson, {
          fileName: `${fileStem}-metadata.json`,
          mimeType: 'application/json',
        });
      } else if (metadataUrl) {
        await saveRemoteFile(metadataUrl, {
          fileName: `${fileStem}-metadata.json`,
          mimeType: 'application/json',
        });
      }
      Alert.alert(
        'Metadata Saved',
        'The metadata file was saved successfully.',
      );
    } catch (error) {
      Alert.alert(
        'Download Failed',
        getUserFacingMessage(error, 'The metadata could not be downloaded.'),
      );
    } finally {
      setDownloading(null);
    }
  };

  const s = StyleSheet.create({
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '800',
      marginTop: scaleHeight(14),
      marginBottom: scaleHeight(8),
    },
    status: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(19),
      marginBottom: scaleHeight(8),
    },
    statsRow: {
      flexDirection: 'row',
      gap: scaleWidth(8),
      marginTop: scaleHeight(10),
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
      borderRadius: proportionalSize(8),
      paddingVertical: scaleHeight(9),
    },
    statValue: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '800',
    },
    statLabel: {
      color: colors.textTertiary,
      fontSize: scaleFont(10),
      fontWeight: '700',
      marginTop: scaleHeight(2),
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: scaleWidth(12),
      paddingVertical: scaleHeight(6),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    detailLabel: {
      color: colors.textTertiary,
      fontSize: scaleFont(12),
      fontWeight: '700',
    },
    detailValue: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: scaleFont(12),
      fontWeight: '700',
      textAlign: 'right',
    },
    downloadRow: {
      flexDirection: 'row',
      gap: scaleWidth(8),
      marginTop: scaleHeight(4),
    },
    downloadButton: {
      flex: 1,
      paddingHorizontal: scaleWidth(8),
    },
    downloadButtonText: {
      fontSize: scaleFont(12),
    },
    spinner: {
      marginVertical: scaleHeight(8),
    },
  });

  return (
    <View>
      <Text style={s.sectionTitle}>Uploaded Media</Text>
      {media?.url && captureType ? (
        <CaptureMediaPreview
          mediaUri={media.url}
          captureType={captureType}
          metadata={metadata}
        />
      ) : (
        <Text style={s.status}>Media is not available for this upload.</Text>
      )}

      {metadataLoading && (
        <ActivityIndicator
          style={s.spinner}
          size="small"
          color={colors.primary}
        />
      )}
      {metadataError && <Text style={s.status}>{metadataError}</Text>}

      <View style={s.downloadRow}>
        <Button
          variant="secondary"
          label={downloading === 'media' ? 'Saving...' : 'Download Media'}
          onPress={handleDownloadMedia}
          disabled={!media?.url || !mediaFileInfo || downloading !== null}
          style={s.downloadButton}
          textStyle={s.downloadButtonText}
        />
        <Button
          variant="secondary"
          label={downloading === 'metadata' ? 'Saving...' : 'Download Metadata'}
          onPress={handleDownloadMetadata}
          disabled={!metadataUrl || downloading !== null}
          style={s.downloadButton}
          textStyle={s.downloadButtonText}
        />
      </View>

      <Text style={s.sectionTitle}>Detection Summary</Text>
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statValue}>{duration}</Text>
          <Text style={s.statLabel}>Duration</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{frameCount}</Text>
          <Text style={s.statLabel}>Frames</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{detectionCount}</Text>
          <Text style={s.statLabel}>Detections</Text>
        </View>
      </View>

      <View style={{ marginTop: scaleHeight(10) }}>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Model</Text>
          <Text style={s.detailValue}>
            {metadata?.modelName ?? 'Unavailable'}
          </Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Dimensions</Text>
          <Text style={s.detailValue}>{dimensions}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Analyzed</Text>
          <Text style={s.detailValue}>
            {formatDate(metadata?.timestamp ?? metadata?.startTime)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default UploadedCaptureSheetContent;
