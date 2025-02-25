import { ChainId, Pair, Token } from '@uniswap/sdk';
import flatMap from 'lodash.flatmap';
import { useCallback, useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useActiveWeb3React } from 'hooks';
import { useAllTokens } from 'hooks/Tokens';
import { AppDispatch, AppState } from 'state';
import {
  addSerializedPair,
  addSerializedToken,
  removeSerializedToken,
  SerializedPair,
  SerializedToken,
  updateUserDarkMode,
  updateUserDeadline,
  updateUserExpertMode,
  updateUserSlippageTolerance,
  toggleURLWarning,
  updateUserSingleHopOnly,
  updateUserBonusRouter,
  updateSlippageManuallySet,
  updateSelectedWallet,
  updateUserLiquidityHub,
} from './actions';
import {
  V2_BASES_TO_TRACK_LIQUIDITY_FOR,
  V2_PINNED_PAIRS,
} from 'constants/v3/addresses';
import { ConnectionType } from 'connectors';

function serializeToken(token: Token): SerializedToken {
  return {
    chainId: token.chainId,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
  };
}

function deserializeToken(serializedToken: SerializedToken): Token {
  const token = new Token(
    serializedToken.chainId,
    serializedToken.address,
    serializedToken.decimals,
    serializedToken.symbol,
    serializedToken.name,
  );

  //HACK: Since we're adding default properties to the token we know its not native
  // adding these properties enables support for the new tokens in the Uniswap SDK
  const extendedToken = token as any;
  extendedToken.isToken = true;
  extendedToken.isNative = false;

  return extendedToken;
}

export function useIsDarkMode(): boolean {
  const { userDarkMode, matchesDarkMode } = useSelector<
    AppState,
    { userDarkMode: boolean | null; matchesDarkMode: boolean }
  >(
    ({ user: { matchesDarkMode, userDarkMode } }) => ({
      userDarkMode,
      matchesDarkMode,
    }),
    shallowEqual,
  );

  return userDarkMode === null ? matchesDarkMode : userDarkMode;
}

export function useDarkModeManager(): [boolean, () => void] {
  const dispatch = useDispatch<AppDispatch>();
  const darkMode = useIsDarkMode();

  const toggleSetDarkMode = useCallback(() => {
    dispatch(updateUserDarkMode({ userDarkMode: !darkMode }));
  }, [darkMode, dispatch]);

  return [darkMode, toggleSetDarkMode];
}

export function useIsExpertMode(): boolean {
  return useSelector<AppState, AppState['user']['userExpertMode']>(
    (state) => state.user.userExpertMode,
  );
}

export function useExpertModeManager(): [boolean, () => void] {
  const dispatch = useDispatch<AppDispatch>();
  const expertMode = useIsExpertMode();

  const toggleSetExpertMode = useCallback(() => {
    dispatch(updateUserExpertMode({ userExpertMode: !expertMode }));
  }, [expertMode, dispatch]);

  return [expertMode, toggleSetExpertMode];
}

export function useBonusRouterManager(): [boolean, () => void] {
  const dispatch = useDispatch<AppDispatch>();
  const bonusRouterDisabled = useSelector<
    AppState,
    AppState['user']['userBonusRouterDisabled']
  >((state) => {
    return state.user.userBonusRouterDisabled;
  });

  const toggleSetBonusRouter = useCallback(() => {
    dispatch(
      updateUserBonusRouter({ userBonusRouterDisabled: !bonusRouterDisabled }),
    );
  }, [bonusRouterDisabled, dispatch]);

  return [bonusRouterDisabled, toggleSetBonusRouter];
}

export function useUserSlippageTolerance(): [
  number,
  (slippage: number) => void,
] {
  const dispatch = useDispatch<AppDispatch>();
  const userSlippageTolerance = useSelector<
    AppState,
    AppState['user']['userSlippageTolerance']
  >((state) => {
    return state.user.userSlippageTolerance;
  });

  const setUserSlippageTolerance = useCallback(
    (userSlippageTolerance: number) => {
      dispatch(updateUserSlippageTolerance({ userSlippageTolerance }));
    },
    [dispatch],
  );

  return [userSlippageTolerance, setUserSlippageTolerance];
}

