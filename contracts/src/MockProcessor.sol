// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Testnet-only stand-in for a TapeOut processor. The real deployment
///         points at the live TapeOut circuits contract on X Layer mainnet.
///         This contract exists so the full escrow/draw/settle flow can be
///         rehearsed on X Layer testnet before mainnet funds are available.
contract MockProcessor {
    function eval(uint256 circuitId, bytes calldata inputs) external pure returns (bytes memory) {
        uint256 x;
        for (uint256 i = 0; i < inputs.length; i++) {
            x |= uint256(uint8(inputs[i])) << (8 * i);
        }
        uint256 y = (x * 1103515245 + 12345 + circuitId * 2654435761) & 0x1FF;
        return abi.encodePacked(uint16(y));
    }
}
