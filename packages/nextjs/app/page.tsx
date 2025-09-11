"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectedAddress } from "~~/components/ConnectedAddress";
import { CounterControls } from "~~/components/CounterControls";
import { CounterEventHistory } from "~~/components/CounterEventHistory";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useAccount } from "~~/hooks/useAccount";

const Home = () => {
  const { address } = useAccount();
  
  const { data: counterValue, isLoading, error, refetch } = useScaffoldReadContract({
    contractName: "CounterContract", 
    functionName: "get_counter",
  });

  const { data: ownerAddress } = useScaffoldReadContract({
    contractName: "CounterContract", 
    functionName: "owner",
  });

  if (error) return <div className="text-center text-error">Failed to load counter</div>;
  if (isLoading || counterValue === undefined) return <div className="text-center">Loading...</div>;

  const currentValue = Number(counterValue);
  
  // Нормализуем адреса для сравнения
  const normalizeAddress = (addr: any): string => {
    if (!addr) return "";
    
    // Если это BigInt, конвертируем в hex строку
    if (typeof addr === "bigint") {
      let hex = addr.toString(16).toLowerCase();
      // Дополняем до 64 символов (32 байта) нулями слева
      return hex.padStart(64, '0');
    }
    
    // Если это строка, убираем 0x префикс и приводим к нижнему регистру
    const addrStr = String(addr);
    let normalized = addrStr.toLowerCase().replace(/^0x/, "");
    // Дополняем до 64 символов нулями слева
    return normalized.padStart(64, '0');
  };
  
  const normalizedUserAddress = normalizeAddress(address);
  const normalizedOwnerAddress = normalizeAddress(ownerAddress);
  
  const isOwner = address && ownerAddress && normalizedUserAddress === normalizedOwnerAddress;

  // Функция для форматирования адреса в читаемый вид
  const formatAddress = (addr: any): string => {
    if (!addr) return "Loading...";
    
    let hexAddr = "";
    if (typeof addr === "bigint") {
      hexAddr = "0x" + addr.toString(16);
    } else {
      hexAddr = String(addr);
    }
    
    return hexAddr.slice(0, 6) + "..." + hexAddr.slice(-4);
  };

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">Welcome to</span>
          <span className="block text-4xl font-bold">Basecamp 13</span>
        </h1>
        
        <div className="flex justify-center mt-8">
          <CounterControls 
            counterValue={currentValue} 
            onUpdate={refetch} 
            currentAddress={address}
            ownerAddress={ownerAddress}
          />
        </div>
        
        <div className="flex justify-center mt-6">
          <CounterEventHistory />
        </div>
        
        <div className="flex justify-center mt-4">
          <ConnectedAddress />
        </div>
      </div>
    </div>
  );
};

export default Home;
