import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { OverlayModal } from '../components/common/OverlayModal';
import { ReserveDropdown } from '../components/common/ReserveDropdown';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { WalletWarning } from '../components/common/WalletWarning';
import { WithdrawAnvil } from '../components/withdraw/WithdrawAnvil';
import { useWallet } from '../contexts/wallet';
import { useStore } from '../store/store';
import { toBalance, toPercentage } from '../utils/formatter';

const Withdraw: NextPage = () => {
  const theme = useTheme();
  const { connected, walletAddress } = useWallet();

  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const loadPoolData = useStore((state) => state.loadPoolData);
  const reserve = useStore((state) =>
    state.poolData.get(safePoolId)?.reserves.find((reserve) => {
      return reserve.assetId == safeAssetId;
    })
  );
  const reserve_est = useStore((state) =>
    state.pool_est.get(safePoolId)?.reserve_est?.find((res) => res.id === safeAssetId)
  );
  const user_bal_est = useStore((state) =>
    state.pool_user_est.get(safePoolId)?.reserve_estimates.get(safeAssetId)
  );

  // always re-estimate values to most recent ledger
  useEffect(() => {
    const updatePool = async () => {
      if (safePoolId != '') {
        await loadPoolData(safePoolId, connected ? walletAddress : undefined, false);
      }
    };
    updatePool();
    const refreshInterval = setInterval(async () => {
      await updatePool();
    }, 30 * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadPoolData, safePoolId, reserve, connected, walletAddress]);

  return (
    <>
      <Row>
        <WalletWarning />
      </Row>
      <Row>
        <GoBackHeader poolId={safePoolId} />
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ marginTop: '12px', marginBottom: '12px' }}>
          <ReserveDropdown action="withdraw" poolId={safePoolId} activeReserveId={safeAssetId} />
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ padding: '12px' }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography variant="h5" sx={{ marginRight: '6px' }}>
                Available
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.lend.main }}>
                {toBalance(user_bal_est?.supplied ?? 0, reserve?.config.decimals)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ color: theme.palette.text.secondary }}>
                {reserve?.tokenMetadata?.symbol ?? ''}
              </Typography>
            </Box>
          </Box>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Supply APY"
            text={reserve_est ? toPercentage(reserve_est.supply_apy) : ''}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Collateral factor"
            text={reserve_est ? toPercentage(reserve_est.c_factor) : ''}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total supplied"
            text={reserve_est ? toBalance(reserve_est.supplied) : ''}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <Row>
        <WithdrawAnvil poolId={safePoolId} assetId={safeAssetId} />
      </Row>

      <OverlayModal poolId={safePoolId} type="dashboard" />
    </>
  );
};

export default Withdraw;
