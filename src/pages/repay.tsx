import { Box, Typography, useTheme } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { FlameIcon } from '../components/common/FlameIcon';
import { GoBackHeader } from '../components/common/GoBackHeader';
import { ReserveDropdown } from '../components/common/ReserveDropdown';
import { Row } from '../components/common/Row';
import { Section, SectionSize } from '../components/common/Section';
import { StackedText } from '../components/common/StackedText';
import { RepayAnvil } from '../components/repay/RepayAnvil';
import { useHorizonAccount, usePool, usePoolUser, useTokenBalance } from '../hooks/api';
import { getEmissionTextFromValue, toBalance, toPercentage } from '../utils/formatter';

const Repay: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { poolId, assetId } = router.query;
  const safePoolId = typeof poolId == 'string' && /^[0-9A-Z]{56}$/.test(poolId) ? poolId : '';
  const safeAssetId = typeof assetId == 'string' && /^[0-9A-Z]{56}$/.test(assetId) ? assetId : '';

  const { data: pool } = usePool(safePoolId);
  const { data: poolUser } = usePoolUser(pool);
  const reserve = pool?.reserves.get(safeAssetId);
  const { data: horizonAccount } = useHorizonAccount();
  const { data: tokenBalance } = useTokenBalance(
    reserve?.assetId,
    reserve?.tokenMetadata?.asset,
    horizonAccount,
    reserve !== undefined
  );

  const currentDebt = reserve && poolUser ? poolUser.getLiabilitiesFloat(reserve) : undefined;

  return (
    <>
      <Row>
        <GoBackHeader name={pool?.config.name} />
      </Row>
      <Row>
        <Section width={SectionSize.FULL} sx={{ marginTop: '12px', marginBottom: '12px' }}>
          <ReserveDropdown action="repay" poolId={safePoolId} activeReserveId={safeAssetId} />
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
                Debt
              </Typography>
              <Typography variant="h4" sx={{ color: theme.palette.borrow.main }}>
                {toBalance(currentDebt)}
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
            title="Borrow APR"
            text={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {toPercentage(reserve?.borrowApr)}{' '}
                {reserve?.borrowEmissions && (
                  <FlameIcon
                    width={22}
                    height={22}
                    title={getEmissionTextFromValue(
                      reserve.emissionsPerYearPerBorrowedAsset(),
                      reserve.tokenMetadata?.symbol || 'token'
                    )}
                  />
                )}
              </div>
            }
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Liability factor"
            text={toPercentage(reserve?.getLiabilityFactor())}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
        <Section width={SectionSize.THIRD}>
          <StackedText
            title="Wallet balance"
            text={toBalance(tokenBalance, reserve?.config.decimals)}
            sx={{ width: '100%', padding: '6px' }}
          ></StackedText>
        </Section>
      </Row>
      <Row>
        <RepayAnvil poolId={safePoolId} assetId={safeAssetId} />
      </Row>
    </>
  );
};

export default Repay;
