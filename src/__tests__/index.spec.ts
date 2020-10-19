import { TransformerDef, TransformGraphQLSchema } from '../';
import { TreeToGraphQL } from 'graphql-zeus';

const GraphQLTransform = `
    type Post implements Nameable @model{
        name: String!
        content: String!
        createdAt: String!
    }

    type Query{
        version: String
    }
    type Mutation{
        version: String @other
    }
    interface Nameable {
        name: String
    }

    directive @model on OBJECT
    directive @other on FIELD_DEFINITION
`;

export const transformerCRUD: TransformerDef = {
  transformer: ({ field, operations }) => {
    if (!field.args) {
      throw new Error('Model can be used only for types');
    }
    if (!operations.query) {
      throw new Error('Query type required');
    }
    if (!operations.mutation) {
      throw new Error('Query type required');
    }
    return `
      input Create${field.name}{
          ${TreeToGraphQL.parse({ nodes: field.args })}
      }
      input Update${field.name}{
          ${TreeToGraphQL.parse({ nodes: field.args })}
      }
      input Details${field.name}{
          id: String!
      }
      type ${field.name}Query{
          list: [${field.name}!]!
          getByDetails(details: Details${field.name}): ${field.name}
      }
      type ${field.name}Mutation{
          create( ${field.name[0].toLowerCase() + field.name.slice(1)}: Create${field.name} ): String!
          update( ${field.name[0].toLowerCase() + field.name.slice(1)}: Update${field.name}, details: Details${
      field.name
    } ): String!
          remove( details: Details${field.name} ): String!
      }
      extend type ${operations.query.name}{
          ${field.name[0].toLowerCase() + field.name.slice(1)}: ${field.name}Query
      }
      extend type ${operations.mutation.name}{
          ${field.name[0].toLowerCase() + field.name.slice(1)}: ${field.name}Mutation
      }
      `;
  },
  directiveName: 'model',
};

describe('Test GraphQL Transformer', () => {
  it('Should create CRUD inputs and produce resolvers on query and mutation without losing anything from input schema', () => {
    const schema = TransformGraphQLSchema({ schema: GraphQLTransform, transformers: [transformerCRUD] });
    expect(schema).toContain('input CreatePost');
    expect(schema).toContain('input UpdatePost');
    expect(schema).toContain('input DetailsPost');
    expect(schema).toContain('post: PostQuery');
    expect(schema).toContain('post: PostMutation');
    expect(schema).toContain('type Post implements Nameable @model');
    expect(schema).toContain('version: String @other');
  });
});
