 "use client";
 
 import { ReactNode } from "react";
 import { MetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
 import { MetaMaskEthersSignerProvider } from "@/hooks/metamask/useMetaMaskEthersSigner";
 import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
 
 export default function Providers({ children }: { children: ReactNode }) {
   const initialMockChains: Readonly<Record<number, string>> = {
     31337: "http://localhost:8545",
   };
   return (
     <MetaMaskProvider>
       <MetaMaskEthersSignerProvider initialMockChains={initialMockChains}>
         <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
       </MetaMaskEthersSignerProvider>
     </MetaMaskProvider>
   );
 }
 

