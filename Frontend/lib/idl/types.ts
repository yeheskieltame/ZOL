/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/zol_contract.json`.
 */
export type ZolContract = {
  address: "Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv";
  metadata: {
    name: "zolContract";
    version: "0.1.0";
    spec: "0.1.0";
  };
  instructions: [
    {
      name: "deposit";
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182];
      accounts: [
        {
          name: "userPosition";
          writable: true;
        },
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "vault";
          writable: true;
        },
        {
          name: "userUsdc";
          writable: true;
        },
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "executeSettlement";
      discriminator: [237, 120, 82, 62, 224, 193, 147, 137];
      accounts: [
        {
          name: "userPosition";
          writable: true;
        },
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "vault";
          writable: true;
        },
        {
          name: "userUsdc";
          writable: true;
        },
        {
          name: "shopTreasury";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "yieldAmount";
          type: "u64";
        }
      ];
    },
    {
      name: "initVault";
      discriminator: [192, 155, 103, 232, 227, 22, 53, 165];
      accounts: [
        {
          name: "vault";
          writable: true;
        },
        {
          name: "usdcMint";
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "rent";
        }
      ];
      args: [];
    },
    {
      name: "initializeGame";
      discriminator: [44, 62, 102, 247, 126, 208, 130, 215];
      accounts: [
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
        }
      ];
      args: [];
    },
    {
      name: "injectYield";
      discriminator: [44, 53, 228, 21, 179, 167, 196, 63];
      accounts: [
        {
          name: "vault";
          writable: true;
        },
        {
          name: "providerUsdc";
          writable: true;
        },
        {
          name: "provider";
          writable: true;
          signer: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "registerUser";
      discriminator: [2, 241, 150, 223, 99, 214, 116, 97];
      accounts: [
        {
          name: "userPosition";
          writable: true;
        },
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
        }
      ];
      args: [
        {
          name: "factionId";
          type: "u8";
        }
      ];
    },
    {
      name: "resolveEpoch";
      discriminator: [127, 233, 72, 190, 252, 134, 239, 218];
      accounts: [
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "admin";
          signer: true;
        }
      ];
      args: [];
    },
    {
      name: "startNewEpoch";
      discriminator: [37, 124, 144, 12, 253, 60, 22, 222];
      accounts: [
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "admin";
          signer: true;
        }
      ];
      args: [];
    },
    {
      name: "updateAutomation";
      discriminator: [241, 23, 38, 245, 51, 30, 100, 111];
      accounts: [
        {
          name: "userPosition";
          writable: true;
        },
        {
          name: "user";
          signer: true;
        }
      ];
      args: [
        {
          name: "slot1";
          type: {
            defined: {
              name: "automationRule";
            };
          };
        },
        {
          name: "slot2";
          type: {
            defined: {
              name: "automationRule";
            };
          };
        },
        {
          name: "fallback";
          type: {
            defined: {
              name: "fallbackAction";
            };
          };
        }
      ];
    },
    {
      name: "withdraw";
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34];
      accounts: [
        {
          name: "userPosition";
          writable: true;
        },
        {
          name: "gameState";
          writable: true;
        },
        {
          name: "vault";
          writable: true;
        },
        {
          name: "userUsdc";
          writable: true;
        },
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "gameState";
      discriminator: [144, 94, 208, 172, 248, 99, 134, 120];
    },
    {
      name: "userPosition";
      discriminator: [251, 248, 209, 245, 83, 234, 17, 27];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "invalidFaction";
      msg: "Invalid faction ID (must be 0-2)";
    },
    {
      code: 6001;
      name: "insufficientFunds";
      msg: "Insufficient funds for withdrawal";
    },
    {
      code: 6002;
      name: "epochNotEnded";
      msg: "Epoch has not ended yet";
    }
  ];
  types: [
    {
      name: "automationRule";
      type: {
        kind: "struct";
        fields: [
          {
            name: "itemId";
            type: "u8";
          },
          {
            name: "threshold";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "automationSettings";
      type: {
        kind: "struct";
        fields: [
          {
            name: "prioritySlot1";
            type: {
              defined: {
                name: "automationRule";
              };
            };
          },
          {
            name: "prioritySlot2";
            type: {
              defined: {
                name: "automationRule";
              };
            };
          },
          {
            name: "fallbackAction";
            type: {
              defined: {
                name: "fallbackAction";
              };
            };
          }
        ];
      };
    },
    {
      name: "factionState";
      type: {
        kind: "struct";
        fields: [
          {
            name: "id";
            type: "u8";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "tvl";
            type: "u64";
          },
          {
            name: "score";
            type: "i64";
          }
        ];
      };
    },
    {
      name: "gameState";
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            type: "pubkey";
          },
          {
            name: "epochNumber";
            type: "u64";
          },
          {
            name: "epochStartTs";
            type: "i64";
          },
          {
            name: "epochEndTs";
            type: "i64";
          },
          {
            name: "totalTvl";
            type: "u64";
          },
          {
            name: "factions";
            type: {
              array: [
                {
                  defined: {
                    name: "factionState";
                  };
                },
                3
              ];
            };
          },
          {
            name: "status";
            type: {
              defined: {
                name: "gameStatus";
              };
            };
          }
        ];
      };
    },
    {
      name: "gameStatus";
      type: {
        kind: "enum";
        variants: [
          {
            name: "active";
          },
          {
            name: "settlement";
          },
          {
            name: "paused";
          }
        ];
      };
    },
    {
      name: "fallbackAction";
      type: {
        kind: "enum";
        variants: [
          {
            name: "autoCompound";
          },
          {
            name: "sendToWallet";
          }
        ];
      };
    },
    {
      name: "payoutPreference";
      type: {
        kind: "enum";
        variants: [
          {
            name: "sendToWallet";
          },
          {
            name: "autoCompound";
          },
          {
            name: "buyItem";
          }
        ];
      };
    },
    {
      name: "userInventory";
      type: {
        kind: "struct";
        fields: [
          {
            name: "swordCount";
            type: "u64";
          },
          {
            name: "shieldCount";
            type: "u64";
          },
          {
            name: "spyglassCount";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "userPosition";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "factionId";
            type: "u8";
          },
          {
            name: "depositedAmount";
            type: "u64";
          },
          {
            name: "lastDepositEpoch";
            type: "u64";
          },
          {
            name: "automationSettings";
            type: {
              defined: {
                name: "automationSettings";
              };
            };
          },
          {
            name: "inventory";
            type: {
              defined: {
                name: "userInventory";
              };
            };
          }
        ];
      };
    }
  ];
};

// TypeScript type definitions derived from IDL
export type GameState = {
  admin: string;
  epochNumber: bigint;
  epochStartTs: bigint;
  epochEndTs: bigint;
  totalTvl: bigint;
  factions: FactionState[];
  status: GameStatus;
};

export type FactionState = {
  id: number;
  name: string;
  tvl: bigint;
  score: bigint;
};

export type UserPosition = {
  owner: string;
  factionId: number;
  depositedAmount: bigint;
  lastDepositEpoch: bigint;
  automationSettings: AutomationSettings;
  inventory: UserInventory;
};

export type AutomationSettings = {
  prioritySlot1: AutomationRule;
  prioritySlot2: AutomationRule;
  fallbackAction: FallbackAction;
};

export type AutomationRule = {
  itemId: number;
  threshold: bigint;
};

export type UserInventory = {
  swordCount: bigint;
  shieldCount: bigint;
  spyglassCount: bigint;
};

export type GameStatus = 
  | { active: {} }
  | { settlement: {} }
  | { paused: {} };

export type FallbackAction = 
  | { autoCompound: {} }
  | { sendToWallet: {} };

export type PayoutPreference = 
  | { sendToWallet: {} }
  | { autoCompound: {} }
  | { buyItem: {} };
