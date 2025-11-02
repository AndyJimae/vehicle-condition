"use client";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { errorNotDeployed } from "./ErrorNotDeployed";
import { useVehicleCondition } from "@/hooks/useVehicleCondition";
import { useState } from "react";

export const VehicleConditionDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const vehicle = useVehicleCondition({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [mileage, setMileage] = useState<number>(0);
  const [accidents, setAccidents] = useState<number>(0);
  const [severity, setSeverity] = useState<number>(1);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8">Please connect your MetaMask wallet to access the vehicle condition assessment system</p>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isConnected}
            onClick={connect}
          >
            Connect to MetaMask
          </button>
        </div>
      </div>
    );
  }

  if (chainId !== undefined && vehicle.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  const getFhevmStatusDisplay = () => {
    if (!fhevmInstance) return { text: "Initializing", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (fhevmError) return { text: "Error", color: "text-red-600", bg: "bg-red-100" };
    return { text: "Ready", color: "text-green-600", bg: "bg-green-100" };
  };

  const getLevelBadge = (level?: bigint) => {
    if (level === undefined) return { text: "Pending", color: "bg-gray-100 text-gray-600" };
    
    const levelStr = String(level);
    const badges: Record<string, { text: string; color: string }> = {
      "0": { text: "Excellent", color: "bg-green-100 text-green-700" },
      "1": { text: "Good", color: "bg-blue-100 text-blue-700" },
      "2": { text: "Fair", color: "bg-yellow-100 text-yellow-700" },
      "3": { text: "Poor", color: "bg-red-100 text-red-700" },
    };
    
    return badges[levelStr] ?? { text: `Unknown (${levelStr})`, color: "bg-gray-100 text-gray-600" };
  };

  const statusDisplay = getFhevmStatusDisplay();
  const levelBadge = getLevelBadge(vehicle.clearLevel);

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Connection Status</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.bg} ${statusDisplay.color}`}>
            {statusDisplay.text}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 w-24">Chain ID:</span>
              <span className="text-sm text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">{String(chainId)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 w-24">Account:</span>
              <span className="text-sm text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-xs" title={accounts?.[0]}>
                {accounts?.[0] ? `${accounts[0].slice(0, 10)}...${accounts[0].slice(-8)}` : "No account"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 w-24">Contract:</span>
              <span className="text-sm text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-xs" title={vehicle.contractAddress}>
                {vehicle.contractAddress ? `${vehicle.contractAddress.slice(0, 10)}...${vehicle.contractAddress.slice(-8)}` : "Not deployed"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 w-24">FHEVM:</span>
              <span className={`text-sm font-semibold ${statusDisplay.color}`}>
                {fhevmInstance ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
        {fhevmError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <span className="font-semibold">Error:</span> {fhevmError.message}
            </p>
          </div>
        )}
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Information</h2>
        <p className="text-sm text-gray-600 mb-6">Enter vehicle parameters below. All data will be encrypted on the client side before submission.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mileage (km)
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="number"
              min={0}
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Total kilometers driven</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Accident Count
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="number"
              min={0}
              value={accidents}
              onChange={(e) => setAccidents(Number(e.target.value))}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Number of accidents</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Severity Level
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="number"
              min={1}
              max={5}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">Scale: 1 (minor) to 5 (severe)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="flex-1 min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
            disabled={!vehicle.canSubmit}
            onClick={() => vehicle.submit(mileage, accidents, severity)}
          >
            {vehicle.isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Submit & Compute"
            )}
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
            disabled={!vehicle.canGet}
            onClick={vehicle.refreshHandles}
          >
            Refresh Handles
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
            disabled={!vehicle.canDecrypt}
            onClick={vehicle.decrypt}
          >
            {vehicle.isDecrypting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Decrypting...
              </span>
            ) : (
              "Decrypt Results"
            )}
          </button>
        </div>
      </div>

      {/* Results Card */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Assessment Results</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Condition Score</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {vehicle.clearScore !== undefined ? String(vehicle.clearScore) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {vehicle.clearScore !== undefined ? "Calculated score" : "Awaiting decryption"}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Condition Level</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${levelBadge.color}`}>
              {levelBadge.text}
            </span>
            <p className="text-xs text-gray-500 mt-2">
              {vehicle.clearLevel !== undefined ? "Assessment complete" : "Awaiting decryption"}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 mb-1">System Message</p>
              <p className="text-sm text-blue-700">
                {vehicle.message || "No messages at this time"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Encrypted Handles Card */}
      {(vehicle.scoreHandle || vehicle.levelHandle) && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Encrypted Data Handles</h2>
          <p className="text-sm text-gray-600 mb-4">These handles reference encrypted data stored on-chain</p>
          
          <div className="space-y-3">
            {vehicle.scoreHandle && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-24 font-semibold text-sm text-gray-700">Score Handle:</div>
                  <div className="flex-1 font-mono text-xs text-gray-600 break-all bg-white px-3 py-2 rounded border border-gray-200">
                    {vehicle.scoreHandle}
                  </div>
                </div>
              </div>
            )}
            {vehicle.levelHandle && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-24 font-semibold text-sm text-gray-700">Level Handle:</div>
                  <div className="flex-1 font-mono text-xs text-gray-600 break-all bg-white px-3 py-2 rounded border border-gray-200">
                    {vehicle.levelHandle}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


