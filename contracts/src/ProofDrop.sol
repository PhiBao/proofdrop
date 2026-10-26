// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title ProofDrop
/// @notice Prize escrow and draw settlement for giveaways whose winner is
///         selected by an on-chain TapeOut circuit. No custodian, no oracle.
/// @dev The contract stores a committed entrant root, captures a future block
///      hash, and asks a TapeOut processor to evaluate a circuit. The winner
///      index is derived from the circuit output. Payout requires a Merkle
///      proof binding the winner address to that index.
contract ProofDrop {
    error NotCreator();
    error NotCommitter();
    error InvalidState();
    error InvalidConfig();
    error InvalidCloseTime();
    error InvalidEntryCount();
    error InvalidRoot();
    error InvalidProof();
    error InvalidWinner();
    error SeedNotReady();
    error SeedExpired();
    error ValueMismatch();
    error TransferFailed();
    error Reentrancy();
    error NothingToClaim();

    struct Draw {
        address creator;
        address committer;
        address winner;
        uint256 prize;
        uint64 closeTime;
        uint64 seedBlock;
        uint32 maxEntries;
        uint32 entryCount;
        uint32 winnerIndex;
        uint8 rounds;
        bool drawn;
        bool settled;
        bool refunded;
        bytes32 entriesRoot;
        bytes32 seed;
    }

    event DrawCreated(
        uint256 indexed id,
        address indexed creator,
        address committer,
        uint256 prize,
        uint256 fee,
        uint64 closeTime,
        uint32 maxEntries,
        uint8 rounds
    );
    event EntriesCommitted(uint256 indexed id, bytes32 root, uint32 count, uint64 seedBlock);
    event SeedCaptured(uint256 indexed id, bytes32 seed);
    event DrawComputed(uint256 indexed id, bytes32 seed, uint256 winnerIndex, bytes inputs, bytes outputs);
    event Settled(uint256 indexed id, address indexed winner, uint256 prize);
    event ClaimQueued(address indexed winner, uint256 amount);
    event Claimed(address indexed account, uint256 amount);
    event Refunded(uint256 indexed id, address indexed creator, uint256 prize);

    uint256 public constant SEED_DELAY = 5;
    uint256 public constant SEED_WINDOW = 256;
    uint256 public constant REFUND_DELAY = 30 days;
    uint16 public constant MAX_FEE_BPS = 1_000;
    uint8 public constant MAX_ROUNDS = 8;

    address public immutable processor;
    uint256 public immutable circuitId;
    address public immutable treasury;
    uint16 public immutable feeBps;
    uint256 public immutable minFee;
    uint8 public immutable defaultRounds;

    uint256 public nextId = 1;
    mapping(uint256 => Draw) private _draws;
    mapping(address => uint256) public claimable;
    uint256 private _locked = 1;

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(
        address processor_,
        uint256 circuitId_,
        uint16 feeBps_,
        uint256 minFee_,
        address treasury_,
        uint8 rounds_
    ) {
        if (processor_ == address(0) || treasury_ == address(0)) revert InvalidConfig();
        if (feeBps_ > MAX_FEE_BPS || rounds_ == 0 || rounds_ > MAX_ROUNDS) revert InvalidConfig();
        processor = processor_;
        circuitId = circuitId_;
        feeBps = feeBps_;
        minFee = minFee_;
        treasury = treasury_;
        defaultRounds = rounds_;
    }

    function feeFor(uint256 prize) public view returns (uint256) {
        uint256 proportional = (prize * feeBps) / 10_000;
        return proportional > minFee ? proportional : minFee;
    }

    function createDraw(
        uint256 prize,
        uint64 closeTime,
        uint32 maxEntries,
        address committer
    ) external payable returns (uint256 id) {
        if (prize == 0) revert InvalidConfig();
        if (closeTime < block.timestamp + 5 minutes || closeTime > block.timestamp + 365 days) {
            revert InvalidCloseTime();
        }
        if (maxEntries == 0 || maxEntries > 100_000) revert InvalidEntryCount();

        uint256 fee = feeFor(prize);
        if (msg.value != prize + fee) revert ValueMismatch();

        id = nextId++;
        Draw storage d = _draws[id];
        d.creator = msg.sender;
        d.committer = committer == address(0) ? msg.sender : committer;
        d.prize = prize;
        d.closeTime = closeTime;
        d.maxEntries = maxEntries;
        d.rounds = defaultRounds;

        (bool ok, ) = treasury.call{ value: fee }("");
        if (!ok) revert TransferFailed();

        emit DrawCreated(id, msg.sender, d.committer, prize, fee, closeTime, maxEntries, d.rounds);
    }

    /// @notice Commit the Merkle root of the public entrant list. Only the
    ///         designated committer can do this, once, after entries close.
    function commitEntries(uint256 id, bytes32 root, uint32 count) external {
        Draw storage d = _draws[id];
        if (msg.sender != d.committer) revert NotCommitter();
        if (d.entriesRoot != bytes32(0) || d.refunded) revert InvalidState();
        if (block.timestamp < d.closeTime) revert InvalidState();
        if (root == bytes32(0)) revert InvalidRoot();
        if (count == 0 || count > d.maxEntries) revert InvalidEntryCount();

        d.entriesRoot = root;
        d.entryCount = count;
        d.seedBlock = uint64(block.number + SEED_DELAY);
        emit EntriesCommitted(id, root, count, d.seedBlock);
    }

    /// @notice Store the block hash that seeds the draw. Permissionless.
    ///         Must happen while the seed block is still in the EVM's
    ///         256-block window.
    function captureSeed(uint256 id) public {
        Draw storage d = _draws[id];
        if (d.entriesRoot == bytes32(0) || d.drawn || d.refunded) revert InvalidState();
        if (d.seed != bytes32(0)) return;
        if (block.number <= d.seedBlock) revert SeedNotReady();
        if (block.number > uint256(d.seedBlock) + SEED_WINDOW) revert SeedExpired();
        bytes32 seed = blockhash(d.seedBlock);
        if (seed == bytes32(0)) revert SeedExpired();
        d.seed = seed;
        emit SeedCaptured(id, seed);
    }

    /// @notice Run the draw. Permissionless: anyone can pay the gas to make
    ///         the circuit's decision final. The result cannot be changed.
    function draw(uint256 id) external {
        Draw storage d = _draws[id];
        if (d.entriesRoot == bytes32(0) || d.drawn || d.refunded) revert InvalidState();
        if (d.seed == bytes32(0)) captureSeed(id);

        (uint256 winnerIndex, bytes memory inputs, bytes memory outputs) =
            _derive(d.seed, id, d.entryCount, d.rounds);

        d.winnerIndex = uint32(winnerIndex);
        d.drawn = true;
        emit DrawComputed(id, d.seed, winnerIndex, inputs, outputs);
    }

    /// @notice Verify the winner against the committed list and credit the
    ///         prize. The caller supplies a Merkle proof for the exact index
    ///         the circuit selected. Permissionless.
    function settle(uint256 id, address winner, bytes32[] calldata proof) external nonReentrant {
        Draw storage d = _draws[id];
        if (!d.drawn || d.settled || d.refunded) revert InvalidState();
        if (winner == address(0)) revert InvalidWinner();

        bytes32 leaf = keccak256(abi.encodePacked(uint32(d.winnerIndex), winner));
        if (!_verify(proof, d.entriesRoot, d.winnerIndex, leaf)) revert InvalidProof();

        d.settled = true;
        d.winner = winner;
        uint256 prize = d.prize;

        // Pay the winner directly. If the winner is a contract that rejects
        // the transfer, park the prize in claimable instead of locking it.
        (bool ok, ) = winner.call{ value: prize }("");
        if (!ok) {
            claimable[winner] += prize;
            emit ClaimQueued(winner, prize);
        }

        emit Settled(id, winner, prize);
    }

    /// @notice Winners pull their prize. This avoids a rejected transfer
    ///         locking the draw's escrow forever.
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{ value: amount }("");
        if (!ok) revert TransferFailed();
        emit Claimed(msg.sender, amount);
    }

    /// @notice Return the prize if no entries were committed, or if entries
    ///         were committed but the draw was never executed within 30 days.
    function refund(uint256 id) external nonReentrant {
        Draw storage d = _draws[id];
        if (d.settled || d.refunded) revert InvalidState();
        if (msg.sender != d.creator) revert NotCreator();

        bool noEntries = d.entriesRoot == bytes32(0) && block.timestamp > d.closeTime;
        bool abandoned = d.entriesRoot != bytes32(0) && !d.drawn && block.timestamp > d.closeTime + REFUND_DELAY;
        if (!noEntries && !abandoned) revert InvalidState();

        d.refunded = true;
        uint256 prize = d.prize;
        (bool ok, ) = d.creator.call{ value: prize }("");
        if (!ok) revert TransferFailed();
        emit Refunded(id, d.creator, prize);
    }

    function getDraw(uint256 id) external view returns (Draw memory) {
        return _draws[id];
    }

    /// @notice Reproduce a draw result off-chain. The frontend uses the same
    ///         algorithm to render the proof.
    function preview(uint256 id, bytes32 seed) external view returns (uint256 winnerIndex) {
        Draw storage d = _draws[id];
        if (d.entryCount == 0) return 0;
        (winnerIndex, , ) = _derive(seed, id, d.entryCount, d.rounds);
    }

    function _derive(
        bytes32 seed,
        uint256 drawId,
        uint32 count,
        uint8 rounds
    ) internal view returns (uint256 winnerIndex, bytes memory inputs, bytes memory outputs) {
        inputs = new bytes(uint256(rounds) * 3);
        outputs = new bytes(uint256(rounds) * 2);
        uint256 acc;

        for (uint8 i = 0; i < rounds; i++) {
            uint256 x = (uint256(seed) >> (uint256(i) * 17)) ^ (drawId * 0x9E3779B97F4A7C15);
            x ^= uint256(i) * 0x85EBCA6B;
            x &= 0x1FFFF;

            bytes memory input = abi.encodePacked(uint8(x), uint8(x >> 8), uint8(x >> 16));
            bytes memory out = ITapeOutProcessor(processor).eval(circuitId, input);
            if (out.length < 2) revert InvalidConfig();

            uint16 y = (uint16(uint8(out[0])) << 8) | uint16(uint8(out[1]));
            acc = (acc << 9) | uint256(y & 0x1FF);

            for (uint256 j = 0; j < 3; j++) inputs[uint256(i) * 3 + j] = input[j];
            outputs[uint256(i) * 2] = out[0];
            outputs[uint256(i) * 2 + 1] = out[1];
        }

        winnerIndex = acc % count;
    }

    function _verify(
        bytes32[] calldata proof,
        bytes32 root,
        uint32 index,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            if ((index >> i) & 1 == 1) {
                computed = keccak256(abi.encodePacked(proof[i], computed));
            } else {
                computed = keccak256(abi.encodePacked(computed, proof[i]));
            }
        }
        return computed == root;
    }
}

interface ITapeOutProcessor {
    function eval(uint256 circuitId, bytes calldata inputs) external view returns (bytes memory);
}
