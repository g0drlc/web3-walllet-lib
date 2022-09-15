import type { BalancePlugin } from '@web3-wallet/plugin-balance-react';
import type { EnsPlugin } from '@web3-wallet/plugin-ens-react';
import type { Wallet } from '@web3-wallet/react';
import React from 'react';

import { Account } from './Account';
import { Box } from './Box';

export const Accounts = ({
  accounts,
  balances,
  ensNames,
}: {
  accounts: ReturnType<Wallet['useAccounts']>;
  balances: ReturnType<BalancePlugin.Api['hooks']['useBalances']>;
  ensNames: ReturnType<EnsPlugin.Api['hooks']['useEnsNames']>;
}) => {
  if (accounts === undefined) return null;
  if (accounts.length === 0) {
    return (
      <Box style={{ display: 'flex', marginBottom: 10 }}>
        <span style={{ marginRight: 10 }}>Account:</span>
        <b>None</b>
      </Box>
    );
  }

  return (
    <>
      {accounts.map((account, i) =>
        ensNames.data?.[i] ? (
          ensNames.data?.[i]
        ) : (
          <React.Fragment key={account}>
            <Box>
              <span style={{ marginRight: 10 }}>Account:</span>
              <b>
                <Account account={account} />
              </b>
            </Box>
            <Box>
              <span style={{ marginRight: 10 }}>Balance:</span>
              <b>
                {balances.data?.[i]
                  ? `${balances.data[i]}`
                  : balances.data?.[i] === 0
                  ? 0
                  : '--'}
              </b>
            </Box>
          </React.Fragment>
        ),
      )}
    </>
  );
};
