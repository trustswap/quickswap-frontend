import React, { useMemo, useEffect, useState } from 'react';
import { Currency } from '@uniswap/sdk-core';
import { PoolStats } from '../PoolStats';
import { IDerivedMintInfo, useV3MintActionHandlers } from 'state/mint/v3/hooks';
import { Presets } from 'state/mint/v3/reducer';
import { Box } from '@material-ui/core';
import { PoolState } from 'hooks/usePools';
import Loader from 'components/Loader';
import { fetchPoolsAPR } from 'utils/api';
import { computePoolAddress } from 'hooks/v3/computePoolAddress';
import { POOL_DEPLOYER_ADDRESS } from 'constants/v3/addresses';
import GammaPairABI from 'constants/abis/gamma-hypervisor.json';
import PoolABI from 'constants/abis/v3/pool.json';
import './index.scss';
import { useActiveWeb3React } from 'hooks';
import { Interface } from 'ethers/lib/utils';
import { useTranslation } from 'react-i18next';
import { useMultipleContractSingleData } from 'state/multicall/hooks';
import { GlobalConst } from 'constants/index';

export interface IPresetArgs {
  type: Presets;
  min: number;
  max: number;
  address?: string;
  isReversed?: boolean;
  title?: string;
  risk?: PresetProfits;
  tokenStr?: string;
}

interface IPresetRanges {
  mintInfo: IDerivedMintInfo;
  baseCurrency: Currency | null | undefined;
  quoteCurrency: Currency | null | undefined;
  isStablecoinPair: boolean;
  activePreset: Presets | null;
  handlePresetRangeSelection: (preset: IPresetArgs | null) => void;
  priceLower: string | undefined;
  priceUpper: string | undefined;
  price: string | undefined;
  gammaPair?: { address: string; title: string; type: Presets }[];
  isGamma?: boolean;
  unipilotPairs?: any[];
  isUnipilot?: boolean;
}

enum PresetProfits {
  VERY_LOW,
  LOW,
  MEDIUM,
  HIGH,
}

const unipilotVaultTypes = ['Wide', 'Balanced', 'Narrow'];

