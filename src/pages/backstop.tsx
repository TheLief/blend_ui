import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { BackstopEarnings } from '../components/backstop/BackstopEarnings';
import { BackstopQueue } from '../components/backstop/BackstopQueue';
import { CustomButton } from '../components/common/CustomButton';
import { Divider } from '../components/common/Divider';
import { LinkBox } from '../components/common/LinkBox';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { SectionBase } from '../components/common/SectionBase';
import { StackedText } from '../components/common/StackedText';
import { ToggleButton } from '../components/common/ToggleButton';
import { TokenIcon } from '../components/common/TokenIcon';
import { WalletWarning } from '../components/common/WalletWarning';
import { PoolExploreBar } from '../components/pool/PoolExploreBar';
import { useSettings, ViewType } from '../contexts';
import { useWallet } from '../contexts/wallet';
import { useStore } from '../store/store';
import { toBalance, toPercentage } from '../utils/formatter';

const Backstop: NextPage = () => {
  const { viewType, setLastPool, showDeposit, setShowDeposit } = useSettings();
  const { connected, walletAddress } = useWallet();
  const theme = useTheme();
  const isMounted = useRef(false);

  const router = useRouter();
  const { poolId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9a-f]{64}$/.test(poolId) ? poolId : '';

  const refreshPoolReserveAll = useStore((state) => state.refreshPoolReserveAll);
  const refreshPoolBackstopData = useStore((state) => state.refreshPoolBackstopData);
  const estimateToLatestLedger = useStore((state) => state.estimateToLatestLedger);
  const poolEst = useStore((state) => state.pool_est.get(safePoolId));
  const backstopTokenToBase = useStore((state) => state.backstopTokenPrice);
  const backstopPoolBalance = useStore((state) => state.poolBackstopBalance.get(safePoolId));

  const tokenToBase = Number(backstopTokenToBase) / 1e7;
  const estBackstopSize = backstopPoolBalance
    ? (Number(backstopPoolBalance.tokens) / 1e7) * tokenToBase
    : undefined;
  const estBackstopApy =
    poolEst && estBackstopSize ? poolEst.total_backstop_take_base / estBackstopSize : undefined;
  const poolQ4W = backstopPoolBalance
    ? Number(backstopPoolBalance.q4w) / Number(backstopPoolBalance.shares)
    : undefined;
  const shareRate = backstopPoolBalance
    ? Number(backstopPoolBalance.tokens) / Number(backstopPoolBalance.shares)
    : 1;

  const handleDepositClick = () => {
    if (!showDeposit) {
      setShowDeposit(true);
    }
  };

  const handleWithdrawClick = () => {
    if (showDeposit) {
      setShowDeposit(false);
    }
  };

  useEffect(() => {
    const updateBackstop = async () => {
      if (safePoolId != '') {
        await refreshPoolReserveAll(safePoolId, connected ? walletAddress : undefined);
        if (connected) {
          await refreshPoolBackstopData(safePoolId, walletAddress);
        }
        await estimateToLatestLedger(safePoolId, connected ? walletAddress : undefined);
      }
    };
    if (isMounted.current) {
      setLastPool(safePoolId);
      updateBackstop();
      const refreshInterval = setInterval(() => {
        updateBackstop();
      }, 60 * 1000);
      return () => clearInterval(refreshInterval);
    } else {
      isMounted.current = true;
    }
  }, [safePoolId, connected]);

  return (
    <>
      <Row>
        <WalletWarning />
      </Row>
      <PoolExploreBar poolId={safePoolId} />
      <Row>
        <SectionBase type="alt" sx={{ margin: '6px', padding: '6px' }}>
          Backstop Manager
        </SectionBase>
      </Row>
      <Divider />
      <Row>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Backstop APY"
            text={toPercentage(estBackstopApy)}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Q4W"
            text={toPercentage(poolQ4W)}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Total deposited"
            text={`$${toBalance(estBackstopSize)}`}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ padding: '0px' }}>
          <ToggleButton
            active={showDeposit}
            palette={theme.palette.backstop}
            sx={{
              width: '50%',
              padding: '12px',
              '&:hover': {
                background: '#E16BFF15',
              },
            }}
            onClick={handleDepositClick}
          >
            Deposit
          </ToggleButton>
          <ToggleButton
            active={!showDeposit}
            palette={theme.palette.backstop}
            sx={{
              width: '50%',
              padding: '12px',
              '&:hover': {
                background: '#E16BFF15',
              },
            }}
            onClick={handleWithdrawClick}
          >
            Withdraw
          </ToggleButton>
        </Section>
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ flexDirection: 'column', paddingTop: '12px' }}>
          <Typography variant="body2" sx={{ margin: '6px' }}>{`Available to ${
            showDeposit ? 'deposit' : 'withdraw'
          }`}</Typography>
          <Row>
            <LinkBox
              sx={{ width: '100%', marginRight: '12px' }}
              to={{ pathname: '/backstop-deposit', query: { poolId: 'poolId' } }}
            >
              <CustomButton
                sx={{
                  width: '100%',
                  margin: '6px',
                  padding: '12px',
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  '&:hover': {
                    color: theme.palette.backstop.main,
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <TokenIcon symbol="blnd" sx={{ marginRight: '12px' }}></TokenIcon>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Typography variant="h4" sx={{ marginRight: '6px' }}>
                      688.666k
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                      BLND
                    </Typography>
                  </Box>
                </Box>
                <ArrowForwardIcon fontSize="inherit" />
              </CustomButton>
            </LinkBox>
          </Row>
          <Row>
            <LinkBox
              sx={{ width: '100%', marginRight: '12px' }}
              to={{ pathname: '/backstop-deposit', query: { poolId: 'poolId' } }}
            >
              <CustomButton
                sx={{
                  width: '100%',
                  margin: '6px',
                  padding: '12px',
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  '&:hover': {
                    color: theme.palette.backstop.main,
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <TokenIcon symbol="blndusdclp" sx={{ marginRight: '12px' }}></TokenIcon>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Typography variant="h4" sx={{ marginRight: '6px' }}>
                      668.886k
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                      BLND-USDC LP
                    </Typography>
                  </Box>
                </Box>
                <ArrowForwardIcon fontSize="inherit" />
              </CustomButton>
            </LinkBox>
          </Row>
        </Section>
      </Row>
      {viewType === ViewType.REGULAR && (
        <Row sx={{ marginBottom: '12px' }}>
          <BackstopEarnings />
          <BackstopQueue />
        </Row>
      )}
      {viewType !== ViewType.REGULAR && (
        <Row sx={{ marginBottom: '12px', flexWrap: 'wrap' }}>
          <BackstopEarnings />
          <BackstopQueue />
        </Row>
      )}
    </>
  );
};

export default Backstop;
