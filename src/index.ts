import { OperationType, Parser, ParserField, ParserTree, TreeToGraphQL } from 'graphql-zeus';

export interface TransformerFunction {
  (props: {
    directiveName: string;
    tree: ParserTree;
    operations: Record<OperationType, ParserField | undefined>;
    schema: string;
    field: ParserField;
  }): string;
}

export interface TransformerDef {
  transformer: TransformerFunction;
  directiveName: string;
}

interface TransformSchemaProps {
  schema: string;
  transformers: Array<TransformerDef>;
}

const getOperations = (tree: ParserTree) => {
  const query = tree.nodes.find((n) => n.type.operations?.includes(OperationType.query));
  const mutation = tree.nodes.find((n) => n.type.operations?.includes(OperationType.mutation));
  const subscription = tree.nodes.find((n) => n.type.operations?.includes(OperationType.subscription));
  return {
    [OperationType.query]: query,
    [OperationType.mutation]: mutation,
    [OperationType.subscription]: subscription,
  };
};

export const TransformGraphQLSchema = ({ schema, transformers }: TransformSchemaProps) => {
  const initialTree = Parser.parse(schema);
  const addSchema: string[] = [];
  transformers.forEach((transformer) => {
    const { nodes } = initialTree;
    const checkNode = (n: ParserField) => {
      if (n.directives?.find((d) => d.name === transformer.directiveName)) {
        addSchema.push(
          transformer.transformer({
            tree: initialTree,
            operations: getOperations(initialTree),
            directiveName: transformer.directiveName,
            field: n,
            schema,
          }),
        );
      }
      if (n.args) {
        n.args.forEach((a) => checkNode(a));
      }
    };
    nodes.forEach(checkNode);
  });
  const joinedSchemas = addSchema.join('\n').concat(schema);
  return TreeToGraphQL.parse(Parser.parseAddExtensions(joinedSchemas));
};
