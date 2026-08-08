import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/common/Button';
import { isOcrAvailable, recognise } from '../../src/services/receipt/ocr';
import { parseReceipt } from '../../src/services/receipt/parseReceipt';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../src/theme';

export default function ScanReceiptScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = useStyles();
    const { colors } = useTheme();

    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const ocrReady = isOcrAvailable();

    const handleCapture = async () => {
        if (!cameraRef.current || busy) return;

        setBusy(true);
        setStatus('Capturing…');

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                skipProcessing: true,
            });

            if (!photo?.uri) throw new Error('Capture failed');

            // Params are always strings; anything absent is simply omitted so the
            // add screen keeps its own default.
            const params: Record<string, string> = { receiptUri: photo.uri };

            if (ocrReady) {
                setStatus('Reading receipt…');
                const result = await recognise(photo.uri);

                if (result.text) {
                    const parsed = parseReceipt(result.text);

                    if (parsed.amount !== null) params.amount = String(parsed.amount);
                    if (parsed.merchant) params.description = parsed.merchant;
                    if (parsed.date) params.date = parsed.date.toISOString();
                    params.ocrConfidence = String(parsed.confidence);
                }
            }

            router.replace({ pathname: '/expense/add', params });
        } catch (error: any) {
            setStatus(error?.message ?? 'Something went wrong');
            setBusy(false);
        }
    };

    // Permission still resolving.
    if (!permission) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.centered, { padding: spacing.xxl }]}>
                <Ionicons name="camera-outline" size={56} color={colors.textSecondary} />
                <Text style={styles.permissionTitle}>Camera access needed</Text>
                <Text style={styles.permissionBody}>
                    Snap a photo of a receipt and PocketExpense+ will attach it to the
                    expense{ocrReady ? ' and read the total for you' : ''}.
                </Text>
                <Button
                    title="Allow camera"
                    onPress={requestPermission}
                    style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
                />
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
                    <Text style={styles.link}>Not now</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />

            {/* Framing guide */}
            <View style={styles.overlay} pointerEvents="none">
                <View style={styles.frame} />
                <Text style={styles.hint}>
                    {ocrReady
                        ? 'Fit the whole receipt in the frame'
                        : 'Photo will be attached — enter the amount next'}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.close, { top: insets.top + spacing.md }]}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Close scanner"
            >
                <Ionicons name="close" size={26} color={colors.textWhite} />
            </TouchableOpacity>

            <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.xxl }]}>
                {status && <Text style={styles.status}>{status}</Text>}

                <TouchableOpacity
                    style={[styles.shutter, busy && styles.shutterBusy]}
                    onPress={handleCapture}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Capture receipt"
                >
                    {busy ? (
                        <ActivityIndicator color={colors.primaryDark} />
                    ) : (
                        <View style={styles.shutterInner} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.background,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
        alignItems: 'center',
        justifyContent: 'center',
    },
    frame: {
        width: '78%',
        height: '52%',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.85)',
        borderRadius: borderRadius.lg,
    },
    hint: {
        marginTop: spacing.lg,
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: '#FFFFFF',
        textAlign: 'center',
        paddingHorizontal: spacing.xxl,
    },
    close: {
        position: 'absolute',
        left: spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controls: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
    },
    status: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: '#FFFFFF',
        marginBottom: spacing.md,
    },
    shutter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterBusy: {
        backgroundColor: '#FFFFFF',
    },
    shutterInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFFFFF',
    },
    permissionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.xl,
        color: c.textMain,
        marginTop: spacing.lg,
    },
    permissionBody: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 20,
    },
    link: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.primary,
    },
}));
