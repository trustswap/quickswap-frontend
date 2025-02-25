import polygon from './polygon.json';
import dogechain from './dogechain.json';
import zktestnet from './zktestnet.json';
import zkmainnet from './zkmainnet.json';
import manta from './manta.json';
import zkartana from './zkartana.json';
import qlpmanager from './qlpmanager.json';
import { ChainId } from '@uniswap/sdk';
const configs: any = {
  [ChainId.MATIC]: polygon,
  [ChainId.DOGECHAIN]: dogechain,
  [ChainId.ZKTESTNET]: zktestnet,
  [ChainId.ZKEVM]: zkmainnet,
  [ChainId.MANTA]: manta,
  [ChainId.ZKATANA]: zkartana,
};

export const getConfig = (network: ChainId | undefined) => {
  if (network === undefined) {
    return configs[ChainId.MATIC];
  }
  const config = configs[network];
  return config;
};

export const getQlpManager = () => {
  return qlpmanager;
};
