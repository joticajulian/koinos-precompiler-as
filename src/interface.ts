export interface PrecompilerConfig {
  /**
   * Main class of the project
   */
  class: string;

  /**
   * Source folder (relative to the root of the project).
   * By default it is "./src"
   */
  sourceDir: string;

  /**
   * Build folder (relative to the root of the project).
   * By default it is "./build"
   */
  buildDir: string;

  /**
   * List of TS files relative to the source folder
   */
  files: string[];

  /**
   * List of proto dirs relative to the source folder
   */
  protoImport: { name: string; path: string; exclude?: string[] }[];
}

export interface Abi {
  methods: {
    [x: string]: {
      entry_point: number;
      "entry-point": string;
      argument?: string;
      return?: string;
      read_only?: boolean;
      "read-only"?: boolean;
      description?: string;
    };
  };
  events?: {
    [x: string]: {
      argument?: string;
      description?: string;
    };
  };
  types: string;
  koilib_types: unknown;
}

export interface JsonDescriptor {
  nested: {
    [x: string]: unknown;
  };
}

export interface TsStructure {
  className: string;
  file: string;
  imports: {
    dependency: string;
    modules: string[];
  }[];
  proto: {
    className: string;
    file: string;
    jsonDescriptor: JsonDescriptor;
  }[];
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
  events: {
    name: string;
    argument: string;
  }[];
  extends: TsStructure[];
}

export interface TypeModel {
  typeName: string;
}

export interface Argument {
  name: string;
  type: TypeModel;
}
