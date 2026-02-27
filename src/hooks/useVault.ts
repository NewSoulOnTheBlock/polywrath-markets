'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/contracts';

const USDC_DECIMALS = 6;
// Native USDC on Polygon
const USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;

export function useVaultBalance() {
  const { address } = useAccount();

  const { data: userInfo, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Bridged USDC.e balance
  const { data: usdcBridgedBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Native USDC balance
  const { data: usdcNativeBalance } = useReadContract({
    address: USDC_NATIVE,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Combine both USDC balances
  const zero = BigInt(0);
  const usdcBalance = (usdcBridgedBalance ?? zero) + (usdcNativeBalance ?? zero);

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  return {
    available: userInfo ? formatUnits(userInfo[0], USDC_DECIMALS) : '0.00',
    locked: userInfo ? formatUnits(userInfo[1], USDC_DECIMALS) : '0.00',
    totalDeposited: userInfo ? formatUnits(userInfo[2], USDC_DECIMALS) : '0.00',
    totalWithdrawn: userInfo ? formatUnits(userInfo[3], USDC_DECIMALS) : '0.00',
    totalFeesPaid: userInfo ? formatUnits(userInfo[4], USDC_DECIMALS) : '0.00',
    walletUSDC: usdcBalance ? formatUnits(usdcBalance as bigint, USDC_DECIMALS) : '0.00',
    allowance: allowance ? formatUnits(allowance, USDC_DECIMALS) : '0.00',
    refetch,
  };
}

export function useApproveUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount: string) => {
    const parsedAmount = parseUnits(amount, USDC_DECIMALS);
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [VAULT_ADDRESS, parsedAmount],
    });
  };

  return { approve, isPending, isConfirming, isSuccess, hash, error };
}

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = (amount: string) => {
    const parsedAmount = parseUnits(amount, USDC_DECIMALS);
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [parsedAmount],
    });
  };

  return { deposit, isPending, isConfirming, isSuccess, hash, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: string) => {
    const parsedAmount = parseUnits(amount, USDC_DECIMALS);
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [parsedAmount],
    });
  };

  return { withdraw, isPending, isConfirming, isSuccess, hash, error };
}
