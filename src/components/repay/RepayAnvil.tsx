import {
  PoolContract,
  PositionEstimates,
  RequestType,
  SubmitArgs,
  UserPositions,
  parseResult,
} from '@blend-capital/blend-sdk';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import { SorobanRpc } from 'stellar-sdk';
import { TxStatus, TxType, useWallet } from '../../contexts/wallet';
import { RPC_DEBOUNCE_DELAY, useDebouncedState } from '../../hooks/debounce';
import { useStore } from '../../store/store';
import { toBalance, toPercentage } from '../../utils/formatter';
import { getAssetReserve } from '../../utils/horizon';
import { scaleInputToBigInt } from '../../utils/scval';
import { InputBar } from '../common/InputBar';
import { OpaqueButton } from '../common/OpaqueButton';
import { ReserveComponentProps } from '../common/ReserveComponentProps';
import { Row } from '../common/Row';
import { Section, SectionSize } from '../common/Section';
import { SubmitError, TxOverview } from '../common/TxOverview';
import { Value } from '../common/Value';
import { ValueChange } from '../common/ValueChange';

export const RepayAnvil: React.FC<ReserveComponentProps> = ({ poolId, assetId }) => {
  const theme = useTheme();
  const { connected, walletAddress, poolSubmit, txStatus, txType } = useWallet();

  const account = useStore((state) => state.account);
  const poolData = useStore((state) => state.pools.get(poolId));
  const userPoolData = useStore((state) => state.userPoolData.get(poolId));
  const userBalance = useStore((state) => state.balances.get(assetId)) ?? BigInt(0);

  const [toRepay, setToRepay] = useState<string>('');
  const [simResponse, setSimResponse] = useState<SorobanRpc.Api.SimulateTransactionResponse>();
  const [parsedSimResult, setParsedSimResult] = useState<UserPositions>();
  const [validDecimals, setValidDecimals] = useState<boolean>(true);

  useDebouncedState(toRepay, RPC_DEBOUNCE_DELAY, txType, async () => {
    if (validDecimals) {
      let response = await handleSubmitTransaction(true);
      if (response) {
        setSimResponse(response);
        if (SorobanRpc.Api.isSimulationSuccess(response)) {
          setParsedSimResult(parseResult(response, PoolContract.parsers.submit));
        }
      }
    }
  });
  let newPositionEstimate =
    poolData && parsedSimResult ? PositionEstimates.build(poolData, parsedSimResult) : undefined;

  const reserve = poolData?.reserves.get(assetId);
  const assetToBase = reserve?.oraclePrice ?? 1;
  const decimals = reserve?.config.decimals ?? 7;
  const scalar = 10 ** decimals;
  const symbol = reserve?.tokenMetadata?.symbol ?? '';

  const curBorrowCap = userPoolData ? userPoolData.positionEstimates.borrowCap : undefined;
  const nextBorrowCap = newPositionEstimate ? newPositionEstimate.borrowCap : undefined;
  const curBorrowLimit =
    userPoolData && Number.isFinite(userPoolData?.positionEstimates.borrowLimit)
      ? userPoolData?.positionEstimates?.borrowLimit
      : 0;
  const nextBorrowLimit =
    newPositionEstimate && Number.isFinite(newPositionEstimate?.borrowLimit)
      ? newPositionEstimate?.borrowLimit
      : 0;

  // calculate current wallet state
  let stellar_reserve_amount = getAssetReserve(account, reserve?.tokenMetadata?.asset);
  const freeUserBalanceScaled = Number(userBalance) / scalar - stellar_reserve_amount;

  let returnedTokens =
    toRepay != undefined &&
      userPoolData &&
      Number(toRepay) > (userPoolData.positionEstimates.liabilities.get(assetId) ?? 0)
      ? Number(toRepay) - (userPoolData.positionEstimates.liabilities.get(assetId) ?? 0)
      : 0;
  if (txStatus === TxStatus.SUCCESS && txType === TxType.CONTRACT && Number(toRepay) != 0) {
    setToRepay('');
  }
  // verify that the user can act
  const { isSubmitDisabled, isMaxDisabled, reason, disabledType } = useMemo(() => {
    const errorProps: SubmitError = {
      isSubmitDisabled: false,
      isMaxDisabled: false,
      reason: undefined,
      disabledType: undefined,
    };
    if (!toRepay) {
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = 'Please enter an amount to repay.';
      errorProps.disabledType = 'info';
    } else if (toRepay.split('.')[1]?.length > decimals) {
      setValidDecimals(false);
      errorProps.isSubmitDisabled = true;
      errorProps.isMaxDisabled = false;
      errorProps.reason = `You cannot input more than ${decimals} decimal places.`;
      errorProps.disabledType = 'warning';
    }

    return errorProps;
  }, [freeUserBalanceScaled, toRepay, simResponse]);

  const handleRepayMax = () => {
    if (userPoolData) {
      let dustProofRepay = userPoolData?.positionEstimates?.liabilities?.get(assetId) ?? 0 * 1.001;
      let maxRepay =
        freeUserBalanceScaled < dustProofRepay ? freeUserBalanceScaled : dustProofRepay;
      setToRepay(maxRepay.toFixed(decimals));
    }
  };

  const handleSubmitTransaction = async (sim: boolean) => {
    if (toRepay && connected && reserve) {
      let submitArgs: SubmitArgs = {
        from: walletAddress,
        to: walletAddress,
        spender: walletAddress,
        requests: [
          {
            amount: scaleInputToBigInt(toRepay, decimals),
            request_type: RequestType.Repay,
            address: reserve.assetId,
          },
        ],
      };
      return await poolSubmit(poolId, submitArgs, sim);
    }
  };

  return (
    <Row>
      <Section
        width={SectionSize.FULL}
        sx={{ padding: '0px', display: 'flex', flexDirection: 'column' }}
      >
        <Box
          sx={{
            background: theme.palette.borrow.opaque,
            width: '100%',
            borderRadius: '5px',
            padding: '12px',
            marginBottom: '12px',
            boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Typography variant="body2" sx={{ marginLeft: '12px', marginBottom: '12px' }}>
            Amount to repay
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: '35px',
              display: 'flex',
              flexDirection: 'row',
              marginBottom: '12px',
            }}
          >
            <InputBar
              symbol={symbol}
              value={toRepay}
              onValueChange={setToRepay}
              onSetMax={handleRepayMax}
              palette={theme.palette.borrow}
              sx={{ width: '100%' }}
              isMaxDisabled={isMaxDisabled}
            />
            <OpaqueButton
              onClick={() => handleSubmitTransaction(false)}
              palette={theme.palette.borrow}
              sx={{ minWidth: '108px', marginLeft: '12px', padding: '6px' }}
              disabled={isSubmitDisabled}
            >
              Repay
            </OpaqueButton>
          </Box>
          <Box sx={{ marginLeft: '12px' }}>
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
              {`$${toBalance(Number(toRepay ?? 0) * assetToBase, decimals)}`}
            </Typography>
          </Box>
        </Box>
        <TxOverview
          simResponse={simResponse}
          isDisabled={isSubmitDisabled}
          disabledType={disabledType}
          reason={reason}
        >
          <Value title="Amount to repay" value={`${toRepay ?? '0'} ${symbol}`} />
          {returnedTokens != 0 && (
            <Value title="Amount to return" value={`${toBalance(returnedTokens)} ${symbol}`} />
          )}
          <ValueChange
            title="Your total borrowed"
            curValue={`${toBalance(
              userPoolData?.positionEstimates?.liabilities?.get(assetId) ?? 0,
              decimals
            )} ${symbol}`}
            newValue={`${toBalance(
              Math.max(newPositionEstimate?.liabilities.get(assetId) ?? 0, 0),
              decimals
            )} ${symbol}`}
          />
          <ValueChange
            title="Borrow capacity"
            curValue={`$${toBalance(curBorrowCap)}`}
            newValue={`$${toBalance(nextBorrowCap)}`}
          />
          <ValueChange
            title="Borrow limit"
            curValue={toPercentage(curBorrowLimit)}
            newValue={toPercentage(nextBorrowLimit)}
          />
        </TxOverview>
      </Section>
    </Row>
  );
};
