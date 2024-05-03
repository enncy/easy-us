import { GMStoreProvider, MemoryStoreProvider, StoreProvider } from '../interfaces/store.provider';
export { GMStoreProvider, MemoryStoreProvider } from '../interfaces/store.provider';
export const $store: StoreProvider =
	typeof globalThis.unsafeWindow === 'undefined' ? new MemoryStoreProvider() : new GMStoreProvider();
