// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { ProofDrop } from "../src/ProofDrop.sol";
import { MockProcessor } from "../src/MockProcessor.sol";

contract ProofDropTest is Test {
    ProofDrop internal drop;
    MockProcessor internal processor;

    address internal creator = address(0xC0FFEE);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal committer = address(0xC0DE);
    address internal treasury = address(0x7DEA);

    uint256 internal constant PRIZE = 1 ether;
    uint16 internal constant FEE_BPS = 100;
    uint256 internal constant MIN_FEE = 0.001 ether;
    uint8 internal constant ROUNDS = 4;

    function setUp() public {
        processor = new MockProcessor();
        drop = new ProofDrop(address(processor), 24, FEE_BPS, MIN_FEE, treasury, ROUNDS);
        vm.deal(creator, 100 ether);
    }

    function _create(uint32 maxEntries) internal returns (uint256 id) {
        uint256 fee = drop.feeFor(PRIZE);
        vm.prank(creator);
        id = drop.createDraw{ value: PRIZE + fee }(
            PRIZE,
            uint64(block.timestamp + 1 hours),
            maxEntries,
            committer
        );
    }

    function _leaves(address[3] memory who) internal pure returns (bytes32[3] memory leaves) {
        for (uint32 i = 0; i < who.length; i++) {
            leaves[i] = keccak256(abi.encodePacked(i, who[i]));
        }
    }

    function _root3(bytes32[3] memory leaves) internal pure returns (bytes32) {
        bytes32 a = keccak256(abi.encodePacked(leaves[0], leaves[1]));
        bytes32 b = keccak256(abi.encodePacked(leaves[2], leaves[2]));
        return keccak256(abi.encodePacked(a, b));
    }

    function _proofFor(uint32 index, bytes32[3] memory leaves) internal pure returns (bytes32[] memory proof) {
        bytes32 a = keccak256(abi.encodePacked(leaves[0], leaves[1]));
        bytes32 b = keccak256(abi.encodePacked(leaves[2], leaves[2]));
        proof = new bytes32[](2);
        if (index < 2) {
            proof[0] = leaves[1 - index];
            proof[1] = b;
        } else {
            proof[0] = leaves[2];
            proof[1] = a;
        }
    }

    function testCreateChargesFeeAndEscrowsPrize() public {
        uint256 fee = drop.feeFor(PRIZE);
        assertEq(fee, 0.01 ether);
        uint256 before = treasury.balance;

        uint256 id = _create(100);
        ProofDrop.Draw memory d = drop.getDraw(id);

        assertEq(id, 1);
        assertEq(d.creator, creator);
        assertEq(d.committer, committer);
        assertEq(d.prize, PRIZE);
        assertEq(address(drop).balance, PRIZE);
        assertEq(treasury.balance - before, fee);
    }

    function testCreateRejectsWrongValue() public {
        vm.prank(creator);
        vm.expectRevert(ProofDrop.ValueMismatch.selector);
        drop.createDraw{ value: PRIZE }(PRIZE, uint64(block.timestamp + 1 hours), 10, committer);
    }

    function testOnlyCommitterCommitsOnce() public {
        uint256 id = _create(10);
        vm.warp(block.timestamp + 1 hours);

        vm.prank(alice);
        vm.expectRevert(ProofDrop.NotCommitter.selector);
        drop.commitEntries(id, bytes32(uint256(1)), 3);

        vm.prank(committer);
        drop.commitEntries(id, bytes32(uint256(1)), 3);

        vm.prank(committer);
        vm.expectRevert(ProofDrop.InvalidState.selector);
        drop.commitEntries(id, bytes32(uint256(1)), 3);
    }

    function testDrawSettleClaim() public {
        address[3] memory who = [alice, bob, carol];
        bytes32[3] memory leaves = _leaves(who);
        bytes32 root = _root3(leaves);

        uint256 id = _create(10);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(committer);
        drop.commitEntries(id, root, 3);

        vm.roll(block.number + 10);
        drop.captureSeed(id);
        ProofDrop.Draw memory beforeDraw = drop.getDraw(id);
        assertTrue(beforeDraw.seed != bytes32(0));

        drop.draw(id);
        ProofDrop.Draw memory d = drop.getDraw(id);
        assertTrue(d.drawn);
        assertLt(d.winnerIndex, 3);

        uint32 idx = d.winnerIndex;
        address winner = who[idx];
        bytes32[] memory proof = _proofFor(idx, leaves);

        uint256 before = winner.balance;
        drop.settle(id, winner, proof);
        ProofDrop.Draw memory settled = drop.getDraw(id);
        assertTrue(settled.settled);
        assertEq(settled.winner, winner);
        assertEq(winner.balance - before, PRIZE);
        assertEq(drop.claimable(winner), 0);
        assertEq(address(drop).balance, 0);
    }

    function testSettleQueuesWhenWinnerRejects() public {
        RejectingWinner rejecting = new RejectingWinner();
        address[3] memory who = [address(rejecting), address(rejecting), address(rejecting)];
        bytes32[3] memory leaves = _leaves(who);
        bytes32 root = _root3(leaves);

        uint256 id = _create(10);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(committer);
        drop.commitEntries(id, root, 3);
        vm.roll(block.number + 10);
        drop.draw(id);

        ProofDrop.Draw memory d = drop.getDraw(id);
        uint32 idx = d.winnerIndex;
        address winner = who[idx];
        bytes32[] memory proof = _proofFor(idx, leaves);

        drop.settle(id, winner, proof);
        assertEq(drop.claimable(winner), PRIZE);
        assertEq(address(drop).balance, PRIZE);
    }

    function testSettleRejectsWrongProof() public {
        address[3] memory who = [alice, bob, carol];
        bytes32[3] memory leaves = _leaves(who);
        bytes32 root = _root3(leaves);

        uint256 id = _create(10);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(committer);
        drop.commitEntries(id, root, 3);
        vm.roll(block.number + 10);
        drop.draw(id);

        ProofDrop.Draw memory d = drop.getDraw(id);
        address wrong = d.winnerIndex == 0 ? bob : alice;
        bytes32[] memory proof = _proofFor(0, leaves);

        vm.expectRevert(ProofDrop.InvalidProof.selector);
        drop.settle(id, wrong, proof);
    }

    function testCaptureSeedExpires() public {
        uint256 id = _create(10);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(committer);
        drop.commitEntries(id, bytes32(uint256(1)), 1);

        vm.roll(block.number + 300);
        vm.expectRevert(ProofDrop.SeedExpired.selector);
        drop.captureSeed(id);
    }

    function testRefundNoEntries() public {
        uint256 id = _create(10);
        vm.warp(block.timestamp + 2 hours);

        uint256 before = creator.balance;
        vm.prank(creator);
        drop.refund(id);
        assertEq(creator.balance - before, PRIZE);
        assertTrue(drop.getDraw(id).refunded);
    }

    function testRefundRequiresCreator() public {
        uint256 id = _create(10);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(alice);
        vm.expectRevert(ProofDrop.NotCreator.selector);
        drop.refund(id);
    }

    function testPreviewMatchesDraw() public {
        address[3] memory who = [alice, bob, carol];
        bytes32 root = _root3(_leaves(who));
        uint256 id = _create(10);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(committer);
        drop.commitEntries(id, root, 3);
        vm.roll(block.number + 10);
        drop.captureSeed(id);
        bytes32 seed = drop.getDraw(id).seed;
        uint256 preview = drop.preview(id, seed);
        drop.draw(id);
        assertEq(drop.getDraw(id).winnerIndex, preview);
    }
}

contract RejectingWinner {
    // Intentionally no receive/fallback: the settlement push must fail and
    // the prize must remain claimable.
}
