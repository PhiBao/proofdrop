// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { ProofDrop } from "../src/ProofDrop.sol";
import { MockProcessor } from "../src/MockProcessor.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        bool deployMock = vm.envOr("DEPLOY_MOCK", false);
        address processor = vm.envOr("PROCESSOR", address(0));
        uint256 circuitId = vm.envOr("CIRCUIT_ID", uint256(24));
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(100)));
        uint256 minFee = vm.envOr("MIN_FEE", uint256(0.001 ether));
        address treasury = vm.envOr("TREASURY", vm.addr(pk));
        uint8 rounds = uint8(vm.envOr("ROUNDS", uint256(4)));

        vm.startBroadcast(pk);

        if (deployMock) {
            MockProcessor mock = new MockProcessor();
            processor = address(mock);
            circuitId = vm.envOr("CIRCUIT_ID", uint256(24));
            console.log("MockProcessor", processor);
        }

        require(processor != address(0), "PROCESSOR required");
        ProofDrop drop = new ProofDrop(processor, circuitId, feeBps, minFee, treasury, rounds);
        console.log("ProofDrop", address(drop));
        console.log("processor", processor);
        console.log("circuitId", circuitId);
        console.log("treasury", treasury);

        vm.stopBroadcast();
    }
}
