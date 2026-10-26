// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { ProofDrop } from "../src/ProofDrop.sol";

/// @notice Runs against a fork of X Layer mainnet to prove the real TapeOut
///         circuit integration works and to measure draw gas.
contract ProofDropForkTest is Test {
    address constant PROCESSOR = 0x87BFCa3494Aa228fF589ab9B642143A5e8c8F9a6;
    uint256 constant CIRCUIT_ID = 24;

    receive() external payable {}

    function testRealCircuitPreview() public {
        if (block.chainid != 196) return;
        ProofDrop drop = new ProofDrop(PROCESSOR, CIRCUIT_ID, 100, 0.001 ether, address(this), 4);
        vm.deal(address(this), 10 ether);
        uint256 close = block.timestamp + 1 hours;
        uint256 id = drop.createDraw{ value: 1 ether + drop.feeFor(1 ether) }(
            1 ether,
            uint64(close),
            100,
            address(this)
        );
        vm.warp(close);
        drop.commitEntries(id, bytes32(uint256(0x1234)), 3);

        uint256 gasBefore = gasleft();
        uint256 winner = drop.preview(id, keccak256("proofdrop-fork-seed"));
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("winnerIndex", winner);
        emit log_named_uint("preview gas", gasUsed);
        assertLt(winner, 3);
    }
}
