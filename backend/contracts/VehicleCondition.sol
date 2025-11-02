// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title VehicleCondition - Privacy-preserving vehicle condition scoring using FHEVM
/// @notice Accepts encrypted vehicle parameters, computes an encrypted score and level, and authorizes the caller to decrypt.
/// @dev All computations happen on encrypted types. Division uses clear divisors per FHEVM rules.
contract VehicleCondition is ZamaEthereumConfig {
    mapping(address => euint32) private _scoreByUser;
    mapping(address => euint8) private _levelByUser; // 0: Excellent, 1: Good, 2: Fair, 3: Poor

    /// @notice Compute and store encrypted score and level from encrypted inputs.
    /// @param cipherMileage     Encrypted mileage (in km)
    /// @param cipherAccidents   Encrypted accident count
    /// @param cipherSeverity    Encrypted accident severity level (1-5)
    /// @param inputProof        Input proof returned by the FHEVM Relayer SDK for the batch encryption
    function submitAndCompute(
        externalEuint32 cipherMileage,
        externalEuint32 cipherAccidents,
        externalEuint32 cipherSeverity,
        bytes calldata inputProof
    ) external {
        // Convert external encrypted handles into in-contract encrypted values
        euint32 mileage = FHE.fromExternal(cipherMileage, inputProof);
        euint32 accidents = FHE.fromExternal(cipherAccidents, inputProof);
        euint32 severity = FHE.fromExternal(cipherSeverity, inputProof);

        // Base score
        euint32 score = FHE.asEuint32(100);

        // Penalties:
        // - mileage / 1000
        // - accidents * 10
        // - severity * 15
        // Apply penalties and clamp after each subtraction to prevent underflow
        euint32 mileagePenalty = FHE.div(mileage, 2000);
        score = FHE.sub(score, mileagePenalty);
        // Clamp to prevent underflow (negative values wrap to large positive)
        score = FHE.max(FHE.asEuint32(0), score);
        score = FHE.min(FHE.asEuint32(100), score);

        euint32 accidentsPenalty = FHE.mul(accidents, FHE.asEuint32(5));
        score = FHE.sub(score, accidentsPenalty);
        // Clamp to prevent underflow
        score = FHE.max(FHE.asEuint32(0), score);
        score = FHE.min(FHE.asEuint32(100), score);

        euint32 severityPenalty = FHE.mul(severity, FHE.asEuint32(10));
        score = FHE.sub(score, severityPenalty);
        // Final clamp to [0, 100] to ensure correct range
        score = FHE.max(FHE.asEuint32(0), score);
        score = FHE.min(FHE.asEuint32(100), score);

        // Derive encrypted level from encrypted score:
        // Excellent (0) if score >= 80
        // Good      (1) if 60 <= score < 80
        // Fair      (2) if 40 <= score < 60
        // Poor      (3) if score < 40
        euint32 defaultLevel = FHE.asEuint32(3);
        euint32 levelIfGE40 = FHE.select(FHE.ge(score, FHE.asEuint32(40)), FHE.asEuint32(2), defaultLevel);
        euint32 levelIfGE60 = FHE.select(FHE.ge(score, FHE.asEuint32(60)), FHE.asEuint32(1), levelIfGE40);
        euint32 levelIfGE80 = FHE.select(FHE.ge(score, FHE.asEuint32(80)), FHE.asEuint32(0), levelIfGE60);
        euint8 level = FHE.asEuint8(levelIfGE80);

        _scoreByUser[msg.sender] = score;
        _levelByUser[msg.sender] = level;

        // Update ACL: allow this contract and the caller to decrypt the new values
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);
        FHE.allowThis(level);
        FHE.allow(level, msg.sender);
    }

    /// @notice Returns the caller's latest encrypted score
    function getMyScore() external view returns (euint32) {
        return _scoreByUser[msg.sender];
    }

    /// @notice Returns the caller's latest encrypted level (0:Excellent,1:Good,2:Fair,3:Poor)
    function getMyLevel() external view returns (euint8) {
        return _levelByUser[msg.sender];
    }
}


