"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractContext = void 0;
class ContractContext {
}
exports.ContractContext = ContractContext;
/**
 * The pancakeswap router address
 */
ContractContext.routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
/**
 * The pancakeswap factory address
 */
ContractContext.factoryAddress = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
/**
 * The pancakeswap pair address
 */
ContractContext.pairAddress = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
/**
 * PancakeSwap v2 router
 */
ContractContext.routerAbi = require('../ABI/pancakeswap-router-v2.json');
/**
 * PancakeSwap v2 factory
 */
ContractContext.factoryAbi = require('../ABI/pancakeswap-factory-v2.json');
/**
 * PancakeSwap v2 pair
 */
ContractContext.pairAbi = require('../ABI/pancakeswap-pair-v2.json');
/**
 * ERC20 abi
 */
ContractContext.erc20Abi = require('../ABI/erc-20-abi.json');
