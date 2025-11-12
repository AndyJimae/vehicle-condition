"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { VehicleConditionABI } from "@/abi/VehicleConditionABI";
import { VehicleConditionAddresses } from "@/abi/VehicleConditionAddresses";

export type ClearScoreType = {
  handle: string;
  clear: bigint;
};

export type ClearLevelType = {
  handle: string;
  clear: bigint;
};

// Vehicle condition hook for managing encrypted vehicle data

type VehicleConditionInfoType = {
  abi: typeof VehicleConditionABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getVehicleConditionByChainId(
  chainId: number | undefined
): VehicleConditionInfoType {
  if (!chainId) {
    return { abi: VehicleConditionABI.abi };
  }
  const chainIdStr = chainId.toString();
  const entry =
    VehicleConditionAddresses[
      chainIdStr as keyof typeof VehicleConditionAddresses
    ] as { address: string; chainId: number; chainName: string } | undefined;
  if (!entry || entry.address === ethers.ZeroAddress) {
    return { abi: VehicleConditionABI.abi, chainId };
  }
  return {
    address: entry.address as `0x${string}`,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: VehicleConditionABI.abi,
  };
}

export const useVehicleCondition = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [scoreHandle, setScoreHandle] = useState<string | undefined>(undefined);
  const [levelHandle, setLevelHandle] = useState<string | undefined>(undefined);
  const [clearScore, setClearScore] = useState<ClearScoreType | undefined>(undefined);
  const [clearLevel, setClearLevel] = useState<ClearLevelType | undefined>(undefined);
  const clearScoreRef = useRef<ClearScoreType | undefined>(undefined);
  const clearLevelRef = useRef<ClearLevelType | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const infoRef = useRef<VehicleConditionInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isSubmittingRef = useRef<boolean>(isSubmitting);

  const vehicle = useMemo(() => {
    const c = getVehicleConditionByChainId(chainId);
    infoRef.current = c;
    // Only show deployment not found message when chainId is defined and address is missing
    if (chainId !== undefined && !c.address) {
      setMessage(`Contract not found on the current blockchain network. Please deploy the contract first.`);
    } else if (chainId === undefined || c.address) {
      // Clear the message when chainId is undefined or address exists
      setMessage("");
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!vehicle) {
      return undefined;
    }
    return Boolean(vehicle.address) && vehicle.address !== ethers.ZeroAddress;
  }, [vehicle]);

  const canGet = useMemo(() => {
    return vehicle.address && ethersSigner && !isRefreshing;
  }, [vehicle.address, ethersSigner, isRefreshing]);

  const canSubmit = useMemo(() => {
    return vehicle.address && instance && ethersSigner && !isSubmitting;
  }, [vehicle.address, instance, ethersSigner, isSubmitting]);

  const canDecrypt = useMemo(() => {
    return (
      vehicle.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      scoreHandle &&
      levelHandle &&
      scoreHandle !== ethers.ZeroHash &&
      levelHandle !== ethers.ZeroHash &&
      (scoreHandle !== clearScore?.handle || levelHandle !== clearLevel?.handle)
    );
  }, [
    vehicle.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    scoreHandle,
    levelHandle,
    clearScore,
    clearLevel,
  ]);

  const refreshHandles = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }
    if (
      !infoRef.current ||
      !infoRef.current?.chainId ||
      !infoRef.current?.address ||
      !ethersSigner
    ) {
      setScoreHandle(undefined);
      setLevelHandle(undefined);
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const thisChainId = infoRef.current.chainId;
    const contractAddress = infoRef.current.address!;
    const thisSigner = ethersSigner;
    const contract = new ethers.Contract(
      contractAddress,
      infoRef.current.abi,
      thisSigner
    );
    Promise.all([contract.getMyScore(), contract.getMyLevel()])
      .then(([score, level]) => {
        if (
          sameChain.current(thisChainId) &&
          contractAddress === infoRef.current?.address &&
          sameSigner.current(thisSigner)
        ) {
          setScoreHandle(score);
          setLevelHandle(level);
        }
      })
      .catch((e) => {
        setMessage("Failed to retrieve vehicle data from the contract. Please try again.");
        console.error("getMyScore/Level error:", e);
        setScoreHandle(undefined);
        setLevelHandle(undefined);
      })
      .finally(() => {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersSigner, sameChain, sameSigner]);

  useEffect(() => {
    refreshHandles();
  }, [refreshHandles]);

  const decrypt = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }
    if (!vehicle.address || !instance || !ethersSigner) {
      return;
    }
    if (!scoreHandle || !levelHandle) {
      setClearScore(undefined);
      setClearLevel(undefined);
      clearScoreRef.current = undefined;
      clearLevelRef.current = undefined;
      return;
    }
    const thisChainId = chainId;
    const thisAddress = vehicle.address;
    const thisScoreHandle = scoreHandle;
    const thisLevelHandle = levelHandle;
    const thisSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Initiating decryption process...");
    const run = async () => {
      const isStale = () =>
        thisAddress !== infoRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisSigner);
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisAddress as `0x${string}`],
          thisSigner,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }
        if (isStale()) {
          setMessage("Decryption cancelled due to state change");
          return;
        }
        setMessage("Decrypting encrypted data...");
        const res = await (instance as any).userDecrypt(
          [
            { handle: thisScoreHandle, contractAddress: thisAddress },
            { handle: thisLevelHandle, contractAddress: thisAddress },
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        if (isStale()) {
          setMessage("Decryption cancelled due to state change");
          return;
        }
        setClearScore({
          handle: thisScoreHandle,
          clear: res[thisScoreHandle as `0x${string}`],
        });
        clearScoreRef.current = {
          handle: thisScoreHandle,
          clear: res[thisScoreHandle as `0x${string}`],
        };
        setClearLevel({
          handle: thisLevelHandle,
          clear: res[thisLevelHandle as `0x${string}`],
        });
        clearLevelRef.current = {
          handle: thisLevelHandle,
          clear: res[thisLevelHandle as `0x${string}`],
        };
        setMessage("Decryption completed successfully! Results are now available.");
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };
    run();
  }, [
    chainId,
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    instance,
    levelHandle,
    sameChain,
    sameSigner,
    scoreHandle,
    vehicle.address,
  ]);

  const submit = useCallback(
    (mileage: number, accidents: number, severity: number) => {
      if (isRefreshingRef.current || isSubmittingRef.current) {
        return;
      }
      if (!vehicle.address || !instance || !ethersSigner) {
        return;
      }
      const thisChainId = chainId;
      const thisAddress = vehicle.address;
      const thisSigner = ethersSigner;
      const contract = new ethers.Contract(
        thisAddress,
        vehicle.abi,
        thisSigner
      );
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Preparing to submit vehicle data...");
      const run = async () => {
        const isStale = () =>
          thisAddress !== infoRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisSigner);
        try {
          const input = (instance as any).createEncryptedInput(
            thisAddress,
            thisSigner.address
          );
          input.add32(mileage);
          input.add32(accidents);
          input.add32(severity);
          const enc = await input.encrypt();
          if (isStale()) {
            setMessage("Submission cancelled due to state change");
            return;
          }
          setMessage("Submitting encrypted data to blockchain...");
          const tx: ethers.TransactionResponse =
            await contract.submitAndCompute(
              enc.handles[0],
              enc.handles[1],
              enc.handles[2],
              enc.inputProof
            );
          setMessage(`Transaction submitted. Waiting for confirmation...`);
          const receipt = await tx.wait();
          if (receipt?.status === 1) {
            setMessage(`Vehicle data submitted successfully! Computing assessment...`);
          } else {
            setMessage(`Transaction failed. Please try again.`);
          }
          if (isStale()) {
            setMessage(`Submission cancelled due to state change`);
            return;
          }
          refreshHandles();
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          setMessage(`Submission failed: ${errorMsg}`);
          console.error("submitAndCompute error:", e);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };
      run();
    },
    [
      chainId,
      ethersSigner,
      instance,
      refreshHandles,
      sameChain,
      sameSigner,
      vehicle.address,
      vehicle.abi,
    ]
  );

  return {
    contractAddress: vehicle.address,
    isDeployed,
    canGet,
    canSubmit,
    canDecrypt,
    isRefreshing,
    isSubmitting,
    isDecrypting,
    message,
    scoreHandle,
    levelHandle,
    clearScore: clearScore?.clear,
    clearLevel: clearLevel?.clear,
    refreshHandles,
    submit,
    decrypt,
  };
};


