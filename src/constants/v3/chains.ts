import { ChainId } from '@uniswap/sdk';

export const L1_CHAIN_IDS = [] as const;

export type SupportedL1ChainId = typeof L1_CHAIN_IDS[number];

export const L2_CHAIN_IDS = [] as const;

export type SupportedL2ChainId = typeof L2_CHAIN_IDS[number];

interface L1ChainInfo {
  readonly docs: string;
  readonly explorer: string;
  readonly infoLink: string;
  readonly label: string;
  readonly nativeCurrencySymbol: string;
  readonly nativeCurrencyName: string;
  readonly nativeCurrencyDecimals: number;
}

interface L2ChainInfo extends L1ChainInfo {
  readonly bridge: string;
  readonly logoUrl: string;
}

type ChainInfo = { readonly [chainId: number]: L1ChainInfo | L2ChainInfo } & {
  readonly [chainId in SupportedL2ChainId]: L2ChainInfo;
} &
  { readonly [chainId in SupportedL1ChainId]: L1ChainInfo };

export const CHAIN_INFO: ChainInfo = {
  [ChainId.MATIC]: {
    docs: 'https://algebra.finance/',
    explorer: 'https://polygonscan.com/',
    infoLink: 'https://algebra.finance',
    label: 'Polygon',
    nativeCurrencySymbol: 'MATIC',
    nativeCurrencyName: 'Matic',
    nativeCurrencyDecimals: 18,
  },
  [ChainId.DOGECHAIN]: {
    docs: 'https://algebra.finance/',
    explorer: 'https://explorer.dogechain.dog',
    infoLink: 'https://algebra.finance',
    label: 'DOGECHAIN',
    nativeCurrencySymbol: 'WDOGE',
    nativeCurrencyName: 'Wrapped Doge',
    nativeCurrencyDecimals: 18,
  },
  [ChainId.ZKTESTNET]: {
    docs: 'https://algebra.finance/',
    explorer: 'https://testnet-zkevm.polygonscan.com',
    infoLink: 'https://algebra.finance',
    label: 'ZKTESTNET',
    nativeCurrencySymbol: 'ETH',
    nativeCurrencyName: 'Ether',
    nativeCurrencyDecimals: 18,
  },
  [ChainId.ZKEVM]: {
    docs: 'https://algebra.finance/',
    explorer: 'https://zkevm.polygonscan.com',
    infoLink: 'https://algebra.finance',
    label: 'ZKEVM',
    nativeCurrencySymbol: 'ETH',
    nativeCurrencyName: 'Ether',
    nativeCurrencyDecimals: 18,
  },
  [ChainId.MANTA]: {
    docs: 'https://algebra.finance/',
    explorer: 'https://pacific-explorer.manta.network',
    infoLink: 'https://algebra.finance',
    label: 'Manta',
    nativeCurrencySymbol: 'ETH',
    nativeCurrencyName: 'Ether',
    nativeCurrencyDecimals: 18,
  },
  [ChainId.ZKATANA]: {
    docs: 'https://algebra.finance/',
    explorer: 'https://zkatana.blockscout.com',
    infoLink: 'https://algebra.finance',
    label: 'zKatana',
    nativeCurrencySymbol: 'ETH',
    nativeCurrencyName: 'Ether',
    nativeCurrencyDecimals: 18,
  },
};
