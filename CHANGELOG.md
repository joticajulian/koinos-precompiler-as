# Changelog

All notable changes to this project will be documented in this file. 🤘

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
