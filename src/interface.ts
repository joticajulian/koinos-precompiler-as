export interface FileDep {
  dependency: string;
  path: string;
}

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

  /**
   * List of TS files imported from node_modules
   */
  filesImport: { dependency: string; path: string }[];

  /**
   * Boolean defining if the generation of the ABI will support
   * the original ABI created in koinos CLI, which includes
   * "entry-point" as string and "read-only"
   */
  supportAbi1?: boolean;
}

export interface Abi {
  methods: {
    [x: string]: {
      entry_point: number;
      argument: string;
      return: string;
      read_only: boolean;
      description?: string;
      "entry-point"?: string;
      "read-only"?: boolean;
    };
  };
  events?: {
    [x: string]: {
      type?: string;
      // @deprecated - "argument" will be removed in future
      // versions. Use "type" instead
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
  dependency: string;
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
    nameAbi: string;
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
