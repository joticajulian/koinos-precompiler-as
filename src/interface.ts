export interface PrecompilerConfig {
  proto: string[];
  class: string;
  files: string[];
}

export interface Abi {
  methods: {
    [x: string]: {
      entry_point: number;
      argument?: string;
      return?: string;
      read_only?: boolean;
      "read-only"?: boolean;
      description?: string;
    };
  };
  types: string;
  koilib_types: unknown;
}

export interface TsStructure {
  className: string;
  file: string;
  protoAs: string[];
  methods: {
    name: string;
    comment: string;
    description: string;
    entryPoint: string;
    readOnly: boolean;
    argType: string;
    retType: string;
    isVoid: boolean;
  }[];
  hasAuthorize: boolean;
  extends: TsStructure[];
}

export interface TypeModel {
  typeName: string;
}

export interface Argument {
  name: string;
  type: TypeModel;
}
