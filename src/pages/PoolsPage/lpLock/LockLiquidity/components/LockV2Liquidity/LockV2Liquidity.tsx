import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  TransactionErrorContent,
  TransactionConfirmationModal,
  ConfirmationModalContent,
} from 'components';
import { Contract } from '@ethersproject/contracts';
/* import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration'; */
import {
  useNetworkSelectionModalToggle,
  useWalletModalToggle,
} from 'state/application/hooks';
import { useTranslation } from 'react-i18next';
import {
  Token,
  ChainId,
} from '@uniswap/sdk';
import { useActiveWeb3React, useV2LiquidityPools } from 'hooks';
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback';
import {
  calculateGasMargin,
  useIsSupportedNetwork,
  formatTokenAmount,
} from 'utils';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@material-ui/core';
import { useTokenBalance } from 'state/wallet/hooks';
import { usePairContract, useTokenLockerContract } from 'hooks/useContract';
import { V2_FACTORY_ADDRESSES } from 'constants/lockers';
import { tryParseAmount } from 'state/swap/hooks';
import useTransactionDeadline from 'hooks/useTransactionDeadline';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ethers } from 'ethers';
import './index.scss';
dayjs.extend(utc);
//import { fetchUserV2LiquidityLocks } from 'state/data/liquidityLocker';

