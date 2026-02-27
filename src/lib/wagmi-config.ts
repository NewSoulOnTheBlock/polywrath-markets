'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Polymarket Agent',
  projectId: 'polymarket-agent-dapp', // WalletConnect project ID - replace with real one for prod
  chains: [polygon],
  ssr: true,
});
