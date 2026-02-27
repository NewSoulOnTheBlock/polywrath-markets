// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PolyAgentVault
 * @notice Custodial vault for PolyAgent. Users deposit USDC, the agent trades on their behalf.
 *         1% fee is deducted from each trade's notional value.
 * @dev Deployed on Polygon. USDC on Polygon: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 (native)
 *      or 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 (bridged)
 */
contract PolyAgentVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- State ---
    IERC20 public immutable usdc;
    address public agent;           // Agent wallet that executes trades
    address public feeCollector;    // Where 1% fees go
    uint256 public feeBps = 100;    // 1% = 100 basis points
    uint256 public constant MAX_FEE_BPS = 500; // 5% max fee cap

    mapping(address => uint256) public balances;        // User available balances
    mapping(address => uint256) public lockedBalances;  // Funds in active positions
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;
    mapping(address => uint256) public totalFeePaid;

    uint256 public totalVaultBalance;
    uint256 public totalFeesCollected;

    // --- Events ---
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event TradePlaced(address indexed user, uint256 amount, uint256 fee, bytes32 marketId);
    event TradeSettled(address indexed user, uint256 payout, bytes32 marketId);
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    // --- Modifiers ---
    modifier onlyAgent() {
        require(msg.sender == agent, "Only agent");
        _;
    }

    // --- Constructor ---
    constructor(address _usdc, address _agent, address _feeCollector) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_agent != address(0), "Invalid agent");
        require(_feeCollector != address(0), "Invalid fee collector");
        usdc = IERC20(_usdc);
        agent = _agent;
        feeCollector = _feeCollector;
    }

    // --- User Functions ---

    /**
     * @notice Deposit USDC into the vault. Must approve first.
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        totalDeposited[msg.sender] += amount;
        totalVaultBalance += amount;
        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw available (unlocked) USDC.
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalWithdrawn[msg.sender] += amount;
        totalVaultBalance -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Get user's full position info
     */
    function getUserInfo(address user) external view returns (
        uint256 available,
        uint256 locked,
        uint256 deposited,
        uint256 withdrawn,
        uint256 feesPaid
    ) {
        return (
            balances[user],
            lockedBalances[user],
            totalDeposited[user],
            totalWithdrawn[user],
            totalFeePaid[user]
        );
    }

    // --- Agent Functions ---

    /**
     * @notice Agent places a trade on behalf of a user. Deducts amount + fee from user balance.
     * @param user The user whose funds to use
     * @param amount Trade notional (before fee)
     * @param marketId Polymarket condition ID or market identifier
     */
    function placeTrade(
        address user,
        uint256 amount,
        bytes32 marketId
    ) external onlyAgent nonReentrant whenNotPaused {
        uint256 fee = (amount * feeBps) / 10000;
        uint256 total = amount + fee;
        require(balances[user] >= total, "Insufficient user balance");

        // Deduct from available, lock the trade amount
        balances[user] -= total;
        lockedBalances[user] += amount;

        // Collect fee
        totalFeePaid[user] += fee;
        totalFeesCollected += fee;
        usdc.safeTransfer(feeCollector, fee);

        emit TradePlaced(user, amount, fee, marketId);
    }

    /**
     * @notice Agent settles a trade — returns payout to user's available balance.
     * @param user The user
     * @param lockedAmount Original amount that was locked
     * @param payout Actual payout (can be 0 if lost, or > lockedAmount if won)
     * @param marketId Market identifier
     */
    function settleTrade(
        address user,
        uint256 lockedAmount,
        uint256 payout,
        bytes32 marketId
    ) external onlyAgent nonReentrant {
        require(lockedBalances[user] >= lockedAmount, "Invalid locked amount");
        lockedBalances[user] -= lockedAmount;

        if (payout > 0) {
            // If payout > locked, the extra comes from vault reserves (agent must ensure solvency)
            balances[user] += payout;
            if (payout > lockedAmount) {
                totalVaultBalance += (payout - lockedAmount);
            } else {
                totalVaultBalance -= (lockedAmount - payout);
            }
        } else {
            totalVaultBalance -= lockedAmount;
        }

        emit TradeSettled(user, payout, marketId);
    }

    /**
     * @notice Agent can approve USDC to Polymarket's CTF Exchange for actual trading
     * @param spender The Polymarket exchange contract
     * @param amount Amount to approve
     */
    function approveExchange(address spender, uint256 amount) external onlyAgent {
        usdc.approve(spender, amount);
    }

    // --- Admin Functions ---

    function setAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent");
        emit AgentUpdated(agent, _agent);
        agent = _agent;
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid collector");
        emit FeeCollectorUpdated(feeCollector, _feeCollector);
        feeCollector = _feeCollector;
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Emergency withdraw of stuck tokens (not user USDC)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(usdc), "Cannot withdraw USDC");
        IERC20(token).safeTransfer(owner(), amount);
    }
}
