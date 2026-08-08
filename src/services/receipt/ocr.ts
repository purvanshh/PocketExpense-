/**
 * Text recognition for receipt images.
 *
 * There is no first-party on-device OCR in the Expo managed workflow, so this
 * is a thin provider layer:
 *
 *   - If `@react-native-ml-kit/text-recognition` is present (it requires a
 *     custom dev build — `npx expo run:android` or an EAS build, not Expo Go),
 *     it is used for fully offline, free recognition.
 *   - Otherwise `recognise` reports unavailability and the capture flow falls
 *     back to attaching the photo and letting the user type the amount.
 *
 * Everything downstream consumes plain text, so swapping in a cloud provider
 * later means implementing one function.
 */

export interface OcrResult {
    available: boolean;
    text: string;
    /** Set when a provider exists but the call itself failed. */
    error?: string;
}

type MlKitModule = {
    default?: { recognize: (uri: string) => Promise<{ text: string }> };
    recognize?: (uri: string) => Promise<{ text: string }>;
};

let cachedModule: MlKitModule | null | undefined;

/**
 * Resolve the optional native module once. `require` is used rather than a
 * static import so the bundle still builds when the package is absent.
 */
function loadProvider(): MlKitModule | null {
    if (cachedModule !== undefined) return cachedModule;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        cachedModule = require('@react-native-ml-kit/text-recognition') as MlKitModule;
    } catch {
        cachedModule = null;
    }

    return cachedModule;
}

/** True when text recognition can actually run in this build. */
export function isOcrAvailable(): boolean {
    return loadProvider() !== null;
}

export async function recognise(imageUri: string): Promise<OcrResult> {
    const provider = loadProvider();

    if (!provider) {
        return { available: false, text: '' };
    }

    const recognize = provider.default?.recognize ?? provider.recognize;
    if (!recognize) {
        return { available: false, text: '' };
    }

    try {
        const result = await recognize(imageUri);
        return { available: true, text: result?.text ?? '' };
    } catch (error) {
        return {
            available: true,
            text: '',
            error: error instanceof Error ? error.message : 'Text recognition failed',
        };
    }
}