export function useSlippageManuallySet(): [
  boolean,
  (manuallySetSlippage: boolean) => void,
] {
  const dispatch = useDispatch<AppDispatch>();
  const slippageManuallySet = useSelector<
    AppState,
    AppState['user']['slippageManuallySet']
  >((state) => {
    return state.user.slippageManuallySet;
  });

  const setSlippageManuallySet = useCallback(
    (slippageManuallySet: boolean) => {
      dispatch(updateSlippageManuallySet({ slippageManuallySet }));
    },
    [dispatch],
  );

  return [slippageManuallySet, setSlippageManuallySet];
}

export function useUserTransactionTTL(): [number, (slippage: number) => void] {
  const dispatch = useDispatch<AppDispatch>();
  const userDeadline = useSelector<AppState, AppState['user']['userDeadline']>(
    (state) => {
      return state.user.userDeadline;
    },
  );

  const setUserDeadline = useCallback(
    (userDeadline: number) => {
      dispatch(updateUserDeadline({ userDeadline }));
    },
    [dispatch],
  );

  return [userDeadline, setUserDeadline];
}

export function useAddUserToken(): (token: Token) => void {
  const dispatch = useDispatch<AppDispatch>();
  return useCallback(
    (token: Token) => {
      dispatch(addSerializedToken({ serializedToken: serializeToken(token) }));
    },
    [dispatch],
  );
}

export function useRemoveUserAddedToken(): (
  chainId: number,
  address: string,
) => void {
  const dispatch = useDispatch<AppDispatch>();
  return useCallback(
    (chainId: number, address: string) => {
      dispatch(removeSerializedToken({ chainId, address }));
    },
    [dispatch],
  );
}

export function useUserAddedTokens(): Token[] {
  const { chainId } = useActiveWeb3React();
  const serializedTokensMap = useSelector<AppState, AppState['user']['tokens']>(
    ({ user: { tokens } }) => tokens,
  );

  return useMemo(() => {
    if (!chainId) return [];
    return Object.values(serializedTokensMap[chainId as ChainId] ?? {}).map(
      deserializeToken,
    );
  }, [serializedTokensMap, chainId]);
}

function serializePair(pair: Pair): SerializedPair {
  return {
    token0: serializeToken(pair.token0),
    token1: serializeToken(pair.token1),
  };
}

export function usePairAdder(): (pair: Pair) => void {
  const dispatch = useDispatch<AppDispatch>();

  return useCallback(
    (pair: Pair) => {
      dispatch(addSerializedPair({ serializedPair: serializePair(pair) }));
    },
    [dispatch],
  );
}

export function useURLWarningVisible(): boolean {
  return useSelector((state: AppState) => state.user.URLWarningVisible);
}

export function useURLWarningToggle(): () => void {
  const dispatch = useDispatch();
  return useCallback(() => dispatch(toggleURLWarning()), [dispatch]);
}

/**
 * Given two tokens return the liquidity token that represents its liquidity shares
 * @param tokenA one of the two tokens
 * @param tokenB the other token
 */
export function toV2LiquidityToken([tokenA, tokenB]: [Token, Token]): Token {
  return new Token(
    tokenA.chainId,
    Pair.getAddress(tokenA, tokenB),
    18,
    'QUICK-V2',
    'Quickswap V2',
  );
}

/**
 * Returns all the pairs of tokens that are tracked by the user for the current chain ID.
 */
