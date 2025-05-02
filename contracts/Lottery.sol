// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Lottery {
    struct Game {
        uint256 totalAmount;
        bool isSettled;
        mapping(bytes32 => address) guesses;
        mapping(uint8 => address[]) playerGuess;
        uint8 winNumber;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(uint256 => Game) public games;
    uint256 public constant CYCLE_PERIOD = 15 minutes;
    uint256 public lastCycleStart;
    uint256 public guestAmount = 0.01 ether;
    
    bool private locked;
    address public owner;
    address public feeAddress;
    uint256 public taxPercent; // in basis points (1 = 0.01%)

    event GameCreated(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event GuessMade(uint256 indexed gameId, address player, bytes32 guess);
    event GameSettled(uint256 indexed gameId, uint8 winNumber, address[] winners);
    event ProofSubmitted(uint256 indexed gameId, bytes32 guess, uint8 originNumber, uint256 nonce);
    event PrizeDistributed(uint256 indexed gameId, address winner, uint256 amount);
    event FeeDistributed(uint256 indexed gameId, uint256 amount);

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier validGame(uint256 gameId) {
        require(isValidCycle(gameId), "Invalid game cycle");
        require(!games[gameId].isSettled, "Game already settled");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _feeAddress, uint256 _taxPercent) {
        owner = msg.sender;
        lastCycleStart = block.timestamp;
        setFeeAddress(_feeAddress);
        setTaxPercent(_taxPercent);
    }

    function setGuestAmount(uint256 _amount) external onlyOwner {
        guestAmount = _amount;
    }

    function setFeeAddress(address _feeAddress) public onlyOwner {
        require(_feeAddress != address(0), "Invalid fee address");
        feeAddress = _feeAddress;
    }

    function setTaxPercent(uint256 _taxPercent) public onlyOwner {
        require(_taxPercent <= 10000, "Tax too high"); // Max 100%
        taxPercent = _taxPercent;
    }

    function getCurrentCycle() public view returns (uint256) {
        return (block.timestamp - lastCycleStart) / CYCLE_PERIOD;
    }

    function isValidCycle(uint256 cycleId) public view returns (bool) {
        return cycleId <= getCurrentCycle();
    }

    function getCycleEndTime(uint256 cycleId) public view returns (uint256) {
        return lastCycleStart + (cycleId + 1) * CYCLE_PERIOD;
    }

    function guess(bytes32 _guess) external payable {
        uint256 currentCycle = getCurrentCycle();
        Game storage game = games[currentCycle];
        require(msg.value == guestAmount, "Must send exactly guest amount");
        require(game.guesses[_guess] == address(0), "Already used guess");
        
        if (game.startTime == 0) {
            game.startTime = block.timestamp;
            game.endTime = getCycleEndTime(currentCycle);
            emit GameCreated(currentCycle, game.startTime, game.endTime);
        }
        
        game.guesses[_guess] = msg.sender;
        game.totalAmount += msg.value;

        emit GuessMade(currentCycle, msg.sender, _guess);
    }

    function submitProof(uint256 _gameId, bytes32 _guess, uint8 _originNumber, uint256 _nonce) 
        external 
        validGame(_gameId)
    {
        Game storage game = games[_gameId];
        require(game.guesses[_guess] == msg.sender, "Not your guess");
        require(keccak256(abi.encodePacked(_originNumber, _nonce)) == _guess, "Invalid proof");

        game.guesses[_guess] = address(0);
        game.playerGuess[_originNumber].push(msg.sender);

        emit ProofSubmitted(_gameId, _guess, _originNumber, _nonce);

        // Auto settle if game is 2 or more cycles old
        uint256 currentCycle = getCurrentCycle();
        if (currentCycle >= _gameId + 2) {
            settleGame(_gameId);
        }
    }

    function settleGame(uint256 _gameId) public nonReentrant {
        Game storage game = games[_gameId];
        require(!game.isSettled, "Game is already settled");
        require(_gameId + 2 <= getCurrentCycle(), "Game is not over");

        // Find the winning number (number with fewest players)
        uint256 minPlayers = type(uint256).max;
        uint8 winNumber = 0;
        
        // Iterate through all possible numbers (0-255)
        for (uint8 i = 0; i < type(uint8).max; i++) {
            // Skip if no one guessed this number
            if (game.playerGuess[i].length == 0) {
                continue;
            }
            
            // Update winning number if this number has fewer players
            if (game.playerGuess[i].length < minPlayers) {
                minPlayers = game.playerGuess[i].length;
                winNumber = i;
            }
        }

        // Set the winning number and mark game as settled
        game.winNumber = winNumber;
        game.isSettled = true;

        // Calculate and distribute fees
        uint256 totalPrize = game.totalAmount;
        uint256 feeAmount = (totalPrize * taxPercent) / 10000;
        uint256 prizePool = totalPrize - feeAmount;

        // Send fee to fee address
        if (feeAmount > 0) {
            (bool feeSuccess, ) = feeAddress.call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
            emit FeeDistributed(_gameId, feeAmount);
        }

        // Distribute prizes to winners
        address[] memory winners = game.playerGuess[winNumber];
        uint256 winnersLength = winners.length;
        uint256 prizePerWinner = prizePool / winnersLength;
        
        for (uint256 i = 0; i < winnersLength; i++) {
            (bool success, ) = winners[i].call{value: prizePerWinner}("");
            require(success, "Transfer failed");
            emit PrizeDistributed(_gameId, winners[i], prizePerWinner);
        }

        emit GameSettled(_gameId, winNumber, winners);
    }
} 
