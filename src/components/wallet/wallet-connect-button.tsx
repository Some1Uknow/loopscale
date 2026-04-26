"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletConnectButton() {
  return (
    <WalletMultiButton className="!h-10 !rounded-lg !border !border-[#d5cdc2] !bg-transparent !px-4 !font-mono !text-[11px] !font-medium !text-[#716b61] transition-colors duration-150 hover:!bg-[#f0ece4] hover:!text-[#161614]" />
  );
}