const LockV2Liquidity: React.FC = () => {
  const { t } = useTranslation();
  const isSupportedNetwork = useIsSupportedNetwork();
  const { account, chainId, library } = useActiveWeb3React();
  const chainIdToUse = chainId ? chainId : ChainId.MATIC;
  const nativeCurrency = Token.ETHER[chainIdToUse];

  // inputs
  const [isV3, setIsV3] = useState(false);
  const [unlockDate, setUnlockDate] = useState(dayjs().add(90, 'days'))
  const [selectedExtendDate, setSelectedExtendDate] = useState('3M')
  /* const [value, setValue] = useState<Dayjs | null>(dayjs().add(dayjs.duration({'years' : 1}))); */
  const [lpTokenAddress, setLpTokenAddress] = useState('');
  const [amount, setAmount] = useState('')
  const [removeErrorMessage, setRemoveErrorMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [feesInEth, setFeesInEth] = useState(ethers.BigNumber.from(0));

  const { ethereum } = window as any;
  const toggleWalletModal = useWalletModalToggle();
  const toggleNetworkSelectionModal = useNetworkSelectionModalToggle();

  const {
    loading: v2IsLoading,
    pairs: allV2PairsWithLiquidity,
  } = useV2LiquidityPools(account ?? undefined);

  const lpToken = useMemo(() => {
    return allV2PairsWithLiquidity.find((item) => item.liquidityToken.address === lpTokenAddress)
  }, [allV2PairsWithLiquidity]);

  const userPoolBalance = useTokenBalance(
    account ?? undefined,
    lpToken?.liquidityToken,
  );
  const parsedAmount = tryParseAmount(chainIdToUse, amount, lpToken?.liquidityToken);
  const tokenLockerContract = useTokenLockerContract(chainId);

  const [showConfirm, setShowConfirm] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txPending, setTxPending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [attemptingTxn, setAttemptingTxn] = useState(false);
  const pairContract: Contract | null = usePairContract(
    lpToken?.liquidityToken?.address,
  );
  const [approval, approveCallback] = useApproveCallback(
    parsedAmount,
    chainId ? V2_FACTORY_ADDRESSES[chainId] : undefined,
  );

  const deadline = useTransactionDeadline();

  const handleChange = (e: any) => {
      setLpTokenAddress(e.target.value);
  };

  const handleChangeDate = (e: string) => {
    setUnlockDate(dayjs(e));
  };

  const addMonths = (months: number) => {
    const newDate = dayjs().add(months, 'month')
    setUnlockDate(newDate);
    setSelectedExtendDate(`${months}M`)
  }

  const addYears = (years: number) => {
    const newDate = dayjs().add(years, 'year')
    setUnlockDate(newDate);
    setSelectedExtendDate(`${years}Y`)
  }

  useEffect(()=> {
    async function getFeesInEth (address: string) {
      setFeesInEth(await tokenLockerContract?.getFeesInETH(address))
    }
    if (lpTokenAddress) {
      getFeesInEth(lpTokenAddress)
    }
  }, [lpTokenAddress])

  const connectWallet = () => {
    if (!isSupportedNetwork) {
      toggleNetworkSelectionModal();
    } else {
      toggleWalletModal();
    }
  };

  // @Hassaan: Approval already works
  const onAttemptToApprove = async () => {
    if (!pairContract || !lpToken || !library || !deadline) {
      setErrorMsg(t('missingdependencies'));
      return;
    }
    const liquidityAmount = parsedAmount;
    if (!liquidityAmount) {
      setErrorMsg(t('missingliquidity'));
      return;
    }
    setApproving(true);
    try {
      await approveCallback();
      setApproving(false);
    } catch (e) {
      setApproving(false);
    }
  };

  const onLock = async () => {
    if (!pairContract || !lpToken || !library || !deadline || v2IsLoading || !tokenLockerContract) {
      setErrorMsg(t('missingdependencies'));
      throw new Error(t('missingdependencies'));
    }
    const liquidityAmount = parsedAmount;
    
    if (!liquidityAmount) {
      setErrorMsg(t('missingliquidity'));
      throw new Error(t('missingliquidity'));
    }

    try {
      setAttemptingTxn(true);
      console.log(
        lpTokenAddress,
        account,
        parsedAmount.raw.toString(),
        unlockDate.unix(),
        false,
        ethers.constants.AddressZero
      )
      
      const gasEstimate = await tokenLockerContract?.estimateGas.lockToken(
        lpTokenAddress,
        account,
        parsedAmount.raw.toString(),
        unlockDate.unix(),
        false,
        ethers.constants.AddressZero
      )
      const gasEstimateWithMargin = calculateGasMargin(gasEstimate);
      const response = await tokenLockerContract?.lockToken(
        lpTokenAddress,
        account,
        parsedAmount.raw.toString(),
        unlockDate.unix(),
        false,
        ethers.constants.AddressZero, {
          value: feesInEth
        }
      )

      setTxHash(response.hash)
      setAttemptingTxn(false);
      setTxPending(true);

      const receipt = await response.wait(); 
      console.log(receipt);
      setTxPending(false);
    } catch (error) {
      setAttemptingTxn(false);
      setTxPending(false);
      setRemoveErrorMessage(t('errorInTx'));
    }
  };

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false);
    setTxHash('');
  }, []);

  const modalHeader = () => {
    return (
      <Box>
        <Box className='flex justify-center' mt={10} mb={3}>
          Locking V2 Liquidity
        </Box>
        <Box mt={2}>
          <Button fullWidth className='lockButton' onClick={onLock}>
            {t('confirm')}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {showConfirm && (
        <TransactionConfirmationModal
          isOpen={showConfirm}
          onDismiss={handleDismissConfirmation}
          attemptingTxn={attemptingTxn}
          txPending={txPending}
          hash={txHash}
          content={() =>
            removeErrorMessage ? (
              <TransactionErrorContent
                onDismiss={handleDismissConfirmation}
                message={removeErrorMessage}
              />
            ) : (
              <ConfirmationModalContent
                title={t('lockingLiquidity')}
                onDismiss={handleDismissConfirmation}
                content={modalHeader}
              />
            )
          }
          pendingText=''
          modalContent={
            txPending
              ? 'Submitting'
              : 'Success'
          }
        />
      )}
      <Box p={2} className='bg-secondary2 rounded-md'>
        <Box>
          <FormControl fullWidth variant="outlined">
            <InputLabel>LP Token</InputLabel>
            <Select
              disabled={v2IsLoading}
              value={lpTokenAddress}
              onChange={handleChange}
              label="LP Token"
              renderValue={(value) => `Address: ${value}`}
            >
              <MenuItem value=''>
                <em>None</em>
              </MenuItem>
              {allV2PairsWithLiquidity.map((pair) => (
                <MenuItem key={pair.liquidityToken.address} value={pair.liquidityToken.address}>{pair.liquidityToken.address}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box mt={2.5}>
          <TextField value={amount} onChange={(e)=>setAmount(e.target.value)} type="number" fullWidth label="Amount to lock" variant="outlined" />
          <small>{formatTokenAmount(userPoolBalance)}</small>
        </Box>
        <Box mt={2.5}>
          <TextField
            fullWidth
            label="Lock until"
            type="datetime-local"
            value={unlockDate.format('YYYY-MM-DDTHH:mm')}
            onChange={(e)=> handleChangeDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box className='flex flex-wrap items-center flex-wrap' mt={1}>
          <Box className={`durationWrapper${selectedExtendDate === '3M' ? ' selectedDurationWrapper' : ''}`} onClick={() => addMonths(3)}>
            <small>3M</small>
          </Box>
          <Box className={`durationWrapper${selectedExtendDate === '6M' ? ' selectedDurationWrapper' : ''}`} onClick={() => addMonths(6)} ml={1}>
            <small>6M</small>
          </Box>
          <Box className={`durationWrapper${selectedExtendDate === '9M' ? ' selectedDurationWrapper' : ''}`} onClick={() => addMonths(9)} ml={1}>
            <small>9M</small>
          </Box>
          <Box className={`durationWrapper${selectedExtendDate === '1Y' ? ' selectedDurationWrapper' : ''}`} onClick={() => addYears(1)} ml={1}>
            <small>1Y</small>
          </Box>
          <Box className={`durationWrapper${selectedExtendDate === '2Y' ? ' selectedDurationWrapper' : ''}`} onClick={() => addYears(2)} ml={1}>
            <small>2Y</small>
          </Box>
          <Box className={`durationWrapper${selectedExtendDate === '5Y' ? ' selectedDurationWrapper' : ''}`} onClick={() => addYears(5)} ml={1}>
            <small>5Y</small>
          </Box>
        </Box>
        {/* <Box mt={2.5}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker value={value} onChange={(e)=> setValue(e)} />
          </LocalizationProvider>
        </Box> */}
      </Box>
      <Box className='swapButtonWrapper'>
        <Button
          fullWidth
          disabled={approving || approval !== ApprovalState.NOT_APPROVED}
          onClick={onAttemptToApprove}
        >
          {approving ? 'Approving...' : 'Approve'}
        </Button>
      </Box>
      <Box mt={2} className='swapButtonWrapper'>
        <Button
          fullWidth
          disabled={approval !== ApprovalState.APPROVED}
          onClick={() => {
            setRemoveErrorMessage('');
            setShowConfirm(true);
          }}
        >
          Lock Liquidity
        </Button>
      </Box>
    </Box>
  );
};

export default LockV2Liquidity;