export function PresetRanges({
  mintInfo,
  baseCurrency,
  quoteCurrency,
  isStablecoinPair,
  activePreset,
  handlePresetRangeSelection,
  priceLower,
  price,
  priceUpper,
  isGamma = false,
  gammaPair,
  isUnipilot = false,
  unipilotPairs,
}: IPresetRanges) {
  const { chainId } = useActiveWeb3React();
  const { onChangePresetRange } = useV3MintActionHandlers(mintInfo.noLiquidity);
  const { t } = useTranslation();
  const [aprs, setAprs] = useState<undefined | { [key: string]: number }>();

  useEffect(() => {
    if (!chainId) return;
    fetchPoolsAPR(chainId).then(setAprs);
  }, [chainId]);

  const gammaPairAddresses = gammaPair
    ? gammaPair.map((pair) => pair.address)
    : [];

  const gammaBaseLowerData = useMultipleContractSingleData(
    gammaPairAddresses,
    new Interface(GammaPairABI),
    'baseLower',
  );

  const gammaBaseUpperData = useMultipleContractSingleData(
    gammaPairAddresses,
    new Interface(GammaPairABI),
    'baseUpper',
  );

  const gammaCurrentTickData = useMultipleContractSingleData(
    gammaPairAddresses,
    new Interface(GammaPairABI),
    'currentTick',
  );

  const uniPilotCurrentTickData = useMultipleContractSingleData(
    unipilotPairs?.map((pair) => pair.poolAddress) ?? [],
    new Interface(PoolABI),
    'globalState',
  );

  const gammaBaseLowers = gammaBaseLowerData.map((callData) => {
    if (!callData.loading && callData.result && callData.result.length > 0) {
      return Number(callData.result[0]);
    }
    return;
  });

  const gammaBaseUppers = gammaBaseUpperData.map((callData) => {
    if (!callData.loading && callData.result && callData.result.length > 0) {
      return Number(callData.result[0]);
    }
    return;
  });

  const gammaCurrentTicks = gammaCurrentTickData.map((callData) => {
    if (!callData.loading && callData.result && callData.result.length > 0) {
      return Number(callData.result[0]);
    }
    return;
  });

  const uniPilotCurrentTicks = uniPilotCurrentTickData.map((callData) => {
    if (!callData.loading && callData.result && callData.result.length > 1) {
      return Number(callData.result[1]);
    }
    return 0;
  });

  const gammaValues = gammaPairAddresses.map((_, index) => {
    if (
      gammaBaseLowers.length >= index &&
      gammaBaseUppers.length >= index &&
      gammaCurrentTicks.length >= index
    ) {
      const gammaBaseLower = gammaBaseLowers[index];
      const gammaCurrentTick = gammaCurrentTicks[index];
      const gammaBaseUpper = gammaBaseUppers[index];
      if (gammaBaseLower && gammaCurrentTick && gammaBaseUpper) {
        const lowerValue = Math.pow(1.0001, gammaBaseLower - gammaCurrentTick);
        const upperValue = Math.pow(1.0001, gammaBaseUpper - gammaCurrentTick);
        return { min: lowerValue, max: upperValue };
      }
      return;
    }
    return;
  });

  const ranges: IPresetArgs[] = useMemo(() => {
    if (isGamma) {
      return gammaPair
        ? gammaPair.map((pair, index) => {
            const gammaValue = gammaValues[index];

            return {
              type: pair.type,
              title: pair.title,
              address: pair.address,
              min: gammaValue ? gammaValue.min : 0,
              max: gammaValue ? gammaValue.max : 0,
              risk: PresetProfits.VERY_LOW,
              profit: PresetProfits.HIGH,
            };
          })
        : [];
    }

    if (isUnipilot) {
      return unipilotPairs
        ? unipilotPairs.map((pair, index) => {
            const pairSymbolData = pair.symbol.split('-');
            const pairType = Number(pairSymbolData[pairSymbolData.length - 1]);
            const minTick = Math.max(
              Number(pair.baseTickLower ?? 0),
              Number(pair.rangeTickLower ?? 0),
            );
            const maxTick = Math.max(
              Number(pair.baseTickUpper ?? 0),
              Number(pair.rangeTickUpper ?? 0),
            );
            const currentTick = uniPilotCurrentTicks[index];
            const minPrice = Math.pow(1.0001, minTick - currentTick);
            const maxPrice = Math.pow(1.0001, maxTick - currentTick);
            return {
              type: pairType,
              title: unipilotVaultTypes[pairType - 1],
              address: pair.id,
              tokenStr: pair.token0 + '-' + pair.token1,
              min: minPrice,
              max: maxPrice,
              risk: PresetProfits.VERY_LOW,
              profit: PresetProfits.HIGH,
            };
          })
        : [];
    }

    if (isStablecoinPair)
      return [
        {
          type: Presets.FULL,
          title: t('fullRange'),
          min: 0,
          max: Infinity,
          risk: PresetProfits.VERY_LOW,
          profit: PresetProfits.VERY_LOW,
        },
        {
          type: Presets.STABLE,
          title: t('stablecoins'),
          min: 0.984,
          max: 1.016,
          risk: PresetProfits.VERY_LOW,
          profit: PresetProfits.HIGH,
        },
      ];

    return [
      {
        type: Presets.FULL,
        title: t('fullRange'),
        min: 0,
        max: Infinity,
        risk: PresetProfits.VERY_LOW,
        profit: PresetProfits.VERY_LOW,
      },
      {
        type: Presets.SAFE,
        title: t('safe'),
        min: 0.8,
        max: 1.4,
        risk: PresetProfits.LOW,
        profit: PresetProfits.LOW,
      },
      {
        type: Presets.NORMAL,
        title: t('common'),
        min: 0.9,
        max: 1.2,
        risk: PresetProfits.MEDIUM,
        profit: PresetProfits.MEDIUM,
      },
      {
        type: Presets.RISK,
        title: t('expert'),
        min: 0.95,
        max: 1.1,
        risk: PresetProfits.HIGH,
        profit: PresetProfits.HIGH,
      },
    ];
  }, [
    isGamma,
    isUnipilot,
    isStablecoinPair,
    t,
    gammaPair,
    gammaValues,
    unipilotPairs,
    uniPilotCurrentTicks,
  ]);

  const risk = useMemo(() => {
    if (!priceUpper || !priceLower || !price) return;

    const upperPercent = 100 - (+price / +priceUpper) * 100;
    const lowerPercent = Math.abs(100 - (+price / +priceLower) * 100);

    const rangePercent =
      +priceLower > +price && +priceUpper > 0
        ? upperPercent - lowerPercent
        : upperPercent + lowerPercent;

    if (rangePercent < 7.5) {
      return 5;
    } else if (rangePercent < 15) {
      return (15 - rangePercent) / 7.5 + 4;
    } else if (rangePercent < 30) {
      return (30 - rangePercent) / 15 + 3;
    } else if (rangePercent < 60) {
      return (60 - rangePercent) / 30 + 2;
    } else if (rangePercent < 120) {
      return (120 - rangePercent) / 60 + 1;
    } else {
      return 1;
    }
  }, [price, priceLower, priceUpper]);

  const _risk = useMemo(() => {
    const res: any[] = [];
    const split = risk?.toString().split('.');

    if (!split) return;

    for (let i = 0; i < 5; i++) {
      if (i < +split[0]) {
        res.push(100);
      } else if (i === +split[0]) {
        res.push(parseFloat('0.' + split[1]) * 100);
      } else {
        res.push(0);
      }
    }

    return res;
  }, [risk]);

  const feeString = useMemo(() => {
    if (
      mintInfo.poolState === PoolState.INVALID ||
      mintInfo.poolState === PoolState.LOADING
    )
      return <Loader stroke='#22cbdc' />;

    if (mintInfo.noLiquidity) return `0.01% ${t('fee').toLowerCase()}`;

    return `${(mintInfo.dynamicFee / 10000).toFixed(3)}% ${t(
      'fee',
    ).toLowerCase()}`;
  }, [mintInfo, t]);

  const aprString = useMemo(() => {
    if (!aprs || !baseCurrency || !quoteCurrency)
      return <Loader stroke='#22dc22' />;

    const poolAddress = computePoolAddress({
      poolDeployer: POOL_DEPLOYER_ADDRESS[137],
      tokenA: baseCurrency.wrapped,
      tokenB: quoteCurrency.wrapped,
    }).toLowerCase();

    return aprs[poolAddress] ? aprs[poolAddress].toFixed(2) : undefined;
  }, [baseCurrency, quoteCurrency, aprs]);

  const gammaValuesLoaded =
    mintInfo.price && gammaValues.filter((value) => !value).length === 0;
  const { liquidityRangeType } = mintInfo;

  useEffect(() => {
    if (
      gammaValuesLoaded &&
      liquidityRangeType === GlobalConst.v3LiquidityRangeType.GAMMA_RANGE
    ) {
      handlePresetRangeSelection(ranges[0]);
      onChangePresetRange(ranges[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gammaValuesLoaded, liquidityRangeType, baseCurrency, quoteCurrency]);

  useEffect(() => {
    if (
      unipilotPairs &&
      unipilotPairs?.length > 0 &&
      liquidityRangeType === GlobalConst.v3LiquidityRangeType.UNIPILOT_RANGE
    ) {
      handlePresetRangeSelection(ranges[0]);
      onChangePresetRange(ranges[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unipilotPairs?.length, liquidityRangeType, baseCurrency, quoteCurrency]);

  return (
    <Box>
      <Box mb='10px' className='preset-buttons'>
        {isGamma && !gammaValuesLoaded ? (
          <Box width={1} className='flex justify-center'>
            <Loader />
          </Box>
        ) : (
          <>
            {ranges.map((range, i) => (
              <button
                className={`${
                  activePreset === range.type ? 'active-preset' : ''
                }`}
                onClick={() => {
                  if (activePreset === range.type) {
                    handlePresetRangeSelection(null);
                  } else {
                    handlePresetRangeSelection(range);
                  }
                  onChangePresetRange(range);
                }}
                key={i}
              >
                <p className='caption'>{range.title}</p>
              </button>
            ))}
          </>
        )}
      </Box>
      {!isGamma && !isUnipilot && (
        <>
          <Box className='flex justify-between'>
            {_risk && !mintInfo.invalidRange && !isStablecoinPair && (
              <Box className='preset-range-info'>
                <Box px='12px' className='flex items-center justify-between'>
                  <span>{t('risk')}:</span>
                  <Box className='flex items-center'>
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className='preset-range-circle'>
                        <Box
                          key={i}
                          left={`calc(-100% + ${_risk[i]}%)`}
                          className='preset-range-circle-active bg-error'
                        />
                      </div>
                    ))}
                  </Box>
                </Box>
                <Box
                  mt={1}
                  px='12px'
                  className='flex items-center justify-between'
                >
                  <span>{t('profit')}:</span>
                  <Box className='flex items-center'>
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className='preset-range-circle'>
                        <Box
                          key={i}
                          left={`calc(-100% + ${_risk[i]}%)`}
                          className='preset-range-circle-active bg-success'
                        />
                      </div>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
            {baseCurrency && quoteCurrency && (
              <Box className='preset-range-info'>
                <Box padding='10px 12px'>
                  <PoolStats
                    fee={feeString}
                    apr={aprString}
                    loading={
                      mintInfo.poolState === PoolState.LOADING ||
                      mintInfo.poolState === PoolState.INVALID
                    }
                    noLiquidity={mintInfo.noLiquidity}
                  ></PoolStats>
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
