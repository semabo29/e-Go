export type ListenerStore = Record<string, Array<(...args: unknown[]) => void>>;

type MockAd = {
  load: { mock: { calls: unknown[] } };
  show: {
    mock: { calls: unknown[] };
    mockImplementation: (impl: () => void) => void;
  };
  addAdEventListener: { mock: { calls: Array<[string, (...args: unknown[]) => void]> } };
};

export type AdTestHarness = {
  interstitialStore: ListenerStore;
  rewardedStore: ListenerStore;
  interstitialAd: MockAd;
  rewardedAd: MockAd;
};

declare global {
  // eslint-disable-next-line no-var
  var __adTestHarness: AdTestHarness | undefined;
}

export function getHarness(): AdTestHarness {
  const harness = globalThis.__adTestHarness;
  if (!harness) throw new Error('Ad test harness no inicializado');
  return harness;
}

export function clearHarnessStores(): void {
  const harness = getHarness();
  for (const key of Object.keys(harness.interstitialStore)) {
    delete harness.interstitialStore[key];
  }
  for (const key of Object.keys(harness.rewardedStore)) {
    delete harness.rewardedStore[key];
  }
}

export function invokeHandler(
  ad: AdTestHarness['interstitialAd'],
  event: string,
  which: 'first' | 'last' = 'first'
): void {
  const calls = ad.addAdEventListener.mock.calls.filter((entry) => entry[0] === event);
  if (!calls.length) throw new Error(`No listener for ${event}`);
  const call = which === 'last' ? calls[calls.length - 1] : calls[0];
  call[1]();
}