export function useTrackedTokenPairs(): [Token, Token][] {
  const { chainId } = useActiveWeb3React();
  const tokens = useAllTokens();

  // pinned pairs
  const pinnedPairs = useMemo(
    () => (chainId ? V2_PINNED_PAIRS[chainId] ?? [] : []),
    [chainId],
  ) as [Token, Token][];

  // pairs for every token against every base
  const generatedPairs: [Token, Token][] = useMemo(
    () =>
      chainId
        ? flatMap(Object.keys(tokens), (tokenAddress) => {
            const token = tokens[tokenAddress];
            // for each token on the current chain,
            return (
              // loop though all bases on the current chain
              (V2_BASES_TO_TRACK_LIQUIDITY_FOR[chainId] ?? [])
                // to construct pairs of the given token with each base
                .map((base) => {
                  if (base.address === token.address) {
                    return null;
                  } else {
                    return [base, token];
                  }
                })
                .filter((p): p is [Token, Token] => p !== null)
            );
          })
        : [],
    [tokens, chainId],
  );

  // pairs saved by users
  const savedSerializedPairs = useSelector<AppState, AppState['user']['pairs']>(
    ({ user: { pairs } }) => pairs,
  );

  const userPairs: [Token, Token][] = useMemo(() => {
    if (!chainId || !savedSerializedPairs) return [];
    const forChain = savedSerializedPairs[chainId];
    if (!forChain) return [];

    return Object.keys(forChain).map((pairId) => {
      return [
        deserializeToken(forChain[pairId].token0),
        deserializeToken(forChain[pairId].token1),
      ];
    });
  }, [savedSerializedPairs, chainId]);

  const combinedList = useMemo(
    () => userPairs.concat(generatedPairs).concat(pinnedPairs),
    [generatedPairs, pinnedPairs, userPairs],
  );

  return useMemo(() => {
    // dedupes pairs of tokens in the combined list
    const keyed = combinedList.reduce<{ [key: string]: [Token, Token] }>(
      (memo, [tokenA, tokenB]) => {
        const sorted = tokenA.sortsBefore(tokenB);
        const key = sorted
          ? `${tokenA.address}:${tokenB.address}`
          : `${tokenB.address}:${tokenA.address}`;
        if (memo[key]) return memo;
        memo[key] = sorted ? [tokenA, tokenB] : [tokenB, tokenA];
        return memo;
      },
      {},
    );

    return Object.keys(keyed).map((key) => keyed[key]);
  }, [combinedList]);
}

export function useUserSingleHopOnly(): [
  boolean,
  (newSingleHopOnly: boolean) => void,
] {
  const dispatch = useDispatch<AppDispatch>();

  const singleHopOnly = useSelector<
    AppState,
    AppState['user']['userSingleHopOnly']
  >((state) => {
    return state.user.userSingleHopOnly;
  });

  const setSingleHopOnly = useCallback(
    (newSingleHopOnly: boolean) => {
      dispatch(
        updateUserSingleHopOnly({ userSingleHopOnly: newSingleHopOnly }),
      );
    },
    [dispatch],
  );

  return [singleHopOnly, setSingleHopOnly];
}

export function useSelectedWallet(): {
  selectedWallet: ConnectionType | undefined;
  updateSelectedWallet: (wallet?: ConnectionType) => void;
} {
  const selectedWallet = useSelector(
    (state: AppState) => state.user.selectedWallet,
  );
  const dispatch = useDispatch();
  const _updateSelectedWallet = useCallback(
    (wallet?: ConnectionType) => {
      dispatch(updateSelectedWallet({ wallet }));
    },
    [dispatch],
  );
  return { selectedWallet, updateSelectedWallet: _updateSelectedWallet };
}

export function useLiquidityHubManager(): [boolean, () => void] {
  const dispatch = useDispatch<AppDispatch>();
  const userLiquidityHubDisabled = useSelector<
    AppState,
    AppState['user']['userLiquidityHubDisabled']
  >((state) => {
    return state.user.userLiquidityHubDisabled;
  });

  const toggleSetLiquidityHub = useCallback(() => {
    dispatch(
      updateUserLiquidityHub({
        userLiquidityHubDisabled: !userLiquidityHubDisabled,
      }),
    );
  }, [userLiquidityHubDisabled, dispatch]);

  return [userLiquidityHubDisabled, toggleSetLiquidityHub];
}

// export function useUserTransactionTTL(): [number, (slippage: number) => void] {
//   const dispatch = useDispatch<AppDispatch>();
//   const userDeadline = useSelector<AppState, AppState['user']['userDeadline']>(
//     (state) => {
//       return state.user.userDeadline;
//     },
//   );

//   const setUserDeadline = useCallback(
//     (userDeadline: number) => {
//       dispatch(updateUserDeadline({ userDeadline }));
//     },
//     [dispatch],
//   );

//   return [userDeadline, setUserDeadline];
// }
