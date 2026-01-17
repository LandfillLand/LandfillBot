import { ref } from 'vue';
import { loadWasm } from 'shiki';
import { setDefaultWasmLoader } from '@shikijs/engine-oniguruma';

// Whether Oniguruma WASM has been initialized.
export const shikiWasmReady = ref(false);

let initPromise: Promise<boolean> | null = null;

export async function initShikiWasm(): Promise<boolean> {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			// Vite will turn this into a real URL under any base path.
			const { default: onigWasmUrl } = await import('shiki/onig.wasm?url');
			const wasmLoader = () => fetch(onigWasmUrl);
			setDefaultWasmLoader(wasmLoader);
			await loadWasm(wasmLoader);
			shikiWasmReady.value = true;
			return true;
		} catch (err) {
			console.warn('[shikiWasm] init failed:', err);
			shikiWasmReady.value = false;
			return false;
		}
	})();

	return initPromise;
}
