# Changelog

All notable changes to this project will be documented in this file. 🤘

## [v1.7.3](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.7.3) (2025-02-24)

### 🐛 Bug Fixes

- Fix the compilation of proto files of extended classes. Example:
  The SmartWalletAllowance used the "authority" proto from @koinos/sdk-as.
  However, if this class was used as an extension of another class, the
  precompiler was linking "authority" to @koinosbox/contracts, instead of
  @koinos/sdk-as. This issue was fixed.

## [v1.7.2](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.7.2) (2024-11-23)

### 🐛 Bug Fixes

- Fix imports during the generation of interfaces for extended classes. Example:
  Nicknames extends the NFT class. During the generation of the interface INFT.ts
  (the extended class), the import "./proto/nft" is replaced by the dependency:
  "@koinosbox/contracts".

## [v1.7.1](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.7.1) (2024-10-25)

### 🐛 Bug Fixes

- Fix the definition of protos in koilib_types when the class extends another one. Some comments
  were added to the code to improve the documentation of this change.

## [v1.7.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.7.0) (2024-10-25)

### 🚀 Features

- Support new event standard in the generation of ABIs. Example:

```
{
  "methods": { ... },
  "types": "...",
  "events": {
    "token.transfer_event": {
      "argument": "token.transfer_args",
      "type": "token.transfer_args"
    }
  }
}
```

The new standard uses "type" instead of "argument" when defining events. The "argument" will be
removed in future versions

## [v1.6.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.6.0) (2024-07-02)

### 🚀 Features

- The @entrypoint comment in the method now can be used to override the name of the method.
  This option is useful when the parent class uses different arguments and cannot be overriden.

## [v1.5.1](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.5.1) (2024-04-09)

### 🐛 Bug Fixes

- Fix generateProto when using workspaces

## [v1.5.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.5.0) (2024-03-15)

### 🐛 Bug Fixes

- Fix interface when it extends another interface (no need to define the constructor).
- The warning of empty types has been fixed (`warning: the proto type was not found in the imports`).
- Throw error when a proto is not found. This is to make sure the developer is creating a complete ABI without missing protos.
- The warning `INFO AS210: Expression is never 'null'` has been fixed in interfaces.

Note: The warning `INFO AS210` is a warning in AssemblyScript v0.27 but an error in AssemblyScript v0.19. If you are still using v0.19 consider to downgrade koinos-precompiler-as to v1.4. Or you can also add manually the exclamation marks in the affected interfaces to resolve the error.

## [v1.4.2](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.4.2) (2024-02-26)

### 🐛 Bug Fixes

- Fix ABI computation when protofiles has empty strings

## [v1.4.1](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.4.1) (2024-02-24)

-- sync

## [v1.4.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.4.0) (2024-02-24)

### 🚀 Features

- Option `supportAbi1` to configure the ABI support. When `false` it will create the ABI with `entry_point` and `read_only`. When `true` it will create the ABI with `entry_point`, `entry-point`, `read_only`, and `read-only`.

## [v1.3.2](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.3.2) (2024-01-16)

### 🐛 Bug Fixes

- Fix build with koinos-proto

## [v1.3.1](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.3.1) (2024-01-16)

### 🐛 Bug Fixes

- Fix extends when when the parent class does not have functions

## [v1.3.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.3.0) (2024-01-09)

### 🚀 Features

- Support windows for the generation the AS proto files

## [v1.2.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.2.0) (2023-10-02)

### 🚀 Features

- filesImport option to define list of files imported from node modules

### 🐛 Bug Fixes

- Fix generation of index.ts file and interfaces when importing files from node modules

## [v1.1.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.1.0) (2023-08-18)

### 🚀 Features

- option to exclude files from protoImport

## [v1.0.0](https://github.com/joticajulian/koinos-precompiler-as/releases/tag/v1.0.0) (2023-08-17)

### 🚀 Features

- refactor to be able to import contracts from node_modules
